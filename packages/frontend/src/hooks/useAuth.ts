import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      // First try to get user from localStorage (set during login)
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser) as User;
        } catch {
          // If parsing fails, fall through to API call
        }
      }

      // Fallback: Try to fetch from API (uses httpOnly cookie auth)
      try {
        const response = await api.get('/auth/me');
        return response.data.data;
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return null;
      }
    },
    // Keep the user data fresh but don't refetch constantly
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isLoading,
    error,
  };
}
