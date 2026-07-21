const IS_PRODUCTION_BUILD = process.env.NODE_ENV === "production";

// Estos flags son exclusivamente locales. Un build de producción nunca debe
// desactivar la autenticación ni mostrar información interna de la sesión.
export const AUTH_BYPASS_ENABLED =
  !IS_PRODUCTION_BUILD && process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export const AUTH_DEBUG_ENABLED =
  !IS_PRODUCTION_BUILD && process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
