/**
 * DuplicateWarningModal Component
 * Displays a warning when potential duplicate clients are detected during creation
 * Allows user to: View Existing Client, Create Anyway, or Cancel
 */

import { useNavigate } from 'react-router-dom';

interface DuplicateMatch {
  clientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryPhone: string;
  email?: string;
  mrn?: string;
  matchType: 'EXACT' | 'PHONETIC' | 'FUZZY' | 'PARTIAL' | 'ADDRESS';
  confidence: number;
  matchingFields: string[];
}

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAnyway: () => void;
  duplicates: DuplicateMatch[];
  isCreating: boolean;
}

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  onCreateAnyway,
  duplicates,
  isCreating
}: DuplicateWarningModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-red-100 text-red-800 border-red-300';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'EXACT': return 'Exact Match';
      case 'PHONETIC': return 'Similar Name';
      case 'FUZZY': return 'Partial Match';
      case 'PARTIAL': return 'DOB Match';
      case 'ADDRESS': return 'Address Match';
      default: return type;
    }
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl px-6 py-4">
            <div className="flex items-center">
              <span className="text-3xl mr-3">⚠️</span>
              <div>
                <h2 className="text-xl font-bold text-white">Potential Duplicate Detected</h2>
                <p className="text-amber-100 text-sm">
                  {duplicates.length} existing client{duplicates.length > 1 ? 's' : ''} match the information you entered
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            <p className="text-gray-600 mb-4">
              The following client{duplicates.length > 1 ? 's' : ''} may already exist in the system.
              Please review before creating a new record.
            </p>

            {/* Duplicate Cards */}
            <div className="space-y-3">
              {duplicates.map((duplicate, index) => (
                <div
                  key={duplicate.clientId || index}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {duplicate.firstName} {duplicate.lastName}
                      </h3>
                      {duplicate.mrn && (
                        <p className="text-sm text-gray-500">MRN: {duplicate.mrn}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getConfidenceColor(duplicate.confidence)}`}>
                        {Math.round(duplicate.confidence * 100)}% Match
                      </span>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                        {getMatchTypeLabel(duplicate.matchType)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">DOB:</span> {formatDate(duplicate.dateOfBirth)}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {duplicate.primaryPhone}
                    </div>
                    {duplicate.email && (
                      <div className="col-span-2">
                        <span className="font-medium">Email:</span> {duplicate.email}
                      </div>
                    )}
                  </div>

                  {duplicate.matchingFields && duplicate.matchingFields.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-500">Matching fields: </span>
                      <span className="text-xs text-amber-600">
                        {duplicate.matchingFields.join(', ')}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleViewClient(duplicate.clientId)}
                    className="w-full px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold rounded-lg transition-colors text-sm"
                  >
                    View This Client
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onCreateAnyway}
                disabled={isCreating}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">➕</span>
                    Create Anyway
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Creating a duplicate client may result in fragmented medical records and billing issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
