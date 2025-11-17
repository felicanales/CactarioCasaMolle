/**
 * Centralized API URL configuration
 * This utility provides a single source of truth for API endpoints
 * across the entire frontend application.
 */

/**
 * Get the API base URL based on environment and context
 * @returns {string} The API base URL
 */
export const getApiUrl = () => {
    // Prioridad 1: Variable de entorno (más confiable para producción)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // Prioridad 2: Detectar si estamos en un dominio público (Railway, ngrok, etc.)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // Si estamos en un dominio Railway, intentar detectar el backend
        if (hostname.includes('railway.app')) {
            // Si frontend y backend están en el mismo proyecto Railway,
            // podrían estar en el mismo dominio con diferentes puertos
            // Por ahora, usar variable de entorno o fallback
            // En Railway, cada servicio tiene su propio dominio
            // El backend debería estar configurado en NEXT_PUBLIC_API_URL
            console.warn('[api-config] Railway domain detected but NEXT_PUBLIC_API_URL not set. Using fallback.');
            // Fallback: asumir que el backend está en un servicio separado
            // Esto debería ser configurado en Railway como variable de entorno
            return `https://cactariocasamolle-production.up.railway.app`;
        }

        // Si estamos en un dominio ngrok, usar backend de producción
        if (hostname.includes('ngrok.io') ||
            hostname.includes('ngrok-free.app') ||
            hostname.includes('ngrok-free.dev') ||
            hostname.includes('ngrokapp.com') ||
            hostname.includes('ngrok')) {
            return "https://cactariocasamolle-production.up.railway.app";
        }

        // Si estamos en HTTPS (producción), usar backend de producción
        if (protocol === 'https:') {
            // Excepto si es localhost con HTTPS (raro pero posible en desarrollo)
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return "http://localhost:8000";
            }
            return "https://cactariocasamolle-production.up.railway.app";
        }

        // Si estamos en HTTP pero en una IP local (192.168.x.x, 10.x.x.x, 172.x.x.x)
        // Esto cubre el caso de acceder desde celular en la misma red local
        if (protocol === 'http:') {
            if (hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')) {
                // IP local desde móvil o red local - usar producción
                return "https://cactariocasamolle-production.up.railway.app";
            }
        }
    }

    // Prioridad 3: Desarrollo local (solo funciona en la misma máquina con localhost)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'http:') {
            return "http://localhost:8000";
        }
    }

    // Fallback: error en producción si no está configurado
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        console.error('[api-config] ERROR: NEXT_PUBLIC_API_URL must be set in production');
        throw new Error('NEXT_PUBLIC_API_URL must be set in production');
    }

    // Fallback seguro para desarrollo
    return "http://localhost:8000";
};

/**
 * Get the API URL (cached version for use in components)
 * This is computed once and can be imported directly
 */
export const API_URL = getApiUrl();

// Log API URL for debugging (solo en desarrollo)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[api-config] Using API URL:', API_URL);
}

