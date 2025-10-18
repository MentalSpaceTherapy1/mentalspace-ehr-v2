import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  credentials: string[];
  specialties: string[];
  languagesSpoken: string[];
  profileBio: string;
  profilePhotoS3: string | null;
  yearsOfExperience: number;
  approachesToTherapy: string[];
}

interface ChangeRequest {
  id: string;
  requestReason: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  denialReason: string | null;
}

export default function PortalTherapistChange() {
  const navigate = useNavigate();
  const [availableTherapists, setAvailableTherapists] = useState<Therapist[]>([]);
  const [existingRequests, setExistingRequests] = useState<ChangeRequest[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAvailableTherapists();
    fetchExistingRequests();
  }, []);

  const fetchAvailableTherapists = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/therapist/available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setAvailableTherapists(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching therapists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingRequests = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/therapist-change-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setExistingRequests(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedTherapist || !requestReason.trim()) {
      toast.error('Please select a therapist and provide a reason');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('portalToken');

      const response = await axios.post(
        '/portal/therapist-change-requests',
        {
          requestReason,
          isUrgent,
          preferredNewClinicianId: selectedTherapist.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Therapist change request submitted successfully');
        setShowForm(false);
        setSelectedTherapist(null);
        setRequestReason('');
        setIsUrgent(false);
        fetchExistingRequests();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.delete(
        `/portal/therapist-change-requests/${requestId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Request cancelled');
        fetchExistingRequests();
      }
    } catch (error: any) {
      toast.error('Failed to cancel request');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-purple-100 text-purple-800',
      DENIED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasPendingRequest = existingRequests.some((req) =>
    ['PENDING', 'UNDER_REVIEW'].includes(req.status)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Therapist Change</h1>
        <p className="text-gray-600">
          If you feel a different therapist would better meet your needs, you can request a change
        </p>
      </div>

      {/* Warning if pending request exists */}
      {hasPendingRequest && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-yellow-900">You have a pending therapist change request</p>
              <p className="text-sm text-yellow-700 mt-1">
                Please wait for your current request to be reviewed before submitting a new one.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Request Form or Button */}
      {!showForm && !hasPendingRequest && (
        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Submit New Request</span>
          </button>
        </div>
      )}

      {/* Request Form */}
      {showForm && !hasPendingRequest && (
        <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Submit Therapist Change Request</h2>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedTherapist(null);
                setRequestReason('');
                setIsUrgent(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Reason for change */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for requesting a change <span className="text-red-500">*</span>
              </label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Please explain why you feel a change would be beneficial..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Your feedback helps us ensure you receive the best care possible
              </p>
            </div>

            {/* Urgent checkbox */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="urgent"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="urgent" className="text-sm text-gray-700">
                <span className="font-medium">This is an urgent request</span>
                <p className="text-gray-500">Check this if you feel this change is time-sensitive</p>
              </label>
            </div>

            {/* Select preferred therapist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Select a preferred therapist (Optional)
              </label>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : availableTherapists.length === 0 ? (
                <p className="text-gray-500 py-4">No therapists currently accepting new clients</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTherapists.map((therapist) => (
                    <button
                      key={therapist.id}
                      onClick={() => setSelectedTherapist(therapist)}
                      className={`text-left p-4 border-2 rounded-lg transition-all ${
                        selectedTherapist?.id === therapist.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {therapist.profilePhotoS3 ? (
                          <img
                            src={therapist.profilePhotoS3}
                            alt={`${therapist.firstName} ${therapist.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-500 text-lg font-medium">
                              {therapist.firstName[0]}{therapist.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">
                            {therapist.firstName} {therapist.lastName}, {therapist.title}
                          </h3>
                          {therapist.specialties.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              {therapist.specialties.slice(0, 2).join(', ')}
                              {therapist.specialties.length > 2 && '...'}
                            </p>
                          )}
                          {therapist.yearsOfExperience && (
                            <p className="text-xs text-gray-500 mt-1">
                              {therapist.yearsOfExperience} years experience
                            </p>
                          )}
                        </div>
                        {selectedTherapist?.id === therapist.id && (
                          <svg className="w-6 h-6 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>What happens next?</strong><br />
                Your request will be reviewed by our clinical team. We'll contact you within 1-2 business days
                to discuss the transition process. Your current therapist will be notified to ensure continuity of care.
              </p>
            </div>

            {/* Submit button */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedTherapist(null);
                  setRequestReason('');
                  setIsUrgent(false);
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={isSubmitting || !requestReason.trim()}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Requests */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Requests</h2>
        </div>

        {existingRequests.length === 0 ? (
          <div className="text-center py-12 px-6">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
            <p className="text-gray-500">You haven't submitted any therapist change requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {existingRequests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        Submitted on {formatDate(request.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-2">{request.requestReason}</p>
                    {request.reviewedAt && (
                      <p className="text-sm text-gray-500 mt-2">
                        Reviewed on {formatDate(request.reviewedAt)}
                      </p>
                    )}
                    {request.denialReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-900">
                          <strong>Reason for denial:</strong> {request.denialReason}
                        </p>
                      </div>
                    )}
                  </div>
                  {['PENDING', 'UNDER_REVIEW'].includes(request.status) && (
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
