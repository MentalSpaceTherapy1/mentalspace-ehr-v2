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
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';
import SessionInputBox from '../../../components/AI/SessionInputBox';
import ReviewModal from '../../../components/AI/ReviewModal';
import AppointmentPicker from '../../../components/ClinicalNotes/AppointmentPicker';
import ScheduleHeader from '../../../components/ClinicalNotes/ScheduleHeader';
import CreateAppointmentModal from '../../../components/ClinicalNotes/CreateAppointmentModal';
import { useNoteValidation } from '../../../hooks/useNoteValidation';
import ValidatedField from '../../../components/ClinicalNotes/ValidatedField';
import ValidationSummary from '../../../components/ClinicalNotes/ValidationSummary';
import useSessionSafeSave, { SessionExpiredAlert, RecoveredDraftAlert } from '../../../hooks/useSessionSafeSave';
import { useNoteSignature } from '../../../hooks/useNoteSignature';
import { SignatureModal } from '../../../components/ClinicalNotes/SignatureModal';

// Constants
const SESSION_TYPES = ['Individual', 'Couples', 'Family', 'Group'];
const LOCATIONS = ['Office', 'Telehealth', 'Home', 'School', 'Other'];
const SEVERITIES = ['None', 'Mild', 'Moderate', 'Severe'];
const PROGRESS_LEVELS = ['No Progress', 'Minimal Progress', 'Moderate Progress', 'Significant Progress', 'Goal Achieved'];
const APPEARANCES = ['Well-groomed', 'Disheveled', 'Appropriate'];
const AFFECTS = ['Appropriate', 'Flat', 'Restricted', 'Labile'];
const THOUGHT_PROCESSES = ['Logical', 'Tangential', 'Disorganized'];
const RISK_LEVELS = ['None', 'Low', 'Moderate', 'High'];
const ENGAGEMENT_LEVELS = ['Highly engaged', 'Moderately engaged', 'Minimally engaged', 'Resistant'];
const RESPONSE_LEVELS = ['Very responsive', 'Moderately responsive', 'Minimal response', 'No response'];
const HOMEWORK_COMPLIANCE = ['Completed', 'Partially completed', 'Not completed', 'N/A'];

const SYMPTOMS = [
  'Depression',
  'Anxiety',
  'Irritability',
  'Sleep problems',
  'Appetite changes',
  'Suicidal ideation',
  'Homicidal ideation',
  'Substance use',
  'Panic',
  'Obsessions/compulsions',
  'Trauma symptoms',
];

const INTERVENTIONS = [
  'CBT techniques',
  'DBT skills',
  'Psychoeducation',
  'Supportive therapy',
  'Mindfulness',
  'Relaxation training',
  'Problem-solving',
  'Exposure therapy',
  'Behavioral activation',
];

interface SymptomState {
  [key: string]: string;
}

interface GoalProgress {
  goalDescription: string;
  progressLevel: string;
  notes: string;
}

interface InterventionState {
  [key: string]: boolean;
}

