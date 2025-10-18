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
      const token = localStorage.getItem('token');
      if (!token) return null;

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
  });

  return {
    user,
    isLoading,
    error,
  };
}
