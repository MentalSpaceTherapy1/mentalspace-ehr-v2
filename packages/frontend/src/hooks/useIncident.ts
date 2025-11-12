import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Incident {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'UNDER_INVESTIGATION' | 'CORRECTIVE_ACTION' | 'RESOLVED' | 'CLOSED';
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  peopleInvolved?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  photos?: string[];
  immediateActions?: string;
  investigation?: Investigation;
  timeline?: Array<{
    id: string;
    action: string;
    performedBy: string;
    performedAt: string;
    notes?: string;
  }>;
}

interface Investigation {
  id: string;
  incidentId: string;
  investigator: string;
  startedAt: string;
  completedAt?: string;
  rootCause?: string;
  correctiveActions?: Array<{
    id: string;
    action: string;
    responsible: string;
    dueDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  preventiveActions?: Array<{
    id: string;
    action: string;
    responsible: string;
    dueDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  evidence?: Array<{
    id: string;
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  signedOff?: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
}

interface IncidentStats {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  averageResolutionTime: number;
  openIncidents: number;
  overdueInvestigations: number;
}

export const useIncident = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async (filters?: {
    severity?: string;
    status?: string;
    type?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.append('dateTo', filters.dateTo);

      const response = await axios.get(`${API_URL}/incidents?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIncidents(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentById = async (id: string): Promise<Incident | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/incidents/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch incident');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createIncident = async (incidentData: Partial<Incident>): Promise<Incident | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/incidents`, incidentData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchIncidents();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create incident');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateIncident = async (id: string, incidentData: Partial<Incident>): Promise<Incident | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/incidents/${id}`, incidentData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchIncidents();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update incident');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const assignInvestigator = async (id: string, investigatorId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/incidents/${id}/assign`, { investigatorId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchIncidents();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign investigator');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateInvestigation = async (
    incidentId: string,
    investigationData: Partial<Investigation>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await axios.put(`${API_URL}/incidents/${incidentId}/investigation`, investigationData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update investigation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const closeIncident = async (id: string, closureNotes?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/incidents/${id}/close`, { closureNotes }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchIncidents();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close incident');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getIncidentStats = async (filters?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<IncidentStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.append('dateTo', filters.dateTo);

      const response = await axios.get(`${API_URL}/incidents/stats?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const exportIncidents = async (filters?: any): Promise<Blob | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/incidents/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
        params: filters
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export incidents');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    incidents,
    loading,
    error,
    fetchIncidents,
    fetchIncidentById,
    createIncident,
    updateIncident,
    assignInvestigator,
    updateInvestigation,
    closeIncident,
    getIncidentStats,
    exportIncidents
  };
};

export type { Incident, Investigation, IncidentStats };
