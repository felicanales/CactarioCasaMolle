"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext(null);

// Configuración dinámica de API por entorno
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return `${window.location.protocol}//${window.location.hostname}`;
  }
  return "http://localhost:8000";
};

const API = getApiUrl();

// Helper para obtener CSRF token
const getCsrfToken = () => {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
    return match ? match[2] : null;
  }
  return null;
};

// Helper para hacer requests con CSRF
const apiRequest = async (url, options = {}) => {
  const csrfToken = getCsrfToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for state-changing operations
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies
  });
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email } o null
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiRequest(`${API}/auth/me`, {
        method: "GET",
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
    // Always try to fetch user on mount - middleware handles authentication
    (async () => {
      await fetchMe();
      setLoading(false);
    })();
  }, [fetchMe]);


  const requestOtp = async (email) => {
    const res = await apiRequest(`${API}/auth/request-otp`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!res.ok && res.status !== 204) throw new Error("No se pudo solicitar OTP");
    return true;
  };

  const verifyOtp = async (email, code) => {
    const res = await apiRequest(`${API}/auth/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Código inválido o expirado");
    }
    const data = await res.json();

    // Update user state after successful verification
    await fetchMe();
    return data;
  };

  const refreshToken = async () => {
    try {
      const res = await apiRequest(`${API}/auth/refresh`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Token refresh failed");
      }
      const data = await res.json();

      // Update user state after refresh
      await fetchMe();
      return data;
    } catch (error) {
      // If refresh fails, logout user
      await logout();
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest(`${API}/auth/logout`, {
        method: "POST",
      });
    } finally {
      setUser(null);
      // No need to clear localStorage - we don't use it anymore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, refreshToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
