import { useState, useCallback } from 'react';
import api from '../lib/api';

export interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  totalHours?: number;
  overtime?: number;
  status: 'CLOCKED_IN' | 'ON_BREAK' | 'CLOCKED_OUT';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'PTO' | 'HOLIDAY';
  hoursWorked: number;
  overtime: number;
  notes?: string;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  ptoDays: number;
  attendanceRate: number;
  totalHours: number;
  overtimeHours: number;
  averageHoursPerDay: number;
}

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clockIn = useCallback(async (employeeId: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/attendance/clock-in`, {
        employeeId,
        notes,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clock in');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clockOut = useCallback(async (employeeId: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/attendance/clock-out`, {
        employeeId,
        notes,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clock out');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startBreak = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/attendance/break-start`, {
        employeeId,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start break');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const endBreak = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/attendance/break-end`, {
        employeeId,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to end break');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentStatus = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/attendance/current/${employeeId}`);
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTimeEntries = useCallback(async (filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/attendance/entries`, {
        params: filters,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch time entries');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAttendanceRecords = useCallback(async (filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/attendance/records`, {
        params: filters,
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance records');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAttendanceStats = useCallback(async (employeeId: string, startDate: string, endDate: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/attendance/stats/${employeeId}`, {
        params: { startDate, endDate },
      });
      return response.data.data || response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch attendance stats');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportAttendance = useCallback(async (filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'excel' | 'pdf';
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/attendance/export`, {
        params: filters,
        responseType: 'blob',
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getCurrentStatus,
    getTimeEntries,
    getAttendanceRecords,
    getAttendanceStats,
    exportAttendance,
  };
};
