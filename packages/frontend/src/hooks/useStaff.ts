import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Staff {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  department: string;
  jobTitle: string;  // Changed from 'title' to match backend field name
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PENDING';
  hireDate: string;
  terminationDate?: string;
  managerId?: string;
  manager?: Staff;
  directReports?: Staff[];
  salary?: number;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  credentials?: Credential[];
  training?: Training[];
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  staffId: string;
  credentialType: string;
  licenseNumber?: string;
  issueDate: string;
  expirationDate?: string;
  issuingOrganization: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  documentUrl?: string;
}

export interface Training {
  id: string;
  staffId: string;
  trainingName: string;
  trainingType: string;
  completionDate?: string;
  expirationDate?: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'REQUIRED' | 'OVERDUE';
  certificateUrl?: string;
}

export interface OrgChartNode {
  id: string;
  name: string;
  title: string;
  department: string;
  photoUrl?: string;
  children?: OrgChartNode[];
}

export const useStaff = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async (filters?: {
    department?: string;
    role?: string;
    status?: string;
    search?: string;
  }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.department) params.append('department', filters.department);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const response = await axios.get(`${API_BASE_URL}/staff?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Extract the staff array from the wrapped response
      setStaff(Array.isArray(response.data) ? response.data : (response.data?.data || []));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch staff');
      setStaff([]); // Set empty array on error to prevent issues
    } finally {
      setLoading(false);
    }
  };

  const getStaffById = async (id: string): Promise<Staff | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Extract the staff member from the wrapped response
      return response.data?.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch staff');
      return null;
    }
  };

  const createStaff = async (data: Partial<Staff>): Promise<Staff | null> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/staff`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchStaff();
      // Extract the staff member from the wrapped response
      return response.data?.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create staff');
      return null;
    }
  };

  const updateStaff = async (id: string, data: Partial<Staff>): Promise<Staff | null> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/staff/${id}`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchStaff();
      // Extract the staff member from the wrapped response
      return response.data?.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update staff');
      return null;
    }
  };

  const deleteStaff = async (id: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_BASE_URL}/staff/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchStaff();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete staff');
      return false;
    }
  };

  const getOrgChart = async (): Promise<OrgChartNode | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/org-chart`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Extract the org chart from the wrapped response
      return response.data?.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch org chart');
      return null;
    }
  };

  const uploadPhoto = async (staffId: string, file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.post(`${API_BASE_URL}/staff/${staffId}/photo`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.photoUrl;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload photo');
      return null;
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return {
    staff,
    loading,
    error,
    fetchStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    getOrgChart,
    uploadPhoto,
  };
};

export const useStaffCredentials = (staffId: string) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/staff/${staffId}/credentials`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Extract the credentials array from the wrapped response
      setCredentials(Array.isArray(response.data) ? response.data : (response.data?.data || []));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch credentials');
      setCredentials([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const addCredential = async (data: Partial<Credential>): Promise<Credential | null> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/staff/${staffId}/credentials`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchCredentials();
      // Extract the credential from the wrapped response
      return response.data?.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add credential');
      return null;
    }
  };

  useEffect(() => {
    if (staffId) fetchCredentials();
  }, [staffId]);

  return { credentials, loading, error, fetchCredentials, addCredential };
};

export const useStaffTraining = (staffId: string) => {
  const [training, setTraining] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraining = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/staff/${staffId}/training`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Extract the training array from the wrapped response
      setTraining(Array.isArray(response.data) ? response.data : (response.data?.data || []));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch training');
      setTraining([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const addTraining = async (data: Partial<Training>): Promise<Training | null> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/staff/${staffId}/training`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchTraining();
      // Extract the training record from the wrapped response
      return response.data?.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add training');
      return null;
    }
  };

  useEffect(() => {
    if (staffId) fetchTraining();
  }, [staffId]);

  return { training, loading, error, fetchTraining, addTraining };
};
