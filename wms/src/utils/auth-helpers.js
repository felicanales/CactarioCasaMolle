/**
 * Obtiene el access token con prioridad:
 * 1. Estado del AuthContext (más reciente)
 * 2. Cookie sb-access-token si es legible en desarrollo
 *
 * En produccion la cookie es HttpOnly, por lo que los fetch deben usar
 * credentials: "include" aunque esta funcion retorne null.
 *
 * @param {string|null} accessTokenFromContext - Token del estado de AuthContext
 * @returns {string|null}
 */
export const getAccessTokenFromContext = (accessTokenFromContext) => {
  if (accessTokenFromContext) return accessTokenFromContext;

  if (typeof window === "undefined") return null;

  try {
    const match = document.cookie.match(new RegExp("(^| )sb-access-token=([^;]+)"));
    if (match && match[2]) return match[2];

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "sb-access-token" && value) return value;
    }
  } catch {}

  return null;
};
