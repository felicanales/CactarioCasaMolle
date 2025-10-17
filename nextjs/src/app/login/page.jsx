"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { user, requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null); // mensajes de feedback
  const [loading, setLoading] = useState(false);

  const onRequestOtp = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await requestOtp(email.trim());
      setStep("code");
      setStatus({ type: "success", text: "Te enviamos un código a tu correo." });
    } catch (err) {
      setStatus({ type: "error", text: "No fue posible solicitar el código (verifica tu correo autorizado)." });
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setStatus(null);
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

  if (user) {
    return (
      <div className="card">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Ya estás dentro ✅</h1>
        <p style={{ marginBottom: 16 }}>Email: <b>{user.email}</b></p>
        <Link href="/staff">Ir al panel de staff →</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Ingresar al sistema</h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        Accede con tu correo institucional. Te enviaremos un código de verificación.
      </p>

      {status && (
        <div style={{
          marginBottom: 16,
          padding: "10px 12px",
          borderRadius: 8,
          background: status.type === "error" ? "#fee2e2" : "#ecfeff",
          color: status.type === "error" ? "#991b1b" : "#075985",
          border: "1px solid",
          borderColor: status.type === "error" ? "#fecaca" : "#a5f3fc"
        }}>
          {status.text}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={onRequestOtp}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu-correo@casamolle.cl"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", marginBottom: 12
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Enviando..." : "Enviar código"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onVerifyOtp}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #d1d5db", background: "#f9fafb"
              }}
            />
          </div>

          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Código (6 dígitos)</label>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid #d1d5db", marginBottom: 12, letterSpacing: 2
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>

          <button
            type="button"
            onClick={() => setStep("email")}
            className="btn-secondary"
            style={{ marginTop: 10 }}
          >
            Cambiar correo
          </button>
        </form>
      )}
    </div>
  );
}
