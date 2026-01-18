import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface ClinicalNote {
  id: string;
  noteType: string;
  sessionDate: string;
  status: string;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  signedDate: string;
  createdAt: string;
}

const NOTE_TYPE_COLORS: Record<string, string> = {
  'Intake Assessment': 'bg-purple-100 text-purple-800 border-purple-300',
  'Progress Note': 'bg-blue-100 text-blue-800 border-blue-300',
  'Treatment Plan': 'bg-green-100 text-green-800 border-green-300',
  'Cancellation Note': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Consultation Note': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'Contact Note': 'bg-pink-100 text-pink-800 border-pink-300',
  'Termination Note': 'bg-red-100 text-red-800 border-red-300',
  'Miscellaneous Note': 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function CosignQueue() {
  const navigate = useNavigate();


  const { data: notesData, isLoading } = useQuery({
    queryKey: ['cosign-queue'],
    queryFn: async () => {
      const response = await api.get('/supervision/cosign-queue');
      return response.data;
    },
  });

  const notes: ClinicalNote[] = notesData?.data || [];

  // Timezone-safe date formatting - parses ISO string directly to avoid timezone shifts
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not specified';
    const datePart = date.split('T')[0];
    if (!datePart) return 'Not specified';
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return 'Not specified';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return 'Not specified';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime()) || parsed.getTime() === 0) return 'Not specified';

    // Explicitly use the user's detected timezone to ensure proper UTC to local conversion
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone,
    });
  };

  const getDaysWaiting = (signedDate: string | null | undefined) => {
    if (!signedDate) return 0;
    const parsed = new Date(signedDate);
    if (isNaN(parsed.getTime()) || parsed.getTime() === 0) return 0;
    const days = Math.floor((new Date().getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Co-Signing Queue
              </h1>
              <p className="text-gray-600">Clinical notes awaiting your co-signature as supervisor</p>
            </div>
            <button
              onClick={() => navigate('/clients')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              + New Clinical Note
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-semibold mb-1">Pending</p>
                <p className="text-4xl font-bold">{notes.length}</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold mb-1">Urgent (&gt;3 days)</p>
                <p className="text-4xl font-bold">
                  {notes.filter(n => getDaysWaiting(n.signedDate) > 3).length}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-semibold mb-1">Clinicians</p>
                <p className="text-4xl font-bold">
                  {new Set(notes.map(n => n.clinician.id)).size}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">There are no clinical notes waiting for your co-signature.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const daysWaiting = getDaysWaiting(note.signedDate);
              const isUrgent = daysWaiting > 3;

              return (
                <div
                  key={note.id}
                  onClick={() => navigate(`/clients/${note.client.id}/notes/${note.id}`)}
                  className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 ${
                    isUrgent ? 'border-orange-300 hover:border-orange-400' : 'border-transparent hover:border-purple-300'
                  }`}
                >
                  <div className="p-6">
                    {isUrgent && (
                      <div className="mb-4 px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 border-l-4 border-orange-500 rounded">
                        <p className="text-sm font-semibold text-orange-800">
                          ⚠️ Urgent: Waiting {daysWaiting} days for co-signature
                        </p>
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-4">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']}`}>
                            {note.noteType}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                            Awaiting Co-Sign
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Client</h4>
                            <p className="text-sm font-bold text-gray-800">
                              {note.client.firstName} {note.client.lastName}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Clinician</h4>
                            <p className="text-sm font-bold text-gray-800">
                              {note.clinician.title} {note.clinician.firstName} {note.clinician.lastName}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Session Date</h4>
                            <p className="text-sm font-bold text-gray-800">{formatDate(note.sessionDate)}</p>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Signed Date</h4>
                            <p className="text-sm font-bold text-gray-800">{formatDateTime(note.signedDate)}</p>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Days Waiting</h4>
                            <p className={`text-sm font-bold ${
                              daysWaiting > 3 ? 'text-orange-600' : 'text-gray-800'
                            }`}>
                              {daysWaiting} {daysWaiting === 1 ? 'day' : 'days'}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Created</h4>
                            <p className="text-sm font-bold text-gray-800">{formatDate(note.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/clients/${note.client.id}/notes/${note.id}`);
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                        >
                          Co-Sign Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
