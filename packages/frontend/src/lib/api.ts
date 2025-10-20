import axios from 'axios';

// Get API URL from environment variable or default to localhost backend
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Use portal token for portal routes (/portal/ or /portal-auth), regular token for EHR routes
    const isPortalRoute = config.url?.includes('/portal/') || config.url?.includes('/portal-');
    const token = isPortalRoute
      ? localStorage.getItem('portalToken')
      : localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // DEBUG: Log the exact URL being called
    console.log('🌐 API REQUEST:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      isPortalRoute,
      hasToken: !!token
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if this is a portal request or EHR request
      const isPortalRoute = originalRequest.url?.includes('/portal/') || originalRequest.url?.includes('/portal-');

      try {
        if (isPortalRoute) {
          // Portal routes: redirect to portal login (no refresh token mechanism yet)
          localStorage.removeItem('portalToken');
          localStorage.removeItem('portalClient');
          localStorage.removeItem('portalAccount');
          window.location.href = '/portal/login';
          return Promise.reject(error);
        } else {
          // EHR routes: try to refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

          // Update stored tokens
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { api, API_URL };
