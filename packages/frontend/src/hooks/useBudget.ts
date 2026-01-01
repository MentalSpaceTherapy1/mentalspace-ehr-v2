import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  totalAmount: number;
  spentAmount: number;
  remainingAmount: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  departmentId?: string;
  categories: BudgetCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  percentage: number;
}

export interface BudgetUtilization {
  total: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  byCategory: {
    category: string;
    allocated: number;
    spent: number;
    percentage: number;
  }[];
}

export const useBudgets = (fiscalYear?: number) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const url = fiscalYear
        ? `/budgets?fiscalYear=${fiscalYear}`
        : `/budgets`;

      const response = await api.get(url);
      setBudgets(response.data.data || response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [fiscalYear]);

  return { budgets, loading, error, refetch: fetchBudgets };
};

export const useBudget = (id: string) => {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/budgets/${id}`);
        setBudget(response.data.data || response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch budget');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBudget();
  }, [id]);

  return { budget, loading, error };
};

export const useBudgetUtilization = (fiscalYear: number) => {
  const [utilization, setUtilization] = useState<BudgetUtilization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUtilization = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/budgets/utilization?fiscalYear=${fiscalYear}`
        );
        setUtilization(response.data.data || response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch utilization');
      } finally {
        setLoading(false);
      }
    };

    fetchUtilization();
  }, [fiscalYear]);

  return { utilization, loading, error };
};

export const createBudget = async (data: Partial<Budget>) => {
  const response = await api.post(`/budgets`, data);
  return response.data.data || response.data;
};

export const updateBudget = async (id: string, data: Partial<Budget>) => {
  const response = await api.put(`/budgets/${id}`, data);
  return response.data.data || response.data;
};

export const exportBudgetReport = async (fiscalYear: number) => {
  const response = await api.get(
    `/budgets/export?fiscalYear=${fiscalYear}`,
    { responseType: 'blob' }
  );
  return response.data;
};
