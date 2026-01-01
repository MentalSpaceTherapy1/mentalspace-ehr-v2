import { useState, useEffect } from 'react';
import api from '../lib/api';

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

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.vendorId) params.append('vendorId', filters.vendorId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/purchase-orders?${params.toString()}`);
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
        const response = await api.get(`/purchase-orders/${id}`);
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
        const response = await api.get('/purchase-orders/stats');
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
  const response = await api.post('/purchase-orders', data);
  return response.data;
};

export const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>) => {
  const response = await api.put(`/purchase-orders/${id}`, data);
  return response.data;
};

export const approvePurchaseOrder = async (id: string, notes?: string) => {
  const response = await api.post(`/purchase-orders/${id}/approve`, { notes });
  return response.data;
};

export const rejectPurchaseOrder = async (id: string, notes: string) => {
  const response = await api.post(`/purchase-orders/${id}/reject`, { notes });
  return response.data;
};

export const receivePurchaseOrder = async (id: string) => {
  const response = await api.post(`/purchase-orders/${id}/receive`, {});
  return response.data;
};

export const cancelPurchaseOrder = async (id: string, reason: string) => {
  const response = await api.post(`/purchase-orders/${id}/cancel`, { reason });
  return response.data;
};

export const exportPurchaseOrders = async (filters?: {
  status?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.vendorId) params.append('vendorId', filters.vendorId);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await api.get(`/purchase-orders/export?${params.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};
