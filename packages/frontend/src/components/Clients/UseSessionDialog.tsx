import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface PriorAuthorization {
  id: string;
  clientId: string;
  authorizationNumber: string;
  sessionsAuthorized: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  insurance: {
    insuranceCompany: string;
  };
}

interface UseSessionDialogProps {
  authorization: PriorAuthorization;
  onClose: () => void;
}

export default function UseSessionDialog({ authorization, onClose }: UseSessionDialogProps) {
  const queryClient = useQueryClient();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const useSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/prior-authorizations/${authorization.id}/use-session`, {
        sessionDate: new Date(sessionDate).toISOString(),
        notes: notes || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prior-authorizations', authorization.clientId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    useSessionMutation.mutate();
  };

  const isLastSession = authorization.sessionsRemaining === 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Use Session</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Authorization Info */}
          <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-600">Authorization</p>
              <p className="text-lg font-bold text-gray-900">{authorization.authorizationNumber}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-600">Insurance</p>
              <p className="text-base font-bold text-gray-900">{authorization.insurance.insuranceCompany}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/70 p-2 rounded-lg">
                <p className="text-xs font-semibold text-gray-600">Authorized</p>
                <p className="text-xl font-bold text-gray-900">{authorization.sessionsAuthorized}</p>
              </div>
              <div className="bg-white/70 p-2 rounded-lg">
                <p className="text-xs font-semibold text-gray-600">Used</p>
                <p className="text-xl font-bold text-gray-900">{authorization.sessionsUsed}</p>
              </div>
              <div className="bg-white/70 p-2 rounded-lg">
                <p className="text-xs font-semibold text-gray-600">Remaining</p>
                <p className={`text-xl font-bold ${
                  authorization.sessionsRemaining < 5 ? 'text-red-600' :
                  authorization.sessionsRemaining < 10 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {authorization.sessionsRemaining}
                </p>
              </div>
            </div>
          </div>

          {/* Warning for last session */}
          {isLastSession && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-red-50 border-2 border-amber-400 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-amber-900 mb-1">Last Session Warning</p>
                  <p className="text-sm text-amber-800">
                    This is the last session available on this authorization. Consider submitting a renewal request.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session Date */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Session Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">Session date cannot be in the future</p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this session..."
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 resize-none"
            />
          </div>

          {/* After Usage Preview */}
          <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
            <p className="text-sm font-semibold text-gray-600 mb-2">After this session:</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Sessions Used</p>
                <p className="text-lg font-bold text-gray-900">{authorization.sessionsUsed + 1}</p>
              </div>
              <div className="text-2xl">→</div>
              <div>
                <p className="text-xs text-gray-600">Sessions Remaining</p>
                <p className={`text-lg font-bold ${
                  authorization.sessionsRemaining - 1 < 5 ? 'text-red-600' :
                  authorization.sessionsRemaining - 1 < 10 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {authorization.sessionsRemaining - 1}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {useSessionMutation.isError && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl">
              <p className="text-sm font-semibold text-red-800">
                Failed to use session. Please try again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={useSessionMutation.isPending}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={useSessionMutation.isPending}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {useSessionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Confirm Use Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
