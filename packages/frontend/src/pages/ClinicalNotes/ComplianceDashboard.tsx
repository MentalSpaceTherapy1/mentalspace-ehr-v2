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
  lockedDate?: string;
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
}

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  daysSince: number;
  isOverdue: boolean;
  isUrgent: boolean;
}

interface ComplianceDashboardData {
  notesAwaitingCosign: ClinicalNote[];
  overdueNotes: ClinicalNote[];
  lockedNotes: ClinicalNote[];
  draftNotes: ClinicalNote[];
  appointmentsWithoutNotes: Appointment[];
  stats: {
    awaitingCosign: number;
    overdue: number;
    locked: number;
    drafts: number;
    missingNotes: number;
    urgent: number;
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

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cosign' | 'missing' | 'overdue' | 'locked' | 'drafts'>('missing');

  const { data: dashboardData, isLoading } = useQuery<{ data: ComplianceDashboardData }>({
    queryKey: ['compliance-dashboard'],
    queryFn: async () => {
      const response = await api.get('/clinical-notes/compliance/dashboard');
      return response.data;
    },
  });

  const data = dashboardData?.data;

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

  const formatTime = (time: string) => {
    return time;
  };

  const getDaysText = (days: number) => {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Clinical Notes Compliance
              </h1>
              <p className="text-gray-600">Track and manage your clinical documentation compliance</p>
            </div>
            <button
              onClick={() => navigate('/clinical-notes/new')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              + New Clinical Note
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <button
            onClick={() => setActiveTab('missing')}
            className={`bg-gradient-to-br ${
              activeTab === 'missing'
                ? 'from-red-500 to-orange-600 text-white ring-4 ring-red-300'
                : 'from-red-400 to-orange-500 text-white hover:shadow-lg'
            } rounded-2xl shadow-xl p-6 transition-all duration-200 transform hover:scale-105`}
          >
            <div className="text-left">
              <p className="text-red-100 text-xs font-semibold mb-1">Missing Notes</p>
              <p className="text-3xl font-bold">{data?.stats.missingNotes || 0}</p>
              <p className="text-red-100 text-xs mt-1">Appointments without notes</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`bg-gradient-to-br ${
              activeTab === 'overdue'
                ? 'from-orange-500 to-yellow-600 text-white ring-4 ring-orange-300'
                : 'from-orange-400 to-yellow-500 text-white hover:shadow-lg'
            } rounded-2xl shadow-xl p-6 transition-all duration-200 transform hover:scale-105`}
          >
            <div className="text-left">
              <p className="text-orange-100 text-xs font-semibold mb-1">Overdue</p>
              <p className="text-3xl font-bold">{data?.stats.overdue || 0}</p>
              <p className="text-orange-100 text-xs mt-1">Past 3-day deadline</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('drafts')}
            className={`bg-gradient-to-br ${
              activeTab === 'drafts'
                ? 'from-blue-500 to-indigo-600 text-white ring-4 ring-blue-300'
                : 'from-blue-400 to-indigo-500 text-white hover:shadow-lg'
            } rounded-2xl shadow-xl p-6 transition-all duration-200 transform hover:scale-105`}
          >
            <div className="text-left">
              <p className="text-blue-100 text-xs font-semibold mb-1">Drafts</p>
              <p className="text-3xl font-bold">{data?.stats.drafts || 0}</p>
              <p className="text-blue-100 text-xs mt-1">Incomplete notes</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('cosign')}
            className={`bg-gradient-to-br ${
              activeTab === 'cosign'
                ? 'from-purple-500 to-pink-600 text-white ring-4 ring-purple-300'
                : 'from-purple-400 to-pink-500 text-white hover:shadow-lg'
            } rounded-2xl shadow-xl p-6 transition-all duration-200 transform hover:scale-105`}
          >
            <div className="text-left">
              <p className="text-purple-100 text-xs font-semibold mb-1">Pending Co-Sign</p>
              <p className="text-3xl font-bold">{data?.stats.awaitingCosign || 0}</p>
              <p className="text-purple-100 text-xs mt-1">Awaiting supervisor</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('locked')}
            className={`bg-gradient-to-br ${
              activeTab === 'locked'
                ? 'from-gray-600 to-gray-700 text-white ring-4 ring-gray-400'
                : 'from-gray-500 to-gray-600 text-white hover:shadow-lg'
            } rounded-2xl shadow-xl p-6 transition-all duration-200 transform hover:scale-105`}
          >
            <div className="text-left">
              <p className="text-gray-100 text-xs font-semibold mb-1">Locked</p>
              <p className="text-3xl font-bold">{data?.stats.locked || 0}</p>
              <p className="text-gray-100 text-xs mt-1">Non-compliance</p>
            </div>
          </button>

          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="text-left">
              <p className="text-emerald-100 text-xs font-semibold mb-1">Urgent</p>
              <p className="text-3xl font-bold">{data?.stats.urgent || 0}</p>
              <p className="text-emerald-100 text-xs mt-1">7+ days overdue</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : (
          <div>
            {/* Missing Notes */}
            {activeTab === 'missing' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Appointments Without Signed Notes
                </h2>
                {data?.appointmentsWithoutNotes.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">All appointments have signed notes.</p>
                  </div>
                ) : (
                  data?.appointmentsWithoutNotes.map((appointment) => (
                    <div
                      key={appointment.id}
                      onClick={() => navigate(`/clients/${appointment.client.id}/notes/create?appointmentId=${appointment.id}`)}
                      className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 ${
                        appointment.isUrgent
                          ? 'border-red-300 hover:border-red-400'
                          : appointment.isOverdue
                          ? 'border-orange-300 hover:border-orange-400'
                          : 'border-transparent hover:border-purple-300'
                      }`}
                    >
                      <div className="p-6">
                        {appointment.isUrgent && (
                          <div className="mb-4 px-4 py-2 bg-gradient-to-r from-red-100 to-orange-100 border-l-4 border-red-500 rounded">
                            <p className="text-sm font-semibold text-red-800">
                              🚨 URGENT: {getDaysText(appointment.daysSince)} - Immediate action required!
                            </p>
                          </div>
                        )}
                        {appointment.isOverdue && !appointment.isUrgent && (
                          <div className="mb-4 px-4 py-2 bg-gradient-to-r from-orange-100 to-yellow-100 border-l-4 border-orange-500 rounded">
                            <p className="text-sm font-semibold text-orange-800">
                              ⚠️ Overdue: {getDaysText(appointment.daysSince)} - Past 3-day deadline
                            </p>
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1">Client</h4>
                                <p className="text-sm font-bold text-gray-800">
                                  {appointment.client.firstName} {appointment.client.lastName}
                                </p>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1">Clinician</h4>
                                <p className="text-sm font-bold text-gray-800">
                                  {appointment.clinician.title} {appointment.clinician.firstName} {appointment.clinician.lastName}
                                </p>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1">Appointment Date</h4>
                                <p className="text-sm font-bold text-gray-800">{formatDate(appointment.appointmentDate)}</p>
                                <p className="text-xs text-gray-600">
                                  {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                                </p>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1">Days Since</h4>
                                <p
                                  className={`text-sm font-bold ${
                                    appointment.isUrgent
                                      ? 'text-red-600'
                                      : appointment.isOverdue
                                      ? 'text-orange-600'
                                      : 'text-gray-800'
                                  }`}
                                >
                                  {appointment.daysSince} {appointment.daysSince === 1 ? 'day' : 'days'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${appointment.client.id}/notes/create?appointmentId=${appointment.id}`);
                              }}
                              className={`px-6 py-3 ${
                                appointment.isUrgent
                                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                  : appointment.isOverdue
                                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                                  : 'bg-gradient-to-r from-purple-600 to-blue-600'
                              } text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold`}
                            >
                              Create Note
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Overdue Notes */}
            {activeTab === 'overdue' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Overdue Notes (Past 3-Day Deadline)</h2>
                {data?.overdueNotes.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No overdue notes.</p>
                  </div>
                ) : (
                  data?.overdueNotes.map((note) => {
                    const daysSince = Math.floor(
                      (new Date().getTime() - new Date(note.sessionDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div
                        key={note.id}
                        onClick={() => navigate(`/clients/${note.client.id}/notes/${note.id}/edit`)}
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-orange-300 hover:border-orange-400"
                      >
                        <div className="p-6">
                          <div className="mb-4 px-4 py-2 bg-gradient-to-r from-orange-100 to-yellow-100 border-l-4 border-orange-500 rounded">
                            <p className="text-sm font-semibold text-orange-800">
                              ⚠️ {daysSince} days since session - Sign immediately
                            </p>
                          </div>

                          <div className="flex items-center space-x-3 mb-4">
                            <span
                              className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${
                                NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']
                              }`}
                            >
                              {note.noteType}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                              DRAFT - Overdue
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
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Draft Notes */}
            {activeTab === 'drafts' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Draft Notes</h2>
                {data?.draftNotes.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No draft notes.</p>
                  </div>
                ) : (
                  data?.draftNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => navigate(`/clients/${note.client.id}/notes/${note.id}/edit`)}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-300"
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <span
                            className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${
                              NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']
                            }`}
                          >
                            {note.noteType}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
                            DRAFT
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
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Co-Sign Queue */}
            {activeTab === 'cosign' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Notes Awaiting Co-Signature</h2>
                {data?.notesAwaitingCosign.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No notes awaiting co-signature.</p>
                  </div>
                ) : (
                  data?.notesAwaitingCosign.map((note) => {
                    const daysWaiting = note.signedDate
                      ? Math.floor((new Date().getTime() - new Date(note.signedDate).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    return (
                      <div
                        key={note.id}
                        onClick={() => navigate(`/clients/${note.client.id}/notes/${note.id}`)}
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-purple-300"
                      >
                        <div className="p-6">
                          {daysWaiting > 3 && (
                            <div className="mb-4 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-purple-500 rounded">
                              <p className="text-sm font-semibold text-purple-800">
                                ⏰ Waiting {daysWaiting} days for co-signature
                              </p>
                            </div>
                          )}

                          <div className="flex items-center space-x-3 mb-4">
                            <span
                              className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${
                                NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']
                              }`}
                            >
                              {note.noteType}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                              Awaiting Co-Sign
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                            {note.signedDate && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 mb-1">Days Waiting</h4>
                                <p className="text-sm font-bold text-gray-800">
                                  {daysWaiting} {daysWaiting === 1 ? 'day' : 'days'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Locked Notes */}
            {activeTab === 'locked' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Locked Notes (Non-Compliance)</h2>
                {data?.lockedNotes.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No locked notes.</p>
                  </div>
                ) : (
                  data?.lockedNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => navigate(`/clients/${note.client.id}/notes/${note.id}`)}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-gray-300 hover:border-gray-400"
                    >
                      <div className="p-6">
                        <div className="mb-4 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 border-l-4 border-gray-500 rounded">
                          <p className="text-sm font-semibold text-gray-800">
                            🔒 Locked on {note.lockedDate ? formatDate(note.lockedDate) : 'N/A'} - Request unlock to edit
                          </p>
                        </div>

                        <div className="flex items-center space-x-3 mb-4">
                          <span
                            className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 ${
                              NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS['Miscellaneous Note']
                            }`}
                          >
                            {note.noteType}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                            LOCKED
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
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
