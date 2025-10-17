import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface ClinicalNote {
  id: string;
  noteType: string;
  sessionDate: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suicidalIdeation: boolean;
  homicidalIdeation: boolean;
  selfHarm: boolean;
  riskLevel: string;
  riskAssessmentNotes?: string;
  interventions?: string;
  diagnosisCodes: string[];
  cptCode?: string;
  billingCode?: string;
  billable: boolean;
  nextSessionDate?: string;
  dueDate: string;
  status: 'DRAFT' | 'SIGNED' | 'PENDING_COSIGN' | 'COSIGNED' | 'LOCKED';
  requiresCosign: boolean;
  completedOnTime: boolean;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  signedDate?: string;
  cosignedDate?: string;
  signedBy?: string;
  cosignedBy?: string;
  createdAt: string;
  updatedAt: string;
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

export default function ClinicalNoteDetail() {
  const { clientId, noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSignModal, setShowSignModal] = useState(false);
  const [showCosignModal, setShowCosignModal] = useState(false);
  const [signature, setSignature] = useState('');

  const token = localStorage.getItem('token');
  const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { data: noteData, isLoading } = useQuery({
    queryKey: ['clinical-note', noteId],
    queryFn: async () => {
      const response = await apiClient.get(`/clinical-notes/${noteId}`);
      return response.data.data;
    },
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/clinical-notes/${noteId}/sign`, { signature });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      setShowSignModal(false);
      setSignature('');
    },
  });

  const cosignMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/clinical-notes/${noteId}/cosign`, { signature });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      setShowCosignModal(false);
      setSignature('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/clinical-notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  const note: ClinicalNote = noteData;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const canEdit = note?.status === 'DRAFT';
  const canSign = note?.status === 'DRAFT';
  const canCosign = note?.status === 'SIGNED' && note?.requiresCosign;
  const canDelete = note?.status === 'DRAFT';

  const handleSign = () => {
    signMutation.mutate();
  };

  const handleCosign = () => {
    cosignMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this draft note? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Clinical Note Not Found</h2>
            <button
              onClick={() => navigate(`/clients/${clientId}/notes`)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Back to Clinical Notes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/clients/${clientId}/notes`)}
            className="flex items-center text-purple-600 hover:text-purple-800 mb-4 font-semibold transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Clinical Notes
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']}`}>
                  {note.noteType}
                </span>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${STATUS_COLORS[note.status]}`}>
                  {formatStatus(note.status)}
                </span>
                {!note.completedOnTime && note.status !== 'DRAFT' && (
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                    Late Completion
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Clinical Note
              </h1>
              <p className="text-gray-600 mt-2">Session Date: {formatDate(note.sessionDate)}</p>
            </div>

            <div className="flex items-center space-x-3">
              {canEdit && (
                <button
                  onClick={() => navigate(`/clients/${clientId}/notes/${noteId}/edit`)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Edit
                </button>
              )}
              {canSign && (
                <button
                  onClick={() => setShowSignModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Sign Note
                </button>
              )}
              {canCosign && (
                <button
                  onClick={() => setShowCosignModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Co-Sign Note
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clinician Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Clinician</h3>
              <p className="text-lg font-bold text-gray-800">
                {note.clinician.title} {note.clinician.firstName} {note.clinician.lastName}
              </p>
            </div>

            {note.signedDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Signed</h3>
                <p className="text-lg font-bold text-gray-800">{formatDateTime(note.signedDate)}</p>
                {note.signedBy && <p className="text-sm text-gray-600">By: {note.signedBy}</p>}
              </div>
            )}

            {note.supervisor && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Supervisor</h3>
                <p className="text-lg font-bold text-gray-800">
                  {note.supervisor.title} {note.supervisor.firstName} {note.supervisor.lastName}
                </p>
              </div>
            )}

            {note.cosignedDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Co-Signed</h3>
                <p className="text-lg font-bold text-gray-800">{formatDateTime(note.cosignedDate)}</p>
                {note.cosignedBy && <p className="text-sm text-gray-600">By: {note.cosignedBy}</p>}
              </div>
            )}
          </div>
        </div>

        {/* SOAP Notes */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">SOAP Documentation</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-purple-700 mb-2">Subjective</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-purple-50 p-4 rounded-lg">{note.subjective}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Objective</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">{note.objective}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-2">Assessment</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-green-50 p-4 rounded-lg">{note.assessment}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-orange-700 mb-2">Plan</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-orange-50 p-4 rounded-lg">{note.plan}</p>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Risk Assessment</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Risk Indicators</h3>
              <div className="space-y-2">
                {note.suicidalIdeation && (
                  <div className="flex items-center px-4 py-2 bg-red-100 border-2 border-red-300 rounded-lg">
                    <span className="font-semibold text-red-800">✓ Suicidal Ideation</span>
                  </div>
                )}
                {note.homicidalIdeation && (
                  <div className="flex items-center px-4 py-2 bg-orange-100 border-2 border-orange-300 rounded-lg">
                    <span className="font-semibold text-orange-800">✓ Homicidal Ideation</span>
                  </div>
                )}
                {note.selfHarm && (
                  <div className="flex items-center px-4 py-2 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
                    <span className="font-semibold text-yellow-800">✓ Self-Harm</span>
                  </div>
                )}
                {!note.suicidalIdeation && !note.homicidalIdeation && !note.selfHarm && (
                  <p className="text-gray-600 italic">No risk indicators present</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Risk Level</h3>
              <div className={`px-6 py-4 rounded-lg font-bold text-lg ${
                note.riskLevel === 'None' ? 'bg-green-100 text-green-800' :
                note.riskLevel === 'Low' ? 'bg-blue-100 text-blue-800' :
                note.riskLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                note.riskLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {note.riskLevel}
              </div>
            </div>
          </div>

          {note.riskAssessmentNotes && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Risk Assessment Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{note.riskAssessmentNotes}</p>
            </div>
          )}

          {note.interventions && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Interventions</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{note.interventions}</p>
            </div>
          )}
        </div>

        {/* Diagnosis & Billing */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Diagnosis & Billing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Diagnosis Codes (ICD-10)</h3>
              <div className="flex flex-wrap gap-2">
                {note.diagnosisCodes.length > 0 ? (
                  note.diagnosisCodes.map((code) => (
                    <div
                      key={code}
                      className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg font-semibold"
                    >
                      {code}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 italic">No diagnosis codes</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {note.cptCode && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">CPT Code</h3>
                  <p className="text-lg font-bold text-gray-800">{note.cptCode}</p>
                </div>
              )}

              {note.billingCode && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Billing Code</h3>
                  <p className="text-lg font-bold text-gray-800">{note.billingCode}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Billable</h3>
                <span className={`px-4 py-2 rounded-lg font-semibold ${note.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {note.billable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Additional Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Due Date</h3>
              <p className="text-lg font-bold text-gray-800">{formatDate(note.dueDate)}</p>
            </div>

            {note.nextSessionDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Next Session Date</h3>
                <p className="text-lg font-bold text-gray-800">{formatDate(note.nextSessionDate)}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Created</h3>
              <p className="text-lg font-bold text-gray-800">{formatDateTime(note.createdAt)}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Last Updated</h3>
              <p className="text-lg font-bold text-gray-800">{formatDateTime(note.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Sign Clinical Note</h2>
            <p className="text-gray-600 mb-6">
              By signing this note, you confirm that all information is accurate and complete. Once signed, the note cannot be edited.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Electronic Signature *
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {signMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {(signMutation.error as any)?.response?.data?.message || 'Failed to sign note'}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={!signature || signMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signMutation.isPending ? 'Signing...' : 'Sign Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cosign Modal */}
      {showCosignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Co-Sign Clinical Note</h2>
            <p className="text-gray-600 mb-6">
              As the supervisor, you are verifying and approving this clinical note. Once co-signed, the note will be locked.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Electronic Signature *
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {cosignMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {(cosignMutation.error as any)?.response?.data?.message || 'Failed to co-sign note'}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowCosignModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCosign}
                disabled={!signature || cosignMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cosignMutation.isPending ? 'Co-Signing...' : 'Co-Sign Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
