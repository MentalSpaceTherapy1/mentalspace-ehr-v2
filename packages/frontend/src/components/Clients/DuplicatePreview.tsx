/**
 * DuplicatePreview Component
 * Shows real-time potential duplicate matches as user types in the client form
 * Displays inline below the name/DOB fields with clickable links to existing clients
 * @version 1.0.1
 */

import { useNavigate } from 'react-router-dom';

interface DuplicateMatch {
  clientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryPhone?: string;
  email?: string;
  mrn?: string;
  matchType: 'EXACT' | 'PHONETIC' | 'FUZZY' | 'PARTIAL' | 'ADDRESS';
  confidence: number;
  matchingFields: string[];
}

interface DuplicatePreviewProps {
  matches: DuplicateMatch[];
  isSearching: boolean;
  onViewClient: (clientId: string) => void;
}

export default function DuplicatePreview({
  matches,
  isSearching,
  onViewClient,
}: DuplicatePreviewProps) {
  const navigate = useNavigate();

  // Don't render if no matches and not searching
  if (!isSearching && matches.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          {Math.round(confidence * 100)}% match
        </span>
      );
    }
    if (confidence >= 0.7) {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
          {Math.round(confidence * 100)}% match
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
        {Math.round(confidence * 100)}% match
      </span>
    );
  };

  const handleViewClient = (clientId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Open in new tab to preserve form data
    window.open(`/clients/${clientId}`, '_blank');
  };

  return (
    <div className="mt-4 mb-2">
      {isSearching ? (
        <div className="flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-2"></div>
          Checking for existing clients...
        </div>
      ) : matches.length > 0 ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start mb-3">
            <span className="text-xl mr-2">&#9888;</span>
            <div>
              <h4 className="font-bold text-amber-800">
                Potential Match{matches.length > 1 ? 'es' : ''} Found
              </h4>
              <p className="text-sm text-amber-700">
                {matches.length} existing client{matches.length > 1 ? 's' : ''}{' '}
                match the information you're entering
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {matches.slice(0, 5).map((match, index) => (
              <div
                key={match.clientId || index}
                className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between hover:border-amber-400 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {match.firstName} {match.lastName}
                    </span>
                    {getConfidenceBadge(match.confidence)}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>DOB: {formatDate(match.dateOfBirth)}</span>
                    {match.primaryPhone && (
                      <span>Phone: {match.primaryPhone}</span>
                    )}
                    {match.mrn && <span>MRN: {match.mrn}</span>}
                  </div>
                  {match.matchingFields && match.matchingFields.length > 0 && (
                    <div className="mt-1 text-xs text-amber-600">
                      Matching: {match.matchingFields.join(', ')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => handleViewClient(match.clientId, e)}
                  className="ml-3 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  View Client
                </button>
              </div>
            ))}

            {matches.length > 5 && (
              <p className="text-sm text-amber-600 text-center mt-2">
                + {matches.length - 5} more potential match
                {matches.length - 5 > 1 ? 'es' : ''}
              </p>
            )}
          </div>

          <p className="text-xs text-amber-600 mt-3 text-center">
            Please verify these are different individuals before creating a new
            client record.
          </p>
        </div>
      ) : null}
    </div>
  );
}
