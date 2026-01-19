import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface ClinicalNote {
  id: string;
  noteType: string;
  sessionDate: string;
  status: string;
  signedDate?: string;
  cosignedDate?: string;
  isLocked: boolean;
  requiresCosign: boolean;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  cosigner?: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  appointment?: {
    id: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
  };
}

interface MyNotesData {
  data: ClinicalNote[];
  stats: {
    total: number;
    draft: number;
    signed: number;
    pendingCosign: number;
    cosigned: number;
    locked: number;
    overdue: number;
  };
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-800 border-blue-300',
  SIGNED: 'bg-green-100 text-green-800 border-green-300',
  PENDING_COSIGN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  COSIGNED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  LOCKED: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function MyNotes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'status'>('date');

  const { data: notesData, isLoading } = useQuery<MyNotesData>({
    queryKey: ['my-notes', searchTerm, statusFilter, noteTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (noteTypeFilter) params.append('noteType', noteTypeFilter);

      const response = await api.get(`/clinical-notes/my-notes?${params.toString()}`);
      return response.data;
    },
  });

  const notes = notesData?.data || [];
  const stats = notesData?.stats;

  // Sort notes
  const sortedNotes = [...notes].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
    } else if (sortBy === 'client') {
      return `${a.client.lastName} ${a.client.firstName}`.localeCompare(
        `${b.client.lastName} ${b.client.firstName}`
      );
    } else if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

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

  const getDaysAgo = (date: string | null | undefined) => {
    if (!date) return 'Unknown';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime()) || parsed.getTime() === 0) return 'Unknown';
    const days = Math.floor((new Date().getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                My Clinical Notes
              </h1>
              <p className="text-gray-600">View and manage all your clinical notes across all clients</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <button
            onClick={() => setStatusFilter('')}
            className={`bg-gradient-to-br ${
              statusFilter === ''
                ? 'from-purple-600 to-pink-700 ring-4 ring-purple-300'
                : 'from-purple-400 to-pink-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-purple-100 text-xs font-semibold mb-1">Total</p>
            <p className="text-3xl font-bold">{stats?.total || 0}</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')}
            className={`bg-gradient-to-br ${
              statusFilter === 'DRAFT'
                ? 'from-blue-600 to-indigo-700 ring-4 ring-blue-300'
                : 'from-blue-400 to-indigo-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-blue-100 text-xs font-semibold mb-1">Drafts</p>
            <p className="text-3xl font-bold">{stats?.draft || 0}</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'SIGNED' ? '' : 'SIGNED')}
            className={`bg-gradient-to-br ${
              statusFilter === 'SIGNED'
                ? 'from-green-600 to-emerald-700 ring-4 ring-green-300'
                : 'from-green-400 to-emerald-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-green-100 text-xs font-semibold mb-1">Signed</p>
            <p className="text-3xl font-bold">{stats?.signed || 0}</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'PENDING_COSIGN' ? '' : 'PENDING_COSIGN')}
            className={`bg-gradient-to-br ${
              statusFilter === 'PENDING_COSIGN'
                ? 'from-yellow-600 to-orange-700 ring-4 ring-yellow-300'
                : 'from-yellow-400 to-orange-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-yellow-100 text-xs font-semibold mb-1">Pending</p>
            <p className="text-3xl font-bold">{stats?.pendingCosign || 0}</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'COSIGNED' ? '' : 'COSIGNED')}
            className={`bg-gradient-to-br ${
              statusFilter === 'COSIGNED'
                ? 'from-emerald-600 to-teal-700 ring-4 ring-emerald-300'
                : 'from-emerald-400 to-teal-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-emerald-100 text-xs font-semibold mb-1">Cosigned</p>
            <p className="text-3xl font-bold">{stats?.cosigned || 0}</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'LOCKED' ? '' : 'LOCKED')}
            className={`bg-gradient-to-br ${
              statusFilter === 'LOCKED'
                ? 'from-gray-600 to-gray-700 ring-4 ring-gray-300'
                : 'from-gray-400 to-gray-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-gray-100 text-xs font-semibold mb-1">Locked</p>
            <p className="text-3xl font-bold">{stats?.locked || 0}</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? '' : 'OVERDUE')}
            className={`bg-gradient-to-br ${
              statusFilter === 'OVERDUE'
                ? 'from-red-600 to-orange-700 ring-4 ring-red-300'
                : 'from-red-400 to-orange-500 hover:shadow-lg'
            } rounded-xl shadow-lg p-4 text-white transition-all`}
          >
            <p className="text-red-100 text-xs font-semibold mb-1">Overdue</p>
            <p className="text-3xl font-bold">{stats?.overdue || 0}</p>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Notes
              </label>
              <input
                type="text"
                placeholder="Search by client name or note content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Note Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note Type
              </label>
              <select
                value={noteTypeFilter}
                onChange={(e) => setNoteTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="Intake Assessment">Intake Assessment</option>
                <option value="Progress Note">Progress Note</option>
                <option value="Treatment Plan">Treatment Plan</option>
                <option value="Cancellation Note">Cancellation Note</option>
                <option value="Consultation Note">Consultation Note</option>
                <option value="Contact Note">Contact Note</option>
                <option value="Termination Note">Termination Note</option>
                <option value="Miscellaneous Note">Miscellaneous Note</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'client' | 'status')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="date">Date (Newest First)</option>
                <option value="client">Client Name</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter || noteTypeFilter) && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {sortedNotes.length} of {stats?.total || 0} notes
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setNoteTypeFilter('');
                }}
                className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Notes Found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter || noteTypeFilter
                ? 'Try adjusting your filters or search terms.'
                : 'You haven\'t created any clinical notes yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedNotes.map((note) => {
              const isOverdue =
                !note.signedDate &&
                Math.floor((new Date().getTime() - new Date(note.sessionDate).getTime()) / (1000 * 60 * 60 * 24)) > 3;

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    if (note.status === 'DRAFT') {
                      navigate(`/clients/${note.client.id}/notes/${note.id}/edit`);
                    } else {
                      navigate(`/clients/${note.client.id}/notes/${note.id}`);
                    }
                  }}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-purple-300"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${
                            NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']
                          }`}
                        >
                          {note.noteType}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                            STATUS_COLORS[note.status] || 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}
                        >
                          {note.status === 'PENDING_COSIGN' ? 'Pending Co-Sign' : note.status}
                        </span>
                        {note.isLocked && (
                          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                            🔒 LOCKED
                          </span>
                        )}
                        {isOverdue && (
                          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                            ⚠️ OVERDUE
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500">{getDaysAgo(note.sessionDate)}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1">Client</h4>
                        <p className="text-sm font-bold text-gray-800">
                          {note.client.firstName} {note.client.lastName}
                        </p>
                        <p className="text-xs text-gray-600">MRN: {note.client.medicalRecordNumber}</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1">Session Date</h4>
                        <p className="text-sm font-bold text-gray-800">{formatDate(note.sessionDate)}</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1">
                          {note.signedDate ? 'Signed Date' : 'Created Date'}
                        </h4>
                        <p className="text-sm font-bold text-gray-800">
                          {note.signedDate ? formatDate(note.signedDate) : 'Not signed'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1">Co-Signer</h4>
                        <p className="text-sm font-bold text-gray-800">
                          {note.cosigner
                            ? `${note.cosigner.title} ${note.cosigner.firstName} ${note.cosigner.lastName}`
                            : note.requiresCosign
                            ? 'Pending'
                            : 'N/A'}
                        </p>
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
