import { useState } from 'react';
import { X, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { api } from '../../lib/api';

interface ReturnForRevisionModalProps {
  noteId: string;
  noteType: string;
  clientName: string;
  clinicianName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REVISION_REASONS = [
  'Expand subjective section with more detail',
  'Add specific interventions used during session',
  'Clarify assessment and clinical reasoning',
  'Include risk assessment details',
  'Add progress toward treatment goals',
  'Complete diagnosis coding',
  'Add next session planning',
];

export default function ReturnForRevisionModal({
  noteId,
  noteType,
  clientName,
  clinicianName,
  onClose,
  onSuccess,
}: ReturnForRevisionModalProps) {
  const [comments, setComments] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (comments.trim().length < 10) {
      setError('Comments must be at least 10 characters');
      return;
    }

    const allReasons = [...selectedReasons];
    if (customReason.trim()) {
      allReasons.push(customReason.trim());
    }

    if (allReasons.length === 0) {
      setError('Please select or enter at least one required change');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/clinical-notes/${noteId}/return-for-revision`, {
        comments: comments.trim(),
        requiredChanges: allReasons,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to return note for revision');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Return Note for Revision</h2>
                <p className="text-sm opacity-90 mt-1">
                  {noteType} for {clientName} - By {clinicianName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Supervisor Comments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Supervisor Comments <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Provide detailed feedback on what needs to be revised (minimum 10 characters)
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Example: Please expand the assessment section with more clinical detail about the client's current functioning and response to interventions. Be specific about what progress was observed."
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {comments.length} / 10 minimum
            </div>
          </div>

          {/* Required Changes Checklist */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Required Changes <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select all changes needed (at least one required)
            </p>

            <div className="space-y-2">
              {COMMON_REVISION_REASONS.map((reason) => (
                <div
                  key={reason}
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition ${
                    selectedReasons.includes(reason)
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                  onClick={() => toggleReason(reason)}
                >
                  {selectedReasons.includes(reason) ? (
                    <CheckSquare className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm text-gray-700">{reason}</span>
                </div>
              ))}
            </div>

            {/* Custom Reason */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Additional Custom Change (Optional)
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                placeholder="Type a custom required change..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Selected Count */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">
                {selectedReasons.length + (customReason.trim() ? 1 : 0)}
              </span>{' '}
              required change(s) selected
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || comments.trim().length < 10}
            className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Returning...
              </>
            ) : (
              '↩ Return for Revision'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
