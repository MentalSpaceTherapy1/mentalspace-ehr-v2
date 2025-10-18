import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface MetricResult {
  value: number;
  metadata?: {
    numerator?: number;
    denominator?: number;
    [key: string]: any;
  };
}

interface DashboardData {
  weeklyMetrics: Record<string, MetricResult>;
  unsignedNotes: any[];
  alerts: any[];
  clientsNeedingRebook: any[];
}

export function useClinicianDashboard(userId: string) {
  return useQuery({
    queryKey: ['clinicianDashboard', userId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get<{ success: boolean; data: DashboardData }>(
        `/productivity/dashboard/clinician/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useSupervisorDashboard(supervisorId: string) {
  return useQuery({
    queryKey: ['supervisorDashboard', supervisorId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/productivity/dashboard/supervisor/${supervisorId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    refetchInterval: 60000,
  });
}

export function useAdministratorDashboard() {
  return useQuery({
    queryKey: ['administratorDashboard'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/productivity/dashboard/administrator`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    refetchInterval: 60000,
  });
}

export function useMetricsHistory(userId: string, metricType?: string) {
  return useQuery({
    queryKey: ['metricsHistory', userId, metricType],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (metricType) params.append('metricType', metricType);

      const response = await axios.get(
        `/productivity/metrics/${userId}/history?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
  });
}