export default function ProgressNoteForm() {
  const { clientId, noteId } = useParams();
  const isEditMode = !!noteId;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const appointmentIdFromURL = searchParams.get('appointmentId') || '';
  const allowDraft = searchParams.get('allowDraft') === 'true';

  // Appointment selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentIdFromURL);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(!appointmentIdFromURL && !isEditMode && !allowDraft);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const appointmentId = selectedAppointmentId;

  // Session Information
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Current Symptoms
  const [symptoms, setSymptoms] = useState<SymptomState>({});

  // Progress Toward Goals
  const [goals, setGoals] = useState<GoalProgress[]>([
    { goalDescription: '', progressLevel: '', notes: '' },
  ]);

  // Brief Mental Status
  const [appearance, setAppearance] = useState('');
  const [mood, setMood] = useState('');
  const [affect, setAffect] = useState('');
  const [thoughtProcess, setThoughtProcess] = useState('');
  const [suicidalIdeation, setSuicidalIdeation] = useState(false);
  const [homicidalIdeation, setHomicidalIdeation] = useState(false);
  const [riskLevel, setRiskLevel] = useState('None');

  // Interventions Used
  const [interventionsUsed, setInterventionsUsed] = useState<InterventionState>({});
  const [otherIntervention, setOtherIntervention] = useState('');

  // Client Response
  const [engagementLevel, setEngagementLevel] = useState('');
  const [responseToInterventions, setResponseToInterventions] = useState('');
  const [homeworkCompliance, setHomeworkCompliance] = useState('');
  const [clientResponseNotes, setClientResponseNotes] = useState('');

  // SOAP Notes
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Safety & Risk
  const [safetyPlanReviewed, setSafetyPlanReviewed] = useState(false);
  const [safetyPlanUpdated, setSafetyPlanUpdated] = useState(false);

  // Diagnosis (inherited from Intake)
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [canSign, setCanSign] = useState(true);
  const [diagnosisValidationMessage, setDiagnosisValidationMessage] = useState('');

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('');
  const [billable, setBillable] = useState(true);

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Record<string, any> | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // Phase 1.3: Validation
  const { validateNote, summary, isFieldRequired, getFieldHelpText, validateField } = useNoteValidation('Progress Note');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);

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
    noteType: 'ProgressNote',
    clientId: clientId || '',
    noteId,
  });

  // Sign and Submit hook
  const {
    isSignatureModalOpen,
    isSaving: isSignSaving,
    isSigning,
    isSignAndSubmitting,
    initiateSignAndSubmit,
    signatureModalProps,
  } = useNoteSignature({
    noteType: 'Progress Note',
    clientId: clientId || undefined,
    onSignSuccess: (noteId) => {
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

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
    queryKey: ['eligible-appointments', clientId, 'Progress Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Progress%20Note`
      );
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch inherited diagnoses
  const { data: inheritedDiagnosesData } = useQuery({
    queryKey: ['inherited-diagnoses', clientId, 'Progress Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/inherited-diagnoses/Progress%20Note`
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
          if (apt.duration) {
            setSessionDuration(`${apt.duration} minutes`);
            setSessionDurationMinutes(apt.duration.toString());
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
      // Check if date is valid before using it
      if (!isNaN(date.getTime())) {
        date.setDate(date.getDate() + 7);
        setDueDate(date.toISOString().split('T')[0]);
      }
    }
  }, [sessionDate, dueDate]);

  // Auto-populate SOAP notes from form data
  useEffect(() => {
    // Auto-populate Subjective from symptoms
    const symptomsList = Object.entries(symptoms)
      .filter(([_, severity]) => severity && severity !== 'None')
      .map(([symptom, severity]) => `${symptom}: ${severity}`)
      .join(', ');

    if (symptomsList && !subjective) {
      setSubjective(`Client reports: ${symptomsList}`);
    }
  }, [symptoms]);

  useEffect(() => {
    // Auto-populate Objective from MSE
    if ((appearance || mood || affect || thoughtProcess) && !objective) {
      const mseItems = [];
      if (appearance) mseItems.push(`Appearance: ${appearance}`);
      if (mood) mseItems.push(`Mood: ${mood}`);
      if (affect) mseItems.push(`Affect: ${affect}`);
      if (thoughtProcess) mseItems.push(`Thought Process: ${thoughtProcess}`);
      setObjective(mseItems.join('. ') + '.');
    }
  }, [appearance, mood, affect, thoughtProcess]);

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

      // Session info
      if (existingNoteData.sessionDuration) setSessionDuration(existingNoteData.sessionDuration);
      if (existingNoteData.sessionType) setSessionType(existingNoteData.sessionType);
      if (existingNoteData.location) setLocation(existingNoteData.location);

      // Symptoms - parse from existing data if available
      if (existingNoteData.symptoms) {
        if (typeof existingNoteData.symptoms === 'object') {
          setSymptoms(existingNoteData.symptoms);
        }
      }

      // Goals - parse from existing data if available
      if (existingNoteData.goals) {
        if (Array.isArray(existingNoteData.goals) && existingNoteData.goals.length > 0) {
          setGoals(existingNoteData.goals);
        }
      }

      // Mental Status
      if (existingNoteData.appearance) setAppearance(existingNoteData.appearance);
      if (existingNoteData.mood) setMood(existingNoteData.mood);
      if (existingNoteData.affect) setAffect(existingNoteData.affect);
      if (existingNoteData.thoughtProcess) setThoughtProcess(existingNoteData.thoughtProcess);

      // Risk assessment
      if (existingNoteData.suicidalIdeation !== undefined) setSuicidalIdeation(existingNoteData.suicidalIdeation);
      if (existingNoteData.homicidalIdeation !== undefined) setHomicidalIdeation(existingNoteData.homicidalIdeation);
      if (existingNoteData.riskLevel) setRiskLevel(existingNoteData.riskLevel);

      // Interventions
      if (existingNoteData.interventionsUsed && Array.isArray(existingNoteData.interventionsUsed)) {
        const interventionsObj: InterventionState = {};
        existingNoteData.interventionsUsed.forEach((intervention: string) => {
          if (intervention.startsWith('Other:')) {
            setOtherIntervention(intervention.replace('Other:', '').trim());
          } else {
            interventionsObj[intervention] = true;
          }
        });
        setInterventionsUsed(interventionsObj);
      }

      // Client response
      if (existingNoteData.engagementLevel) setEngagementLevel(existingNoteData.engagementLevel);
      if (existingNoteData.responseToInterventions) setResponseToInterventions(existingNoteData.responseToInterventions);
      if (existingNoteData.homeworkCompliance) setHomeworkCompliance(existingNoteData.homeworkCompliance);
      if (existingNoteData.clientResponseNotes) setClientResponseNotes(existingNoteData.clientResponseNotes);

      // SOAP notes
      if (existingNoteData.subjective) setSubjective(existingNoteData.subjective);
      if (existingNoteData.objective) setObjective(existingNoteData.objective);
      if (existingNoteData.assessment) setAssessment(existingNoteData.assessment);
      if (existingNoteData.plan) setPlan(existingNoteData.plan);

      // Safety plan
      if (existingNoteData.safetyPlanReviewed !== undefined) setSafetyPlanReviewed(existingNoteData.safetyPlanReviewed);
      if (existingNoteData.safetyPlanUpdated !== undefined) setSafetyPlanUpdated(existingNoteData.safetyPlanUpdated);

      // Billing
      if (existingNoteData.cptCode) setCptCode(existingNoteData.cptCode);
      if (existingNoteData.sessionDurationMinutes) setSessionDurationMinutes(existingNoteData.sessionDurationMinutes.toString());
      if (existingNoteData.billable !== undefined) setBillable(existingNoteData.billable);
    }
  }, [existingNoteData, isEditMode]);

  // Handle recovering draft data
  const handleRecoverDraft = () => {
    const recovered = applyRecoveredDraft();
    if (recovered) {
      // Apply recovered data to form fields
      if (recovered.sessionDate) {
        const date = new Date(recovered.sessionDate);
        setSessionDate(date.toISOString().split('T')[0]);
      }
      if (recovered.dueDate) {
        const date = new Date(recovered.dueDate);
        setDueDate(date.toISOString().split('T')[0]);
      }
      if (recovered.sessionDuration) setSessionDuration(recovered.sessionDuration);
      if (recovered.sessionType) setSessionType(recovered.sessionType);
      if (recovered.location) setLocation(recovered.location);
      if (recovered.symptoms) setSymptoms(recovered.symptoms);
      if (recovered.goals) setGoals(recovered.goals);
      if (recovered.appearance) setAppearance(recovered.appearance);
      if (recovered.mood) setMood(recovered.mood);
      if (recovered.affect) setAffect(recovered.affect);
      if (recovered.thoughtProcess) setThoughtProcess(recovered.thoughtProcess);
      if (recovered.suicidalIdeation !== undefined) setSuicidalIdeation(recovered.suicidalIdeation);
      if (recovered.homicidalIdeation !== undefined) setHomicidalIdeation(recovered.homicidalIdeation);
      if (recovered.riskLevel) setRiskLevel(recovered.riskLevel);
      if (recovered.engagementLevel) setEngagementLevel(recovered.engagementLevel);
      if (recovered.responseToInterventions) setResponseToInterventions(recovered.responseToInterventions);
      if (recovered.homeworkCompliance) setHomeworkCompliance(recovered.homeworkCompliance);
      if (recovered.clientResponseNotes) setClientResponseNotes(recovered.clientResponseNotes);
      if (recovered.subjective) setSubjective(recovered.subjective);
      if (recovered.objective) setObjective(recovered.objective);
      if (recovered.assessment) setAssessment(recovered.assessment);
      if (recovered.plan) setPlan(recovered.plan);
      if (recovered.cptCode) setCptCode(recovered.cptCode);
      if (recovered.billable !== undefined) setBillable(recovered.billable);
      if (recovered.appointmentId) setSelectedAppointmentId(recovered.appointmentId);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(data);
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      // Clear backup after successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
    onError: (error: any, variables: any) => {
      handleSaveError(error, variables);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(data);
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      // Clear backup after successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
    onError: (error: any, variables: any) => {
      handleSaveError(error, variables);
    },
  });

  // Helper functions
  const handleSymptomChange = (symptom: string, severity: string) => {
    setSymptoms(prev => ({ ...prev, [symptom]: severity }));
  };

  const handleInterventionChange = (intervention: string, checked: boolean) => {
    setInterventionsUsed(prev => ({ ...prev, [intervention]: checked }));
  };

  const addGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, { goalDescription: '', progressLevel: '', notes: '' }]);
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof GoalProgress, value: string) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    setGoals(updatedGoals);
  };

  // AI Handler Functions
  const handleGenerateFromTranscription = async (sessionNotes: string) => {
    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-note', {
        noteType: 'Progress Note',
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
    if (data.sessionDate) setSessionDate(data.sessionDate);
    if (data.sessionDuration) setSessionDuration(data.sessionDuration);
    if (data.sessionType) setSessionType(data.sessionType);
    if (data.location) setLocation(data.location);
    if (data.symptoms) setSymptoms(data.symptoms);

    // Handle goals - ensure it's always an array
    if (data.goals) {
      if (Array.isArray(data.goals)) {
        setGoals(data.goals);
      } else if (typeof data.goals === 'object') {
        // If it's a single goal object, wrap it in an array
        setGoals([data.goals]);
      }
    }

    if (data.appearance) setAppearance(data.appearance);
    if (data.mood) setMood(data.mood);
    if (data.affect) setAffect(data.affect);
    if (data.thoughtProcess) setThoughtProcess(data.thoughtProcess);
    if (data.suicidalIdeation !== undefined) setSuicidalIdeation(data.suicidalIdeation);
    if (data.homicidalIdeation !== undefined) setHomicidalIdeation(data.homicidalIdeation);
    if (data.riskLevel) setRiskLevel(data.riskLevel);
    if (data.interventionsUsed) setInterventionsUsed(data.interventionsUsed);
    if (data.otherIntervention) setOtherIntervention(data.otherIntervention);
    if (data.engagementLevel) setEngagementLevel(data.engagementLevel);
    if (data.responseToInterventions) setResponseToInterventions(data.responseToInterventions);
    if (data.homeworkCompliance) setHomeworkCompliance(data.homeworkCompliance);
    if (data.clientResponseNotes) setClientResponseNotes(data.clientResponseNotes);
    if (data.subjective) setSubjective(data.subjective);
    if (data.objective) setObjective(data.objective);
    if (data.assessment) setAssessment(data.assessment);
    if (data.plan) setPlan(data.plan);

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {


    const selectedInterventions = Object.entries(interventionsUsed)
      .filter(([_, checked]) => checked)
      .map(([intervention]) => intervention);

    if (otherIntervention) {
      selectedInterventions.push(`Other: ${otherIntervention}`);
    }

    const data = {
      clientId,
      noteType: 'Progress Note',
      appointmentId: appointmentId || null, // Allow null for drafts without appointment
      sessionDate: sessionDate ? new Date(sessionDate).toISOString() : undefined,
      sessionDuration: sessionDuration ? parseInt(sessionDuration) : undefined, // Convert to number
      sessionType: sessionType || undefined,
      location: location || undefined,
      symptoms,
      goals: Array.isArray(goals) ? goals : [],
      appearance: appearance || undefined,
      mood: mood || undefined,
      affect: affect || undefined,
      thoughtProcess: thoughtProcess || undefined,
      suicidalIdeation,
      homicidalIdeation,
      riskLevel: riskLevel || undefined,
      interventionsUsed: selectedInterventions,
      engagementLevel: engagementLevel || undefined,
      responseToInterventions: responseToInterventions || undefined,
      homeworkCompliance: homeworkCompliance || undefined,
      clientResponseNotes: clientResponseNotes || undefined,
      subjective: subjective || undefined,
      objective: objective || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
      diagnosisCodes: Array.isArray(diagnosisCodes) ? diagnosisCodes : [],
      safetyPlanReviewed: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanReviewed : undefined,
      safetyPlanUpdated: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanUpdated : undefined,
      cptCode: cptCode || undefined,
      sessionDurationMinutes: sessionDurationMinutes ? parseInt(sessionDurationMinutes) : undefined,
      billable,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      status: 'DRAFT',
    };

    saveDraftMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {


    // Phase 1.3: Validate note data before submission
    const noteData = {
      subjective,
      objective,
      assessment,
      plan,
      cptCode,
    };

    const validation = validateNote(noteData);
    setValidationErrors(validation.errors);
    setShowValidation(true);

    if (!validation.isValid) {
      setAiWarnings(['Please complete all required fields before submitting.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const selectedInterventions = Object.entries(interventionsUsed)
      .filter(([_, checked]) => checked)
      .map(([intervention]) => intervention);

    if (otherIntervention) {
      selectedInterventions.push(`Other: ${otherIntervention}`);
    }

    const data = {
      clientId,
      noteType: 'Progress Note',
      appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      sessionDuration,
      sessionType,
      location,
      symptoms,
      goals: Array.isArray(goals) ? goals : [],
      appearance,
      mood,
      affect,
      thoughtProcess,
      suicidalIdeation,
      homicidalIdeation,
      riskLevel,
      interventionsUsed: selectedInterventions,
      engagementLevel,
      responseToInterventions,
      homeworkCompliance,
      clientResponseNotes,
      subjective,
      objective,
      assessment,
      plan,
      diagnosisCodes: Array.isArray(diagnosisCodes) ? diagnosisCodes : [],
      safetyPlanReviewed: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanReviewed : undefined,
      safetyPlanUpdated: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanUpdated : undefined,
      cptCode,
      sessionDurationMinutes: sessionDurationMinutes ? parseInt(sessionDurationMinutes) : undefined,
      billable,
      dueDate: new Date(dueDate).toISOString(),
    };

    saveMutation.mutate(data);
  };

  // Sign and Submit handler - saves note then opens signature modal
  const handleSignAndSubmit = () => {
    // Phase 1.3: Validate note data before submission
    const noteData = {
      subjective,
      objective,
      assessment,
      plan,
      cptCode,
    };

    const validation = validateNote(noteData);
    setValidationErrors(validation.errors);
    setShowValidation(true);

    if (!validation.isValid) {
      setAiWarnings(['Please complete all required fields before signing.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const selectedInterventions = Object.entries(interventionsUsed)
      .filter(([_, checked]) => checked)
      .map(([intervention]) => intervention);

    if (otherIntervention) {
      selectedInterventions.push(`Other: ${otherIntervention}`);
    }

    const data = {
      clientId,
      noteType: 'Progress Note',
      appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      sessionDuration,
      sessionType,
      location,
      symptoms,
      goals: Array.isArray(goals) ? goals : [],
      appearance,
      mood,
      affect,
      thoughtProcess,
      suicidalIdeation,
      homicidalIdeation,
      riskLevel,
      interventionsUsed: selectedInterventions,
      engagementLevel,
      responseToInterventions,
      homeworkCompliance,
      clientResponseNotes,
      subjective,
      objective,
      assessment,
      plan,
      diagnosisCodes: Array.isArray(diagnosisCodes) ? diagnosisCodes : [],
      safetyPlanReviewed: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanReviewed : undefined,
      safetyPlanUpdated: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanUpdated : undefined,
      cptCode,
      sessionDurationMinutes: sessionDurationMinutes ? parseInt(sessionDurationMinutes) : undefined,
      billable,
      dueDate: new Date(dueDate).toISOString(),
    };

    // Initiate sign and submit - will save as DRAFT first, then open signature modal
    initiateSignAndSubmit(data, isEditMode ? noteId : undefined);
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
            Progress Note
          </h1>
          <p className="text-gray-600 mt-2">Session progress and treatment updates</p>
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
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save progress note'}
              </p>
            </div>
          </div>
        )}

        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Progress Note"
              onSelect={handleAppointmentSelect}
              onCreateNew={() => {
                setShowAppointmentPicker(false);
                setShowCreateModal(true);
              }}
            />
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAppointmentPicker(false);
                  setSelectedAppointmentId('');
                }}
                className="w-full text-purple-600 hover:text-purple-700 font-medium py-2 px-4 rounded-lg border border-purple-300 hover:border-purple-400 transition-colors"
              >
                Continue without appointment (Save as Draft)
              </button>
            </div>
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
            noteType="Progress Note"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - shown after appointment is selected OR when skipping appointment for draft */}
        {!showAppointmentPicker && (
          <form onSubmit={() => handleSubmit({} as any)} className="space-y-6">
            {/* Schedule Header */}
            {appointmentData && (
              <ScheduleHeader
                appointmentDate={appointmentData.appointmentDate}
                startTime={appointmentData.startTime}
                endTime={appointmentData.endTime}
                duration={appointmentData.duration || 45}
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
              noteType="Progress Note"
            />

          {/* Current Symptoms */}
          <FormSection title="Current Symptoms" number={1}>
            <p className="text-sm text-gray-600 mb-4">Rate the severity of each symptom present in this session</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SYMPTOMS.map(symptom => (
                <div key={symptom} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{symptom}</label>
                  <select
                    value={symptoms[symptom] || ''}
                    onChange={(e) => handleSymptomChange(symptom, e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select severity</option>
                    {SEVERITIES.map(severity => (
                      <option key={severity} value={severity}>{severity}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Progress Toward Goals */}
          <FormSection title="Progress Toward Goals" number={2}>
            <div className="space-y-6">
              {Array.isArray(goals) && goals.map((goal, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Goal {index + 1}</h3>
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Description</label>
                      <input
                        type="text"
                        value={goal.goalDescription}
                        onChange={(e) => updateGoal(index, 'goalDescription', e.target.value)}
                        placeholder="Enter treatment goal or auto-populate from treatment plan"
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Progress Level</label>
                      <select
                        value={goal.progressLevel}
                        onChange={(e) => updateGoal(index, 'progressLevel', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select progress level</option>
                        {PROGRESS_LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes on Progress</label>
                      <textarea
                        value={goal.notes}
                        onChange={(e) => updateGoal(index, 'notes', e.target.value)}
                        rows={3}
                        placeholder="Specific observations about progress on this goal..."
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {goals.length < 5 && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl text-purple-700 font-semibold hover:from-purple-200 hover:to-blue-200 transition-all"
                >
                  + Add Another Goal (up to 5)
                </button>
              )}
            </div>
          </FormSection>

          {/* Brief Mental Status */}
          <FormSection title="Brief Mental Status" number={3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                label="Appearance"
                value={appearance}
                onChange={setAppearance}
                options={APPEARANCES.map(app => ({ value: app, label: app }))}
              />
              <TextField
                label="Mood (client stated)"
                value={mood}
                onChange={setMood}
                placeholder="e.g., 'happy', 'sad', 'anxious'"
              />
              <SelectField
                label="Affect"
                value={affect}
                onChange={setAffect}
                options={AFFECTS.map(aff => ({ value: aff, label: aff }))}
              />
              <SelectField
                label="Thought Process"
                value={thoughtProcess}
                onChange={setThoughtProcess}
                options={THOUGHT_PROCESSES.map(tp => ({ value: tp, label: tp }))}
              />
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <CheckboxField
                  label="Suicidal Ideation"
                  checked={suicidalIdeation}
                  onChange={setSuicidalIdeation}
                />
                <CheckboxField
                  label="Homicidal Ideation"
                  checked={homicidalIdeation}
                  onChange={setHomicidalIdeation}
                />
                <SelectField
                  label="Risk Level"
                  value={riskLevel}
                  onChange={setRiskLevel}
                  options={RISK_LEVELS.map(level => ({ value: level, label: level }))}
                  required
                />
              </div>
            </div>
          </FormSection>

          {/* Interventions Used */}
          <FormSection title="Interventions Used" number={4}>
            <p className="text-sm text-gray-600 mb-4">Select all interventions used in this session</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {INTERVENTIONS.map(intervention => (
                <CheckboxField
                  key={intervention}
                  label={intervention}
                  checked={interventionsUsed[intervention] || false}
                  onChange={(checked) => handleInterventionChange(intervention, checked)}
                />
              ))}
            </div>
            <TextField
              label="Other Intervention (specify)"
              value={otherIntervention}
              onChange={setOtherIntervention}
              placeholder="Describe any other interventions used..."
            />
          </FormSection>

          {/* Client Response */}
          <FormSection title="Client Response" number={5}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <SelectField
                label="Engagement Level"
                value={engagementLevel}
                onChange={setEngagementLevel}
                options={ENGAGEMENT_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
              <SelectField
                label="Response to Interventions"
                value={responseToInterventions}
                onChange={setResponseToInterventions}
                options={RESPONSE_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
              <SelectField
                label="Homework Compliance"
                value={homeworkCompliance}
                onChange={setHomeworkCompliance}
                options={HOMEWORK_COMPLIANCE.map(level => ({ value: level, label: level }))}
              />
            </div>
            <TextAreaField
              label="Client Response Notes"
              value={clientResponseNotes}
              onChange={setClientResponseNotes}
              rows={4}
              placeholder="Additional notes about client's response, insights gained, or other observations..."
            />
          </FormSection>

          {/* SOAP Notes */}
          <FormSection title="SOAP Notes" number={6}>
            <div className="space-y-6">
              <ValidatedField
                label="Subjective"
                fieldName="subjective"
                isRequired={isFieldRequired('subjective')}
                helpText={getFieldHelpText('subjective')}
                error={validationErrors.find(e => e.field === 'subjective')}
                showValidation={showValidation}
              >
                <TextAreaField
                  label=""
                  value={subjective}
                  onChange={setSubjective}
                  required={isFieldRequired('subjective')}
                  rows={4}
                  placeholder="Client's reported symptoms, concerns, and subjective experience (auto-populated from symptoms)"
                />
              </ValidatedField>

              <ValidatedField
                label="Objective"
                fieldName="objective"
                isRequired={isFieldRequired('objective')}
                helpText={getFieldHelpText('objective')}
                error={validationErrors.find(e => e.field === 'objective')}
                showValidation={showValidation}
              >
                <TextAreaField
                  label=""
                  value={objective}
                  onChange={setObjective}
                  required={isFieldRequired('objective')}
                  rows={4}
                  placeholder="Observable behaviors, mental status observations (auto-populated from MSE)"
                />
              </ValidatedField>

              <ValidatedField
                label="Assessment"
                fieldName="assessment"
                isRequired={isFieldRequired('assessment')}
                helpText={getFieldHelpText('assessment')}
                error={validationErrors.find(e => e.field === 'assessment')}
                showValidation={showValidation}
              >
                <TextAreaField
                  label=""
                  value={assessment}
                  onChange={setAssessment}
                  required={isFieldRequired('assessment')}
                  rows={4}
                  placeholder="Clinical impressions, progress evaluation, symptom severity, response to treatment..."
                />
              </ValidatedField>

              <ValidatedField
                label="Plan"
                fieldName="plan"
                isRequired={isFieldRequired('plan')}
                helpText={getFieldHelpText('plan')}
                error={validationErrors.find(e => e.field === 'plan')}
                showValidation={showValidation}
              >
                <TextAreaField
                  label=""
                  value={plan}
                  onChange={setPlan}
                  required={isFieldRequired('plan')}
                  rows={4}
                  placeholder="Treatment interventions for this session, homework assigned, follow-up plans..."
                />
              </ValidatedField>
            </div>
          </FormSection>

          {/* Safety & Risk */}
          <FormSection title="Safety & Risk Management" number={7}>
            <div className="space-y-6">
              <p className="text-sm text-gray-600 mb-2">
                Note: Risk Level already assessed in Mental Status section above. Use this section for safety planning if moderate/high risk was identified.
              </p>
              {(riskLevel === 'Moderate' || riskLevel === 'High') && (
                <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Safety Plan Management Required</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CheckboxField
                      label="Safety Plan Reviewed"
                      checked={safetyPlanReviewed}
                      onChange={setSafetyPlanReviewed}
                    />
                    <CheckboxField
                      label="Safety Plan Updated"
                      checked={safetyPlanUpdated}
                      onChange={setSafetyPlanUpdated}
                    />
                  </div>
                </div>
              )}
              {riskLevel !== 'Moderate' && riskLevel !== 'High' && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl">
                  <p className="text-sm text-green-700">No immediate safety concerns identified based on current risk level assessment.</p>
                </div>
              )}
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={8}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ValidatedField
                  label="CPT Code"
                  fieldName="cptCode"
                  isRequired={isFieldRequired('cptCode')}
                  helpText={getFieldHelpText('cptCode')}
                  error={validationErrors.find(e => e.field === 'cptCode')}
                  showValidation={showValidation}
                >
                  <CPTCodeAutocomplete value={cptCode} onChange={setCptCode} />
                </ValidatedField>
                <TextField
                  label="Session Duration (minutes)"
                  value={sessionDurationMinutes}
                  onChange={setSessionDurationMinutes}
                  placeholder="e.g., 30, 45, 60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Due Date (7-day rule)"
                  type="date"
                  value={dueDate}
                  onChange={setDueDate}
                  required
                />
                <div className="flex items-center">
                  <CheckboxField
                    label="Billable Service"
                    checked={billable}
                    onChange={setBillable}
                  />
                </div>
              </div>
            </div>
          </FormSection>

            {/* Phase 1.3: Validation Summary */}
            {showValidation && (
              <div className="mt-6">
                <ValidationSummary
                  errors={validationErrors}
                  requiredFields={summary?.requiredFields || []}
                  noteType="Progress Note"
                  showOnlyWhenInvalid={false}
                />
              </div>
            )}

            {/* Form Actions */}
            <FormActions
              onCancel={() => navigate(`/clients/${clientId}/notes`)}
              onSubmit={() => handleSubmit({} as any)}
              submitLabel={isEditMode ? "Update Progress Note" : "Create Progress Note"}
              isSubmitting={saveMutation.isPending}
              onSaveDraft={() => handleSaveDraft({} as any)}
              isSavingDraft={saveDraftMutation.isPending}
              onSignAndSubmit={handleSignAndSubmit}
              isSigningAndSubmitting={isSignAndSubmitting}
              canSign={true}
              signAndSubmitLabel="Sign & Submit"
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
            noteType="Progress Note"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}

        {/* Signature Modal for Sign & Submit */}
        <SignatureModal {...signatureModalProps} />
      </div>
    </div>
  );
}
