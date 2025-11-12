import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(
        `${API_URL}/api/expenses?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExpenses(response.data);
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
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/expenses/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExpense(response.data);
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
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/expenses/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
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
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/api/expenses`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateExpense = async (id: string, data: Partial<Expense>) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/api/expenses/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const approveExpense = async (id: string, notes?: string) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/expenses/${id}/approve`,
    { notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const denyExpense = async (id: string, notes: string) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/expenses/${id}/deny`,
    { notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const uploadReceipt = async (expenseId: string, file: File) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_URL}/api/expenses/${expenseId}/receipt`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

export const exportExpenses = async (filters?: {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await axios.get(
    `${API_URL}/api/expenses/export?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }
  );
  return response.data;
};
