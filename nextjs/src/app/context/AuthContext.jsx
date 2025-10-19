"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext(null);
// Configuración dinámica de API por entorno
const getApiUrl = () => {
  // Si hay una variable de entorno específica, usarla
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // En Railway, usar el mismo dominio para el API
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return `${window.location.protocol}//${window.location.hostname}`;
  }

  // Desarrollo local
  return "http://localhost:8000";
};

const API = getApiUrl();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email } o null
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "GET",
        credentials: "include",           // <- para que viaje la cookie cm_session
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Evita 401 innecesario en Network antes de login: solo intentamos si creemos tener sesión
    const hasSessionMarker = typeof window !== "undefined" && localStorage.getItem("hasSession") === "true";
    (async () => {
      if (hasSessionMarker) {
        await fetchMe();
      }
      setLoading(false);
    })();
  }, [fetchMe]);


  const requestOtp = async (email) => {
    const res = await fetch(`${API}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    // El endpoint devuelve 204 siempre que “pasa” la validación
    if (!res.ok && res.status !== 204) throw new Error("No se pudo solicitar OTP");
    return true;
  };

  const verifyOtp = async (email, code) => {
    const res = await fetch(`${API}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "include", // recibe y guarda cookie httpOnly
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Código inválido o expirado");
    }
    const data = await res.json();
    // Marcador local para evitar 401 en el primer render
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSession", "true");
    }
    // Ya tenemos cookie, pero por conveniencia pedimos /auth/me para poblar user
    await fetchMe();
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("hasSession");
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
