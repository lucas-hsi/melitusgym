import axios, { AxiosInstance } from 'axios';

// Determinar baseURL da API a partir do ambiente
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Bloquear uso de localhost em produção para evitar apontamento incorreto
if (
  process.env.NODE_ENV === 'production' &&
  (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1'))
) {
  throw new Error(
    'NEXT_PUBLIC_API_URL inválida em produção. Configure para o backend real, ex.: https://melitusgym-production.up.railway.app/api'
  );
}

// Criar instância do axios com configuração personalizada
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 segundos
});

// Configuração global do axios
export const setupAxiosInterceptors = (
  instance: AxiosInstance = axiosInstance,
  options?: { redirectOn401?: boolean }
) => {
  const redirectOn401 = options?.redirectOn401 ?? true;
  // Interceptor para adicionar token automaticamente
  instance.interceptors.request.use(
    (config) => {
      // Evitar acesso ao localStorage durante SSR
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor para tratar erros de autenticação
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem('token');
        localStorage.removeItem('auth_user');
        
        // Redirecionar para login apenas se não estivermos já na página de login
        if (redirectOn401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
};

// Inicializar interceptors
setupAxiosInterceptors(axiosInstance, { redirectOn401: true });

export default axiosInstance;