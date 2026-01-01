import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  vendorId?: string;
  vendorName?: string;
  budgetId?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'PAID';
  submittedBy: string;
  submittedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvalNotes?: string;
  receiptUrl?: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  paid: number;
  totalAmount: number;
}

export const useExpenses = (filters?: {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/expenses?${params.toString()}`);
      setExpenses(response.data.data || response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filters?.status, filters?.category, filters?.startDate, filters?.endDate]);

  return { expenses, loading, error, refetch: fetchExpenses };
};

export const useExpense = (id: string) => {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/expenses/${id}`);
        setExpense(response.data.data || response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch expense');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchExpense();
  }, [id]);

  return { expense, loading, error };
};

export const useExpenseStats = () => {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/expenses/stats`);
        setStats(response.data.data || response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};

export const createExpense = async (data: Partial<Expense>) => {
  const response = await api.post(`/expenses`, data);
  return response.data.data || response.data;
};

export const updateExpense = async (id: string, data: Partial<Expense>) => {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data.data || response.data;
};

export const approveExpense = async (id: string, notes?: string) => {
  const response = await api.post(`/expenses/${id}/approve`, { notes });
  return response.data.data || response.data;
};

export const denyExpense = async (id: string, notes: string) => {
  const response = await api.post(`/expenses/${id}/deny`, { notes });
  return response.data.data || response.data;
};

export const uploadReceipt = async (expenseId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/expenses/${expenseId}/receipt`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data.data || response.data;
};

export const exportExpenses = async (filters?: {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await api.get(
    `/expenses/export?${params.toString()}`,
    { responseType: 'blob' }
  );
  return response.data;
};
