import { useState, useCallback } from 'react';
import api from '../lib/api';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED';
  overallRating: number;
  categories: {
    name: string;
    rating: number;
    comments: string;
  }[];
  goals: {
    description: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    achievementLevel: number;
  }[];
  achievements: string[];
  areasForImprovement: string[];
  employeeComments?: string;
  managerComments?: string;
  attachments?: string[];
  employeeSignature?: string;
  managerSignature?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  employeeId: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  categories: {
    name: string;
    rating: number;
    comments: string;
  }[];
  goals: {
    description: string;
    status: string;
    achievementLevel: number;
  }[];
  achievements: string[];
  areasForImprovement: string[];
  managerComments?: string;
}

export interface ReviewStats {
  averageRating: number;
  completionRate: number;
  totalReviews: number;
  pendingReviews: number;
  completedReviews: number;
}

export const usePerformance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getReviews = useCallback(async (filters?: {
    employeeId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/performance/reviews`, {
        params: filters,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch reviews');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReview = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/performance/reviews/${id}`);
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch review');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createReview = useCallback(async (data: CreateReviewInput) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/performance/reviews`, data);
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create review');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReview = useCallback(async (id: string, data: Partial<CreateReviewInput>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/performance/reviews/${id}`, data);
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update review');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReview = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/performance/reviews/${id}/submit`);
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signReview = useCallback(async (id: string, signature: string, role: 'employee' | 'manager') => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/performance/reviews/${id}/sign`, {
        signature,
        role,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign review');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReviewStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/performance/stats`);
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadAttachment = useCallback(async (reviewId: string, file: File) => {
    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(
        `/performance/reviews/${reviewId}/attachments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload attachment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getReviews,
    getReview,
    createReview,
    updateReview,
    submitReview,
    signReview,
    getReviewStats,
    uploadAttachment,
  };
};
