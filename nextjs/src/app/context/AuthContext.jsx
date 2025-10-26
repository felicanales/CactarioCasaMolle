"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext(null);

// ========================================
// MODO DESARROLLO - SIN AUTENTICACIÓN (SOLO LOCAL)
// ========================================
// ✅ AUTH DESACTIVADA - Solo para desarrollo LOCAL
// En Railway/PRODUCCIÓN: autenticación activada
const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
);
const DEV_MODE = isLocalhost; // Solo dev mode en localhost
const MOCK_USER = {
  id: 1,
  email: "admin@cactario.local",
  name: "Usuario de Desarrollo",
  role: "admin"
};

// Configuración dinámica de API por entorno
const getApiUrl = () => {
  // Prioridad 1: Variable de entorno NEXT_PUBLIC_API_URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Prioridad 2: Detectar Railway y usar backend de producción
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return "https://cactario-backend-production.up.railway.app";
  }

  // Prioridad 3: Desarrollo local
  return "http://localhost:8000";
};

const API = getApiUrl();

// Log API URL for debugging
if (typeof window !== 'undefined') {
  console.log('[AuthContext] Using API URL:', API);
  console.log('[AuthContext] DEV_MODE:', DEV_MODE);
}

// Helper para obtener CSRF token
const getCsrfToken = () => {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
    return match ? match[2] : null;
  }
  return null;
};

// Helper para obtener el access token de cookies o localStorage
const getAccessToken = () => {
  if (typeof window === 'undefined') return null;

  // Prioridad 1: localStorage (para compatibilidad con usuarios existentes)
  const localStorageToken = localStorage.getItem('access_token');
  if (localStorageToken) {
    console.log('[AuthContext] Using token from localStorage');
    return localStorageToken;
  }

  // Prioridad 2: cookies
  const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
  if (match) {
    console.log('[AuthContext] Using token from cookies');
    return match[2];
  }

  return null;
};

// Helper para hacer requests con CSRF y Authorization
const apiRequest = async (url, options = {}) => {
  const csrfToken = getCsrfToken();
  const accessToken = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for state-changing operations
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Add Authorization header if token is available
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    console.log('[AuthContext] Adding Authorization header to request:', url);
  } else {
    console.log('[AuthContext] No access token available for request:', url);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies
  });
};

export function AuthProvider({ children }) {
  // Modo desarrollo: usar mock user sin autenticación
  if (DEV_MODE) {
    return <AuthContext.Provider value={{
      user: MOCK_USER,
      loading: false,
      accessToken: "dev-token",
      requestOtp: async () => { },
      verifyOtp: async () => { },
      refreshToken: async () => { },
      logout: () => {
        console.log('[AuthContext] Logout llamado pero ignorado en DEV_MODE');
      },
      fetchMe: async () => { }
    }}>
      {children}
    </AuthContext.Provider>;
  }

  const [user, setUser] = useState(null);      // { id, email } o null
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiRequest(`${API}/auth/me`, {
        method: "GET",
      });

      if (!res.ok) {
        console.log('[AuthContext] fetchMe failed:', res.status);
        setUser(null);
        setAccessToken(null);
        // Limpiar localStorage si la autenticación falla
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        return false;
      }

      const data = await res.json();
      console.log('[AuthContext] fetchMe success:', data);

      // Check if user is authenticated
      if (data.authenticated === false) {
        console.log('[AuthContext] ❌ User not authenticated, clearing state');
        setUser(null);
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        return false;
      } else {
        console.log('[AuthContext] ✅ User authenticated, updating state');
        console.log('[AuthContext] Setting user to:', data);
        setUser(data);
        // Guardar token en estado y localStorage si está disponible
        if (data.access_token) {
          setAccessToken(data.access_token);
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', data.access_token);
            console.log('[AuthContext] Token updated in localStorage from /auth/me');
          }
        }
        console.log('[AuthContext] User state updated, returning true');
        return true;
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user:', error);
      setUser(null);
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
      return false;
    }
  }, []);

  useEffect(() => {
    // Intentar obtener el usuario al cargar solo una vez
    if (!initialized) {
      (async () => {
        console.log('[AuthContext] Initializing...');
        await fetchMe();
        setLoading(false);
        setInitialized(true);
        console.log('[AuthContext] Initialization complete - user:', user, 'loading:', loading);
      })();
    }
  }, [fetchMe, initialized]);

  // Monitorear cambios en el estado del usuario
  useEffect(() => {
    console.log('[AuthContext] User state changed - user:', user, 'loading:', loading);
  }, [user, loading]);


  const requestOtp = async (email) => {
    const res = await apiRequest(`${API}/auth/request-otp`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!res.ok && res.status !== 204) {
      // Intentar obtener el mensaje de error del servidor
      let errorMessage = "No se pudo solicitar OTP";
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Si no se puede parsear, usar mensaje genérico
      }
      throw new Error(errorMessage);
    }
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

    console.log('[AuthContext] OTP verified, data:', data);

    // Guardar token y usuario
    if (data.access_token) {
      setAccessToken(data.access_token);
      // Guardar en localStorage para compatibilidad
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        console.log('[AuthContext] Token saved to localStorage');
      }
    }
    if (data.user) {
      setUser(data.user);
    }

    // Actualizar el estado del usuario llamando a fetchMe
    console.log('[AuthContext] Updating user state after OTP verification');
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
      setAccessToken(null);
      // Limpiar localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        console.log('[AuthContext] Token removed from localStorage');
      }
      console.log('[AuthContext] User logged out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, requestOtp, verifyOtp, refreshToken, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
