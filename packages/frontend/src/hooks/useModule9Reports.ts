import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Module9Report {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  lastRun?: string;
  isFavorite?: boolean;
}

export interface ReportData {
  id: string;
  title: string;
  category: string;
  generatedAt: string;
  data: any[];
  summary: {
    totalRecords: number;
    filteredRecords: number;
    metrics: Record<string, any>;
  };
  charts: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  colors?: string[];
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: any;
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  reportType: string;
  filters: ReportFilter[];
  columns: string[];
  chartType?: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

// Available reports
const availableReports: Module9Report[] = [
  {
    id: 'credentialing',
    name: 'Credentialing Report',
    category: 'Compliance',
    description: 'Track provider credentials, licenses, and expiration dates',
    icon: '📋',
    color: '#3B82F6'
  },
  {
    id: 'training',
    name: 'Training Compliance',
    category: 'Compliance',
    description: 'Monitor staff training completion and compliance',
    icon: '🎓',
    color: '#8B5CF6'
  },
  {
    id: 'incidents',
    name: 'Incident Reports',
    category: 'Safety',
    description: 'Analyze safety incidents and trends',
    icon: '⚠️',
    color: '#EF4444'
  },
  {
    id: 'policies',
    name: 'Policy Management',
    category: 'Compliance',
    description: 'Track policy reviews and acknowledgments',
    icon: '📜',
    color: '#10B981'
  },
  {
    id: 'onboarding',
    name: 'Onboarding Status',
    category: 'HR',
    description: 'Monitor new staff onboarding progress',
    icon: '👋',
    color: '#F59E0B'
  },
  {
    id: 'financial',
    name: 'Financial Overview',
    category: 'Financial',
    description: 'Budget, expenses, and financial metrics',
    icon: '💰',
    color: '#06B6D4'
  },
  {
    id: 'vendor',
    name: 'Vendor Performance',
    category: 'Financial',
    description: 'Track vendor contracts and performance',
    icon: '🤝',
    color: '#EC4899'
  },
  {
    id: 'documents',
    name: 'Document Repository',
    category: 'Compliance',
    description: 'Manage organizational documents',
    icon: '📁',
    color: '#14B8A6'
  },
  {
    id: 'guardian',
    name: 'Guardian Access',
    category: 'Portal',
    description: 'Monitor guardian portal usage and access',
    icon: '👨‍👩‍👧',
    color: '#6366F1'
  },
  {
    id: 'messaging',
    name: 'Secure Messaging',
    category: 'Portal',
    description: 'Track portal messaging activity',
    icon: '💬',
    color: '#8B5CF6'
  }
];

export const useModule9Reports = () => {
  const [reports, setReports] = useState<Module9Report[]>(availableReports);
  const [favoriteReports, setFavoriteReports] = useState<string[]>([]);
  const [recentReports, setRecentReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
    loadRecentReports();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports/favorites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFavoriteReports(response.data.favorites || []);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const loadRecentReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports/recent`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecentReports(response.data.reports || []);
    } catch (err) {
      console.error('Failed to load recent reports:', err);
    }
  };

  const toggleFavorite = async (reportId: string) => {
    try {
      const isFavorite = favoriteReports.includes(reportId);
      if (isFavorite) {
        await axios.delete(`${API_URL}/api/reports/favorites/${reportId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setFavoriteReports(prev => prev.filter(id => id !== reportId));
      } else {
        await axios.post(`${API_URL}/api/reports/favorites`,
          { reportId },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setFavoriteReports(prev => [...prev, reportId]);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const generateReport = async (
    reportType: string,
    filters: ReportFilter[] = [],
    dateRange?: { startDate: string; endDate: string }
  ): Promise<ReportData> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/reports/generate`, {
        reportType,
        filters,
        dateRange
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      loadRecentReports(); // Refresh recent reports
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (
    reportId: string,
    format: 'pdf' | 'excel' | 'csv',
    options: any = {}
  ): Promise<Blob> => {
    try {
      const response = await axios.post(`${API_URL}/api/reports/${reportId}/export`, {
        format,
        ...options
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export report');
      throw err;
    }
  };

  return {
    reports,
    favoriteReports,
    recentReports,
    loading,
    error,
    toggleFavorite,
    generateReport,
    exportReport,
    loadRecentReports
  };
};

export const useCustomReports = () => {
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomReports();
  }, []);

  const loadCustomReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/custom-reports`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCustomReports(response.data.reports || []);
    } catch (err) {
      console.error('Failed to load custom reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomReport = async (report: Omit<CustomReport, 'id' | 'createdAt' | 'createdBy'>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/custom-reports`, report, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      await loadCustomReports();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save custom report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomReport = async (reportId: string) => {
    try {
      await axios.delete(`${API_URL}/api/custom-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await loadCustomReports();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete custom report');
      throw err;
    }
  };

  return {
    customReports,
    loading,
    error,
    saveCustomReport,
    deleteCustomReport,
    loadCustomReports
  };
};

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAuditLogs = async (filters: {
    userId?: string;
    action?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await axios.get(`${API_URL}/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setLogs(response.data.logs || []);
      setTotalCount(response.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLogs = async (
    filters: any,
    format: 'csv' | 'excel'
  ): Promise<Blob> => {
    try {
      const response = await axios.post(`${API_URL}/api/audit-logs/export`, {
        filters,
        format
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export audit logs');
      throw err;
    }
  };

  return {
    logs,
    totalCount,
    loading,
    error,
    fetchAuditLogs,
    exportAuditLogs
  };
};

export const useDashboardWidgets = () => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/dashboards/widgets`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWidgets(response.data.widgets || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveDashboard = async (widgets: DashboardWidget[]) => {
    try {
      await axios.post(`${API_URL}/api/dashboards/widgets`,
        { widgets },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setWidgets(widgets);
    } catch (err) {
      console.error('Failed to save dashboard:', err);
      throw err;
    }
  };

  return {
    widgets,
    loading,
    setWidgets,
    saveDashboard,
    loadDashboard
  };
};
