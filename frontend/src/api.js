import axios from 'axios';

// Gunakan relative URL — works for both local dev (vite proxy) dan production (nginx reverse proxy)
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: auto-attach JWT token dari localStorage ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vidflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: handle 401 — redirect ke login kalau token expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // JANGAN reload kalau ini request login (401 = password salah)
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        const token = localStorage.getItem('vidflow_token');
        if (token) {
          localStorage.removeItem('vidflow_token');
          localStorage.removeItem('vidflow_user');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
