import axios from 'axios';
import { storage } from '../utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Guard to prevent multiple simultaneous 401 redirects
let isRedirectingToLogin = false;

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle actual 401 responses from the server (not network errors)
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page or already redirecting
      const currentPath = window.location.pathname;
      if (!isRedirectingToLogin && currentPath !== '/login') {
        isRedirectingToLogin = true;
        storage.clearAll();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;