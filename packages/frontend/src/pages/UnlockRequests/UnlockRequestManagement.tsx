import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface UnlockRequest {
  id: string;
  noteType: string;
  sessionDate: string;
  createdAt: string;
  unlockRequested: boolean;
  unlockRequestDate: string;
  unlockReason: string;
  isLocked: boolean;
  clientId: string;
  clinicianId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  oldestRequestDate: string | null;
}

const UnlockRequestManagement: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<UnlockRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const queryClient = useQueryClient();

  // Fetch unlock requests
  const { data: requests = [], isLoading } = useQuery<UnlockRequest[]>({
    queryKey: ['unlock-requests'],
    queryFn: async () => {
      const response = await api.get('/unlock-requests');
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ['unlock-requests-stats'],
    queryFn: async () => {
      const response = await api.get('/unlock-requests/stats');
      return response.data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await api.post(`/unlock-requests/${noteId}/approve`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unlock-requests'] });
      queryClient.invalidateQueries({ queryKey: ['unlock-requests-stats'] });
      toast.success(`Request approved. Note unlocked until ${new Date(data.unlockUntil).toLocaleString()}`);
      setShowApproveModal(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve request');
    },
  });

  // Deny mutation
  const denyMutation = useMutation({
    mutationFn: async (data: { noteId: string; denialReason: string }) => {
      const response = await api.post(`/unlock-requests/${data.noteId}/deny`, {
        denialReason: data.denialReason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlock-requests'] });
      queryClient.invalidateQueries({ queryKey: ['unlock-requests-stats'] });
      toast.success('Request denied. Clinician has been notified.');
      setShowDenyModal(false);
      setSelectedRequest(null);
      setDenialReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deny request');
    },
  });

  const handleApprove = (request: UnlockRequest) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleDeny = (request: UnlockRequest) => {
    setSelectedRequest(request);
    setShowDenyModal(true);
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const confirmDeny = () => {
    if (!denialReason.trim()) {
      toast.error('Please provide a reason for denying this request');
      return;
    }

    if (selectedRequest) {
      denyMutation.mutate({
        noteId: selectedRequest.id,
        denialReason: denialReason.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading unlock requests...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Unlock Request Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and approve unlock requests for locked clinical notes
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LockClosedIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                    <dd className="text-lg font-semibold text-yellow-600">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                    <dd className="text-lg font-semibold text-green-600">{stats.approved}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Oldest Request</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {stats.oldestRequestDate
                        ? new Date(stats.oldestRequestDate).toLocaleDateString()
                        : 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <LockClosedIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No unlock requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no pending unlock requests at this time.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.clinician.firstName} {request.clinician.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{request.clinician.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.client.firstName} {request.client.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.noteType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.sessionDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.unlockRequestDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={request.unlockReason}>
                      {request.unlockReason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(request)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowApproveModal(false)} />
            <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Unlock Request</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Clinician:</strong> {selectedRequest.clinician.firstName} {selectedRequest.clinician.lastName}</p>
                  <p><strong>Client:</strong> {selectedRequest.client.firstName} {selectedRequest.client.lastName}</p>
                  <p><strong>Note Type:</strong> {selectedRequest.noteType}</p>
                  <p><strong>Reason:</strong> {selectedRequest.unlockReason}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-green-800">
                    The note will be unlocked for 24 hours. The clinician will receive an email notification.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowApproveModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={approveMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmApprove}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deny Confirmation Modal */}
      {showDenyModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDenyModal(false)} />
            <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Deny Unlock Request</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Clinician:</strong> {selectedRequest.clinician.firstName} {selectedRequest.clinician.lastName}</p>
                  <p><strong>Their Reason:</strong> {selectedRequest.unlockReason}</p>
                </div>
                <div>
                  <label htmlFor="denialReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Denial <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="denialReason"
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="Explain why this unlock request is being denied..."
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    required
                  />
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 my-4">
                  <p className="text-sm text-red-800">
                    The clinician will receive an email with your denial reason.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDenyModal(false);
                      setDenialReason('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={denyMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeny}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    disabled={denyMutation.isPending}
                  >
                    {denyMutation.isPending ? 'Denying...' : 'Deny Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnlockRequestManagement;
