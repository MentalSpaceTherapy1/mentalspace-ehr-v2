import { useNavigate } from 'react-router-dom';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryPhone: string;
  medicalRecordNumber: string;
}

interface DuplicateMatchCardProps {
  duplicate: {
    id: string;
    client1: Client;
    client2: Client;
    matchType: string;
    confidenceScore: number;
    matchFields: string[];
    createdAt: string;
  };
  onMerge: () => void;
  onDismiss: () => void;
  dismissing?: boolean;
}

export default function DuplicateMatchCard({
  duplicate,
  onMerge,
  onDismiss,
  dismissing = false,
}: DuplicateMatchCardProps) {
  const navigate = useNavigate();

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

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'from-red-500 to-rose-600';
    if (score >= 0.7) return 'from-yellow-500 to-amber-600';
    return 'from-green-500 to-emerald-600';
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 0.9) return 'bg-gradient-to-r from-red-500 to-rose-600';
    if (score >= 0.7) return 'bg-gradient-to-r from-yellow-500 to-amber-600';
    return 'bg-gradient-to-r from-green-500 to-emerald-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'High Risk';
    if (score >= 0.7) return 'Medium Risk';
    return 'Low Risk';
  };

  const getMatchTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'EXACT':
        return 'bg-gradient-to-r from-red-600 to-rose-700';
      case 'PHONETIC':
        return 'bg-gradient-to-r from-orange-500 to-amber-600';
      case 'FUZZY':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600';
      case 'PARTIAL':
        return 'bg-gradient-to-r from-purple-500 to-pink-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-600';
    }
  };

  const isFieldMatched = (fieldName: string) => {
    return duplicate.matchFields.includes(fieldName);
  };

  const renderClientInfo = (client: Client, label: string) => (
    <div className="flex-1 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-indigo-900">{label}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/clients/${client.id}`);
          }}
          className="px-3 py-1 text-xs font-bold bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-sm"
        >
          View Profile
        </button>
      </div>

      <div className="space-y-2">
        <div
          className={`p-2 rounded-lg ${
            isFieldMatched('firstName') || isFieldMatched('lastName')
              ? 'bg-yellow-100 border-2 border-yellow-400'
              : 'bg-white'
          }`}
        >
          <p className="text-xs font-semibold text-gray-600">Name</p>
          <p className="text-sm font-bold text-gray-900">
            {client.firstName} {client.lastName}
            {(isFieldMatched('firstName') || isFieldMatched('lastName')) && (
              <span className="ml-2 text-yellow-600 text-xs">MATCH</span>
            )}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-white">
          <p className="text-xs font-semibold text-gray-600">MRN</p>
          <p className="text-sm font-bold text-gray-900 font-mono">{client.medicalRecordNumber}</p>
        </div>

        <div
          className={`p-2 rounded-lg ${
            isFieldMatched('dateOfBirth')
              ? 'bg-yellow-100 border-2 border-yellow-400'
              : 'bg-white'
          }`}
        >
          <p className="text-xs font-semibold text-gray-600">Date of Birth</p>
          <p className="text-sm font-bold text-gray-900">
            {formatDate(client.dateOfBirth)}
            {isFieldMatched('dateOfBirth') && (
              <span className="ml-2 text-yellow-600 text-xs">MATCH</span>
            )}
          </p>
        </div>

        <div
          className={`p-2 rounded-lg ${
            isFieldMatched('primaryPhone')
              ? 'bg-yellow-100 border-2 border-yellow-400'
              : 'bg-white'
          }`}
        >
          <p className="text-xs font-semibold text-gray-600">Phone</p>
          <p className="text-sm font-bold text-gray-900">
            {formatPhone(client.primaryPhone)}
            {isFieldMatched('primaryPhone') && (
              <span className="ml-2 text-yellow-600 text-xs">MATCH</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-200">
      {/* Header with badges and scores */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg ${getMatchTypeBadgeColor(
                duplicate.matchType
              )}`}
            >
              {duplicate.matchType}
            </span>
            <span
              className={`px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg ${getConfidenceBadgeColor(
                duplicate.confidenceScore
              )}`}
            >
              {getConfidenceLabel(duplicate.confidenceScore)} ({(duplicate.confidenceScore * 100).toFixed(0)}%)
            </span>
          </div>

          <div className="text-sm text-gray-600">
            Detected: {new Date(duplicate.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Matching fields summary */}
        {duplicate.matchFields.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Matching Fields:</span>
            {duplicate.matchFields.map((field) => (
              <span
                key={field}
                className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold"
              >
                {field}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Client comparison */}
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          {renderClientInfo(duplicate.client1, 'Client 1')}

          <div className="flex items-center justify-center">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">VS</span>
            </div>
          </div>

          {renderClientInfo(duplicate.client2, 'Client 2')}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDismiss}
            disabled={dismissing}
            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dismissing ? 'Dismissing...' : 'Dismiss - Not a Duplicate'}
          </button>
          <button
            onClick={onMerge}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Merge Clients
          </button>
        </div>
      </div>
    </div>
  );
}
