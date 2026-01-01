import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface UnlockRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteType: string;
  clientName: string;
  sessionDate: string;
}

const UnlockRequestModal: React.FC<UnlockRequestModalProps> = ({
  isOpen,
  onClose,
  noteId,
  noteType,
  clientName,
  sessionDate,
}) => {
  const [unlockReason, setUnlockReason] = useState('');
  const queryClient = useQueryClient();

  const requestUnlockMutation = useMutation({
    mutationFn: async (data: { unlockReason: string }) => {
      const response = await api.post(`/unlock-requests/${noteId}/request`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clinical-note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['clinical-notes'] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      toast.success(`Unlock request submitted successfully. ${data.notifiedTo} has been notified.`);
      setUnlockReason('');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit unlock request');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!unlockReason.trim()) {
      toast.error('Please provide a reason for unlocking this note');
      return;
    }

    if (unlockReason.trim().length < 20) {
      toast.error('Please provide a more detailed reason (at least 20 characters)');
      return;
    }

    requestUnlockMutation.mutate({ unlockReason: unlockReason.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">Request Note Unlock</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4">
              {/* Note Information */}
              <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Note Details</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><strong>Note Type:</strong> {noteType}</p>
                  <p><strong>Client:</strong> {clientName}</p>
                  <p><strong>Session Date:</strong> {new Date(sessionDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">
                  <strong>Important:</strong> This note was locked because it exceeded the documentation deadline.
                  Your supervisor or administrator will review your request and may approve a 24-hour unlock window.
                </p>
              </div>

              {/* Reason Input */}
              <div>
                <label htmlFor="unlockReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Unlock Request <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="unlockReason"
                  rows={5}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Please provide a detailed explanation for why you need to unlock this note. Include any relevant circumstances that prevented timely completion."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  required
                  minLength={20}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 20 characters required. Be specific and professional.
                </p>
              </div>

              {/* Instructions */}
              <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Your supervisor or administrator will be notified via email</li>
                  <li>They will review your request and reason</li>
                  <li>If approved, the note will be unlocked for 24 hours</li>
                  <li>You'll receive an email notification with the decision</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={requestUnlockMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={requestUnlockMutation.isPending}
              >
                {requestUnlockMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UnlockRequestModal;
