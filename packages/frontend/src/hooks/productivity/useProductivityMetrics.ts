import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface MetricResult {
  value: number;
  metadata?: {
    numerator?: number;
    denominator?: number;
    [key: string]: any;
  };
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
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
      const response = await api.get<{ success: boolean; data: DashboardData }>(
        `/productivity/dashboard/clinician/${userId}`
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
      const response = await api.get(
        `/productivity/dashboard/supervisor/${supervisorId}`
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
      const response = await api.get(
        `/productivity/dashboard/administrator`
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
      const params = new URLSearchParams();
      if (metricType) params.append('metricType', metricType);

      const response = await api.get(
        `/productivity/metrics/${userId}/history?${params}`
      );
      return response.data.data;
    },
  });
}
