import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import {
  FormSection,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  FormActions,
} from '../../../components/ClinicalNotes/SharedFormComponents';
import ICD10Autocomplete from '../../../components/ClinicalNotes/ICD10Autocomplete';
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';
import SessionInputBox from '../../../components/AI/SessionInputBox';
import ReviewModal from '../../../components/AI/ReviewModal';
import AppointmentPicker from '../../../components/ClinicalNotes/AppointmentPicker';
import ScheduleHeader from '../../../components/ClinicalNotes/ScheduleHeader';
import CreateAppointmentModal from '../../../components/ClinicalNotes/CreateAppointmentModal';

interface TreatmentGoal {
  goal: string;
  targetDate: string;
  objectives: string[];
  progress: string;
}

export default function TreatmentPlanForm() {
  const { clientId, noteId } = useParams();
  const isEditMode = !!noteId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get appointmentId from URL query parameters
  const [searchParams] = useSearchParams();
  const appointmentIdFromURL = searchParams.get('appointmentId') || '';

  // Appointment selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentIdFromURL);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(!appointmentIdFromURL && !isEditMode);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canSign, setCanSign] = useState(true);
  const [diagnosisValidationMessage, setDiagnosisValidationMessage] = useState('');

  const appointmentId = selectedAppointmentId;

  const [sessionDate, setSessionDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Goals and Objectives
  const [goals, setGoals] = useState<TreatmentGoal[]>([
    { goal: '', targetDate: '', objectives: [''], progress: 'Not Started' },
  ]);

  // Treatment Plan Details - with structured dropdowns
  const [treatmentModality, setTreatmentModality] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState('');
  const [frequency, setFrequency] = useState('');
  const [treatmentSetting, setTreatmentSetting] = useState('');
  const [dischargeCriteria, setDischargeCriteria] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  // Diagnosis & Billing
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

  const [nextSessionDate, setNextSessionDate] = useState('');

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Record<string, any> | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // Fetch client data
  const { data: clientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch existing note data if in edit mode
  const { data: existingNoteData, isLoading: isLoadingNote } = useQuery({
    queryKey: ['clinical-note', noteId],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/${noteId}`);
      return response.data.data;
    },
    enabled: isEditMode && !!noteId,
  });

  // Fetch eligible appointments
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligible-appointments', clientId, 'Treatment Plan'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Treatment%20Plan`
      );
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch inherited diagnoses
  const { data: inheritedDiagnosesData } = useQuery({
    queryKey: ['inherited-diagnoses', clientId, 'Treatment Plan'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/inherited-diagnoses/Treatment%20Plan`
      );
      return response.data.data;
    },
    enabled: !!clientId && !!selectedAppointmentId,
  });

  // Set inherited diagnoses when data arrives
  useEffect(() => {
    if (inheritedDiagnosesData) {
      setDiagnosisCodes(inheritedDiagnosesData.diagnosisCodes || []);
      setCanSign(inheritedDiagnosesData.canSign || false);
      setDiagnosisValidationMessage(inheritedDiagnosesData.validationMessage || '');
    }
  }, [inheritedDiagnosesData]);

  // Fetch appointment data
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (selectedAppointmentId && !appointmentData) {
        try {
          const response = await api.get(`/appointments/${selectedAppointmentId}`);
          const apt = response.data.data;
          setAppointmentData(apt);

          if (apt.appointmentDate) {
            const date = new Date(apt.appointmentDate);
            setSessionDate(date.toISOString().split('T')[0]);
          }
        } catch (error) {
          console.error('Error fetching appointment data:', error);
        }
      }
    };
    fetchAppointmentData();
  }, [selectedAppointmentId, appointmentData]);

  const handleAppointmentSelect = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowAppointmentPicker(false);
  };

  const handleAppointmentCreated = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowCreateModal(false);
    setShowAppointmentPicker(false);
  };

  // Auto-set due date to 7 days from session date
  useEffect(() => {
    if (sessionDate && !dueDate) {
      const date = new Date(sessionDate);
      date.setDate(date.getDate() + 7);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [sessionDate]);

  // Populate form fields from existingNoteData when in edit mode
  useEffect(() => {
    if (existingNoteData && isEditMode) {
      // Set appointment ID from existing note
      if (existingNoteData.appointmentId) {
        setSelectedAppointmentId(existingNoteData.appointmentId);
      }

      // Session details
      if (existingNoteData.sessionDate) {
        const date = new Date(existingNoteData.sessionDate);
        setSessionDate(date.toISOString().split('T')[0]);
      }
      if (existingNoteData.dueDate) {
        const date = new Date(existingNoteData.dueDate);
        setDueDate(date.toISOString().split('T')[0]);
      }
      if (existingNoteData.nextSessionDate) {
        const date = new Date(existingNoteData.nextSessionDate);
        setNextSessionDate(date.toISOString().split('T')[0]);
      }

      // Parse goals from subjective field
      if (existingNoteData.subjective) {
        // Try to parse goals from the text format
        const goalMatches = existingNoteData.subjective.matchAll(/Goal \d+:\s*(.+?)\nProgress:\s*(.+?)\nTarget Date:\s*(.+?)\nObjectives:\n((?:  Objective \d+:.+\n?)*)/gs);
        const parsedGoals: TreatmentGoal[] = [];

        for (const match of goalMatches) {
          const goal = match[1].trim();
          const progress = match[2].trim();
          const targetDate = match[3].trim() !== 'Not specified' ? match[3].trim() : '';
          const objectivesText = match[4];

          const objectives = objectivesText
            .split('\n')
            .filter(line => line.trim().startsWith('Objective'))
            .map(line => line.replace(/^\s*Objective \d+:\s*/, '').trim())
            .filter(obj => obj.length > 0);

          if (goal) {
            parsedGoals.push({
              goal,
              targetDate,
              objectives: objectives.length > 0 ? objectives : [''],
              progress
            });
          }
        }

        if (parsedGoals.length > 0) {
          setGoals(parsedGoals);
        }
      }

      // Parse treatment details from objective field
      if (existingNoteData.objective) {
        const objective = existingNoteData.objective;

        const modalitiesMatch = objective.match(/Treatment Modalities:\s*(.+?)(?:\n|$)/);
        if (modalitiesMatch) {
          const modalities = modalitiesMatch[1].split(',').map(m => m.trim());
          setTreatmentModality(modalities);
        }

        const durationMatch = objective.match(/Session Duration:\s*(.+?)(?:\n|$)/);
        if (durationMatch) setSessionDuration(durationMatch[1].trim());

        const frequencyMatch = objective.match(/Frequency:\s*(.+?)(?:\n|$)/);
        if (frequencyMatch) setFrequency(frequencyMatch[1].trim());

        const settingMatch = objective.match(/Treatment Setting:\s*(.+?)(?:\n|$)/);
        if (settingMatch) setTreatmentSetting(settingMatch[1].trim());

        const estimatedDurationMatch = objective.match(/Estimated Duration:\s*(.+?)(?:\n|$)/);
        if (estimatedDurationMatch) setEstimatedDuration(estimatedDurationMatch[1].trim());
      }

      // Parse discharge criteria from plan field
      if (existingNoteData.plan) {
        const dischargeMatch = existingNoteData.plan.match(/Discharge Criteria:\s*(.+?)$/s);
        if (dischargeMatch) setDischargeCriteria(dischargeMatch[1].trim());
      }

      // Diagnosis and billing
      if (existingNoteData.diagnosisCodes && Array.isArray(existingNoteData.diagnosisCodes)) {
        setDiagnosisCodes(existingNoteData.diagnosisCodes);
      }
      if (existingNoteData.cptCode) setCptCode(existingNoteData.cptCode);
      if (existingNoteData.billingCode) setBillingCode(existingNoteData.billingCode);
      if (existingNoteData.billable !== undefined) setBillable(existingNoteData.billable);
    }
  }, [existingNoteData, isEditMode]);

  const addGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, { goal: '', targetDate: '', objectives: [''], progress: 'Not Started' }]);
    }
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index));
    }
  };

  const updateGoal = (index: number, field: keyof TreatmentGoal, value: any) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;
    setGoals(newGoals);
  };

  const addObjective = (goalIndex: number) => {
    const newGoals = [...goals];
    newGoals[goalIndex].objectives.push('');
    setGoals(newGoals);
  };

  const removeObjective = (goalIndex: number, objectiveIndex: number) => {
    const newGoals = [...goals];
    if (newGoals[goalIndex].objectives.length > 1) {
      newGoals[goalIndex].objectives = newGoals[goalIndex].objectives.filter((_, i) => i !== objectiveIndex);
      setGoals(newGoals);
    }
  };

  const updateObjective = (goalIndex: number, objectiveIndex: number, value: string) => {
    const newGoals = [...goals];
    newGoals[goalIndex].objectives[objectiveIndex] = value;
    setGoals(newGoals);
  };

  const toggleModality = (modality: string) => {
    if (treatmentModality.includes(modality)) {
      setTreatmentModality(treatmentModality.filter(m => m !== modality));
    } else {
      setTreatmentModality([...treatmentModality, modality]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  // AI Handler Functions
  const handleGenerateFromTranscription = async (sessionNotes: string) => {
    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-note', {
        noteType: 'Treatment Plan',
        transcript: sessionNotes,
        clientInfo: {
          firstName: clientData?.firstName || 'Client',
          lastName: clientData?.lastName || '',
          age: clientData?.dateOfBirth ? new Date().getFullYear() - new Date(clientData.dateOfBirth).getFullYear() : undefined,
          diagnoses: diagnosisCodes || [],
          presentingProblems: [],
        },
      });

      setGeneratedData(response.data.generatedContent);
      setAiWarnings(response.data.warnings || []);
      setAiConfidence(response.data.confidence || 0);
      setShowReviewModal(true);
    } catch (error) {
      console.error('AI generation error:', error);
      setAiWarnings(['Failed to generate note. Please try again.']);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptGenerated = (data: Record<string, any>) => {
    // Map all fields from generated data to form state
    if (data.planDate) setSessionDate(data.planDate);
    if (data.reviewDate) setNextSessionDate(data.reviewDate);
    if (data.diagnoses) setDiagnosisCodes([data.diagnoses]);
    if (data.presentingProblems) {
      // Parse presenting problems if provided
    }
    if (data.goals) {
      // Parse goals if provided as string or array
    }
    if (data.objectives) {
      // Parse objectives if provided
    }
    if (data.treatmentModality && Array.isArray(data.treatmentModality)) {
      setTreatmentModality(data.treatmentModality);
    }
    if (data.interventions) {
      // Parse interventions if provided
    }
    if (data.sessionFrequency) setFrequency(data.sessionFrequency);
    if (data.sessionDuration) setSessionDuration(data.sessionDuration);
    if (data.treatmentSetting) setTreatmentSetting(data.treatmentSetting);
    if (data.estimatedDuration) setEstimatedDuration(data.estimatedDuration);
    if (data.dischargeCriteria) setDischargeCriteria(data.dischargeCriteria);
    if (data.clientStrengths) {
      // Parse client strengths if provided
    }
    if (data.barriers) {
      // Parse barriers if provided
    }

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();

    const goalsText = Array.isArray(goals)
      ? goals
        .filter(g => g.goal.trim())
        .map((g, i) => {
          const objectivesText = Array.isArray(g.objectives)
            ? g.objectives.filter(o => o.trim()).map((o, idx) => `  Objective ${idx + 1}: ${o}`).join('\n')
            : '';
          return `Goal ${i + 1}: ${g.goal}\nProgress: ${g.progress}\nTarget Date: ${g.targetDate || 'Not specified'}\nObjectives:\n${objectivesText}`;
        })
        .join('\n\n')
      : '';

    const modalityText = Array.isArray(treatmentModality) && treatmentModality.length > 0
      ? treatmentModality.join(', ')
      : 'Not specified';

    const data = {
      clientId,
      noteType: 'Treatment Plan',
      appointmentId: appointmentId,
      sessionDate: sessionDate ? new Date(sessionDate).toISOString() : undefined,
      subjective: goalsText,
      objective: `Treatment Modalities: ${modalityText}\nSession Duration: ${sessionDuration}\nFrequency: ${frequency}\nTreatment Setting: ${treatmentSetting}\nEstimated Duration: ${estimatedDuration}`,
      assessment: `Formal Treatment Plan established with ${goals.filter(g => g.goal.trim()).length} goals`,
      plan: `Discharge Criteria: ${dischargeCriteria}`,
      interventions: modalityText,
      frequency,
      dischargeCriteria,
      diagnosisCodes,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      status: 'DRAFT',
    };

    saveDraftMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!Array.isArray(goals) || goals.length === 0 || !goals[0].goal.trim()) {
      setAiWarnings(['Please add at least one treatment goal before submitting.']);
      return;
    }

    if (!Array.isArray(treatmentModality) || treatmentModality.length === 0) {
      setAiWarnings(['Please select at least one treatment modality before submitting.']);
      return;
    }

    if (!sessionDuration || !frequency || !treatmentSetting || !estimatedDuration) {
      setAiWarnings(['Please fill in all treatment details (Duration, Frequency, Setting, Estimated Duration) before submitting.']);
      return;
    }

    if (!dischargeCriteria) {
      setAiWarnings(['Please specify discharge criteria before submitting.']);
      return;
    }

    if (!Array.isArray(diagnosisCodes) || diagnosisCodes.length === 0) {
      setAiWarnings(['Please add at least one diagnosis code (ICD-10) before submitting.']);
      return;
    }

    const goalsText = Array.isArray(goals)
      ? goals
        .filter(g => g.goal.trim())
        .map((g, i) => {
          const objectivesText = Array.isArray(g.objectives)
            ? g.objectives.filter(o => o.trim()).map((o, idx) => `  Objective ${idx + 1}: ${o}`).join('\n')
            : '';
          return `Goal ${i + 1}: ${g.goal}\nProgress: ${g.progress}\nTarget Date: ${g.targetDate || 'Not specified'}\nObjectives:\n${objectivesText}`;
        })
        .join('\n\n')
      : '';

    const modalityText = Array.isArray(treatmentModality) && treatmentModality.length > 0
      ? treatmentModality.join(', ')
      : 'Not specified';

    const data = {
      clientId,
      noteType: 'Treatment Plan',
      appointmentId: appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      subjective: goalsText,
      objective: `Treatment Modalities: ${modalityText}\nSession Duration: ${sessionDuration}\nFrequency: ${frequency}\nTreatment Setting: ${treatmentSetting}\nEstimated Duration: ${estimatedDuration}`,
      assessment: `Formal Treatment Plan established with ${goals.filter(g => g.goal.trim()).length} goals`,
      plan: `Discharge Criteria: ${dischargeCriteria}`,
      interventions: modalityText,
      frequency,
      dischargeCriteria,
      diagnosisCodes,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : undefined,
      dueDate: new Date(dueDate).toISOString(),
    };

    saveMutation.mutate(data);
  };

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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Treatment Plan
          </h1>
          <p className="text-gray-600 mt-2">Formal treatment planning and goal setting</p>
        </div>

        {/* Client ID Validation */}
        {!clientId && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-red-700">Error: No client ID found. Please select a client first.</p>
            </div>
          </div>
        )}

        {/* Diagnosis Validation Error */}
        {diagnosisValidationMessage && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-red-700">{diagnosisValidationMessage}</p>
            </div>
          </div>
        )}

        {/* Cannot Sign Warning */}
        {!canSign && (
          <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-yellow-700">Warning: This note cannot be signed until diagnosis validation requirements are met.</p>
            </div>
          </div>
        )}

        {/* AI Warnings */}
        {aiWarnings.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                {aiWarnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-700">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save Mutation Error */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-red-700">
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save treatment plan'}
              </p>
            </div>
          </div>
        )}

        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Treatment Plan"
              onSelect={handleAppointmentSelect}
              onCreateNew={() => {
                setShowAppointmentPicker(false);
                setShowCreateModal(true);
              }}
            />
          </div>
        )}

        {/* Create Appointment Modal */}
        {showCreateModal && eligibleAppointmentsData && (
          <CreateAppointmentModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setShowAppointmentPicker(true);
            }}
            clientId={clientId!}
            noteType="Treatment Plan"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - only shown after appointment is selected */}
        {!showAppointmentPicker && selectedAppointmentId && (
          <form onSubmit={() => handleSubmit({} as React.FormEvent)} className="space-y-6">
            {/* Schedule Header */}
            {appointmentData && (
              <ScheduleHeader
                appointmentDate={appointmentData.appointmentDate}
                startTime={appointmentData.startTime}
                endTime={appointmentData.endTime}
                duration={appointmentData.duration || 60}
                serviceCode={appointmentData.serviceCode}
                location={appointmentData.location}
                sessionType={appointmentData.appointmentType}
                clientName={clientData ? `${clientData.firstName} ${clientData.lastName}` : ''}
                clientDOB={clientData?.dateOfBirth}
                diagnoses={diagnosisCodes}
                editable={false}
              />
            )}

            {/* AI-Powered Note Generation */}
            <SessionInputBox
              onGenerate={handleGenerateFromTranscription}
              isGenerating={isGenerating}
              noteType="Treatment Plan"
            />

          {/* Goals and Objectives */}
          <FormSection title="Treatment Goals and Objectives" number={1}>
            <div className="space-y-6">
              {goals.map((goal, goalIndex) => (
                <div key={goalIndex} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Goal {goalIndex + 1}</h3>
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(goalIndex)}
                        className="text-red-600 hover:text-red-800 font-semibold transition-colors"
                      >
                        Remove Goal
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Goal Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={goal.goal}
                        onChange={(e) => updateGoal(goalIndex, 'goal', e.target.value)}
                        required
                        rows={3}
                        placeholder="Measurable, specific treatment goal (e.g., 'Client will reduce anxiety symptoms by 50% as measured by GAD-7 scores')..."
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        label="Target Date"
                        type="date"
                        value={goal.targetDate}
                        onChange={(value) => updateGoal(goalIndex, 'targetDate', value)}
                      />
                      <SelectField
                        label="Current Progress"
                        value={goal.progress}
                        onChange={(value) => updateGoal(goalIndex, 'progress', value)}
                        options={[
                          { value: 'Not Started', label: 'Not Started' },
                          { value: 'Minimal Progress', label: 'Minimal Progress' },
                          { value: 'Some Progress', label: 'Some Progress' },
                          { value: 'Moderate Progress', label: 'Moderate Progress' },
                          { value: 'Significant Progress', label: 'Significant Progress' },
                          { value: 'Goal Achieved', label: 'Goal Achieved' },
                        ]}
                      />
                    </div>

                    {/* Objectives for this goal */}
                    <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-100">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Measurable Objectives</h4>
                      {goal.objectives.map((objective, objIndex) => (
                        <div key={objIndex} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={objective}
                            onChange={(e) => updateObjective(goalIndex, objIndex, e.target.value)}
                            placeholder={`Objective ${objIndex + 1} (specific, measurable step toward goal)...`}
                            className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          {goal.objectives.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeObjective(goalIndex, objIndex)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addObjective(goalIndex)}
                        className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-semibold"
                      >
                        + Add Objective
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {goals.length < 5 && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="w-full py-3 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors font-semibold"
                >
                  + Add Another Goal (up to 5)
                </button>
              )}
            </div>
          </FormSection>

          {/* Treatment Details */}
          <FormSection title="Treatment Details" number={2}>
            <div className="space-y-6">
              {/* Treatment Modalities */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Treatment Modalities/Interventions <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-3">Select all therapeutic approaches that will be used</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    'Cognitive Behavioral Therapy (CBT)',
                    'Dialectical Behavior Therapy (DBT)',
                    'Acceptance and Commitment Therapy (ACT)',
                    'EMDR',
                    'Psychodynamic Therapy',
                    'Solution-Focused Brief Therapy',
                    'Motivational Interviewing',
                    'Mindfulness-Based Therapy',
                    'Trauma-Focused CBT',
                    'Interpersonal Therapy (IPT)',
                    'Family Systems Therapy',
                    'Narrative Therapy',
                    'Exposure Therapy',
                    'Play Therapy',
                    'Art Therapy',
                    'Group Therapy',
                    'Psychoeducation',
                    'Supportive Counseling',
                  ].map((modality) => (
                    <CheckboxField
                      key={modality}
                      label={modality}
                      checked={treatmentModality.includes(modality)}
                      onChange={() => toggleModality(modality)}
                    />
                  ))}
                </div>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Session Duration"
                  value={sessionDuration}
                  onChange={setSessionDuration}
                  required
                  options={[
                    { value: '30 minutes', label: '30 minutes' },
                    { value: '45 minutes', label: '45 minutes' },
                    { value: '50 minutes', label: '50 minutes' },
                    { value: '60 minutes', label: '60 minutes (1 hour)' },
                    { value: '75 minutes', label: '75 minutes' },
                    { value: '90 minutes', label: '90 minutes (1.5 hours)' },
                    { value: '120 minutes', label: '120 minutes (2 hours)' },
                  ]}
                />

                <SelectField
                  label="Frequency of Services"
                  value={frequency}
                  onChange={setFrequency}
                  required
                  options={[
                    { value: 'Once per week', label: 'Once per week' },
                    { value: 'Twice per week', label: 'Twice per week' },
                    { value: 'Three times per week', label: 'Three times per week' },
                    { value: 'Every other week (bi-weekly)', label: 'Every other week (bi-weekly)' },
                    { value: 'Once per month', label: 'Once per month' },
                    { value: 'As needed', label: 'As needed' },
                  ]}
                />

                <SelectField
                  label="Treatment Setting"
                  value={treatmentSetting}
                  onChange={setTreatmentSetting}
                  required
                  options={[
                    { value: 'Office', label: 'Office' },
                    { value: 'Telehealth', label: 'Telehealth' },
                    { value: 'Home', label: 'Home' },
                    { value: 'School', label: 'School' },
                    { value: 'Hospital', label: 'Hospital' },
                    { value: 'Hybrid (Office + Telehealth)', label: 'Hybrid (Office + Telehealth)' },
                  ]}
                />
              </div>

              <SelectField
                label="Estimated Duration of Treatment"
                value={estimatedDuration}
                onChange={setEstimatedDuration}
                required
                options={[
                  { value: '6-8 weeks (Short-term)', label: '6-8 weeks (Short-term)' },
                  { value: '3 months', label: '3 months' },
                  { value: '6 months', label: '6 months' },
                  { value: '9 months', label: '9 months' },
                  { value: '12 months (1 year)', label: '12 months (1 year)' },
                  { value: '18 months', label: '18 months' },
                  { value: '2 years or more (Long-term)', label: '2 years or more (Long-term)' },
                  { value: 'Ongoing/Indefinite', label: 'Ongoing/Indefinite' },
                ]}
              />

              <TextAreaField
                label="Discharge Criteria"
                value={dischargeCriteria}
                onChange={setDischargeCriteria}
                required
                rows={4}
                placeholder="Specific, measurable criteria that indicate when treatment goals have been met and client is ready for discharge (e.g., 'Client reports anxiety levels below 10 on GAD-7 for 3 consecutive sessions', 'Client demonstrates consistent use of coping skills independently')..."
              />
            </div>
          </FormSection>

          {/* Diagnosis & Billing */}
          <FormSection title="Diagnosis & Billing" number={3}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis Codes (ICD-10) <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Update or confirm diagnosis codes for this treatment plan
                </p>
                <ICD10Autocomplete
                  selectedCodes={diagnosisCodes}
                  onCodesChange={setDiagnosisCodes}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CPT Code
                  </label>
                  <CPTCodeAutocomplete value={cptCode} onChange={setCptCode} />
                </div>

                <TextField
                  label="Billing Code"
                  value={billingCode}
                  onChange={setBillingCode}
                  placeholder="Internal billing code"
                />
              </div>

              <CheckboxField
                label="Billable Service"
                checked={billable}
                onChange={setBillable}
              />
            </div>
          </FormSection>

            {/* Form Actions */}
            <FormActions
              onCancel={() => navigate(`/clients/${clientId}/notes`)}
              onSubmit={() => handleSubmit({} as React.FormEvent)}
              submitLabel={isEditMode ? "Update Treatment Plan" : "Create Treatment Plan"}
              isSubmitting={saveMutation.isPending}
              onSaveDraft={() => handleSaveDraft({} as React.FormEvent)}
              isSavingDraft={saveDraftMutation.isPending}
            />
          </form>
        )}

        {/* Review Generated Content Modal */}
        {generatedData && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            generatedData={generatedData}
            onAccept={handleAcceptGenerated}
            onReject={() => {
              setShowReviewModal(false);
              setGeneratedData(null);
            }}
            noteType="Treatment Plan"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}
      </div>
    </div>
  );
}
