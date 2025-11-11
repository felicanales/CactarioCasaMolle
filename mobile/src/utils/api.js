import axios from 'axios';

// En Next.js, las variables de entorno NEXT_PUBLIC_* están disponibles en el cliente
// La variable se lee en tiempo de build, así que necesitamos asegurarnos de que esté disponible
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';

// Log para debugging
if (typeof window !== 'undefined') {
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NO DEFINIDA - usando Railway por defecto');
  console.log('[API Config] URL final:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para logging en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API] Error en request:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log(`[API] Response:`, response.data);
      return response;
    },
    (error) => {
      console.error('[API] Error en response:', error.response?.data || error.message);
      return Promise.reject(error);
    }
  );
}

// Endpoints públicos
export const sectorsApi = {
  list: () => api.get('/sectors/public'),
  getByQr: (qrCode) => api.get(`/sectors/public/${qrCode}`),
  getSpeciesByQr: (qrCode) => api.get(`/sectors/public/${qrCode}/species`),
};

export const speciesApi = {
  list: (params = {}) => api.get('/species/public', { params }),
  getBySlug: (slug) => api.get(`/species/public/${slug}`),
};

export default api;

