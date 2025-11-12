import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  deliveryDate?: string;
  shippingAddress: string;
  budgetId?: string;
  lineItems: POLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POLineItem {
  id: string;
  purchaseOrderId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface POStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  received: number;
  cancelled: number;
  totalAmount: number;
}

export const usePurchaseOrders = (filters?: {
  status?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.vendorId) params.append('vendorId', filters.vendorId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(
        `${API_URL}/api/purchase-orders?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPurchaseOrders(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [filters?.status, filters?.vendorId, filters?.startDate, filters?.endDate]);

  return { purchaseOrders, loading, error, refetch: fetchPurchaseOrders };
};

export const usePurchaseOrder = (id: string) => {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/purchase-orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPurchaseOrder(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch purchase order');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPurchaseOrder();
  }, [id]);

  return { purchaseOrder, loading, error };
};

export const usePOStats = () => {
  const [stats, setStats] = useState<POStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/purchase-orders/stats`, {
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

export const createPurchaseOrder = async (data: Partial<PurchaseOrder>) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/api/purchase-orders`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/api/purchase-orders/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const approvePurchaseOrder = async (id: string, notes?: string) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/purchase-orders/${id}/approve`,
    { notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const rejectPurchaseOrder = async (id: string, notes: string) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/purchase-orders/${id}/reject`,
    { notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const receivePurchaseOrder = async (id: string) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/purchase-orders/${id}/receive`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const cancelPurchaseOrder = async (id: string, reason: string) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/purchase-orders/${id}/cancel`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const exportPurchaseOrders = async (filters?: {
  status?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.vendorId) params.append('vendorId', filters.vendorId);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await axios.get(
    `${API_URL}/api/purchase-orders/export?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }
  );
  return response.data;
};
