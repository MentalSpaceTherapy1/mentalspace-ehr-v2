import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryPhone: string;
  medicalRecordNumber: string;
}

interface MergeDuplicatesDialogProps {
  open: boolean;
  onClose: () => void;
  duplicate: {
    id: string;
    client1: Client;
    client2: Client;
    matchType: string;
    confidenceScore: number;
    matchFields: string[];
  };
  onMergeComplete: () => void;
}

type MergeStep = 'select' | 'confirm' | 'complete';

export default function MergeDuplicatesDialog({
  open,
  onClose,
  duplicate,
  onMergeComplete,
}: MergeDuplicatesDialogProps) {
  const [step, setStep] = useState<MergeStep>('select');
  const [targetClientId, setTargetClientId] = useState<string>('');
  const [sourceClientId, setSourceClientId] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!targetClientId || !sourceClientId) {
        throw new Error('Please select which client to keep');
      }

      const response = await api.post(`/duplicates/${duplicate.id}/merge`, {
        sourceClientId,
        targetClientId,
        resolutionNotes,
      });
      return response.data;
    },
    onSuccess: () => {
      setStep('complete');
      setTimeout(() => {
        handleClose();
        onMergeComplete();
      }, 2000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to merge clients');
    },
  });

  const handleClose = () => {
    setStep('select');
    setTargetClientId('');
    setSourceClientId('');
    setResolutionNotes('');
    setError(null);
    onClose();
  };

  const handleSelectClient = (keepClientId: string, mergeClientId: string) => {
    setTargetClientId(keepClientId);
    setSourceClientId(mergeClientId);
    setStep('confirm');
    setError(null);
  };

  const handleConfirmMerge = () => {
    mergeMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (!open) return null;

  const targetClient = targetClientId === duplicate.client1.id ? duplicate.client1 : duplicate.client2;
  const sourceClient = sourceClientId === duplicate.client1.id ? duplicate.client1 : duplicate.client2;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {step === 'select' && 'Merge Duplicate Clients'}
              {step === 'confirm' && 'Confirm Merge'}
              {step === 'complete' && 'Merge Complete'}
            </h2>
            <button
              onClick={handleClose}
              disabled={mergeMutation.isPending}
              className="text-white hover:text-gray-200 text-3xl font-bold leading-none disabled:opacity-50"
            >
              X
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select which client to keep */}
          {step === 'select' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Choose which client record to keep
                </h3>
                <p className="text-sm text-gray-600">
                  The selected client will be retained. All appointments, notes, and related records from
                  the other client will be transferred to the kept record. The other client record will be
                  marked as merged.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Client 1 Option */}
                <button
                  onClick={() => handleSelectClient(duplicate.client1.id, duplicate.client2.id)}
                  className="text-left bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-indigo-900">Keep Client 1</h4>
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold">1</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">Name</p>
                      <p className="text-sm font-bold text-gray-900">
                        {duplicate.client1.firstName} {duplicate.client1.lastName}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">MRN</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        {duplicate.client1.medicalRecordNumber}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">Date of Birth</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatDate(duplicate.client1.dateOfBirth)}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">Phone</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatPhone(duplicate.client1.primaryPhone)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg">
                      Select This Client
                    </span>
                  </div>
                </button>

                {/* Client 2 Option */}
                <button
                  onClick={() => handleSelectClient(duplicate.client2.id, duplicate.client1.id)}
                  className="text-left bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-indigo-900">Keep Client 2</h4>
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold">2</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">Name</p>
                      <p className="text-sm font-bold text-gray-900">
                        {duplicate.client2.firstName} {duplicate.client2.lastName}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">MRN</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        {duplicate.client2.medicalRecordNumber}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">Date of Birth</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatDate(duplicate.client2.dateOfBirth)}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600">Phone</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatPhone(duplicate.client2.primaryPhone)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg">
                      Select This Client
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirm merge */}
          {step === 'confirm' && (
            <div>
              <div className="mb-6">
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">Warning</span>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-900 mb-1">Warning: This action cannot be undone</h3>
                      <p className="text-sm text-yellow-800">
                        Please review the merge details carefully before confirming.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-400">
                  <h4 className="text-lg font-bold text-green-900 mb-3 flex items-center">
                    <span className="mr-2">Check</span> Client to Keep
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Name</p>
                      <p className="text-sm font-bold text-gray-900">
                        {targetClient.firstName} {targetClient.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">MRN</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        {targetClient.medicalRecordNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Date of Birth</p>
                      <p className="text-sm font-bold text-gray-900">{formatDate(targetClient.dateOfBirth)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Phone</p>
                      <p className="text-sm font-bold text-gray-900">{formatPhone(targetClient.primaryPhone)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-400">
                  <h4 className="text-lg font-bold text-red-900 mb-3 flex items-center">
                    <span className="mr-2">X</span> Client to Merge (Will be marked as merged)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Name</p>
                      <p className="text-sm font-bold text-gray-900">
                        {sourceClient.firstName} {sourceClient.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">MRN</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        {sourceClient.medicalRecordNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Date of Birth</p>
                      <p className="text-sm font-bold text-gray-900">{formatDate(sourceClient.dateOfBirth)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Phone</p>
                      <p className="text-sm font-bold text-gray-900">{formatPhone(sourceClient.primaryPhone)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-400">
                  <h4 className="text-lg font-bold text-blue-900 mb-3">What will be merged:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="mr-2">Transfer</span>
                      <span>All appointments will be transferred to the kept client</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">Transfer</span>
                      <span>All clinical notes will be transferred to the kept client</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">Transfer</span>
                      <span>All insurance information will be transferred to the kept client</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">Transfer</span>
                      <span>Emergency contacts and guardian info will be transferred to the kept client</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add any notes about this merge decision..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                />
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-xl p-4">
                  <p className="text-red-800 font-semibold">Error: {error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setStep('select');
                    setError(null);
                  }}
                  disabled={mergeMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmMerge}
                  disabled={mergeMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {mergeMutation.isPending ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="h-24 w-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4">
                  <span className="text-white text-5xl">Check</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Merge Complete!</h3>
                <p className="text-gray-600">
                  The client records have been successfully merged.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
