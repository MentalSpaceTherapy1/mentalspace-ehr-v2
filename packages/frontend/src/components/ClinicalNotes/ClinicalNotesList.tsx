import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ClinicalNote {
  id: string;
  noteType: string;
  sessionDate: string;
  status: 'DRAFT' | 'SIGNED' | 'PENDING_COSIGN' | 'COSIGNED' | 'LOCKED';
  requiresCosign: boolean;
  completedOnTime: boolean;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  signedDate?: string;
  cosignedDate?: string;
  createdAt: string;
}

interface TreatmentPlanStatus {
  needsUpdate: boolean;
  daysOverdue: number | null;
  lastTreatmentPlan?: {
    signedDate: string;
  };
}

interface ClinicalNotesListProps {
  clientId: string;
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
  DRAFT: 'bg-gray-100 text-gray-700',
  SIGNED: 'bg-green-100 text-green-700',
  PENDING_COSIGN: 'bg-yellow-100 text-yellow-700',
  COSIGNED: 'bg-blue-100 text-blue-700',
  LOCKED: 'bg-purple-100 text-purple-700',
};

export default function ClinicalNotesList({ clientId }: ClinicalNotesListProps) {
  const navigate = useNavigate();
  const [selectedNoteType, setSelectedNoteType] = useState<string>('all');

  const token = localStorage.getItem('token');
  const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['clinical-notes', clientId],
    queryFn: async () => {
      const response = await apiClient.get(`/clinical-notes/client/${clientId}`);
      return response.data;
    },
  });

  const { data: treatmentPlanStatus } = useQuery({
    queryKey: ['treatment-plan-status', clientId],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: TreatmentPlanStatus }>(
        `/clinical-notes/client/${clientId}/treatment-plan-status`
      );
      return response.data.data;
    },
  });

  const notes: ClinicalNote[] = notesData?.data?.notes || [];
  const filteredNotes = selectedNoteType === 'all'
    ? notes
    : notes.filter(note => note.noteType === selectedNoteType);

  const noteTypes = ['all', ...Array.from(new Set(notes.map(n => n.noteType)))];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Treatment Plan Status Alert */}
      {treatmentPlanStatus?.needsUpdate && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-orange-800">
                Treatment Plan Update Required
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Treatment Plan is {treatmentPlanStatus.daysOverdue} days overdue for update (90-day rule).
                {treatmentPlanStatus.lastTreatmentPlan && (
                  <> Last updated: {formatDate(treatmentPlanStatus.lastTreatmentPlan.signedDate)}</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Clinical Notes
          </h2>
          <p className="text-gray-600 mt-1">View and manage all clinical documentation</p>
        </div>
        <button
          onClick={() => navigate(`/clients/${clientId}/notes/new`)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
        >
          + New Clinical Note
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {noteTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedNoteType(type)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                selectedNoteType === type
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Notes' : type}
              {type !== 'all' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  {notes.filter(n => n.noteType === type).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      {notesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Clinical Notes Yet</h3>
          <p className="text-gray-600 mb-6">
            {selectedNoteType === 'all'
              ? 'Create your first clinical note to get started.'
              : `No ${selectedNoteType} notes found.`}
          </p>
          <button
            onClick={() => navigate(`/clients/${clientId}/notes/new`)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            Create First Note
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => navigate(`/clients/${clientId}/notes/${note.id}`)}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-purple-300"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']}`}>
                        {note.noteType}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[note.status]}`}>
                        {formatStatus(note.status)}
                      </span>
                      {note.requiresCosign && note.status === 'SIGNED' && (
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                          Awaiting Co-Sign
                        </span>
                      )}
                      {!note.completedOnTime && note.status !== 'DRAFT' && (
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                          Late Completion
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Session Date: <span className="font-semibold ml-1">{formatDate(note.sessionDate)}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Clinician: <span className="font-semibold ml-1">
                          {note.clinician.title} {note.clinician.firstName} {note.clinician.lastName}
                        </span>
                      </div>

                      {note.signedDate && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Signed: <span className="font-semibold ml-1">{formatDate(note.signedDate)}</span>
                        </div>
                      )}

                      {note.cosignedDate && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Co-Signed: <span className="font-semibold ml-1">{formatDate(note.cosignedDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
