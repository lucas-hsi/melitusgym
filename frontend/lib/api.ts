import axios from "axios";

// Usar variável de ambiente para baseURL, com fallback local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Flag para evitar múltiplas tentativas de refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    // Evitar acesso ao localStorage no SSR
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("token");
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

// Interceptor para tratar erros e auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Tratar erro 401 (token expirado)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tentar renovar o token
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
          const { access_token } = response.data;
          
          localStorage.setItem("token", access_token);
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          processQueue(null, access_token);
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("auth_user");
          window.location.href = "/login";
        }
      } finally {
        isRefreshing = false;
      }
    }

    // Tratar erro 429 (rate limiting) com backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 1;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // Health data endpoints
  getHealthProfile: () => api.get('/health/profile'),
  
  updateHealthProfile: (data: any) => api.put('/health/profile', data),
  
  getHealthMetrics: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return api.get(`/health/metrics${params}`);
  },
  
  createHealthLog: (data: {
    type: string
    value: any
    notes?: string
  }) => api.post('/health/logs', data),

  // Clinical endpoints
  getClinicalLogs: (params?: {
    measurement_type?: string;
    period?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return api.get(`/clinical/logs?${queryParams.toString()}`);
  },

  createClinicalLog: (data: {
    measurement_type: string;
    value: number;
    secondary_value?: number;
    unit: string;
    period?: string;
    notes?: string;
    measured_at?: string;
  }) => api.post('/clinical/logs', data),

  updateClinicalLog: (id: number, data: any) => api.put(`/clinical/logs/${id}`, data),

  deleteClinicalLog: (id: number) => api.delete(`/clinical/logs/${id}`),

  getClinicalStats: (days?: number) => {
    const params = days ? `?days=${days}` : '';
    return api.get(`/clinical/stats${params}`);
  },

  // Glucose specific endpoints
  getGlucoseReadings: (params?: {
    date_from?: string;
    date_to?: string;
    period?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return api.get(`/clinical/glucose?${queryParams.toString()}`);
  },

  createGlucoseReading: (data: {
    value: number;
    period: string;
    notes?: string;
    measured_at?: string;
  }) => api.post('/clinical/glucose', data),

  getLatestGlucose: () => api.get('/clinical/glucose/latest'),

  getGlucoseTrend: (days?: number) => {
    const params = days ? `?days=${days}` : '';
    return api.get(`/clinical/glucose/trend${params}`);
  },

  // Blood pressure specific endpoints
  getBloodPressureReadings: (params?: {
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return api.get(`/clinical/blood-pressure?${queryParams.toString()}`);
  },

  createBloodPressureReading: (data: {
    systolic: number;
    diastolic: number;
    heart_rate?: number;
    notes?: string;
    measured_at?: string;
  }) => api.post('/clinical/blood-pressure', data),

  // Insulin specific endpoints
  getInsulinReadings: (params?: {
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return api.get(`/clinical/insulin?${queryParams.toString()}`);
  },

  createInsulinReading: (data: {
    units: number;
    insulin_type?: string;
    injection_site?: string;
    notes?: string;
    measured_at?: string;
  }) => api.post('/clinical/insulin', data),

  // Nutrition endpoints
  getNutritionData: () => api.get('/nutrition/foods'),

  analyzeFood: (imageData: FormData) => api.post('/nutrition/analyze', imageData),

  // Unified nutrition search (Nutrition V2)
  searchNutritionUnified: (term: string, pageSize: number = 20) => {
    const params = new URLSearchParams({ term, page_size: pageSize.toString() });
    return api.get(`/nutrition/v2/search?${params.toString()}`);
  },
  
  // Workout endpoints
  getWorkouts: () => api.get('/workouts'),
  
  createWorkout: (data: any) => api.post('/workouts', data)
};

// Funções de conveniência
export const getHealthProfile = () => apiService.getHealthProfile().then(res => res.data);
export const getHealthMetrics = (date?: string) => apiService.getHealthMetrics(date).then(res => res.data);

export default api;
export { api };