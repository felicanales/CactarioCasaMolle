"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getApiUrl } from "../../utils/api-config";

const AuthContext = createContext(null);

// BYPASS AUTH EN DESARROLLO LOCAL - REMOVER EN PRODUCCIÓN
// Por defecto está DESACTIVADO (requiere autenticación)
// Para activar en desarrollo: setear NEXT_PUBLIC_BYPASS_AUTH=true
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
const AUTH_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";

// Usar configuración centralizada de API URL
const API = getApiUrl();
const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

const getStoredAccessToken = () => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
  }
};

const parseJwtPayload = (token) => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const getTokenExpirationMs = (token) => {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return null;
  return payload.exp * 1000;
};

const isTokenExpired = (token, skewMs = 0) => {
  const exp = getTokenExpirationMs(token);
  if (!exp) return false;
  return Date.now() >= (exp - skewMs);
};

const getTokenSource = () => {
  const storedToken = getStoredAccessToken();
  if (storedToken) return "localStorage";

  try {
    if (document.cookie && document.cookie.includes("sb-access-token=")) {
      return "cookie";
    }
  } catch {
  }

  return "none";
};

const formatClockTime = (isoString) => {
  if (!isoString) return "n/a";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleTimeString("es-CL", { hour12: false });
};

const AuthDebugPanel = ({ user, accessToken, debugState, refreshInFlight, tick }) => {
  if (!AUTH_DEBUG) return null;
  const token = getAccessToken();
  const expMs = getTokenExpirationMs(token);
  const timeLeftSec = expMs ? Math.max(0, Math.floor((expMs - Date.now()) / 1000)) : null;
  const source = getTokenSource();

  return (
    <div style={{
      position: "fixed",
      right: "12px",
      bottom: "12px",
      backgroundColor: "rgba(17, 24, 39, 0.9)",
      color: "#f9fafb",
      padding: "10px 12px",
      borderRadius: "8px",
      fontSize: "12px",
      lineHeight: "1.4",
      zIndex: 9999,
      minWidth: "220px",
      maxWidth: "320px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace"
    }}>
      <div style={{ fontWeight: "600", marginBottom: "6px" }}>Auth Debug</div>
      <div>tick: {tick}</div>
      <div>user: {user?.email || "none"}</div>
      <div>token: {token ? "present" : "none"}</div>
      <div>state token: {accessToken ? "yes" : "no"}</div>
      <div>source: {source}</div>
      <div>exp in: {timeLeftSec !== null ? `${timeLeftSec}s` : "n/a"}</div>
      <div>refreshing: {refreshInFlight ? "yes" : "no"}</div>
      <div>last refresh: {formatClockTime(debugState.lastRefreshAt)}</div>
      <div>refresh ok: {debugState.lastRefreshOk === null ? "n/a" : (debugState.lastRefreshOk ? "yes" : "no")}</div>
      <div>auth check: {formatClockTime(debugState.lastAuthCheckAt)}</div>
      {debugState.lastRefreshError ? (
        <div style={{ color: "#fca5a5", marginTop: "4px" }}>
          error: {debugState.lastRefreshError}
        </div>
      ) : null}
    </div>
  );
};

// Helper para obtener el access token de cookies (cross-domain compatible)
const getAccessToken = () => {
  if (typeof window === 'undefined') return null;

  const storedToken = getStoredAccessToken();
  if (storedToken) {
    return storedToken;
  }

  // Intentar leer cookies de diferentes formas para cross-domain
  try {
    // Método 1: Regex estándar
    let match = document.cookie.match(new RegExp('(^| )sb-access-token=([^;]+)'));
    if (match && match[2]) {
      return match[2];
    }
    
    // Método 2: Buscar en todas las cookies (para cross-domain)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sb-access-token' && value) {
        return value;
      }
    }
  } catch {
  }

  return null;
};

