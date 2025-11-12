import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      const token = localStorage.getItem('token');
      const url = fiscalYear
        ? `${API_URL}/api/budgets?fiscalYear=${fiscalYear}`
        : `${API_URL}/api/budgets`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBudgets(response.data);
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
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/budgets/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBudget(response.data);
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
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/api/budgets/utilization?fiscalYear=${fiscalYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUtilization(response.data);
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
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/api/budgets`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateBudget = async (id: string, data: Partial<Budget>) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/api/budgets/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const exportBudgetReport = async (fiscalYear: number) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(
    `${API_URL}/api/budgets/export?fiscalYear=${fiscalYear}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }
  );
  return response.data;
};
