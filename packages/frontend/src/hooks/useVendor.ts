import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxId: string;
  paymentTerms: string;
  status: 'ACTIVE' | 'INACTIVE';
  performanceRating: number;
  totalSpent: number;
  activeContracts: number;
  w9Document?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorContract {
  id: string;
  vendorId: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  value: number;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  terms: string;
}

export const useVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vendors`);
      setVendors(response.data.data || response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return { vendors, loading, error, refetch: fetchVendors };
};

export const useVendor = (id: string) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/vendors/${id}`);
        setVendor(response.data.data || response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch vendor');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchVendor();
  }, [id]);

  return { vendor, loading, error };
};

export const createVendor = async (data: Partial<Vendor>) => {
  const response = await api.post(`/vendors`, data);
  return response.data.data || response.data;
};

export const updateVendor = async (id: string, data: Partial<Vendor>) => {
  const response = await api.put(`/vendors/${id}`, data);
  return response.data.data || response.data;
};

export const deleteVendor = async (id: string) => {
  await api.delete(`/vendors/${id}`);
};

export const uploadW9 = async (vendorId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/vendors/${vendorId}/w9`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data.data || response.data;
};
