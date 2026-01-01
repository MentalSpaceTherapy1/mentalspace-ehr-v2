import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import useSessionSafeSave, { SessionExpiredAlert, RecoveredDraftAlert } from '../../../hooks/useSessionSafeSave';

interface GroupMember {
  id: string;
  clientId: string;
  status: string;
  attendanceCount: number;
  absenceCount: number;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AttendanceRecord {
  groupMemberId: string;
  attended: boolean;
  notes: string;
}

interface GroupSession {
  id: string;
  groupName: string;
  description: string;
  groupType: string;
  facilitatorId: string;
  maxMembers: number;
  currentMembers: number;
}

interface AppointmentClient {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AppointmentDetails {
  id: string;
  isGroupAppointment: boolean;
  appointmentClients?: AppointmentClient[];
}

export default function GroupTherapyNoteForm() {
  const { clientId, appointmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [groupId, setGroupId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(60);
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionObjectives, setSessionObjectives] = useState('');
  const [interventionsUsed, setInterventionsUsed] = useState('');
  const [groupDynamics, setGroupDynamics] = useState('');
  const [therapeuticFactors, setTherapeuticFactors] = useState('');
  const [progressTowardGoals, setProgressTowardGoals] = useState('');
  const [challengesEncountered, setChallengesEncountered] = useState('');
  const [planForNextSession, setPlanForNextSession] = useState('');

  // SOAP fields
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Session-safe saving (handles session timeout with local storage backup)
  const {
    sessionError,
    clearSessionError,
    backupToLocalStorage,
    clearBackup,
    handleSaveError,
    hasRecoveredDraft,
    applyRecoveredDraft,
    discardRecoveredDraft,
  } = useSessionSafeSave({
    noteType: 'GroupTherapyNote',
    clientId: clientId || 'group',
    noteId: appointmentId,
  });

  // Attendance tracking
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceNotes, setAttendanceNotes] = useState<{ [key: string]: string }>({});

  // Fetch group sessions
  const { data: groupSessionsData, isLoading: loadingGroups } = useQuery({
    queryKey: ['group-sessions'],
    queryFn: async () => {
      const response = await api.get('/group-sessions');
      return response.data.data;
    },
  });

  // Fetch appointment details to check for ad-hoc groups
  const { data: appointmentData } = useQuery({
    queryKey: ['appointment-details', appointmentId],
    queryFn: async () => {
      const response = await api.get(`/appointments/${appointmentId}`);
      return response.data.data as AppointmentDetails;
    },
    enabled: !!appointmentId,
  });

  // Check if this is an ad-hoc group from appointment
  const isAdHocGroup = appointmentData?.isGroupAppointment && appointmentData?.appointmentClients;

  // Transform appointmentClients to GroupMember format for ad-hoc groups
  const adHocGroupMembers = isAdHocGroup
    ? appointmentData.appointmentClients?.map((ac) => ({
        id: ac.client.id, // Use client ID as member ID for ad-hoc groups
        clientId: ac.client.id,
        status: 'ACTIVE',
        attendanceCount: 0, // No historical data for ad-hoc groups
        absenceCount: 0,
        client: ac.client,
      }))
    : [];

  // Fetch group members when group is selected (for formal groups)
  const { data: groupMembersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const response = await api.get(`/group-therapy-notes/group/${groupId}/members`);
      return response.data.data;
    },
    enabled: !!groupId && !isAdHocGroup, // Only fetch if not an ad-hoc group
  });

  // Use ad-hoc group members if available, otherwise use formal group members
  const members = isAdHocGroup ? adHocGroupMembers : groupMembersData;

