import axios from 'axios';

// 127.0.0.1 rather than localhost: uvicorn listens on IPv4 only, and on
// Windows "localhost" tries IPv6 first, adding a delay to every request.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// Turns a backend-relative path (e.g. an avatar_url) into a full URL.
export const assetUrl = (path) => (path ? `${API_BASE_URL}${path}` : null);

// Base Axios instance configured for future FastAPI backend integration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for attaching auth tokens once JWT backend is connected
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('talentiq_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Future hook: clear token & redirect on expiration
      console.warn('Unauthorized request - session expired');
    }
    return Promise.reject(error);
  }
);

export default api;
