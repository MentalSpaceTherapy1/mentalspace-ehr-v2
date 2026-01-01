import axios from 'axios';

// Get API URL from environment variable or default to localhost backend
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * CSRF Token Management
 *
 * The backend uses Double Submit Cookie pattern for CSRF protection.
 * We need to fetch the token from /csrf-token endpoint and include it
 * in all state-changing requests (POST, PUT, PATCH, DELETE).
 */
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetch CSRF token from backend
 * Uses a singleton promise to prevent multiple concurrent fetches
 */
async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = axios.get(`${API_URL}/csrf-token`, { withCredentials: true })
    .then(response => {
      csrfToken = response.data.csrfToken;
      console.log('[API] CSRF token fetched successfully');
      return csrfToken!;
    })
    .catch(error => {
      console.warn('[API] Failed to fetch CSRF token:', error.message);
      csrfTokenPromise = null;
      throw error;
    });

  return csrfTokenPromise;
}

/**
 * Clear CSRF token (call on logout or when token becomes invalid)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenPromise = null;
}

/**
 * Ensure CSRF token is available (call on app init or after login)
 */
export async function ensureCsrfToken(): Promise<void> {
  try {
    await fetchCsrfToken();
  } catch (error) {
    // Token fetch failed - will retry on next request
    console.warn('[API] Could not pre-fetch CSRF token');
  }
}

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
 * CSRF tokens are added to all state-changing requests
 */
