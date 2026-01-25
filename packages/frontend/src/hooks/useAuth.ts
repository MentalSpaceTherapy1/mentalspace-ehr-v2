/**
 * useAuth Hook
 * Phase 4.2: Refactored to use API-only auth (httpOnly cookies)
 *
 * HIPAA Security: Auth tokens are now in httpOnly cookies
 * - The browser sends cookies automatically with credentials: true
 * - We never access or store tokens in JavaScript
 * - User data is fetched from /auth/me on each session
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '../lib/api';
import { clearCsrfToken } from '../lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[];
  title?: string;
  organizationId?: string;
}

/**
 * Auth hook that uses httpOnly cookie authentication
 *
 * The auth token is in an httpOnly cookie (not accessible via JS).
 * We verify auth status by calling /auth/me - if the cookie is valid,
 * we get the user; if not, we get 401 and return null.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        // Only source of truth: API with httpOnly cookie
        // The browser automatically sends the auth cookie with this request
        const response = await api.get('/auth/me');
        const userData = response.data.data;

        // Normalize role field for backward compatibility
        if (userData) {
          return {
            ...userData,
            role: userData.roles?.[0] || userData.role,
          };
        }
        return userData;
      } catch (error) {
        // Cookie invalid, expired, or not present
        return null;
      }
    },
    // Keep user data fresh but don't refetch constantly
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Don't retry on auth failure - if cookie is invalid, it's invalid
    retry: false,
    // Don't refetch on window focus during initial load
    refetchOnWindowFocus: 'always',
  });

  /**
   * Logout function
   * Calls the logout endpoint to clear httpOnly cookies on the server
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if logout API fails, clear local state
      console.error('Logout API call failed:', error);
    } finally {
      // Clear CSRF token (new session will need a new one)
      clearCsrfToken();

      // Clear user data from React Query cache
      queryClient.setQueryData(['auth', 'user'], null);

      // Clear all cached data (contains user-specific data)
      queryClient.clear();

      // Clear any legacy localStorage items that might exist
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('passwordExpiryWarning');
    }
  }, [queryClient]);

  /**
   * Check if user is authenticated
   * During loading, we don't know yet
   */
  const isAuthenticated = !isLoading && user !== null;

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    logout,
    refetch,
  };
}

export default useAuth;
