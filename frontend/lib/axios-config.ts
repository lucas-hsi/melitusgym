import axios from 'axios';

// Configuração global do axios
const setupAxiosInterceptors = () => {
  // Configurar baseURL padrão
  axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
  
  // Interceptor para adicionar token automaticamente
  axios.interceptors.request.use(
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
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem('token');
        localStorage.removeItem('auth_user');
        
        // Redirecionar para login apenas se não estivermos já na página de login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;