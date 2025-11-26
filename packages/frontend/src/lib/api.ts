import axios from 'axios';

// Get API URL from environment variable or default to localhost backend
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Axios instance for API requests
 *
 * HIPAA Security: Uses httpOnly cookies for authentication
 * - withCredentials: true enables cookie-based auth (httpOnly cookies)
 * - EHR routes use httpOnly cookies (set by backend, not accessible via JS)
 * - Portal routes still use Bearer tokens in localStorage (separate auth system)
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // CRITICAL: Enable credentials to send/receive httpOnly cookies
  withCredentials: true,
});

/**
 * Request interceptor
 *
 * HIPAA Security: EHR routes use httpOnly cookies (automatically sent by browser)
 * Portal routes still use Bearer tokens in Authorization header
 */
api.interceptors.request.use(
  (config) => {
    // Check if this is a portal route (separate auth system using localStorage)
    const isPortalRoute = config.url?.includes('/portal/') ||
                          config.url?.includes('/portal-') ||
                          config.url?.includes('/tracking/') ||
                          config.url?.includes('/self-schedule/') ||
                          config.url?.includes('/waitlist/');

    // Only add Authorization header for portal routes
    // EHR routes use httpOnly cookies (sent automatically with withCredentials: true)
    if (isPortalRoute) {
      const portalToken = localStorage.getItem('portalToken');
      if (portalToken) {
        config.headers.Authorization = `Bearer ${portalToken}`;
      }
    }
    // Note: EHR auth tokens are in httpOnly cookies, sent automatically by browser

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle token refresh and errors
 *
 * HIPAA Security: Token refresh uses httpOnly cookies (automatic with withCredentials)
 * No tokens are stored in or read from localStorage for EHR routes
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if this is a portal request or EHR request
      const isPortalRoute = originalRequest.url?.includes('/portal/') ||
                            originalRequest.url?.includes('/portal-') ||
                            originalRequest.url?.includes('/tracking/') ||
                            originalRequest.url?.includes('/self-schedule/') ||
                            originalRequest.url?.includes('/waitlist/');

      try {
        if (isPortalRoute) {
          // Portal routes: redirect to portal login (no refresh token mechanism yet)
          localStorage.removeItem('portalToken');
          localStorage.removeItem('portalClient');
          localStorage.removeItem('portalAccount');
          window.location.href = '/portal/login';
          return Promise.reject(error);
        } else {
          // EHR routes: try to refresh token using httpOnly cookies
          // The refresh token is in an httpOnly cookie, sent automatically
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            {}, // Empty body - refresh token is in httpOnly cookie
            { withCredentials: true } // Ensure cookies are sent
          );

          // If refresh succeeded, new tokens are set as httpOnly cookies by backend
          // Simply retry the original request - browser will send new cookies
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear user data and redirect to login
        // Note: httpOnly cookies are cleared server-side on logout
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
