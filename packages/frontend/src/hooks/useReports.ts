import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '/reports';

export function useReportQuickStats() {
  return useQuery({
    queryKey: ['reports', 'quick-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/quick-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });
}

export function useRevenueByClinicianReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'revenue', 'by-clinician', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await axios.get(`${API_BASE}/revenue/by-clinician?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!(startDate && endDate), // Auto-fetch when dates provided
  });
}

export function useRevenueByCPTReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'revenue', 'by-cpt', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await axios.get(`${API_BASE}/revenue/by-cpt?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!(startDate && endDate),
  });
}

export function useRevenueByPayerReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'revenue', 'by-payer', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await axios.get(`${API_BASE}/revenue/by-payer?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!(startDate && endDate),
  });
}

export function usePaymentCollectionReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'revenue', 'collection', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await axios.get(`${API_BASE}/revenue/collection?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!(startDate && endDate),
  });
}

export function useKVRAnalysisReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'productivity', 'kvr-analysis', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await axios.get(`${API_BASE}/productivity/kvr-analysis?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!(startDate && endDate),
  });
}

export function useSessionsPerDayReport(startDate?: Date, endDate?: Date, clinicianId?: string) {
  return useQuery({
    queryKey: ['reports', 'productivity', 'sessions-per-day', startDate, endDate, clinicianId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (clinicianId) params.append('clinicianId', clinicianId);

      const response = await axios.get(`${API_BASE}/productivity/sessions-per-day?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!(startDate && endDate),
  });
}

export function useUnsignedNotesReport() {
  return useQuery({
    queryKey: ['reports', 'compliance', 'unsigned-notes'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/compliance/unsigned-notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: false, // Manual trigger only
  });
}

export function useMissingTreatmentPlansReport() {
  return useQuery({
    queryKey: ['reports', 'compliance', 'missing-treatment-plans'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/compliance/missing-treatment-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: false, // Manual trigger only
  });
}

export function useClientDemographicsReport() {
  return useQuery({
    queryKey: ['reports', 'demographics', 'client-demographics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/demographics/client-demographics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: false, // Manual trigger only
  });
}
