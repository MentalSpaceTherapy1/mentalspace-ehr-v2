import { useNavigate, useParams } from 'react-router-dom';

const NOTE_TYPES = [
  {
    type: 'Intake Assessment',
    description: 'Comprehensive initial evaluation with full assessment',
    icon: '📋',
    color: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300',
  },
  {
    type: 'Progress Note',
    description: 'Session-by-session documentation of treatment progress',
    icon: '📝',
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300',
  },
  {
    type: 'Treatment Plan',
    description: 'Formal treatment planning with goals and objectives',
    icon: '🎯',
    color: 'from-green-500 to-green-600',
    borderColor: 'border-green-300',
  },
  {
    type: 'Cancellation Note',
    description: 'Document session cancellations and rescheduling',
    icon: '❌',
    color: 'from-yellow-500 to-orange-500',
    borderColor: 'border-yellow-300',
  },
  {
    type: 'Consultation Note',
    description: 'Document consultations with other providers',
    icon: '👥',
    color: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300',
  },
  {
    type: 'Contact Note',
    description: 'Brief documentation of client contacts',
    icon: '📞',
    color: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300',
  },
  {
    type: 'Termination Note',
    description: 'Discharge documentation and aftercare planning',
    icon: '🏁',
    color: 'from-red-500 to-red-600',
    borderColor: 'border-red-300',
  },
  {
    type: 'Miscellaneous Note',
    description: 'General documentation and administrative notes',
    icon: '📄',
    color: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300',
  },
];

export default function NoteTypeSelector() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const handleSelectNoteType = (noteType: string) => {
    const urlSafeType = noteType.toLowerCase().replace(/\s+/g, '-');
    navigate(`/clients/${clientId}/notes/new/${urlSafeType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/clients/${clientId}`)}
            className="flex items-center text-purple-600 hover:text-purple-800 mb-4 font-semibold transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Client
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Select Note Type
          </h1>
          <p className="text-gray-600">Choose the type of clinical note you want to create</p>
        </div>

        {/* Note Type Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {NOTE_TYPES.map((noteType) => (
            <button
              key={noteType.type}
              onClick={() => handleSelectNoteType(noteType.type)}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 p-6 text-left border-2 ${noteType.borderColor} hover:border-opacity-100 border-opacity-50`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`text-5xl bg-gradient-to-r ${noteType.color} rounded-2xl p-3 shadow-md`}>
                  {noteType.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{noteType.type}</h3>
              <p className="text-sm text-gray-600">{noteType.description}</p>
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Note:</span> Each note type has its own specific form fields tailored to that documentation requirement.
                Progress Notes require a completed Intake Assessment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
