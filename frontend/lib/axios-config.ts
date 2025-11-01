import axios, { AxiosInstance } from 'axios';

// Criar instância do axios com configuração personalizada
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
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