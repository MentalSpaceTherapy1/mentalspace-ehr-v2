import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TimeOffRequestDialog from '../../components/Availability/TimeOffRequestDialog';
import axios from 'axios';
import { format } from 'date-fns';
import api from '../../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TimeOffRequest {
  id: string;
  providerId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  requestedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  denialReason?: string;
  coverageProviderId?: string;
  autoReschedule: boolean;
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  requester: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  coverageProvider?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function TimeOffRequestsPage() {
  // Fetch current user profile
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  const isAdmin = user?.roles?.includes('ADMIN') || user?.roles?.includes('ADMINISTRATOR');

  useEffect(() => {
    if (user?.id) {
      loadRequests();
    }
  }, [user?.id]);

  const loadRequests = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (!isAdmin) {
        params.providerId = user.id;
      }

      const response = await axios.get(`${API_URL}/api/v1/time-off`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setRequests(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error loading requests:', err);
      setError(err.response?.data?.message || 'Failed to load time-off requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await axios.post(
        `${API_URL}/api/v1/time-off/${requestId}/approve`,
        {
          approvedBy: user?.id,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess('Time-off request approved successfully');
        loadRequests();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleDenyDialogOpen = (requestId: string) => {
    setSelectedRequest(requestId);
    setDenyDialogOpen(true);
  };

  const handleDenyDialogClose = () => {
    setSelectedRequest(null);
    setDenialReason('');
    setDenyDialogOpen(false);
  };

  const handleDeny = async () => {
    if (!selectedRequest || !denialReason.trim()) {
      setError('Please provide a reason for denial');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const response = await axios.post(
        `${API_URL}/api/v1/time-off/${selectedRequest}/deny`,
        {
          approvedBy: user?.id,
          denialReason,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess('Time-off request denied');
        loadRequests();
        handleDenyDialogClose();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Error denying request:', err);
      setError(err.response?.data?.message || 'Failed to deny request');
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this time-off request?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const response = await axios.delete(
        `${API_URL}/api/v1/time-off/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess('Time-off request deleted successfully');
        loadRequests();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Error deleting request:', err);
      setError(err.response?.data?.message || 'Failed to delete request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DENIED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'VACATION':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SICK':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CONFERENCE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PERSONAL':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filterRequests = (status?: string) => {
    if (!status || status === 'all') return requests;
    return requests.filter((r) => r.status === status.toUpperCase());
  };

  const filteredRequests = filterRequests(activeTab);

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Time-Off Requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center">
              <span className="mr-3">🌴</span> Time-Off Requests
            </h1>
            <p className="text-gray-600 text-lg mt-2">Manage provider time-off and coverage</p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
          >
            <span className="mr-2 text-xl">➕</span> Request Time Off
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <span className="text-xl">✖</span>
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
            <span className="text-xl">✖</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl mb-6">
        <div className="border-b-2 border-gray-200 px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 font-semibold transition-all duration-200 border-b-4 ${
                activeTab === 'all'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 All ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 font-semibold transition-all duration-200 border-b-4 ${
                activeTab === 'pending'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ⏳ Pending ({filterRequests('pending').length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-4 font-semibold transition-all duration-200 border-b-4 ${
                activeTab === 'approved'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ✅ Approved ({filterRequests('approved').length})
            </button>
            <button
              onClick={() => setActiveTab('denied')}
              className={`px-6 py-4 font-semibold transition-all duration-200 border-b-4 ${
                activeTab === 'denied'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ❌ Denied ({filterRequests('denied').length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-8 text-center">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Requests Found</h3>
              <p className="text-gray-600">
                {activeTab === 'all'
                  ? 'Create your first time-off request to get started'
                  : `No ${activeTab} requests at this time`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500 hover:shadow-2xl transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {isAdmin && (
                          <h3 className="text-xl font-bold text-gray-800">
                            {request.provider.firstName} {request.provider.lastName}
                          </h3>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getReasonColor(request.reason)}`}>
                          {request.reason}
                        </span>
                      </div>
                      {request.notes && (
                        <p className="text-gray-600 mt-2">{request.notes}</p>
                      )}
                      {request.denialReason && (
                        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 mt-3">
                          <p className="text-sm font-semibold text-red-800">Denial Reason:</p>
                          <p className="text-sm text-red-700">{request.denialReason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Dates */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">📅 Dates</p>
                      <p className="text-sm font-bold text-blue-900">
                        {format(new Date(request.startDate), 'MMM dd, yyyy')} -{' '}
                        {format(new Date(request.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>

                    {/* Coverage */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">👤 Coverage</p>
                      {request.coverageProvider ? (
                        <>
                          <p className="text-sm font-bold text-purple-900">
                            {request.coverageProvider.firstName} {request.coverageProvider.lastName}
                          </p>
                          {request.autoReschedule && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mt-1 border border-green-200">
                              Auto-reschedule
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No coverage assigned</p>
                      )}
                    </div>

                    {/* Requester */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">✍️ Requested By</p>
                      <p className="text-sm font-bold text-amber-900">
                        {request.requester.firstName} {request.requester.lastName}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 pt-4 border-t-2 border-gray-100">
                    {isAdmin && request.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center"
                        >
                          <span className="mr-2">✅</span> Approve
                        </button>
                        <button
                          onClick={() => handleDenyDialogOpen(request.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center"
                        >
                          <span className="mr-2">❌</span> Deny
                        </button>
                      </>
                    )}
                    {request.status === 'PENDING' && request.requestedBy === user?.id && (
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="px-4 py-2 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center"
                      >
                        <span className="mr-2">🗑️</span> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time-Off Request Dialog */}
      <TimeOffRequestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setSuccess('Time-off request submitted successfully');
          loadRequests();
          setTimeout(() => setSuccess(null), 3000);
        }}
        providerId={user?.id || ''}
        requestedBy={user?.id || ''}
      />

      {/* Deny Dialog */}
      {denyDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-2">❌</span> Deny Time-Off Request
              </h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Denial *
              </label>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-red-300 focus:border-red-400 transition-all"
                rows={4}
                required
                placeholder="Please provide a reason for denying this request..."
              />
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3 border-t-2 border-gray-200">
              <button
                onClick={handleDenyDialogClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={!denialReason.trim()}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deny Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
