import axios from 'axios';

// En Next.js, las variables de entorno NEXT_PUBLIC_* están disponibles en el cliente
// La variable se lee en tiempo de build, así que necesitamos asegurarnos de que esté disponible
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';
const LOGS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true';

// Log para debugging (solo cuando esta habilitado)
if (typeof window !== 'undefined' && LOGS_ENABLED) {
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NO DEFINIDA - usando Railway por defecto');
  console.log('[API Config] URL final:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos de timeout (aumentado desde 10s)
});

// Interceptor para logging (solo cuando esta habilitado)
if (typeof window !== 'undefined' && LOGS_ENABLED) {
  api.interceptors.request.use(
    (config) => {
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
      if (config.params) {
        console.log('[API Request] Params:', config.params);
      }
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
      return response;
    },
    (error) => {
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        timeout: error.code === 'ECONNABORTED',
      };
      
      console.error('[API Response Error]', errorDetails);
      
      // Log más detallado para timeouts
      if (error.code === 'ECONNABORTED') {
        console.error('[API Timeout] La solicitud expiró después de 30 segundos');
        console.error('[API Timeout] URL completa:', `${error.config?.baseURL}${error.config?.url}`);
        console.error('[API Timeout] Verifica que el backend esté disponible y respondiendo');
      }
      
      return Promise.reject(error);
    }
  );
}

// Helper para reintentos con backoff exponencial
const retryRequest = async (requestFn, maxRetries = 2, delay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      // No reintentar en el último intento
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Solo reintentar en casos de timeout o errores de red
      if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || !error.response) {
        const waitTime = delay * Math.pow(2, attempt);
        console.log(`[API Retry] Intento ${attempt + 1} falló, reintentando en ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // No reintentar para errores HTTP (4xx, 5xx)
        throw error;
      }
    }
  }
};

// Endpoints públicos con reintentos automáticos
export const sectorsApi = {
  list: () => retryRequest(() => api.get('/sectors/public')),
  getByQr: (qrCode) => retryRequest(() => api.get(`/sectors/public/${qrCode}`)),
  getSpeciesByQr: (qrCode) => retryRequest(() => api.get(`/sectors/public/${qrCode}/species`)),
};

export const speciesApi = {
  list: (params = {}) => retryRequest(() => api.get('/species/public', { params })),
  getBySlug: (slug) => retryRequest(() => api.get(`/species/public/${slug}`)),
};

export default api;