// Helper para hacer requests con Authorization
// Se define dentro del componente para tener acceso al estado accessToken

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, email } o null
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const refreshInFlightRef = useRef(null);
  const [debugState, setDebugState] = useState({
    lastRefreshAt: null,
    lastRefreshOk: null,
    lastRefreshError: null,
    lastAuthCheckAt: null,
  });
  const [debugTick, setDebugTick] = useState(0);

  const runRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      try {
        if (AUTH_DEBUG) {
          setDebugState(prev => ({
            ...prev,
            lastRefreshAt: new Date().toISOString(),
            lastRefreshError: null,
          }));
        }
        const res = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Token refresh failed");
        }

        const data = await res.json();
        if (data && data.access_token) {
          setAccessToken(data.access_token);
          setStoredAccessToken(data.access_token);
        }

        if (AUTH_DEBUG) {
          setDebugState(prev => ({
            ...prev,
            lastRefreshOk: true,
          }));
        }
        return true;
      } catch (error) {
        // If refresh fails, clear state and force re-login
        const token = getAccessToken();
        if (!token || isTokenExpired(token)) {
          setUser(null);
          setAccessToken(null);
          setStoredAccessToken(null);
        }
        if (AUTH_DEBUG) {
          setDebugState(prev => ({
            ...prev,
            lastRefreshOk: false,
            lastRefreshError: error?.message || "Token refresh failed",
          }));
        }
        return false;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [API, refreshInFlightRef, setUser, setAccessToken]);

  // Crear apiRequest que siempre use el token actual del estado
  // Usar useCallback para que se actualice cuando accessToken cambie
  const apiRequest = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (!headers.Authorization && !headers.authorization) {
      // Prioridad 1: Token del estado (mas reciente)
      // Prioridad 2: Token almacenado
      const token = accessToken || getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const shouldSkipRefresh =
      typeof url === "string" &&
      (url.includes("/auth/request-otp") ||
        url.includes("/auth/verify-otp") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/logout"));

    if (!shouldSkipRefresh) {
      const token = getAccessToken();
      const exp = getTokenExpirationMs(token);
      if (token && exp && (exp - Date.now()) < TOKEN_REFRESH_WINDOW_MS) {
        await runRefresh();
      }
    }

    const doFetch = (fetchHeaders) => fetch(url, {
      ...options,
      headers: fetchHeaders,
      credentials: 'include', // Always include cookies
    });

    let response = await doFetch(headers);

    let canRetry = true;
    if (options.body) {
      if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
        canRetry = false;
      }
      if (typeof ReadableStream !== 'undefined' && options.body instanceof ReadableStream) {
        canRetry = false;
      }
    }

    if (!shouldSkipRefresh && response.status === 401 && canRetry) {
      const refreshed = await runRefresh();
      if (refreshed) {
        const retryHeaders = {
          'Content-Type': 'application/json',
          ...options.headers,
        };
        if (!retryHeaders.Authorization && !retryHeaders.authorization) {
          const retryToken = getAccessToken();
          if (retryToken) {
            retryHeaders['Authorization'] = `Bearer ${retryToken}`;
          }
        }
        response = await doFetch(retryHeaders);
      } else {
        setUser(null);
        setAccessToken(null);
        setStoredAccessToken(null);
      }
    }

    return response;
  }, [accessToken, runRefresh]);

  // Función para verificar si el token está expirando pronto
  const isTokenExpiringSoon = () => {
    try {
      const token = getAccessToken();
      if (!token) return true;
      const exp = getTokenExpirationMs(token);
      if (!exp) return true;

      return (exp - Date.now()) < TOKEN_REFRESH_WINDOW_MS;
    } catch (error) {
      console.error('[AuthContext] Error checking token expiration:', error);
      return true; // En caso de error, asumir que expiró
    }
  };

  const refreshToken = async () => {
    const refreshed = await runRefresh();
    if (!refreshed) {
      throw new Error("Token refresh failed");
    }
    return { refreshed };
  };

  const fetchMe = useCallback(async (tokenOverride = null) => {
    try {
      if (AUTH_DEBUG) {
        setDebugState(prev => ({
          ...prev,
          lastAuthCheckAt: new Date().toISOString(),
        }));
      }
      const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined;
      const res = await apiRequest(`${API}/auth/me`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        setUser(null);
        setAccessToken(null);
        setStoredAccessToken(null);
        return false;
      }

      const data = await res.json();

      // Check if user is authenticated
      if (data.authenticated === false) {
        setUser(null);
        setAccessToken(null);
        setStoredAccessToken(null);
        return false;
      } else {
        setUser(data);
        // Token se maneja solo a través de cookies (más seguro)
        if (data.access_token) {
          setAccessToken(data.access_token);
          setStoredAccessToken(data.access_token);
        }
        return true;
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user:', error);
      setUser(null);
      setAccessToken(null);
      setStoredAccessToken(null);
      return false;
    }
  }, [apiRequest]);

  useEffect(() => {
    if (BYPASS_AUTH) return;

    const storedToken = getStoredAccessToken();
    if (storedToken && isTokenExpired(storedToken)) {
      setStoredAccessToken(null);
    } else if (storedToken && !accessToken) {
      setAccessToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!AUTH_DEBUG) return;
    const tickId = setInterval(() => {
      setDebugTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(tickId);
  }, []);

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
      await fetchMe();
      setLoading(false);
    })();
    // fetchMe ya está memoizado con useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    if (BYPASS_AUTH) return;

    const intervalId = setInterval(async () => {
      const token = getAccessToken();
      if (!token) return;

      if (isTokenExpired(token, 60 * 1000)) {
        await runRefresh();
        return;
      }

      const exp = getTokenExpirationMs(token);
      if (exp && (exp - Date.now()) < TOKEN_REFRESH_WINDOW_MS) {
        await runRefresh();
      }
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [runRefresh]);

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

  const getFriendlyOtpError = (rawMessage) => {
    const fallback = "El codigo ingresado es invalido o expiro. Solicita uno nuevo.";
    if (!rawMessage || typeof rawMessage !== "string") {
      return fallback;
    }

    let detail = rawMessage;
    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed && typeof parsed.detail === "string") {
        detail = parsed.detail;
      }
    } catch {
      // Mantener el mensaje original si no es JSON
    }

    const normalized = detail.toLowerCase();
    const isOtpError = normalized.includes("otp") || normalized.includes("codigo");
    const isExpiredOrInvalid = normalized.includes("expired") || normalized.includes("expir") || normalized.includes("invalid");

    if (normalized.includes("error verificando otp") || (isOtpError && isExpiredOrInvalid) || normalized.includes("token has expired") || (normalized.includes("token") && normalized.includes("invalid"))) {
      return fallback;
    }

    return detail;
  };

  const verifyOtp = async (email, code) => {
    const res = await apiRequest(`${API}/auth/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(getFriendlyOtpError(msg));
    }
    const data = await res.json();

    // Token se guarda en cookies autom?ticamente por el backend (m?s seguro)
    if (data.access_token) {
      setAccessToken(data.access_token);
      setStoredAccessToken(data.access_token);
    }
    if (data.user) {
      setUser(data.user);
    }

    // Esperar un poco para que las cookies se propaguen antes de llamar fetchMe
    // Esto es necesario porque las cookies pueden no estar disponibles inmediatamente
    await new Promise(resolve => setTimeout(resolve, 200));

    // Actualizar estado completo con fetchMe
    try {
      const fetchMeSuccess = await fetchMe(data.access_token || null);
      if (!fetchMeSuccess && data.user) {
        // Si fetchMe falla pero tenemos datos del usuario de la respuesta, mantenerlos
        setUser(data.user);
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
      setStoredAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, apiRequest, requestOtp, verifyOtp, refreshToken, logout, fetchMe, isTokenExpiringSoon }}>
      {children}
      <AuthDebugPanel
        user={user}
        accessToken={accessToken}
        debugState={debugState}
        refreshInFlight={Boolean(refreshInFlightRef.current)}
        tick={debugTick}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
