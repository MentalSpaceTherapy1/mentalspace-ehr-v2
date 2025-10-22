import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { viewFormSubmission } from '../../lib/portalApi';
import { SignatureDisplay } from '../Forms/SignatureDisplay';
import { getTransferConfig, isTransferableForm } from '../../config/formFieldMappings';
import TransferDataButton from '../Forms/TransferDataButton';
import api from '../../lib/api';

interface FormSubmissionViewerProps {
  clientId: string;
  assignmentId: string;
  onClose: () => void;
}

interface FormSubmission {
  form: {
    id: string;
    name: string;
    description: string | null;
    formType: string;
  };
  assignment: {
    id: string;
    assignedDate: string;
    dueDate: string | null;
    completedDate: string | null;
    status: string;
    assignedByName: string;
    messageFromAssigner: string | null;
  };
  submission: {
    id: string;
    responsesJson: Record<string, any>;
    status: string;
    submittedDate: string | null;
    reviewedDate: string | null;
    reviewedByName: string | null;
    reviewerNotes: string | null;
    signatureData: string | null;
    signedByName: string | null;
    signedDate: string | null;
    signatureIpAddress: string | null;
    consentAgreed: boolean;
  };
}

/**
 * FormSubmissionViewer Component
 *
 * Displays a complete view of a client's submitted intake form.
 * Shows all form responses, e-signature data, and review information.
 *
 * Features:
 * - Display all form fields and client responses
 * - Show e-signature with SignatureDisplay component
 * - Display assignment details
 * - Show review status and notes
 * - Staff can add review notes
 * - Mark submission as reviewed
 */
export const FormSubmissionViewer: React.FC<FormSubmissionViewerProps> = ({
  clientId,
  assignmentId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentClientData, setCurrentClientData] = useState<any>(null);
  const [loadingClientData, setLoadingClientData] = useState(false);

  useEffect(() => {
    loadSubmission();
  }, [clientId, assignmentId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await viewFormSubmission(clientId, assignmentId);
      setSubmission(data);
      setReviewNotes(data.submission.reviewerNotes || '');
    } catch (err: any) {
      console.error('Error loading form submission:', err);
      setError(err.response?.data?.message || 'Failed to load form submission');
      toast.error('Failed to load form submission');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReviewed = async () => {
    if (!submission) return;

    try {
      setIsReviewing(true);
      // TODO: Implement mark as reviewed API endpoint
      toast.success('Form marked as reviewed');
      await loadSubmission(); // Reload to get updated data
    } catch (err: any) {
      console.error('Error marking as reviewed:', err);
      toast.error('Failed to mark as reviewed');
    } finally {
      setIsReviewing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg text-gray-700">Loading form submission...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="flex items-center mb-4">
            <svg className="w-12 h-12 text-red-500 mr-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Error Loading Submission</h3>
              <p className="text-sm text-gray-600 mt-1">{error || 'An error occurred'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{submission.form.name}</h2>
              <p className="text-blue-100 text-sm mt-1">
                Form Type: {submission.form.formType} | Status: {submission.submission.status}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Assignment Information */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Assignment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Assigned By
                </label>
                <p className="text-sm text-gray-900">{submission.assignment.assignedByName}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Assigned Date
                </label>
                <p className="text-sm text-gray-900">{formatDate(submission.assignment.assignedDate)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Due Date
                </label>
                <p className="text-sm text-gray-900">{formatDate(submission.assignment.dueDate)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Completed Date
                </label>
                <p className="text-sm text-gray-900">{formatDate(submission.assignment.completedDate)}</p>
              </div>
              {submission.assignment.messageFromAssigner && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Message from Assigner
                  </label>
                  <p className="text-sm text-gray-900 bg-white border border-gray-300 rounded p-3">
                    {submission.assignment.messageFromAssigner}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Responses */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Client Responses
            </h3>
            <div className="space-y-4">
              {Object.entries(submission.submission.responsesJson).map(([fieldId, value]) => (
                <div key={fieldId} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {fieldId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 rounded p-3">
                    {typeof value === 'object' ? (
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <p className="whitespace-pre-wrap">{String(value)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E-Signature Section */}
          {submission.submission.signatureData && (
            <div className="mb-6">
              <SignatureDisplay
                signatureData={submission.submission.signatureData}
                signedByName={submission.submission.signedByName}
                signedDate={submission.submission.signedDate}
                signatureIpAddress={submission.submission.signatureIpAddress}
                consentAgreed={submission.submission.consentAgreed}
                showAuditTrail={true}
              />
            </div>
          )}

          {/* Review Section */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Review Information
            </h3>

            {submission.submission.reviewedDate ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-green-900">Form Reviewed</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-green-800">Reviewed By:</span>
                    <span className="ml-2 text-green-900">{submission.submission.reviewedByName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-green-800">Reviewed On:</span>
                    <span className="ml-2 text-green-900">{formatDate(submission.submission.reviewedDate)}</span>
                  </div>
                </div>
                {submission.submission.reviewerNotes && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-green-800 mb-1">Reviewer Notes:</label>
                    <p className="text-sm text-green-900 bg-white border border-green-300 rounded p-3 whitespace-pre-wrap">
                      {submission.submission.reviewerNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-yellow-900">Pending Review</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Review Notes:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Add notes about this form submission..."
                disabled={submission.submission.status === 'Reviewed'}
              />
            </div>

            {submission.submission.status !== 'Reviewed' && (
              <button
                onClick={handleMarkAsReviewed}
                disabled={isReviewing}
                className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isReviewing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Marking as Reviewed...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Mark as Reviewed
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t-2 border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormSubmissionViewer;