  // Initialize attendance when members are loaded
  useEffect(() => {
    if (members && members.length > 0) {
      const initialAttendance = members.map((member: GroupMember) => ({
        groupMemberId: member.id, // This will be the client ID for ad-hoc groups
        attended: true, // Default to attended
        notes: '',
      }));
      setAttendance(initialAttendance);
    }
  }, [members, isAdHocGroup]);

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(data);
      const response = await api.post('/group-therapy-notes', data);
      return response.data;
    },
    onSuccess: () => {
      // Clear backup after successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clinical-notes`);
    },
    onError: (error: any, variables: any) => {
      handleSaveError(error, variables);
    },
  });

  // Handle recovering draft data
  const handleRecoverDraft = () => {
    const recovered = applyRecoveredDraft();
    if (recovered) {
      if (recovered.groupId) setGroupId(recovered.groupId);
      if (recovered.sessionDate) setSessionDate(recovered.sessionDate);
      if (recovered.duration) setDuration(recovered.duration);
      if (recovered.sessionTopic) setSessionTopic(recovered.sessionTopic);
      if (recovered.sessionObjectives) setSessionObjectives(recovered.sessionObjectives);
      if (recovered.interventionsUsed) setInterventionsUsed(recovered.interventionsUsed);
      if (recovered.groupDynamics) setGroupDynamics(recovered.groupDynamics);
      if (recovered.therapeuticFactors) setTherapeuticFactors(recovered.therapeuticFactors);
      if (recovered.progressTowardGoals) setProgressTowardGoals(recovered.progressTowardGoals);
      if (recovered.challengesEncountered) setChallengesEncountered(recovered.challengesEncountered);
      if (recovered.planForNextSession) setPlanForNextSession(recovered.planForNextSession);
      if (recovered.subjective) setSubjective(recovered.subjective);
      if (recovered.objective) setObjective(recovered.objective);
      if (recovered.assessment) setAssessment(recovered.assessment);
      if (recovered.plan) setPlan(recovered.plan);
    }
  };

  const handleAttendanceToggle = (memberId: string) => {
    setAttendance(prev =>
      prev.map(record =>
        record.groupMemberId === memberId
          ? { ...record, attended: !record.attended }
          : record
      )
    );
  };

  const handleAttendanceNoteChange = (memberId: string, note: string) => {
    setAttendanceNotes(prev => ({
      ...prev,
      [memberId]: note,
    }));

    setAttendance(prev =>
      prev.map(record =>
        record.groupMemberId === memberId
          ? { ...record, notes: note }
          : record
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: either need groupId (formal group) or isAdHocGroup (appointment-based group)
    if (!isAdHocGroup && !groupId) {
      toast.error('Please select a group.');
      return;
    }

    if (!appointmentId) {
      toast.error('An appointment must be selected for this note.');
      return;
    }

    // Transform attendance data based on group type
    const transformedAttendance = isAdHocGroup
      ? attendance.map(a => ({
          clientId: a.groupMemberId, // For ad-hoc groups, use clientId
          attended: a.attended,
          notes: a.notes,
        }))
      : attendance; // For formal groups, keep groupMemberId

    const data = {
      groupId: groupId || undefined, // Optional for ad-hoc groups
      appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      duration,
      sessionTopic,
      sessionObjectives,
      interventionsUsed,
      groupDynamics,
      therapeuticFactors,
      progressTowardGoals,
      challengesEncountered,
      planForNextSession,
      subjective,
      objective,
      assessment,
      plan,
      attendance: transformedAttendance,
    };

    createNoteMutation.mutate(data);
  };

  const attendedCount = attendance.filter(a => a.attended).length;
  const totalCount = attendance.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/clinical-notes')}
            className="flex items-center text-purple-600 hover:text-purple-800 mb-4 font-semibold transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Clinical Notes
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
              <UserGroupIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Group Therapy Session Note
              </h1>
              <p className="text-gray-600 mt-2">Document group therapy session with attendance tracking</p>
            </div>
          </div>
        </div>

        {/* Session Expired Alert */}
        {sessionError && (
          <SessionExpiredAlert message={sessionError} onDismiss={clearSessionError} />
        )}

        {/* Recovered Draft Alert */}
        {hasRecoveredDraft && (
          <RecoveredDraftAlert
            onRecover={handleRecoverDraft}
            onDiscard={discardRecoveredDraft}
          />
        )}

        {/* Error Display */}
        {createNoteMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <XCircleIcon className="h-6 w-6 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">
                  {(createNoteMutation.error as any)?.response?.data?.message || 'Failed to create group therapy note'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Selection & Basic Info */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">1</span>
              Group Session Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Show group selection only if NOT an ad-hoc group */}
              {!isAdHocGroup && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Group *
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    required={!isAdHocGroup}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select a group...</option>
                    {groupSessionsData?.map((group: GroupSession) => (
                      <option key={group.id} value={group.id}>
                        {group.groupName} ({group.currentMembers}/{group.maxMembers} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show ad-hoc group info if applicable */}
              {isAdHocGroup && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Group Type
                  </label>
                  <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <div>
                        <p className="font-semibold text-teal-800">Ad-hoc Group Session</p>
                        <p className="text-sm text-teal-600">From group appointment</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Date *
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  required
                  min="15"
                  max="240"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Topic *
                </label>
                <input
                  type="text"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  required
                  placeholder="e.g., Coping with anxiety"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Attendance Tracking */}
          {members && members.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">2</span>
                Attendance ({attendedCount}/{totalCount} present)
              </h2>

              <div className="space-y-4">
                {members.map((member: GroupMember) => {
                  const attendanceRecord = attendance.find(a => a.groupMemberId === member.id);
                  const isAttended = attendanceRecord?.attended ?? true;

                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isAttended
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                          : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleAttendanceToggle(member.id)}
                            className={`p-2 rounded-full transition-all ${
                              isAttended
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                            }`}
                          >
                            {isAttended ? (
                              <CheckCircleIcon className="h-5 w-5" />
                            ) : (
                              <XCircleIcon className="h-5 w-5" />
                            )}
                          </button>
                          <div>
                            <p className="font-bold text-gray-800">
                              {member.client.firstName} {member.client.lastName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {isAdHocGroup
                                ? 'Ad-hoc group session'
                                : `Attendance: ${member.attendanceCount} | Absences: ${member.absenceCount}`
                              }
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            isAttended
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-400 text-white'
                          }`}
                        >
                          {isAttended ? 'Present' : 'Absent'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Notes for this member
                        </label>
                        <textarea
                          value={attendanceNotes[member.id] || ''}
                          onChange={(e) => handleAttendanceNoteChange(member.id, e.target.value)}
                          rows={2}
                          placeholder="Optional notes about this member's participation..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group Session Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">3</span>
              Session Content
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Objectives *
                </label>
                <textarea
                  value={sessionObjectives}
                  onChange={(e) => setSessionObjectives(e.target.value)}
                  required
                  rows={3}
                  placeholder="What were the goals for this session?"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interventions Used *
                </label>
                <textarea
                  value={interventionsUsed}
                  onChange={(e) => setInterventionsUsed(e.target.value)}
                  required
                  rows={3}
                  placeholder="What techniques and interventions were employed?"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Group Dynamics *
                </label>
                <textarea
                  value={groupDynamics}
                  onChange={(e) => setGroupDynamics(e.target.value)}
                  required
                  rows={3}
                  placeholder="Describe the interactions, cohesion, and overall group dynamics..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Therapeutic Factors
                </label>
                <textarea
                  value={therapeuticFactors}
                  onChange={(e) => setTherapeuticFactors(e.target.value)}
                  rows={3}
                  placeholder="e.g., Universality, cohesion, catharsis, interpersonal learning..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Progress & Planning */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">4</span>
              Progress & Planning
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Progress Toward Goals *
                </label>
                <textarea
                  value={progressTowardGoals}
                  onChange={(e) => setProgressTowardGoals(e.target.value)}
                  required
                  rows={3}
                  placeholder="How is the group progressing toward its therapeutic goals?"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Challenges Encountered
                </label>
                <textarea
                  value={challengesEncountered}
                  onChange={(e) => setChallengesEncountered(e.target.value)}
                  rows={3}
                  placeholder="Any difficulties or issues that arose during the session..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Plan for Next Session *
                </label>
                <textarea
                  value={planForNextSession}
                  onChange={(e) => setPlanForNextSession(e.target.value)}
                  required
                  rows={3}
                  placeholder="What will be addressed in the next group session?"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* SOAP Notes (Optional) */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">5</span>
              SOAP Documentation (Optional)
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                These fields are auto-populated from the group session content above but can be customized if needed.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subjective
                </label>
                <textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  rows={3}
                  placeholder="Group members' reported experiences and concerns..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objective
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={3}
                  placeholder="Observable behaviors and group interactions..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessment
                </label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  rows={3}
                  placeholder="Clinical impressions and group progress evaluation..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Plan
                </label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  rows={3}
                  placeholder="Treatment plan and next steps for the group..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/clinical-notes')}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-300 transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createNoteMutation.isPending || !groupId || attendance.length === 0}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <DocumentTextIcon className="h-5 w-5" />
              {createNoteMutation.isPending ? 'Creating...' : 'Create Group Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
