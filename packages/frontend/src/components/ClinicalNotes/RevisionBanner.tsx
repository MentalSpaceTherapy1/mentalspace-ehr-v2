import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, History } from 'lucide-react';
import { api } from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

interface RevisionBannerProps {
  noteId: string;
  currentRevisionComments: string;
  currentRevisionRequiredChanges: string[];
  revisionCount: number;
  revisionHistory: any[];
  onResubmitSuccess: () => void;
}

export default function RevisionBanner({
  noteId,
  currentRevisionComments,
  currentRevisionRequiredChanges,
  revisionCount,
  revisionHistory,
  onResubmitSuccess,
}: RevisionBannerProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resubmitConfirm, setResubmitConfirm] = useState(false);

  const handleResubmitClick = () => {
    setResubmitConfirm(true);
  };

  const confirmResubmit = async () => {
    setResubmitConfirm(false);
    setIsResubmitting(true);
    setError('');

    try {
      await api.post(`/clinical-notes/${noteId}/resubmit-for-review`);
      onResubmitSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resubmit note');
      setIsResubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      {/* Main Revision Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 shadow-lg rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="bg-yellow-100 rounded-full p-3 mr-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>

          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-yellow-900 flex items-center">
                  Note Returned for Revision
                  <span className="ml-3 bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Revision #{revisionCount}
                  </span>
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please address the following feedback before resubmitting
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Supervisor Comments */}
            <div className="bg-white border-2 border-yellow-300 rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs mr-2">
                  SUPERVISOR FEEDBACK
                </span>
              </p>
              <p className="text-gray-700 leading-relaxed">{currentRevisionComments}</p>
            </div>

            {/* Required Changes Checklist */}
            <div className="bg-white border-2 border-yellow-300 rounded-lg p-4 mb-5">
              <p className="font-semibold text-gray-800 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 text-yellow-600 mr-2" />
                Required Changes ({currentRevisionRequiredChanges.length})
              </p>
              <ul className="space-y-2">
                {currentRevisionRequiredChanges.map((change, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{change}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResubmitClick}
                disabled={isResubmitting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isResubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Resubmit for Review
                  </>
                )}
              </button>

              <button
                onClick={() => setShowHistory(true)}
                className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition flex items-center"
              >
                <History className="w-5 h-5 mr-2" />
                View Revision History
              </button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-yellow-700 mt-4 flex items-start">
              <Clock className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
              <span>
                After addressing all required changes, click "Resubmit for Review" to send this note
                back to your supervisor for co-signing.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Revision History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <History className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Revision History</h2>
                    <p className="text-sm opacity-90 mt-1">
                      {revisionCount} revision{revisionCount !== 1 ? 's' : ''} total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Timeline */}
            <div className="p-6">
              {revisionHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No revision history yet</p>
              ) : (
                <div className="space-y-6">
                  {revisionHistory.map((revision: any, index: number) => (
                    <div key={index} className="relative">
                      {/* Timeline Line */}
                      {index < revisionHistory.length - 1 && (
                        <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-purple-200"></div>
                      )}

                      {/* Revision Card */}
                      <div className="flex">
                        {/* Timeline Dot */}
                        <div className="flex flex-col items-center mr-4">
                          <div className="bg-purple-100 rounded-full p-3 z-10">
                            <span className="text-purple-700 font-bold text-lg">
                              #{index + 1}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-lg p-5">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-bold text-gray-900">
                                Returned by {revision.returnedByName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(revision.date)}
                              </p>
                            </div>
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                              RETURNED
                            </span>
                          </div>

                          {/* Comments */}
                          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Supervisor Comments:
                            </p>
                            <p className="text-sm text-gray-600">{revision.comments}</p>
                          </div>

                          {/* Required Changes */}
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Required Changes:
                            </p>
                            <ul className="space-y-1">
                              {revision.requiredChanges.map((change: string, i: number) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start">
                                  <span className="text-gray-400 mr-2">•</span>
                                  {change}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Resubmission Info */}
                          {revision.resubmittedDate && (
                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="font-semibold text-green-900">
                                  Resubmitted for Review
                                </p>
                                <p className="text-green-700">
                                  {formatDate(revision.resubmittedDate)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Confirmation Modal */}
      <ConfirmModal
        isOpen={resubmitConfirm}
        onClose={() => setResubmitConfirm(false)}
        onConfirm={confirmResubmit}
        title="Resubmit Note for Review"
        message="Are you sure you want to resubmit this note for review? Make sure you have addressed all required changes."
        confirmText="Resubmit"
        confirmVariant="primary"
      />
    </>
  );
}
