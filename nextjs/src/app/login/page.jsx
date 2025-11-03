"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

// Utilidades de sanitización y validación
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';

  // Eliminar caracteres peligrosos para SQL injection y XSS
  return input
    .trim()
    .replace(/[<>'"`;(){}[\]\\]/g, '') // Elimina caracteres peligrosos
    .replace(/--/g, '') // Elimina comentarios SQL
    .replace(/\/\*/g, '') // Elimina inicio de comentarios multi-línea
    .replace(/\*\//g, '') // Elimina fin de comentarios multi-línea
    .slice(0, 255); // Limitar longitud
};

const validateEmail = (email) => {
  // Validación estricta de email
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const sanitized = sanitizeInput(email.toLowerCase());

  // Verificar formato
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Formato de email inválido' };
  }

  // Verificar longitud
  if (sanitized.length < 5 || sanitized.length > 254) {
    return { valid: false, error: 'Email debe tener entre 5 y 254 caracteres' };
  }

  // Verificar partes del email
  const [local, domain] = sanitized.split('@');
  if (!local || !domain || local.length > 64) {
    return { valid: false, error: 'Email inválido' };
  }

  return { valid: true, sanitized };
};

const validateOtpCode = (code) => {
  // Solo dígitos, exactamente 6 caracteres
  const sanitized = code.replace(/\D/g, '').slice(0, 6);

  if (sanitized.length !== 6) {
    return { valid: false, error: 'El código debe tener 6 dígitos' };
  }

  return { valid: true, sanitized };
};

// Componente para inputs separados del código OTP con validación mejorada
function CodeInput({ code, setCode, length = 6 }) {
  const inputRefs = useRef([]);
  const [pasted, setPasted] = useState(false);

  // Manejar cambio en un input individual con sanitización
  const handleChange = (index, value) => {
    // Solo permitir números y sanitizar
    const sanitized = value.replace(/\D/g, '').slice(0, 1);

    if (!sanitized && value) return; // Rechazar entrada no numérica

    const newCode = code.split('');
    newCode[index] = sanitized;
    const updatedCode = newCode.join('');
    setCode(updatedCode);

    // Si se escribió un dígito, ir al siguiente campo
    if (sanitized && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manejar teclas especiales
  const handleKeyDown = (index, e) => {
    // Si se presiona Backspace y el campo está vacío, ir al campo anterior
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Si se presiona flecha izquierda, ir al campo anterior
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Si se presiona flecha derecha, ir al campo siguiente
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manejar pegado con sanitización
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    // Solo extraer dígitos y limitar a la longitud especificada
    const digits = pastedData.replace(/\D/g, '').slice(0, length);

    if (digits.length > 0) {
      setCode(digits.padEnd(length, ''));
      setPasted(true);

      // Enfocar el último campo con contenido
      const lastIndex = Math.min(digits.length - 1, length - 1);
      setTimeout(() => {
        inputRefs.current[lastIndex]?.focus();
        setPasted(false);
      }, 100);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: 'clamp(4px, 2vw, 8px)',
      justifyContent: 'center',
      width: '100%',
      maxWidth: '100%',
      margin: '0 auto'
    }}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={code[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          style={{
            width: 'clamp(38px, 13vw, 48px)',
            height: 'clamp(42px, 14vw, 54px)',
            fontSize: 'clamp(18px, 5vw, 22px)',
            textAlign: 'center',
            border: '1px solid #d1d5db',
            borderRadius: 'clamp(8px, 2vw, 12px)',
            outline: 'none',
            transition: 'all 0.2s',
            fontWeight: '600',
            color: '#111827',
            backgroundColor: pasted && index < code.length ? '#dbeafe' : 'white',
            flex: '0 1 auto',
            minWidth: '0',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = 'none';
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [step, setStep] = useState("email"); // "email" | "code"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Rate limiting simple (cliente)
  const [attempts, setAttempts] = useState(0);
  const [lastAttempt, setLastAttempt] = useState(null);

  // Prevenir múltiples submits automáticos
  const submittedRef = useRef(false);

  const checkRateLimit = () => {
    const now = Date.now();

    // Resetear contador después de 5 minutos
    if (lastAttempt && now - lastAttempt > 5 * 60 * 1000) {
      setAttempts(0);
      setLastAttempt(null);
      return true;
    }

    // Máximo 5 intentos cada 5 minutos
    if (attempts >= 5) {
      const timeLeft = Math.ceil((5 * 60 * 1000 - (now - lastAttempt)) / 1000);
      setError(`Demasiados intentos. Espera ${timeLeft} segundos.`);
      return false;
    }

    return true;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validar rate limiting
    if (!checkRateLimit()) return;

    // Validar y sanitizar email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error);
      return;
    }

    setLoading(true);
    setAttempts(prev => prev + 1);
    setLastAttempt(Date.now());

    try {
      await requestOtp(emailValidation.sanitized);
      setEmail(emailValidation.sanitized); // Usar email sanitizado
      setSuccess("✅ Código enviado a tu correo");
      setStep("code");
      setAttempts(0); // Resetear intentos en éxito
    } catch (err) {
      setError(err.message || "Error al solicitar código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    // Validar rate limiting
    if (!checkRateLimit()) return;

    // Validar y sanitizar código OTP
    const codeValidation = validateOtpCode(code);
    if (!codeValidation.valid) {
      setError(codeValidation.error);
      return;
    }

    setLoading(true);
    setAttempts(prev => prev + 1);
    setLastAttempt(Date.now());

    try {
      await verifyOtp(email, codeValidation.sanitized);
      setSuccess("✅ Autenticación exitosa");
      setAttempts(0); // Resetear intentos en éxito
      router.push("/staff");
    } catch (err) {
      setError(err.message || "Código inválido");
      // Limpiar código en error
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit cuando se complete el código (solo una vez por código completo)
  useEffect(() => {
    if (code.length === 6 && step === "code" && !loading && !submittedRef.current) {
      submittedRef.current = true;
      setTimeout(() => {
        handleVerifyOtp(new Event('submit', { bubbles: true, cancelable: true }));
      }, 100);
    }

    // Reset al cambiar de paso
    if (step !== "code") {
      submittedRef.current = false;
    }

    // Reset al limpiar código completamente
    if (code.length === 0) {
      submittedRef.current = false;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, loading]);

  // Sanitizar email en cada cambio
  const handleEmailChange = (e) => {
    const value = e.target.value;
    // Permitir escritura pero limitar caracteres peligrosos
    const sanitized = value
      .toLowerCase()
      .replace(/[<>'"`;(){}[\]\\]/g, '')
      .slice(0, 254);
    setEmail(sanitized);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb",
      padding: "16px"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "clamp(24px, 5vw, 40px)",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "420px"
      }}>
        <h1 style={{
          fontSize: "clamp(20px, 5vw, 24px)",
          fontWeight: "700",
          marginBottom: "8px",
          textAlign: "center",
          color: "#111827"
        }}>
          Cactario Casa Molle
        </h1>
        <p style={{
          fontSize: "clamp(13px, 3vw, 14px)",
          color: "#6b7280",
          marginBottom: "24px",
          textAlign: "center"
        }}>
          Se enviará un codigo a tu correo.
        </p>

        {step === "email" ? (
          <form onSubmit={handleRequestOtp}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#374151"
            }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
              placeholder="tu@email.com"
              disabled={loading}
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              maxLength={254}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "15px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                marginBottom: "16px",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />

            {error && (
              <div style={{
                padding: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "14px",
                marginBottom: "16px"
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: "12px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                color: "#16a34a",
                fontSize: "14px",
                marginBottom: "16px"
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                fontWeight: "600",
                color: "white",
                backgroundColor: (loading || !email) ? "#9ca3af" : "#3b82f6",
                border: "none",
                borderRadius: "8px",
                cursor: (loading || !email) ? "not-allowed" : "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                if (!loading && email) e.target.style.backgroundColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                if (!loading && email) e.target.style.backgroundColor = "#3b82f6";
              }}
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: "8px" }}>
              <p style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                Código enviado a <strong>{email}</strong>
              </p>
            </div>

            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "12px",
              color: "#374151",
              textAlign: "center"
            }}>
              Ingresa el código de 6 dígitos
            </label>

            <div style={{ marginBottom: "16px" }}>
              <CodeInput code={code} setCode={setCode} length={6} />
            </div>

            {error && (
              <div style={{
                padding: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "14px",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: "12px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                color: "#16a34a",
                fontSize: "14px",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                fontWeight: "600",
                color: "white",
                backgroundColor: (loading || code.length !== 6) ? "#9ca3af" : "#3b82f6",
                border: "none",
                borderRadius: "8px",
                cursor: (loading || code.length !== 6) ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
                marginBottom: "12px"
              }}
              onMouseEnter={(e) => {
                if (!loading && code.length === 6) e.target.style.backgroundColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                if (!loading && code.length === 6) e.target.style.backgroundColor = "#3b82f6";
              }}
            >
              {loading ? "Conectando..." : "Verificar código"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
                setSuccess("");
                setAttempts(0);
                submittedRef.current = false; // Reset del ref
              }}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                color: "#6b7280",
                backgroundColor: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
                e.target.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "#d1d5db";
              }}
            >
              ← Cambiar correo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
