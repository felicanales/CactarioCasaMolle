"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Componente para inputs separados del código
function CodeInput({ code, setCode, length = 6 }) {
  const inputRefs = useRef([]);
  const [pasted, setPasted] = useState(false);

  // Manejar cambio en un input individual
  const handleChange = (index, value) => {
    // Solo permitir números
    if (!/^\d*$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('');
    setCode(updatedCode);

    // Si se escribió un dígito, ir al siguiente campo
    if (value && index < length - 1) {
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

  // Manejar pegado
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleanData = pastedData.replace(/\D/g, ''); // Solo números

    if (cleanData.length <= length) {
      setCode(cleanData.padEnd(length, ''));

      // Enfocar el último campo con datos o el siguiente vacío
      const nextEmptyIndex = Math.min(cleanData.length, length - 1);
      inputRefs.current[nextEmptyIndex]?.focus();

      // Mostrar feedback visual de pegado
      setPasted(true);
      setTimeout(() => setPasted(false), 1000);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      transform: pasted ? 'scale(1.02)' : 'scale(1)',
      transition: 'transform 0.2s ease',
      padding: '8px 0',
      width: '100%',
      maxWidth: '320px',
      margin: '0 auto'
    }}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength="1"
          value={code[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          style={{
            width: '42px',
            height: '48px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: '700',
            borderRadius: '10px',
            border: code[index] ? '2px solid #10b981' : '2px solid #e5e7eb',
            background: code[index] ? '#f0fdf4' : '#ffffff',
            outline: 'none',
            transition: 'all 0.3s ease',
            boxShadow: code[index]
              ? '0 2px 8px rgba(16, 185, 129, 0.15)'
              : '0 1px 3px rgba(0, 0, 0, 0.05)',
            color: code[index] ? '#059669' : '#374151',
            flex: '1',
            minWidth: '42px'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
          }}
          onBlur={(e) => {
            if (code[index]) {
              e.target.style.borderColor = '#10b981';
              e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.15)';
            } else {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { user, loading: authLoading, requestOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null); // mensajes de feedback
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/staff");
    }
  }, [user, authLoading, router]);

  const onRequestOtp = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await requestOtp(email.trim());
      setStep("code");
      setStatus({ type: "success", text: "Te enviamos un código a tu correo." });
    } catch (err) {
      // Usar el mensaje de error del servidor si está disponible
      const errorMessage = err.message || "No fue posible solicitar el código. Verifica tu correo.";
      setStatus({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setStatus(null);

    // Validar que el código tenga 6 dígitos
    if (code.length !== 6) {
      setStatus({ type: "error", text: "Por favor ingresa el código completo de 6 dígitos." });
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), code.trim());
      setStatus({ type: "success", text: "Inicio de sesión correcto." });
    } catch (err) {
      setStatus({ type: "error", text: "Código inválido o expirado." });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ maxWidth: 420, margin: "64px auto", textAlign: "center" }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "32px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#1f2937" }}>Ingresar al sistema</h1>
        <p style={{ color: "#6b7280", fontSize: "16px", margin: 0 }}>
          Accede con tu correo institucional. Te enviaremos un código de verificación.
        </p>
      </div>

      {status && (
        <div style={{
          marginBottom: "24px",
          padding: "16px 20px",
          borderRadius: 12,
          background: status.type === "error" ? "#fee2e2" : "#ecfeff",
          color: status.type === "error" ? "#991b1b" : "#075985",
          border: "1px solid",
          borderColor: status.type === "error" ? "#fecaca" : "#a5f3fc",
          fontSize: "14px",
          fontWeight: "500",
          textAlign: "center"
        }}>
          {status.text}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={onRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
          <div style={{ width: "100%" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: "14px", color: "#374151" }}>Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu-correo@casamolle.cl"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                border: "2px solid #e5e7eb",
                fontSize: "16px",
                transition: "border-color 0.2s ease",
                outline: "none",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "600",
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxSizing: "border-box"
            }}
          >
            {loading ? "Enviando..." : "Enviar código"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
          <div style={{ width: "100%" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: "14px", color: "#374151" }}>Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                border: "2px solid #e5e7eb",
                background: "#f8fafc",
                fontSize: "16px",
                color: "#64748b",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 16, fontSize: "14px", textAlign: "center" }}>
              Código de verificación
            </label>
            <div style={{ marginBottom: 12 }}>
              <CodeInput code={code} setCode={setCode} length={6} />
            </div>
            <p style={{
              textAlign: "center",
              fontSize: "14px",
              color: code.length === 6 ? "#10b981" : "#6b7280",
              fontWeight: "500",
              margin: 0
            }}>
              {code.length === 6 ? "✓ Código completo" : `${code.length}/6 dígitos`}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "14px 24px",
                fontSize: "16px",
                fontWeight: "600",
                borderRadius: 10,
                border: "none",
                opacity: code.length !== 6 ? 0.6 : 1,
                cursor: code.length !== 6 ? 'not-allowed' : 'pointer',
                transition: "all 0.2s ease",
                boxSizing: "border-box"
              }}
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>

            <button
              type="button"
              onClick={() => setStep("email")}
              className="btn-secondary"
              style={{
                width: "100%",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#6b7280",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxSizing: "border-box"
              }}
            >
              Cambiar correo
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
