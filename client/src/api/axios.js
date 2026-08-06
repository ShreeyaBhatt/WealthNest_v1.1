/**
 * src/api/axios.js — Axios HTTP Client Configuration
 *
 * WHY a centralized Axios instance?
 * Instead of importing axios and setting the baseURL in every component,
 * we create ONE configured instance. This means:
 * - Change the API URL in one place
 * - Add auth headers automatically (interceptors)
 * - Handle token refresh in one place
 * - Consistent error handling
 *
 * This is the standard pattern in production React apps.
 */

import axios from 'axios';
import toast from 'react-hot-toast';

// ─── Base URL ─────────────────────────────────────────────────
// In development: Vite proxy forwards /api → localhost:5000
// In production:  VITE_API_URL from .env is used
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Create Axios Instance ────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,  // 30 second timeout
});

// ─── Request Interceptor ─────────────────────────────────────
// Runs BEFORE every request is sent
// Use this to attach the JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    // Read the token from localStorage
    const token = localStorage.getItem('accessToken');

    if (token) {
      // Attach as "Bearer" token in the Authorization header
      // The Node.js backend will read this header to verify identity
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;  // Must return config to proceed with the request
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────
// Runs AFTER every response is received
// Use this to handle token expiry and global errors
api.interceptors.response.use(
  // Success handler — just return the response data
  (response) => response,

  // Error handler — runs when status code is 4xx or 5xx
  async (error) => {
    const originalRequest = error.config;

    // ── Handle 401 Unauthorized (Token Expired) ──
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;  // Prevent infinite retry loop

      try {
        // Try to get a new access token using the refresh token
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed — log the user out
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // ── Handle 403 Forbidden ──
    // This one stays global: "you don't have permission" can happen on
    // background/silent requests that have no catch block of their own
    // (e.g. a sidebar count fetch), so nothing else would ever surface it.
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    }

    // 500s and network errors (no response at all) are intentionally NOT
    // toasted here anymore — every page's own catch block already shows
    // toast.error(err.response?.data?.message || '<page-specific fallback>'),
    // and err.response is undefined for both cases, so that fallback text
    // already covers them. Toasting here too just meant every failed
    // request showed two stacked, redundant toasts (e.g. Register showed
    // "Registration failed" AND "Network error..." at once).

    return Promise.reject(error);
  }
);

export default api;
