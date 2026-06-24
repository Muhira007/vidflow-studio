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

export default api;
