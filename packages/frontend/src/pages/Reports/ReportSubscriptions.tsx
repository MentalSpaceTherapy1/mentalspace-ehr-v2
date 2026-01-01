import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import {
  Pause,
  Play,
  Trash2,
  History,
  Mail,
  Calendar,
  Clock,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  reportId: string;
  reportType: string;
  frequency: string;
  format: string;
  timezone: string;
  status: string;
  nextRunDate: string;
  lastRunDate: string | null;
  recipients: {
    to: string[];
    cc?: string[];
    bcc?: string[];
  };
  logs: DeliveryLog[];
}

interface DeliveryLog {
  id: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export const ReportSubscriptions: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    scheduleId: string | null;
    history: DeliveryLog[];
  }>({
    open: false,
    scheduleId: null,
    history: []
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });
  const [executeConfirm, setExecuteConfirm] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/report-schedules');
      setSchedules(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const endpoint = currentStatus === 'ACTIVE' ? 'pause' : 'resume';
      await api.post(`/report-schedules/${id}/${endpoint}`);
      fetchSchedules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update schedule status');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      await api.delete(`/report-schedules/${deleteConfirm.id}`);
      toast.success('Schedule deleted successfully');
      fetchSchedules();
      setDeleteConfirm({ isOpen: false, id: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete schedule');
    }
  };

  const handleExecuteClick = (id: string) => {
    setExecuteConfirm({ isOpen: true, id });
  };

  const confirmExecute = async () => {
    if (!executeConfirm.id) return;

    try {
      await api.post(`/report-schedules/${executeConfirm.id}/execute`);
      toast.success('Report execution started. Check your email shortly.');
      fetchSchedules();
      setExecuteConfirm({ isOpen: false, id: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to execute schedule');
    }
  };

  const handleViewHistory = async (scheduleId: string) => {
    try {
      const response = await api.get(`/report-schedules/${scheduleId}/history`);
      setHistoryDialog({
        open: true,
        scheduleId,
        history: response.data
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch history');
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      CUSTOM: 'Custom'
    };
    return labels[frequency] || frequency;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-300',
      PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getDeliveryStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      SENT: 'bg-green-100 text-green-800 border-green-300',
      FAILED: 'bg-red-100 text-red-800 border-red-300',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      SKIPPED: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 flex items-center">
            <span className="text-5xl mr-3">🔔</span>
            Report Subscriptions & Schedules
          </h1>
          <p className="text-gray-600 text-lg">
            Manage automated report delivery schedules and subscription settings
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-3xl mr-3">⚠️</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Schedules */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {schedules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-8xl mb-6">🔔</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">No scheduled reports found</h2>
              <p className="text-gray-600 text-lg">
                Schedule reports from the Reports dashboard to receive automated email deliveries
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Report Type</th>
                    <th className="px-6 py-4 text-left font-bold">Frequency</th>
                    <th className="px-6 py-4 text-left font-bold">Format</th>
                    <th className="px-6 py-4 text-left font-bold">Recipients</th>
                    <th className="px-6 py-4 text-left font-bold">Next Run</th>
                    <th className="px-6 py-4 text-left font-bold">Last Run</th>
                    <th className="px-6 py-4 text-left font-bold">Status</th>
                    <th className="px-6 py-4 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100">
                  {schedules.map((schedule, index) => (
                    <tr
                      key={schedule.id}
                      className={`hover:bg-indigo-50 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">📊</span>
                          <span className="font-medium text-gray-900">{schedule.reportType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="text-gray-700">{getFrequencyLabel(schedule.frequency)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border-2 border-purple-300">
                          {schedule.format}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                          <span className="text-gray-700 text-sm">
                            {schedule.recipients.to.length} recipient(s)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {schedule.nextRunDate
                          ? format(new Date(schedule.nextRunDate), 'MMM dd, yyyy HH:mm')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {schedule.lastRunDate
                          ? format(new Date(schedule.lastRunDate), 'MMM dd, yyyy HH:mm')
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(schedule.status)}`}>
                          {schedule.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(schedule.id, schedule.status)}
                            className="p-2 rounded-lg hover:bg-blue-100 transition-all duration-200 text-blue-600"
                            title={schedule.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                          >
                            {schedule.status === 'ACTIVE' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleExecuteClick(schedule.id)}
                            disabled={schedule.status !== 'ACTIVE'}
                            className="p-2 rounded-lg hover:bg-green-100 transition-all duration-200 text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Run Now"
                          >
                            <Clock className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleViewHistory(schedule.id)}
                            className="p-2 rounded-lg hover:bg-purple-100 transition-all duration-200 text-purple-600"
                            title="View History"
                          >
                            <History className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(schedule.id)}
                            className="p-2 rounded-lg hover:bg-red-100 transition-all duration-200 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: '' })}
          onConfirm={confirmDelete}
          title="Delete Schedule"
          message="Are you sure you want to delete this schedule? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          icon="danger"
        />

        {/* Execute Confirmation Modal */}
        <ConfirmModal
          isOpen={executeConfirm.isOpen}
          onClose={() => setExecuteConfirm({ isOpen: false, id: '' })}
          onConfirm={confirmExecute}
          title="Execute Report Now"
          message="Execute this report schedule now? The report will be generated and emailed to the recipients."
          confirmText="Execute"
          cancelText="Cancel"
          icon="info"
        />

        {/* History Dialog */}
        {historyDialog.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <span className="text-3xl mr-3">📜</span>
                  Delivery History
                </h2>
              </div>
              <div className="p-6 overflow-auto flex-1">
                {historyDialog.history.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-gray-600 text-lg">No delivery history found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Attempted</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Sent</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {historyDialog.history.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-all duration-200">
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getDeliveryStatusColor(log.status)}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {log.sentAt ? format(new Date(log.sentAt), 'MMM dd, yyyy HH:mm') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600">
                              {log.errorMessage || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="p-6 bg-gray-50 border-t-2 border-gray-200">
                <button
                  onClick={() => setHistoryDialog({ open: false, scheduleId: null, history: [] })}
                  className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
