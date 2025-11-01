import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BillingHold {
  id: string;
  noteId: string;
  holdReason: string;
  holdDetails: string;
  holdPlacedAt: string;
  holdPlacedBy: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  isActive: boolean;
  note?: {
    id: string;
    serviceDate: string;
    client: {
      firstName: string;
      lastName: string;
    };
    clinician: {
      firstName: string;
      lastName: string;
    };
  };
}

const BillingHoldsList: React.FC = () => {
  const navigate = useNavigate();
  const [holds, setHolds] = useState<BillingHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [holdStats, setHoldStats] = useState<{ count: number; byReason: Record<string, number> }>({
    count: 0,
    byReason: {},
  });

  useEffect(() => {
    fetchHolds();
    fetchStats();
  }, []);

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/billing-holds');
      setHolds(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch billing holds');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [countRes, byReasonRes] = await Promise.all([
        axios.get('/api/v1/billing-holds/count'),
        axios.get('/api/v1/billing-holds/by-reason'),
      ]);
      setHoldStats({
        count: countRes.data.data.count,
        byReason: byReasonRes.data.data,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleResolve = async (holdId: string) => {
    if (!window.confirm('Mark this hold as resolved? The note will become available for billing.')) {
      return;
    }

    try {
      await axios.put(`/api/v1/billing-holds/${holdId}/resolve`);
      fetchHolds();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve hold');
    }
  };

  const handleDelete = async (holdId: string) => {
    if (!window.confirm('Permanently delete this hold? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/billing-holds/${holdId}`);
      fetchHolds();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete hold');
    }
  };

  const filteredHolds = holds.filter((hold) => {
    if (filterStatus === 'ACTIVE' && !hold.isActive) return false;
    if (filterStatus === 'RESOLVED' && hold.isActive) return false;
    if (filterReason !== 'ALL' && hold.holdReason !== filterReason) return false;
    return true;
  });

  const uniqueReasons = Array.from(new Set(holds.map((h) => h.holdReason)));

  const getReasonColor = (reason: string): string => {
    const colors: Record<string, string> = {
      'NOT_SIGNED': 'bg-yellow-100 text-yellow-800',
      'SUPERVISION_REQUIRED': 'bg-orange-100 text-orange-800',
      'COSIGN_REQUIRED': 'bg-blue-100 text-blue-800',
      'COSIGN_OVERDUE': 'bg-red-100 text-red-800',
      'PROHIBITED_COMBINATION': 'bg-red-100 text-red-800',
      'NO_MATCHING_RULE': 'bg-purple-100 text-purple-800',
      'NOTE_OVERDUE': 'bg-red-100 text-red-800',
      'MISSING_DIAGNOSIS': 'bg-yellow-100 text-yellow-800',
      'TREATMENT_PLAN_STALE': 'bg-orange-100 text-orange-800',
      'MEDICAL_NECESSITY_MISSING': 'bg-yellow-100 text-yellow-800',
      'PRIOR_AUTH_REQUIRED': 'bg-purple-100 text-purple-800',
    };
    return colors[reason] || 'bg-gray-100 text-gray-800';
  };

  const formatReason = (reason: string): string => {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Holds</h1>
          <p className="mt-1 text-sm text-gray-500">
            Notes that are blocked from billing due to validation issues
          </p>
        </div>
        <button
          onClick={() => navigate('/billing/readiness')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Check Note Readiness
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Active Holds</div>
          <div className="mt-1 text-3xl font-semibold text-red-600">{holdStats.count}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Cosign Issues</div>
          <div className="mt-1 text-3xl font-semibold text-orange-600">
            {(holdStats.byReason.COSIGN_REQUIRED || 0) + (holdStats.byReason.COSIGN_OVERDUE || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Prohibited</div>
          <div className="mt-1 text-3xl font-semibold text-red-600">
            {holdStats.byReason.PROHIBITED_COMBINATION || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Documentation</div>
          <div className="mt-1 text-3xl font-semibold text-yellow-600">
            {(holdStats.byReason.MISSING_DIAGNOSIS || 0) +
              (holdStats.byReason.TREATMENT_PLAN_STALE || 0) +
              (holdStats.byReason.MEDICAL_NECESSITY_MISSING || 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Holds</option>
            <option value="ACTIVE">Active Only</option>
            <option value="RESOLVED">Resolved Only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hold Reason</label>
          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Reasons</option>
            {uniqueReasons.map((reason) => (
              <option key={reason} value={reason}>
                {formatReason(reason)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Holds Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clinician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hold Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Placed
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHolds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {holds.length === 0
                      ? 'No billing holds found. All notes are ready for billing!'
                      : 'No holds match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredHolds.map((hold) => (
                  <tr key={hold.id} className={`hover:bg-gray-50 ${!hold.isActive ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {hold.note?.client
                          ? `${hold.note.client.lastName}, ${hold.note.client.firstName}`
                          : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hold.note?.clinician
                        ? `${hold.note.clinician.lastName}, ${hold.note.clinician.firstName}`
                        : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hold.note?.serviceDate
                        ? new Date(hold.note.serviceDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getReasonColor(hold.holdReason)}`}>
                        {formatReason(hold.holdReason)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {hold.holdDetails}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(hold.holdPlacedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/clinical-notes/${hold.noteId}`)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View Note
                      </button>
                      {hold.isActive && (
                        <button
                          onClick={() => handleResolve(hold.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(hold.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingHoldsList;
