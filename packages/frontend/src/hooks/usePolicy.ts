import { useState } from 'react';
import api from '../lib/api';

interface Policy {
  id: string;
  title: string;
  category: string;
  content: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  effectiveDate: string;
  reviewDate?: string;
  reviewSchedule?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
  }>;
  versionHistory?: Array<{
    version: string;
    date: string;
    changes: string;
  }>;
}

interface PolicyAcknowledgment {
  id: string;
  policyId: string;
  userId: string;
  acknowledgedAt: string;
  signature?: string;
  quizScore?: number;
}

interface PolicyDistribution {
  id: string;
  policyId: string;
  recipients: Array<{
    type: 'DEPARTMENT' | 'ROLE' | 'INDIVIDUAL';
    id: string;
    name: string;
  }>;
  sentAt: string;
  sentBy: string;
}

export const usePolicy = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = async (filters?: {
    status?: string;
    category?: string;
    search?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get(`/policies?${params}`);
      setPolicies(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicyById = async (id: string): Promise<Policy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/policies/${id}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch policy');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPolicy = async (policyData: Partial<Policy>): Promise<Policy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/policies', policyData);
      await fetchPolicies();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create policy');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (id: string, policyData: Partial<Policy>): Promise<Policy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/policies/${id}`, policyData);
      await fetchPolicies();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update policy');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/policies/${id}`);
      await fetchPolicies();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete policy');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const acknowledgePolicy = async (
    policyId: string,
    acknowledgmentData: {
      signature?: string;
      quizAnswers?: Record<string, any>;
    }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/policies/${policyId}/acknowledge`, acknowledgmentData);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to acknowledge policy');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const distributePolicy = async (
    policyId: string,
    distributionData: {
      recipients: Array<{
        type: 'DEPARTMENT' | 'ROLE' | 'INDIVIDUAL';
        id: string;
      }>;
      message?: string;
    }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/policies/${policyId}/distribute`, distributionData);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to distribute policy');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPolicyAcknowledgments = async (policyId: string): Promise<PolicyAcknowledgment[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/policies/${policyId}/acknowledgments`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch acknowledgments');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    policies,
    loading,
    error,
    fetchPolicies,
    fetchPolicyById,
    createPolicy,
    updatePolicy,
    deletePolicy,
    acknowledgePolicy,
    distributePolicy,
    getPolicyAcknowledgments
  };
};

export type { Policy, PolicyAcknowledgment, PolicyDistribution };
