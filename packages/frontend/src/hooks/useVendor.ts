import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendors(response.data);
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
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/vendors/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVendor(response.data);
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
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/api/vendors`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const updateVendor = async (id: string, data: Partial<Vendor>) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/api/vendors/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const deleteVendor = async (id: string) => {
  const token = localStorage.getItem('token');
  await axios.delete(`${API_URL}/api/vendors/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const uploadW9 = async (vendorId: string, file: File) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_URL}/api/vendors/${vendorId}/w9`,
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
