import axios from 'axios';

// Gunakan relative URL — works for both local dev (vite proxy) dan production (nginx reverse proxy)
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