api.interceptors.request.use(
  async (config) => {
    // Check if this is a portal route (separate auth system using localStorage)
    // Note: Only specific waitlist endpoints are for portal clients (my-entries, my-offers, accept, decline)
    // IMPORTANT: /tracking/* routes with :clientId path params are for clinicians (EHR), NOT portal clients
    const isTrackingRoute = config.url?.includes('/tracking/');
    // Clinician tracking routes - ALL routes that use path params for clientId
    // These routes follow pattern: /tracking/{resource}/{clientId}/...
    const isClinicianTrackingRoute = config.url?.includes('/tracking/analytics/') ||
                                      config.url?.includes('/tracking/symptoms/') ||
                                      config.url?.includes('/tracking/sleep/') ||
                                      config.url?.includes('/tracking/exercise/') ||
                                      config.url?.includes('/tracking/reminders/') ||
                                      config.url?.includes('/tracking/export/') ||
                                      config.url?.includes('/tracking/notes') ||
                                      config.url?.includes('/tracking/report');
    const isPortalRoute = config.url?.includes('/portal/') ||
                          config.url?.includes('/portal-') ||
                          (isTrackingRoute && !isClinicianTrackingRoute) ||
                          config.url?.includes('/self-schedule/') ||
                          config.url?.includes('/waitlist/my-entries') ||
                          config.url?.includes('/waitlist/my-offers') ||
                          config.url?.match(/\/waitlist\/[^/]+\/accept/) ||
                          config.url?.match(/\/waitlist\/[^/]+\/decline/);

    // DEBUG: Log route classification
    console.log('[API DEBUG]', {
      url: config.url,
      isTrackingRoute,
      isClinicianTrackingRoute,
      isPortalRoute,
      method: config.method,
    });

    // Only add Authorization header for portal routes
    // EHR routes use httpOnly cookies (sent automatically with withCredentials: true)
    if (isPortalRoute) {
      const portalToken = localStorage.getItem('portalToken');
      console.log('[API DEBUG] Portal route - using portalToken:', !!portalToken);
      if (portalToken) {
        config.headers.Authorization = `Bearer ${portalToken}`;
      }
    }
    // Note: EHR auth tokens are in httpOnly cookies, sent automatically by browser

    // Add CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Skip CSRF for auth endpoints (they don't require it - backend bypasses CSRF for these)
      const isAuthEndpoint = config.url?.includes('/auth/login') ||
                             config.url?.includes('/auth/register') ||
                             config.url?.includes('/auth/refresh') ||
                             config.url?.includes('/auth/forgot-password') ||
                             config.url?.includes('/auth/reset-password') ||
                             config.url?.includes('/auth/verify-email') ||
                             config.url?.includes('/auth/resend-verification') ||
                             config.url?.includes('/auth/mfa/complete');

      if (!isAuthEndpoint && !isPortalRoute) {
        try {
          const token = await fetchCsrfToken();
          if (token) {
            config.headers['x-csrf-token'] = token;
          }
        } catch (error) {
          console.warn('[API] Could not get CSRF token for request');
        }
      }
    }

    // CRITICAL: Explicitly ensure withCredentials is set to send httpOnly cookies
    // This is needed because async interceptors can sometimes lose instance defaults
    config.withCredentials = true;

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

    // Handle CSRF token errors (403 with specific message)
    if (error.response?.status === 403 &&
        error.response?.data?.error?.includes('CSRF') &&
        !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;

      // Clear the cached CSRF token and fetch a new one
      console.log('[API] CSRF token invalid, refreshing...');
      clearCsrfToken();

      try {
        await fetchCsrfToken();
        // Retry the original request with new token
        // Ensure withCredentials is set on the retry request
        originalRequest.withCredentials = true;
        return api(originalRequest);
      } catch (csrfError) {
        console.error('[API] Failed to refresh CSRF token:', csrfError);
        return Promise.reject(error);
      }
    }

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('[API DEBUG] 401 received for:', originalRequest.url);

      // Also clear CSRF token on auth refresh (new session = new CSRF token)
      clearCsrfToken();

      // Check if this is a portal request or EHR request
      // Note: Only specific waitlist endpoints are for portal clients
      // IMPORTANT: /tracking/* routes with :clientId path params are for clinicians (EHR), NOT portal clients
      const isTrackingRoute = originalRequest.url?.includes('/tracking/');
      // Clinician tracking routes - ALL routes that use path params for clientId
      // These routes follow pattern: /tracking/{resource}/{clientId}/...
      const isClinicianTrackingRoute = originalRequest.url?.includes('/tracking/analytics/') ||
                                        originalRequest.url?.includes('/tracking/symptoms/') ||
                                        originalRequest.url?.includes('/tracking/sleep/') ||
                                        originalRequest.url?.includes('/tracking/exercise/') ||
                                        originalRequest.url?.includes('/tracking/reminders/') ||
                                        originalRequest.url?.includes('/tracking/export/') ||
                                        originalRequest.url?.includes('/tracking/notes') ||
                                        originalRequest.url?.includes('/tracking/report');
      const isPortalRoute = originalRequest.url?.includes('/portal/') ||
                            originalRequest.url?.includes('/portal-') ||
                            (isTrackingRoute && !isClinicianTrackingRoute) ||
                            originalRequest.url?.includes('/self-schedule/') ||
                            originalRequest.url?.includes('/waitlist/my-entries') ||
                            originalRequest.url?.includes('/waitlist/my-offers') ||
                            originalRequest.url?.match(/\/waitlist\/[^/]+\/accept/) ||
                            originalRequest.url?.match(/\/waitlist\/[^/]+\/decline/);

      console.log('[API DEBUG] 401 route classification:', { isTrackingRoute, isClinicianTrackingRoute, isPortalRoute });

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
          console.log('[API DEBUG] Attempting EHR token refresh...');
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            {}, // Empty body - refresh token is in httpOnly cookie
            { withCredentials: true } // Ensure cookies are sent
          );

          console.log('[API DEBUG] Token refresh succeeded, retrying original request');
          // If refresh succeeded, new tokens are set as httpOnly cookies by backend
          // Simply retry the original request - browser will send new cookies
          // CRITICAL: Ensure withCredentials is set on the retry request
          originalRequest.withCredentials = true;
          return api(originalRequest);
        }
      } catch (refreshError: any) {
        // Refresh failed, clear user data and redirect to login
        // Note: httpOnly cookies are cleared server-side on logout
        console.log('[API DEBUG] Token refresh FAILED:', refreshError?.response?.status, refreshError?.message);
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
