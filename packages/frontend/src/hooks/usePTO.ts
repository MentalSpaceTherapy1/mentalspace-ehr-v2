import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface PTORequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'VACATION' | 'SICK' | 'PERSONAL' | 'BEREAVEMENT' | 'JURY_DUTY';
  startDate: string;
  endDate: string;
  totalDays: number;
  totalHours: number;
  reason?: string;
  coveragePlan?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  approvedBy?: string;
  approverName?: string;
  approvalNotes?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PTOBalance {
  employeeId: string;
  vacation: {
    accrued: number;
    used: number;
    pending: number;
    available: number;
  };
  sick: {
    accrued: number;
    used: number;
    pending: number;
    available: number;
  };
  personal: {
    accrued: number;
    used: number;
    pending: number;
    available: number;
  };
  totalAvailable: number;
}

export interface CreatePTORequest {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalHours: number;
  reason?: string;
  coveragePlan?: string;
}

export interface TeamPTOCalendar {
  date: string;
  requests: {
    employeeId: string;
    employeeName: string;
    type: string;
    status: string;
  }[];
}

export const usePTO = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(async (data: CreatePTORequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/pto/requests`, data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create PTO request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRequests = useCallback(async (filters?: {
    employeeId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/pto/requests`, {
        params: filters,
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch PTO requests');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRequest = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/pto/requests/${id}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch PTO request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRequest = useCallback(async (id: string, data: Partial<CreatePTORequest>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.put(`${API_BASE_URL}/pto/requests/${id}`, data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update PTO request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelRequest = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/pto/requests/${id}/cancel`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel PTO request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveRequest = useCallback(async (id: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/pto/requests/${id}/approve`, {
        notes,
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve PTO request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const denyRequest = useCallback(async (id: string, notes: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE_URL}/pto/requests/${id}/deny`, {
        notes,
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deny PTO request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBalance = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/pto/balance/${employeeId}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch PTO balance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTeamCalendar = useCallback(async (startDate: string, endDate: string, departmentId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/pto/team-calendar`, {
        params: { startDate, endDate, departmentId },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch team calendar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkConflicts = useCallback(async (startDate: string, endDate: string, departmentId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/pto/check-conflicts`, {
        params: { startDate, endDate, departmentId },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check conflicts');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createRequest,
    getRequests,
    getRequest,
    updateRequest,
    cancelRequest,
    approveRequest,
    denyRequest,
    getBalance,
    getTeamCalendar,
    checkConflicts,
  };
};
