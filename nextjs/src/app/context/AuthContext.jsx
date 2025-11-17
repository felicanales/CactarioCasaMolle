"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getApiUrl } from "../../utils/api-config";

const AuthContext = createContext(null);

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está DESACTIVADO (requiere autenticación)
// Para activar en desarrollo: setear NEXT_PUBLIC_BYPASS_AUTH=true
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

// Usar configuración centralizada de API URL
const API = getApiUrl();

// Log API URL for debugging (solo en desarrollo)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[AuthContext] Using API URL:', API);
}

// Helper para obtener CSRF token
const getCsrfToken = () => {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'));
    return match ? match[2] : null;
  }
  return null;
};

// Helper para obtener el access token SOLO de cookies (más seguro)
const getAccessToken = () => {
  if (typeof window === 'undefined') return null;

  // Solo usar cookies (más seguro, HttpOnly)
  const match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
  if (match) {
    console.log('[AuthContext] Using token from cookies');
    return match[2];
  }

  return null;
};

// Helper para hacer requests con CSRF y Authorization
// Se define dentro del componente para tener acceso al estado accessToken

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email } o null
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  // Crear apiRequest que siempre use el token actual del estado
  // Usar useCallback para que se actualice cuando accessToken cambie
  const apiRequest = useCallback((url, options = {}) => {
    const csrfToken = getCsrfToken();
    // Prioridad 1: Token del estado (más reciente)
    // Prioridad 2: Token de cookies
    let token = accessToken || getAccessToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add CSRF token for state-changing operations
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Add Authorization header if token is available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[AuthContext] Adding Authorization header to request:', url);
    } else {
      console.log('[AuthContext] No access token available for request:', url);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
    });
  }, [accessToken]);

  // Función para verificar si el token está expirando pronto
  const isTokenExpiringSoon = () => {
    try {
      const token = getAccessToken();
      if (!token) return true;

      // Decodificar JWT para obtener exp (expiración)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir a milisegundos
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutos en milisegundos

      // Retornar true si expira en menos de 5 minutos
      return (exp - now) < fiveMinutes;
    } catch (error) {
      console.error('[AuthContext] Error checking token expiration:', error);
      return true; // En caso de error, asumir que expiró
    }
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
      // No llamar fetchMe aquí porque puede causar un ciclo
      return data;
    } catch (error) {
      // If refresh fails, clear state and force re-login
      setUser(null);
      setAccessToken(null);
      throw error;
    }
  };

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiRequest(`${API}/auth/me`, {
        method: "GET",
      });

      if (!res.ok) {
        console.log('[AuthContext] fetchMe failed:', res.status);
        setUser(null);
        setAccessToken(null);
        return false;
      }

      const data = await res.json();
      console.log('[AuthContext] fetchMe success:', data);

      // Check if user is authenticated
      if (data.authenticated === false) {
        setUser(null);
        setAccessToken(null);
        return false;
      } else {
        setUser(data);
        // Token se maneja solo a través de cookies (más seguro)
        if (data.access_token) {
          setAccessToken(data.access_token);
          console.log('[AuthContext] User authenticated, token available via cookies');
        }
        return true;
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user:', error);
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, [apiRequest]);

  useEffect(() => {
    // BYPASS: No hacer fetch inicial en desarrollo
    if (BYPASS_AUTH) {
      setUser({ id: "dev-user-123", email: "dev@cactario.local" });
      setAccessToken("bypassed");
      setLoading(false);
      return;
    }

    // Intentar obtener el usuario al cargar
    (async () => {
      console.log('[AuthContext] Initializing...');
      await fetchMe();
      setLoading(false);
    })();
    // fetchMe ya está memoizado con useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

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

    // Token se guarda en cookies automáticamente por el backend (más seguro)
    if (data.access_token) {
      setAccessToken(data.access_token);
      console.log('[AuthContext] Token available via cookies from backend');
    }
    if (data.user) {
      setUser(data.user);
      console.log('[AuthContext] User set from verify response:', data.user);
    }

    // Esperar un poco para que las cookies se propaguen antes de llamar fetchMe
    // Esto es necesario porque las cookies pueden no estar disponibles inmediatamente
    await new Promise(resolve => setTimeout(resolve, 200));

    // Actualizar estado completo con fetchMe
    try {
      const fetchMeSuccess = await fetchMe();
      if (fetchMeSuccess) {
        console.log('[AuthContext] fetchMe successful after verify');
      } else {
        console.warn('[AuthContext] fetchMe failed after verify, but user data is available');
        // Si fetchMe falla pero tenemos datos del usuario de la respuesta, mantenerlos
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error in fetchMe after verify:', error);
      // Si fetchMe falla pero tenemos datos del usuario de la respuesta, mantenerlos
      if (data.user) {
        setUser(data.user);
      }
    }

    return data;
  };

  const logout = async () => {
    try {
      await apiRequest(`${API}/auth/logout`, {
        method: "POST",
      });
    } finally {
      setUser(null);
      setAccessToken(null);
      console.log('[AuthContext] User logged out, cookies cleared by backend');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, requestOtp, verifyOtp, refreshToken, logout, fetchMe, isTokenExpiringSoon }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
