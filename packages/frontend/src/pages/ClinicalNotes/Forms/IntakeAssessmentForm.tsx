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
import { useNoteValidation } from '../../../hooks/useNoteValidation';
import ValidatedField from '../../../components/ClinicalNotes/ValidatedField';
import ValidationSummary from '../../../components/ClinicalNotes/ValidationSummary';

// Constants for dropdowns
const RISK_LEVELS = ['None', 'Low', 'Moderate', 'High', 'Imminent'];
const SEVERITY_LEVELS = ['N/A', 'Mild', 'Moderate', 'Severe'];
const FREQUENCY_OPTIONS = ['None', 'Rare', 'Occasional', 'Frequent', 'Constant'];
const INTENSITY_OPTIONS = ['None', 'Mild', 'Moderate', 'Severe'];
const SUBSTANCE_FREQUENCY = ['Never', 'Rarely', 'Weekly', 'Daily', 'Multiple times daily'];

// Appearance options
const GROOMING_OPTIONS = ['Well-groomed', 'Disheveled', 'Unkempt', 'Appropriate'];
const HYGIENE_OPTIONS = ['Good', 'Fair', 'Poor'];
const DRESS_OPTIONS = ['Appropriate', 'Inappropriate', 'Unusual'];

// Behavior options
const EYE_CONTACT_OPTIONS = ['Good', 'Minimal', 'Excessive', 'Avoidant'];
const MOTOR_ACTIVITY_OPTIONS = ['Normal', 'Restless', 'Agitated', 'Retarded', 'Hyperactive'];
const COOPERATION_OPTIONS = ['Cooperative', 'Guarded', 'Uncooperative', 'Resistant'];
const RAPPORT_OPTIONS = ['Good', 'Fair', 'Poor', 'Difficult to establish'];

// Speech options
const SPEECH_RATE_OPTIONS = ['Normal', 'Slow', 'Rapid', 'Pressured'];
const SPEECH_VOLUME_OPTIONS = ['Normal', 'Loud', 'Soft', 'Mute'];
const SPEECH_FLUENCY_OPTIONS = ['Fluent', 'Dysfluent', 'Stuttering'];
const SPEECH_ARTICULATION_OPTIONS = ['Clear', 'Slurred', 'Mumbled'];
const SPEECH_SPONTANEITY_OPTIONS = ['Spontaneous', 'Prompted', 'Minimal'];

// Affect options
const AFFECT_RANGE_OPTIONS = ['Full', 'Restricted', 'Blunted', 'Flat'];
const AFFECT_APPROPRIATENESS_OPTIONS = ['Appropriate', 'Inappropriate'];
const AFFECT_MOBILITY_OPTIONS = ['Mobile', 'Fixed'];
const AFFECT_QUALITY_OPTIONS = ['Euthymic', 'Depressed', 'Anxious', 'Irritable', 'Euphoric', 'Angry'];

// Thought Process options
const THOUGHT_ORGANIZATION_OPTIONS = [
  'Logical',
  'Circumstantial',
  'Tangential',
  'Loose',
  'Disorganized',
  'Flight of Ideas',
];
const THOUGHT_COHERENCE_OPTIONS = ['Coherent', 'Incoherent'];

// Cognition options
const ATTENTION_OPTIONS = ['Intact', 'Impaired', 'Distractible'];
const CONCENTRATION_OPTIONS = ['Intact', 'Impaired'];
const MEMORY_OPTIONS = ['Intact', 'Impaired'];
const FUND_KNOWLEDGE_OPTIONS = ['Average', 'Above Average', 'Below Average'];
const ABSTRACT_THINKING_OPTIONS = ['Intact', 'Concrete', 'Impaired'];
const CALCULATION_OPTIONS = ['Intact', 'Impaired'];

// Insight & Judgment options
const INSIGHT_OPTIONS = ['Good', 'Fair', 'Poor', 'None'];
const JUDGMENT_OPTIONS = ['Good', 'Fair', 'Poor', 'Impaired'];
const IMPULSE_CONTROL_OPTIONS = ['Good', 'Fair', 'Poor', 'Impaired'];

// Hallucination types
const HALLUCINATION_TYPES = ['Auditory', 'Visual', 'Tactile', 'Olfactory', 'Gustatory'];

// Appetite/Weight change options
const APPETITE_CHANGE_OPTIONS = ['N/A', 'Increased', 'Decreased'];
const WEIGHT_CHANGE_OPTIONS = ['N/A', 'Increased', 'Decreased'];

// Symptoms list with additional dropdown requirements
const SYMPTOMS = [
  { id: 'depression', label: 'Depression', hasExtra: false },
  { id: 'anxiety', label: 'Anxiety', hasExtra: false },
  { id: 'irritability', label: 'Irritability', hasExtra: false },
  { id: 'anger', label: 'Anger', hasExtra: false },
  { id: 'moodSwings', label: 'Mood Swings', hasExtra: false },
  { id: 'cryingSpells', label: 'Crying Spells', hasExtra: false },
  { id: 'hopelessness', label: 'Hopelessness', hasExtra: false },
  { id: 'worthlessness', label: 'Worthlessness', hasExtra: false },
  { id: 'guilt', label: 'Guilt', hasExtra: false },
  { id: 'anhedonia', label: 'Anhedonia (Loss of Interest)', hasExtra: false },
  { id: 'socialWithdrawal', label: 'Social Withdrawal', hasExtra: false },
  { id: 'insomnia', label: 'Insomnia', hasExtra: false },
  { id: 'hypersomnia', label: 'Hypersomnia', hasExtra: false },
  { id: 'appetiteChange', label: 'Appetite Change', hasExtra: true, extraType: 'appetite' },
  { id: 'weightChange', label: 'Weight Change', hasExtra: true, extraType: 'weight' },
  { id: 'fatigue', label: 'Fatigue/Low Energy', hasExtra: false },
  { id: 'concentrationDifficulty', label: 'Concentration Difficulty', hasExtra: false },
  { id: 'indecisiveness', label: 'Indecisiveness', hasExtra: false },
  { id: 'psychomotorAgitation', label: 'Psychomotor Agitation', hasExtra: false },
  { id: 'psychomotorRetardation', label: 'Psychomotor Retardation', hasExtra: false },
  { id: 'panic', label: 'Panic Attacks', hasExtra: false },
  { id: 'worry', label: 'Excessive Worry', hasExtra: false },
  { id: 'obsessions', label: 'Obsessions', hasExtra: false },
  { id: 'compulsions', label: 'Compulsions', hasExtra: false },
  { id: 'flashbacks', label: 'Flashbacks', hasExtra: false },
  { id: 'nightmares', label: 'Nightmares', hasExtra: false },
  { id: 'hypervigilance', label: 'Hypervigilance', hasExtra: false },
  { id: 'avoidance', label: 'Avoidance', hasExtra: false },
  { id: 'dissociation', label: 'Dissociation', hasExtra: false },
  { id: 'hallucinations', label: 'Hallucinations', hasExtra: true, extraType: 'hallucination' },
  { id: 'delusions', label: 'Delusions', hasExtra: false },
  { id: 'disorganizedThinking', label: 'Disorganized Thinking', hasExtra: false },
  { id: 'behavioralProblems', label: 'Behavioral Problems', hasExtra: false },
];

interface SymptomState {
  present: boolean;
  severity: string;
  extra?: string;
}

export default function IntakeAssessmentForm() {
  const { clientId, noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!noteId;

  console.log('🟣 COMPONENT MOUNTED/RE-RENDERED', {
    clientId,
    noteId,
    isEditMode
  });

  // Get appointmentId from URL query parameters
  const [searchParams] = useSearchParams();
  const appointmentIdFromURL = searchParams.get('appointmentId') || '';

  // Appointment selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentIdFromURL);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(!appointmentIdFromURL && !isEditMode);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const appointmentId = selectedAppointmentId;

  const [sessionDate, _setSessionDate] = useState('');
  const setSessionDate = (value: string) => {
    console.log('📅 setSessionDate called with:', value);
    console.log('📅 Previous sessionDate state:', sessionDate);
    console.trace('📅 Call stack:');
    _setSessionDate(value);
  };

  const [dueDate, setDueDate] = useState('');
  const [nextSessionDate, setNextSessionDate] = useState('');

  // Presenting Problem
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [presentingProblem, setPresentingProblem] = useState('');

  // Current Symptoms - comprehensive state management
  const [selectedSymptoms, setSelectedSymptoms] = useState<Array<{ id: string; label: string; severity: string; extra?: string }>>([]);
  const [symptomSearch, setSymptomSearch] = useState('');

  // History
  const [psychiatricHistory, setPsychiatricHistory] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [medications, setMedications] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [developmentalHistory, setDevelopmentalHistory] = useState('');

  // Substance Use with frequency dropdowns
  const [alcoholUse, setAlcoholUse] = useState('');
  const [alcoholFrequency, setAlcoholFrequency] = useState('Never');
  const [tobaccoUse, setTobaccoUse] = useState('');
  const [tobaccoFrequency, setTobaccoFrequency] = useState('Never');
  const [drugUse, setDrugUse] = useState('');
  const [drugFrequency, setDrugFrequency] = useState('Never');

  // Mental Status Examination - Appearance
  const [grooming, setGrooming] = useState('');
  const [hygiene, setHygiene] = useState('');
  const [dress, setDress] = useState('');

  // MSE - Behavior
  const [eyeContact, setEyeContact] = useState('');
  const [motorActivity, setMotorActivity] = useState('');
  const [cooperation, setCooperation] = useState('');
  const [rapport, setRapport] = useState('');

  // MSE - Speech
  const [speechRate, setSpeechRate] = useState('');
  const [speechVolume, setSpeechVolume] = useState('');
  const [speechFluency, setSpeechFluency] = useState('');
  const [speechArticulation, setSpeechArticulation] = useState('');
  const [speechSpontaneity, setSpeechSpontaneity] = useState('');

  // MSE - Mood & Affect
  const [mood, setMood] = useState('');
  const [affectRange, setAffectRange] = useState('');
  const [affectAppropriateness, setAffectAppropriateness] = useState('');
  const [affectMobility, setAffectMobility] = useState('');
  const [affectQuality, setAffectQuality] = useState('');

  // MSE - Thought Process
  const [thoughtOrganization, setThoughtOrganization] = useState('');
  const [thoughtCoherence, setThoughtCoherence] = useState('');
  const [thoughtGoalDirected, setThoughtGoalDirected] = useState(false);

  // MSE - Thought Content
  const [suicidalIdeation, setSuicidalIdeation] = useState(false);
  const [homicidalIdeation, setHomicidalIdeation] = useState(false);
  const [delusions, setDelusions] = useState(false);
  const [delusionDetails, setDelusionDetails] = useState('');

  // MSE - Perception
  const [hasHallucinations, setHasHallucinations] = useState(false);
  const [hallucinationTypes, setHallucinationTypes] = useState<string[]>([]);

  // MSE - Cognition
  const [orientedPerson, setOrientedPerson] = useState(true);
  const [orientedPlace, setOrientedPlace] = useState(true);
  const [orientedTime, setOrientedTime] = useState(true);
  const [orientedSituation, setOrientedSituation] = useState(true);
  const [attention, setAttention] = useState('');
  const [concentration, setConcentration] = useState('');
  const [memoryImmediate, setMemoryImmediate] = useState('');
  const [memoryRecent, setMemoryRecent] = useState('');
  const [memoryRemote, setMemoryRemote] = useState('');
  const [fundKnowledge, setFundKnowledge] = useState('');
  const [abstractThinking, setAbstractThinking] = useState('');
  const [calculation, setCalculation] = useState('');

  // MSE - Insight & Judgment
  const [insight, setInsight] = useState('');
  const [judgment, setJudgment] = useState('');
  const [impulseControl, setImpulseControl] = useState('');

  // Enhanced Safety Assessment
  const [selfHarm, setSelfHarm] = useState(false);
  const [siFrequency, setSiFrequency] = useState('None');
  const [siIntensity, setSiIntensity] = useState('None');
  const [hiFrequency, setHiFrequency] = useState('None');
  const [hiIntensity, setHiIntensity] = useState('None');
  const [riskLevel, setRiskLevel] = useState('None');
  const [riskFactors, setRiskFactors] = useState('');
  const [protectiveFactors, setProtectiveFactors] = useState('');
  const [safetyPlan, setSafetyPlan] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState('');

  // SOAP
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Diagnosis & Billing
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

  // Treatment Recommendations
  const [treatmentRecommendations, setTreatmentRecommendations] = useState('');
  const [recommendedFrequency, setRecommendedFrequency] = useState('');

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Record<string, any> | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // Phase 1.3: Validation
  const { validateNote, summary, isFieldRequired, getFieldHelpText } = useNoteValidation('Intake Assessment');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);

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

  // Fetch appointment data when appointmentId is selected
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligible-appointments', clientId, 'Intake Assessment'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Intake%20Assessment`
      );
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch specific appointment details
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (selectedAppointmentId && !appointmentData) {
        try {
          const response = await api.get(`/appointments/${selectedAppointmentId}`);
          const apt = response.data.data;
          console.log('🔵 APPOINTMENT DATA:', apt);
          console.log('🔵 apt.appointmentDate:', apt.appointmentDate);
          console.log('🔵 typeof apt.appointmentDate:', typeof apt.appointmentDate);
          setAppointmentData(apt);

          // Auto-populate session date from appointment
          if (apt.appointmentDate) {
            const date = new Date(apt.appointmentDate);
            console.log('🔵 Date object created:', date);
            console.log('🔵 date.toISOString():', date.toISOString());
            const sessionDateValue = date.toISOString().split('T')[0];
            console.log('🔵 sessionDate value being set:', sessionDateValue);
            setSessionDate(sessionDateValue);
          }
        } catch (error) {
          console.error('Error fetching appointment data:', error);
        }
      }
    };
    fetchAppointmentData();
  }, [selectedAppointmentId, appointmentData]);

  // Sync session date with appointment data (handles rescheduled appointments)
  useEffect(() => {
    if (appointmentData?.appointmentDate) {
      const date = new Date(appointmentData.appointmentDate);
      const sessionDateValue = date.toISOString().split('T')[0];
      console.log('🟢 SYNCING sessionDate from appointment:', sessionDateValue);
      setSessionDate(sessionDateValue);
    }
  }, [appointmentData?.appointmentDate]);

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
    console.log('🔴 EDIT MODE EFFECT TRIGGERED', {
      existingNoteData: !!existingNoteData,
      isEditMode,
      noteId,
      existingSessionDate: existingNoteData?.sessionDate
    });

    if (existingNoteData && isEditMode) {
      console.log('🔴 LOADING EXISTING NOTE DATA');
      // Set appointment ID from existing note
      if (existingNoteData.appointmentId) {
        setSelectedAppointmentId(existingNoteData.appointmentId);
      }

      // Session details - let appointment data drive sessionDate, only set if no appointment
      if (existingNoteData.dueDate) {
        const date = new Date(existingNoteData.dueDate);
        setDueDate(date.toISOString().split('T')[0]);
      }
      if (existingNoteData.nextSessionDate) {
        const date = new Date(existingNoteData.nextSessionDate);
        setNextSessionDate(date.toISOString().split('T')[0]);
      }

      // Parse SOAP notes to extract field data
      if (existingNoteData.subjective) {
        const subjective = existingNoteData.subjective;
        const chiefComplaintMatch = subjective.match(/Chief Complaint:\s*(.+?)(?:\n|$)/);
        if (chiefComplaintMatch) setChiefComplaint(chiefComplaintMatch[1].trim());

        const presentingProblemMatch = subjective.match(/Presenting Problem:\s*(.+?)(?:\n\nCurrent Symptoms:|$)/s);
        if (presentingProblemMatch) setPresentingProblem(presentingProblemMatch[1].trim());
      }

      // Parse assessment for history fields
      if (existingNoteData.assessment) {
        const assessment = existingNoteData.assessment;
        const psychiatricHistoryMatch = assessment.match(/Psychiatric History:\s*(.+?)(?:\nMedical History:|$)/s);
        if (psychiatricHistoryMatch) setPsychiatricHistory(psychiatricHistoryMatch[1].trim());

        const medicalHistoryMatch = assessment.match(/Medical History:\s*(.+?)(?:\nMedications:|$)/s);
        if (medicalHistoryMatch) setMedicalHistory(medicalHistoryMatch[1].trim());

        const medicationsMatch = assessment.match(/Medications:\s*(.+?)(?:\nSubstance Use:|$)/s);
        if (medicationsMatch) setMedications(medicationsMatch[1].trim());

        const substanceUseMatch = assessment.match(/Substance Use:\s*(.+?)(?:\nFamily History:|$)/s);
        if (substanceUseMatch) {
          const substanceText = substanceUseMatch[1];
          const alcoholMatch = substanceText.match(/Alcohol:\s*(.+?)\s*\((.+?)\)/);
          if (alcoholMatch) {
            setAlcoholUse(alcoholMatch[1].trim());
            setAlcoholFrequency(alcoholMatch[2].trim());
          }
          const tobaccoMatch = substanceText.match(/Tobacco:\s*(.+?)\s*\((.+?)\)/);
          if (tobaccoMatch) {
            setTobaccoUse(tobaccoMatch[1].trim());
            setTobaccoFrequency(tobaccoMatch[2].trim());
          }
          const drugMatch = substanceText.match(/Drugs:\s*(.+?)\s*\((.+?)\)/);
          if (drugMatch) {
            setDrugUse(drugMatch[1].trim());
            setDrugFrequency(drugMatch[2].trim());
          }
        }

        const familyHistoryMatch = assessment.match(/Family History:\s*(.+?)(?:\nSocial History:|$)/s);
        if (familyHistoryMatch) setFamilyHistory(familyHistoryMatch[1].trim());

        const socialHistoryMatch = assessment.match(/Social History:\s*(.+?)(?:\nDevelopmental History:|$)/s);
        if (socialHistoryMatch) setSocialHistory(socialHistoryMatch[1].trim());

        const developmentalHistoryMatch = assessment.match(/Developmental History:\s*(.+?)$/s);
        if (developmentalHistoryMatch) setDevelopmentalHistory(developmentalHistoryMatch[1].trim());
      }

      // Parse plan for treatment recommendations
      if (existingNoteData.plan) {
        const plan = existingNoteData.plan;
        const treatmentRecommendationsMatch = plan.match(/^(.+?)(?:\n\nTreatment Recommendations:|Treatment Recommendations:)/s);
        if (treatmentRecommendationsMatch) {
          const planText = treatmentRecommendationsMatch[1].trim();
          if (!planText.includes('Treatment Recommendations:')) {
            setPlan(planText);
          }
        }

        const recommendationsMatch = plan.match(/Treatment Recommendations:\s*(.+?)(?:\nRecommended Frequency:|$)/s);
        if (recommendationsMatch) setTreatmentRecommendations(recommendationsMatch[1].trim());

        const frequencyMatch = plan.match(/Recommended Frequency:\s*(.+?)$/s);
        if (frequencyMatch) setRecommendedFrequency(frequencyMatch[1].trim());
      }

      // Risk assessment fields
      if (existingNoteData.suicidalIdeation !== undefined) setSuicidalIdeation(existingNoteData.suicidalIdeation);
      if (existingNoteData.homicidalIdeation !== undefined) setHomicidalIdeation(existingNoteData.homicidalIdeation);
      if (existingNoteData.selfHarm !== undefined) setSelfHarm(existingNoteData.selfHarm);
      if (existingNoteData.riskLevel) setRiskLevel(existingNoteData.riskLevel);

      // Parse risk assessment notes
      if (existingNoteData.riskAssessmentNotes) {
        const riskNotes = existingNoteData.riskAssessmentNotes;
        const riskFactorsMatch = riskNotes.match(/Risk Factors:\s*(.+?)(?:\nProtective Factors:|$)/s);
        if (riskFactorsMatch) setRiskFactors(riskFactorsMatch[1].trim());

        const protectiveFactorsMatch = riskNotes.match(/Protective Factors:\s*(.+?)(?:\nSafety Plan:|$)/s);
        if (protectiveFactorsMatch) setProtectiveFactors(protectiveFactorsMatch[1].trim());

        const safetyPlanMatch = riskNotes.match(/Safety Plan:\s*(.+?)(?:\nEmergency Contacts:|$)/s);
        if (safetyPlanMatch) setSafetyPlan(safetyPlanMatch[1].trim());

        const emergencyContactsMatch = riskNotes.match(/Emergency Contacts:\s*(.+?)$/s);
        if (emergencyContactsMatch) setEmergencyContacts(emergencyContactsMatch[1].trim());
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

  const handleAppointmentSelect = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowAppointmentPicker(false);
  };

  const handleAppointmentCreated = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowCreateModal(false);
    setShowAppointmentPicker(false);
  };

  const addSymptom = (symptom: typeof SYMPTOMS[0]) => {
    if (!selectedSymptoms.find(s => s.id === symptom.id)) {
      setSelectedSymptoms([...selectedSymptoms, {
        id: symptom.id,
        label: symptom.label,
        severity: 'Mild',
        extra: symptom.hasExtra ? 'N/A' : undefined
      }]);
      setSymptomSearch('');
    }
  };

  const removeSymptom = (id: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== id));
  };

  const updateSymptom = (id: string, field: 'severity' | 'extra', value: string) => {
    setSelectedSymptoms(selectedSymptoms.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const getAvailableSymptoms = () => {
    return SYMPTOMS.filter(symptom =>
      !selectedSymptoms.find(s => s.id === symptom.id) &&
      symptom.label.toLowerCase().includes(symptomSearch.toLowerCase())
    );
  };

  const toggleHallucinationType = (type: string) => {
    setHallucinationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  // AI Handler Functions
  const handleGenerateFromTranscription = async (sessionNotes: string) => {
    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-note', {
        noteType: 'Intake Assessment',
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
    if (data.chiefComplaint) setChiefComplaint(data.chiefComplaint);
    if (data.presentingProblem) setPresentingProblem(data.presentingProblem);

    // Handle symptoms - convert from AI format to component format
    if (data.selectedSymptoms && Array.isArray(data.selectedSymptoms)) {
      const formattedSymptoms = data.selectedSymptoms.map((symptomLabel: string) => {
        const symptomDef = SYMPTOMS.find(s => s.label === symptomLabel || s.id === symptomLabel);
        if (symptomDef) {
          return {
            id: symptomDef.id,
            label: symptomDef.label,
            severity: 'Moderate',
            extra: symptomDef.hasExtra ? 'N/A' : undefined
          };
        }
        return null;
      }).filter(Boolean);
      setSelectedSymptoms(formattedSymptoms);
    }

    // History fields
    if (data.psychiatricHistory) setPsychiatricHistory(data.psychiatricHistory);
    if (data.medicalHistory) setMedicalHistory(data.medicalHistory);
    if (data.medications) setMedications(data.medications);
    if (data.familyHistory) setFamilyHistory(data.familyHistory);
    if (data.socialHistory) setSocialHistory(data.socialHistory);
    if (data.substanceUse) {
      // Parse substance use data
      const substanceText = String(data.substanceUse);
      if (substanceText.toLowerCase().includes('alcohol')) setAlcoholUse(substanceText);
      if (substanceText.toLowerCase().includes('tobacco')) setTobaccoUse(substanceText);
      if (substanceText.toLowerCase().includes('drug')) setDrugUse(substanceText);
    }

    // MSE - Appearance
    if (data.appearance) setGrooming(data.appearance);
    if (data.behavior) setCooperation(data.behavior);
    if (data.speech) setSpeechRate(data.speech);
    if (data.mood) setMood(data.mood);
    if (data.affect) setAffectRange(data.affect);
    if (data.thoughtProcess) setThoughtOrganization(data.thoughtProcess);
    if (data.thoughtContent) setDelusionDetails(data.thoughtContent);
    if (data.perceptualDisturbances) {
      setHasHallucinations(data.perceptualDisturbances !== 'None');
      if (data.perceptualDisturbances === 'Auditory hallucinations') {
        setHallucinationTypes(['Auditory']);
      } else if (data.perceptualDisturbances === 'Visual hallucinations') {
        setHallucinationTypes(['Visual']);
      }
    }
    if (data.cognition) setAttention(data.cognition);
    if (data.insight) setInsight(data.insight);
    if (data.judgment) setJudgment(data.judgment);

    // Risk assessment
    if (data.suicidalIdeation) {
      const siValue = String(data.suicidalIdeation);
      setSuicidalIdeation(siValue !== 'None' && siValue !== 'none');
    }
    if (data.suicidalHistory) setRiskFactors(data.suicidalHistory);
    if (data.homicidalIdeation) {
      const hiValue = String(data.homicidalIdeation);
      setHomicidalIdeation(hiValue === 'Present' || hiValue === 'present');
    }
    if (data.selfHarm) {
      const shValue = String(data.selfHarm);
      setSelfHarm(shValue !== 'None' && shValue !== 'none');
    }
    if (data.riskLevel) setRiskLevel(data.riskLevel);
    if (data.safetyPlan) setSafetyPlan(data.safetyPlan);

    // Clinical Assessment (NOT diagnoses - this is clinical impressions)
    if (data.assessment) {
      setAssessment(data.assessment);
    }

    // Diagnosis codes - these should go in the ICD-10 autocomplete field, not assessment
    // For now, we'll add them to the Plan section as text until we can parse ICD codes
    if (data.provisionalDiagnoses) {
      setPlan((prev) => {
        const diagnoses = 'Provisional Diagnoses:\n' + data.provisionalDiagnoses;
        return prev ? diagnoses + '\n\n' + prev : diagnoses;
      });
    }
    if (data.differentialDiagnoses) {
      setPlan((prev) => {
        const differential = '\n\nDifferential Diagnoses:\n' + data.differentialDiagnoses;
        return prev ? prev + differential : differential;
      });
    }

    // Treatment recommendations and prognosis
    if (data.treatmentRecommendations) setTreatmentRecommendations(data.treatmentRecommendations);
    if (data.referrals) {
      setPlan((prev) => {
        const referrals = '\n\nReferrals:\n' + data.referrals;
        return prev ? prev + referrals : referrals;
      });
    }
    if (data.prognosisNote) {
      setPlan((prev) => {
        const prognosis = '\n\nPrognosis:\n' + data.prognosisNote;
        return prev ? prev + prognosis : prognosis;
      });
    }

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    

    // Build symptoms summary
    const symptomsPresent = Array.isArray(selectedSymptoms)
      ? selectedSymptoms
        .map((symptom) => {
          let text = `${symptom.label}: ${symptom.severity}`;
          if (symptom.extra && symptom.extra !== 'N/A') {
            text += ` (${symptom.extra})`;
          }
          return text;
        })
        .join('\n')
      : '';

    // Build MSE summary
    const mseAppearance = `Grooming: ${grooming}, Hygiene: ${hygiene}, Dress: ${dress}`;
    const mseBehavior = `Eye Contact: ${eyeContact}, Motor Activity: ${motorActivity}, Cooperation: ${cooperation}, Rapport: ${rapport}`;
    const mseSpeech = `Rate: ${speechRate}, Volume: ${speechVolume}, Fluency: ${speechFluency}, Articulation: ${speechArticulation}, Spontaneity: ${speechSpontaneity}`;
    const mseAffect = `Range: ${affectRange}, Appropriateness: ${affectAppropriateness}, Mobility: ${affectMobility}, Quality: ${affectQuality}`;
    const mseThoughtProcess = `Organization: ${thoughtOrganization}, Coherence: ${thoughtCoherence}, Goal-directed: ${thoughtGoalDirected ? 'Yes' : 'No'}`;

    const orientationItems = [];
    if (orientedPerson) orientationItems.push('Person');
    if (orientedPlace) orientationItems.push('Place');
    if (orientedTime) orientationItems.push('Time');
    if (orientedSituation) orientationItems.push('Situation');
    const orientation = orientationItems.length > 0 ? `Oriented to ${orientationItems.join(', ')}` : 'Disoriented';

    const mseCognition = `${orientation}\nAttention: ${attention}, Concentration: ${concentration}\nMemory (Immediate/Recent/Remote): ${memoryImmediate}/${memoryRecent}/${memoryRemote}\nFund of Knowledge: ${fundKnowledge}, Abstract Thinking: ${abstractThinking}, Calculation: ${calculation}`;

    const thoughtContent = [];
    if (suicidalIdeation) thoughtContent.push(`Suicidal Ideation (Frequency: ${siFrequency}, Intensity: ${siIntensity})`);
    if (homicidalIdeation) thoughtContent.push(`Homicidal Ideation (Frequency: ${hiFrequency}, Intensity: ${hiIntensity})`);
    if (delusions) thoughtContent.push(`Delusions: ${delusionDetails}`);
    const mseThoughtContent = thoughtContent.length > 0 ? thoughtContent.join('\n') : 'No SI/HI/delusions reported';

    const msePerception = hasHallucinations
      ? `Hallucinations present: ${hallucinationTypes.join(', ')}`
      : 'No hallucinations reported';

    const substanceUse = `Alcohol: ${alcoholUse || 'Not reported'} (${alcoholFrequency})\nTobacco: ${tobaccoUse || 'Not reported'} (${tobaccoFrequency})\nDrugs: ${drugUse || 'Not reported'} (${drugFrequency})`;

    const data = {
      clientId,
      noteType: 'Intake Assessment',
      appointmentId: appointmentId,
      sessionDate: sessionDate ? new Date(sessionDate).toISOString() : undefined,
      subjective: `Chief Complaint: ${chiefComplaint}\n\nPresenting Problem: ${presentingProblem}\n\nCurrent Symptoms:\n${symptomsPresent || 'No significant symptoms reported'}`,
      objective: `Mental Status Examination:\n\nAppearance: ${mseAppearance}\nBehavior: ${mseBehavior}\nSpeech: ${mseSpeech}\nMood: ${mood}\nAffect: ${mseAffect}\nThought Process: ${mseThoughtProcess}\nThought Content: ${mseThoughtContent}\nPerception: ${msePerception}\nCognition: ${mseCognition}\nInsight: ${insight}\nJudgment: ${judgment}\nImpulse Control: ${impulseControl}`,
      assessment: `${assessment}\n\nPsychiatric History: ${psychiatricHistory}\nMedical History: ${medicalHistory}\nMedications: ${medications}\nSubstance Use:\n${substanceUse}\nFamily History: ${familyHistory}\nSocial History: ${socialHistory}\nDevelopmental History: ${developmentalHistory}`,
      plan: `${plan}\n\nTreatment Recommendations: ${treatmentRecommendations}\nRecommended Frequency: ${recommendedFrequency}`,
      suicidalIdeation,
      homicidalIdeation,
      selfHarm,
      riskLevel,
      riskAssessmentNotes: `Risk Factors: ${riskFactors}\nProtective Factors: ${protectiveFactors}\nSafety Plan: ${safetyPlan}\nEmergency Contacts: ${emergencyContacts}`,
      interventions: safetyPlan,
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
    console.log('🟢 handleSubmit called - sessionDate at START of function:', sessionDate);
    console.log('🟢 All state values:', {
      sessionDate,
      dueDate,
      nextSessionDate,
      appointmentId,
      selectedAppointmentId
    });

    // Phase 1.3: Validate note data before submission
    const noteData = {
      subjective: presentingProblem,
      assessment,
      plan,
      diagnosisCodes,
    };

    const validation = validateNote(noteData);
    setValidationErrors(validation.errors);
    setShowValidation(true);

    if (!validation.isValid) {
      setAiWarnings(['Please complete all required fields before submitting.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Build symptoms summary
    const symptomsPresent = Array.isArray(selectedSymptoms)
      ? selectedSymptoms
        .map((symptom) => {
          let text = `${symptom.label}: ${symptom.severity}`;
          if (symptom.extra && symptom.extra !== 'N/A') {
            text += ` (${symptom.extra})`;
          }
          return text;
        })
        .join('\n')
      : '';

    // Build MSE summary
    const mseAppearance = `Grooming: ${grooming}, Hygiene: ${hygiene}, Dress: ${dress}`;
    const mseBehavior = `Eye Contact: ${eyeContact}, Motor Activity: ${motorActivity}, Cooperation: ${cooperation}, Rapport: ${rapport}`;
    const mseSpeech = `Rate: ${speechRate}, Volume: ${speechVolume}, Fluency: ${speechFluency}, Articulation: ${speechArticulation}, Spontaneity: ${speechSpontaneity}`;
    const mseAffect = `Range: ${affectRange}, Appropriateness: ${affectAppropriateness}, Mobility: ${affectMobility}, Quality: ${affectQuality}`;
    const mseThoughtProcess = `Organization: ${thoughtOrganization}, Coherence: ${thoughtCoherence}, Goal-directed: ${thoughtGoalDirected ? 'Yes' : 'No'}`;

    const orientationItems = [];
    if (orientedPerson) orientationItems.push('Person');
    if (orientedPlace) orientationItems.push('Place');
    if (orientedTime) orientationItems.push('Time');
    if (orientedSituation) orientationItems.push('Situation');
    const orientation = orientationItems.length > 0 ? `Oriented to ${orientationItems.join(', ')}` : 'Disoriented';

    const mseCognition = `${orientation}\nAttention: ${attention}, Concentration: ${concentration}\nMemory (Immediate/Recent/Remote): ${memoryImmediate}/${memoryRecent}/${memoryRemote}\nFund of Knowledge: ${fundKnowledge}, Abstract Thinking: ${abstractThinking}, Calculation: ${calculation}`;

    const thoughtContent = [];
    if (suicidalIdeation) thoughtContent.push(`Suicidal Ideation (Frequency: ${siFrequency}, Intensity: ${siIntensity})`);
    if (homicidalIdeation) thoughtContent.push(`Homicidal Ideation (Frequency: ${hiFrequency}, Intensity: ${hiIntensity})`);
    if (delusions) thoughtContent.push(`Delusions: ${delusionDetails}`);
    const mseThoughtContent = thoughtContent.length > 0 ? thoughtContent.join('\n') : 'No SI/HI/delusions reported';

    const msePerception = hasHallucinations
      ? `Hallucinations present: ${hallucinationTypes.join(', ')}`
      : 'No hallucinations reported';

    const substanceUse = `Alcohol: ${alcoholUse || 'Not reported'} (${alcoholFrequency})\nTobacco: ${tobaccoUse || 'Not reported'} (${tobaccoFrequency})\nDrugs: ${drugUse || 'Not reported'} (${drugFrequency})`;

    console.log('🟢 SUBMITTING NOTE - sessionDate state:', sessionDate);
    console.log('🟢 typeof sessionDate:', typeof sessionDate);
    console.log('🟢 new Date(sessionDate):', new Date(sessionDate));
    console.log('🟢 new Date(sessionDate).toISOString():', new Date(sessionDate).toISOString());

    const data = {
      clientId,
      noteType: 'Intake Assessment',
      appointmentId: appointmentId, // Get from URL query parameter
      sessionDate: new Date(sessionDate).toISOString(),
      subjective: `Chief Complaint: ${chiefComplaint}\n\nPresenting Problem: ${presentingProblem}\n\nCurrent Symptoms:\n${symptomsPresent || 'No significant symptoms reported'}`,
      objective: `Mental Status Examination:\n\nAppearance: ${mseAppearance}\nBehavior: ${mseBehavior}\nSpeech: ${mseSpeech}\nMood: ${mood}\nAffect: ${mseAffect}\nThought Process: ${mseThoughtProcess}\nThought Content: ${mseThoughtContent}\nPerception: ${msePerception}\nCognition: ${mseCognition}\nInsight: ${insight}\nJudgment: ${judgment}\nImpulse Control: ${impulseControl}`,
      assessment: `${assessment}\n\nPsychiatric History: ${psychiatricHistory}\nMedical History: ${medicalHistory}\nMedications: ${medications}\nSubstance Use:\n${substanceUse}\nFamily History: ${familyHistory}\nSocial History: ${socialHistory}\nDevelopmental History: ${developmentalHistory}`,
      plan: `${plan}\n\nTreatment Recommendations: ${treatmentRecommendations}\nRecommended Frequency: ${recommendedFrequency}`,
      suicidalIdeation,
      homicidalIdeation,
      selfHarm,
      riskLevel,
      riskAssessmentNotes: `Risk Factors: ${riskFactors}\nProtective Factors: ${protectiveFactors}\nSafety Plan: ${safetyPlan}\nEmergency Contacts: ${emergencyContacts}`,
      interventions: safetyPlan,
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
            Intake Assessment
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive initial evaluation with V1 PRD specifications</p>
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
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save intake assessment'}
              </p>
            </div>
          </div>
        )}

        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Intake Assessment"
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
            noteType="Intake Assessment"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - only shown after appointment is selected */}
        {!showAppointmentPicker && selectedAppointmentId && (
          <form onSubmit={() => handleSubmit({} as any)} className="space-y-6">
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
                editable={false}
              />
            )}

            {/* AI-Powered Note Generation */}
            <SessionInputBox
              onGenerate={handleGenerateFromTranscription}
              isGenerating={isGenerating}
              noteType="Intake Assessment"
            />

          {/* Presenting Problem */}
          <FormSection title="Presenting Problem" number={1}>
            <div className="space-y-6">
              <TextAreaField
                label="Chief Complaint"
                value={chiefComplaint}
                onChange={setChiefComplaint}
                required
                rows={2}
                placeholder="Client's stated reason for seeking services..."
              />
              <ValidatedField
                label="Presenting Problem"
                fieldName="subjective"
                isRequired={isFieldRequired('subjective')}
                helpText={getFieldHelpText('subjective')}
                error={validationErrors.find(e => e.field === 'subjective')}
                showValidation={showValidation}
              >
                <TextAreaField
                  label=""
                  value={presentingProblem}
                  onChange={setPresentingProblem}
                  required={isFieldRequired('subjective')}
                  rows={4}
                  placeholder="Detailed description of current concerns, onset, duration, severity..."
                />
              </ValidatedField>
            </div>
          </FormSection>

          {/* Current Symptoms Checklist */}
          <FormSection title="Current Symptoms" number={2}>
            <div className="space-y-6">
              {/* Search and Add Interface */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search and Add Symptoms
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    placeholder="Type to search symptoms (e.g., depression, anxiety, insomnia)..."
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  {symptomSearch && getAvailableSymptoms().length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-purple-200 max-h-64 overflow-y-auto">
                      {getAvailableSymptoms().slice(0, 10).map((symptom) => (
                        <button
                          key={symptom.id}
                          type="button"
                          onClick={() => addSymptom(symptom)}
                          className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-800">{symptom.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Search for symptoms and click to add them to the list
                </p>
              </div>

              {/* Common Symptoms Quick Add */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Quick Add Common Symptoms
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SYMPTOMS.filter(s =>
                    ['depression', 'anxiety', 'insomnia', 'panic', 'fatigue', 'worry', 'irritability', 'hopelessness'].includes(s.id) &&
                    !selectedSymptoms.find(sel => sel.id === s.id)
                  ).map((symptom) => (
                    <button
                      key={symptom.id}
                      type="button"
                      onClick={() => addSymptom(symptom)}
                      className="px-3 py-2 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-lg text-sm font-medium text-gray-700 hover:from-purple-200 hover:to-blue-200 hover:border-purple-400 transition-all"
                    >
                      + {symptom.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Symptoms */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Selected Symptoms ({selectedSymptoms.length})
                </label>
                {selectedSymptoms.length === 0 ? (
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 text-center">
                    <p className="text-gray-500">No symptoms selected yet. Search or use quick add buttons above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSymptoms.map((symptom) => {
                      const symptomDef = SYMPTOMS.find(s => s.id === symptom.id);
                      return (
                        <div
                          key={symptom.id}
                          className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-md font-semibold text-gray-800">{symptom.label}</h4>
                            <button
                              type="button"
                              onClick={() => removeSymptom(symptom.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg px-2 py-1 transition-all"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Severity
                              </label>
                              <select
                                value={symptom.severity}
                                onChange={(e) => updateSymptom(symptom.id, 'severity', e.target.value)}
                                className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                {SEVERITY_LEVELS.map((level) => (
                                  <option key={level} value={level}>
                                    {level}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {symptomDef?.hasExtra && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  {symptomDef.extraType === 'appetite' && 'Type'}
                                  {symptomDef.extraType === 'weight' && 'Direction'}
                                  {symptomDef.extraType === 'hallucination' && 'Details'}
                                </label>
                                {symptomDef.extraType === 'appetite' && (
                                  <select
                                    value={symptom.extra || 'N/A'}
                                    onChange={(e) => updateSymptom(symptom.id, 'extra', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    {APPETITE_CHANGE_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {symptomDef.extraType === 'weight' && (
                                  <select
                                    value={symptom.extra || 'N/A'}
                                    onChange={(e) => updateSymptom(symptom.id, 'extra', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    {WEIGHT_CHANGE_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {symptomDef.extraType === 'hallucination' && (
                                  <div className="px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-sm text-blue-800">
                                    Specify in Mental Status Examination section
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* Clinical History */}
          <FormSection title="Clinical History" number={3}>
            <div className="space-y-6">
              <TextAreaField
                label="Psychiatric History"
                value={psychiatricHistory}
                onChange={setPsychiatricHistory}
                rows={3}
                placeholder="Previous mental health diagnoses, treatments, hospitalizations..."
              />
              <TextAreaField
                label="Medical History"
                value={medicalHistory}
                onChange={setMedicalHistory}
                rows={3}
                placeholder="Chronic conditions, surgeries, allergies..."
              />
              <TextAreaField
                label="Current Medications"
                value={medications}
                onChange={setMedications}
                rows={2}
                placeholder="List all current medications and dosages..."
              />
            </div>
          </FormSection>

          {/* Substance Use History */}
          <FormSection title="Substance Use History" number={4}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextAreaField
                  label="Alcohol Use"
                  value={alcoholUse}
                  onChange={setAlcoholUse}
                  rows={2}
                  placeholder="Describe alcohol use patterns..."
                />
                <SelectField
                  label="Alcohol Frequency"
                  value={alcoholFrequency}
                  onChange={setAlcoholFrequency}
                  options={SUBSTANCE_FREQUENCY.map((f) => ({ value: f, label: f }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextAreaField
                  label="Tobacco Use"
                  value={tobaccoUse}
                  onChange={setTobaccoUse}
                  rows={2}
                  placeholder="Describe tobacco use patterns..."
                />
                <SelectField
                  label="Tobacco Frequency"
                  value={tobaccoFrequency}
                  onChange={setTobaccoFrequency}
                  options={SUBSTANCE_FREQUENCY.map((f) => ({ value: f, label: f }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextAreaField
                  label="Drug Use"
                  value={drugUse}
                  onChange={setDrugUse}
                  rows={2}
                  placeholder="Describe any drug use (prescription or recreational)..."
                />
                <SelectField
                  label="Drug Use Frequency"
                  value={drugFrequency}
                  onChange={setDrugFrequency}
                  options={SUBSTANCE_FREQUENCY.map((f) => ({ value: f, label: f }))}
                />
              </div>
            </div>
          </FormSection>

          {/* Family & Social History */}
          <FormSection title="Family & Social History" number={5}>
            <div className="space-y-6">
              <TextAreaField
                label="Family Psychiatric History"
                value={familyHistory}
                onChange={setFamilyHistory}
                rows={3}
                placeholder="Mental health conditions, substance use, suicide in family..."
              />
              <TextAreaField
                label="Social History"
                value={socialHistory}
                onChange={setSocialHistory}
                rows={3}
                placeholder="Education, employment, relationships, living situation..."
              />
              <TextAreaField
                label="Developmental History"
                value={developmentalHistory}
                onChange={setDevelopmentalHistory}
                rows={3}
                placeholder="Childhood development, traumas, significant life events..."
              />
            </div>
          </FormSection>

          {/* Mental Status Examination */}
          <FormSection title="Mental Status Examination" number={6}>
            {/* Appearance */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Appearance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Grooming"
                  value={grooming}
                  onChange={setGrooming}
                  options={GROOMING_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Hygiene"
                  value={hygiene}
                  onChange={setHygiene}
                  options={HYGIENE_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Dress"
                  value={dress}
                  onChange={setDress}
                  options={DRESS_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
            </div>

            {/* Behavior */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Behavior</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="Eye Contact"
                  value={eyeContact}
                  onChange={setEyeContact}
                  options={EYE_CONTACT_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Motor Activity"
                  value={motorActivity}
                  onChange={setMotorActivity}
                  options={MOTOR_ACTIVITY_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Cooperation"
                  value={cooperation}
                  onChange={setCooperation}
                  options={COOPERATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Rapport"
                  value={rapport}
                  onChange={setRapport}
                  options={RAPPORT_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
            </div>

            {/* Speech */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Speech</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Rate"
                  value={speechRate}
                  onChange={setSpeechRate}
                  options={SPEECH_RATE_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Volume"
                  value={speechVolume}
                  onChange={setSpeechVolume}
                  options={SPEECH_VOLUME_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Fluency"
                  value={speechFluency}
                  onChange={setSpeechFluency}
                  options={SPEECH_FLUENCY_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Articulation"
                  value={speechArticulation}
                  onChange={setSpeechArticulation}
                  options={SPEECH_ARTICULATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Spontaneity"
                  value={speechSpontaneity}
                  onChange={setSpeechSpontaneity}
                  options={SPEECH_SPONTANEITY_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
            </div>

            {/* Mood & Affect */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Mood & Affect</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <TextField
                    label="Mood (Client's subjective description)"
                    value={mood}
                    onChange={setMood}
                    placeholder="e.g., 'depressed', 'anxious', 'okay'..."
                  />
                </div>
                <SelectField
                  label="Affect Range"
                  value={affectRange}
                  onChange={setAffectRange}
                  options={AFFECT_RANGE_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Affect Appropriateness"
                  value={affectAppropriateness}
                  onChange={setAffectAppropriateness}
                  options={AFFECT_APPROPRIATENESS_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Affect Mobility"
                  value={affectMobility}
                  onChange={setAffectMobility}
                  options={AFFECT_MOBILITY_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Affect Quality"
                  value={affectQuality}
                  onChange={setAffectQuality}
                  options={AFFECT_QUALITY_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
            </div>

            {/* Thought Process */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Thought Process</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Organization"
                  value={thoughtOrganization}
                  onChange={setThoughtOrganization}
                  options={THOUGHT_ORGANIZATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Coherence"
                  value={thoughtCoherence}
                  onChange={setThoughtCoherence}
                  options={THOUGHT_COHERENCE_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <div>
                  <CheckboxField
                    label="Goal-Directed"
                    checked={thoughtGoalDirected}
                    onChange={setThoughtGoalDirected}
                  />
                </div>
              </div>
            </div>

            {/* Thought Content */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Thought Content</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <CheckboxField label="Delusions" checked={delusions} onChange={setDelusions} />
                </div>
                {delusions && (
                  <TextAreaField
                    label="Delusion Details"
                    value={delusionDetails}
                    onChange={setDelusionDetails}
                    rows={2}
                    placeholder="Describe type and content of delusions..."
                  />
                )}
              </div>
            </div>

            {/* Perception */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Perception</h3>
              <div className="space-y-4">
                <CheckboxField
                  label="Hallucinations Present"
                  checked={hasHallucinations}
                  onChange={setHasHallucinations}
                />
                {hasHallucinations && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hallucination Types (select all that apply)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {HALLUCINATION_TYPES.map((type) => (
                        <label
                          key={type}
                          className="flex items-center p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg cursor-pointer hover:border-purple-400 transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={hallucinationTypes.includes(type)}
                            onChange={() => toggleHallucinationType(type)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cognition */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cognition</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Orientation
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <CheckboxField
                      label="Person"
                      checked={orientedPerson}
                      onChange={setOrientedPerson}
                    />
                    <CheckboxField label="Place" checked={orientedPlace} onChange={setOrientedPlace} />
                    <CheckboxField label="Time" checked={orientedTime} onChange={setOrientedTime} />
                    <CheckboxField
                      label="Situation"
                      checked={orientedSituation}
                      onChange={setOrientedSituation}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectField
                    label="Attention"
                    value={attention}
                    onChange={setAttention}
                    options={ATTENTION_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                  <SelectField
                    label="Concentration"
                    value={concentration}
                    onChange={setConcentration}
                    options={CONCENTRATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SelectField
                    label="Memory (Immediate)"
                    value={memoryImmediate}
                    onChange={setMemoryImmediate}
                    options={MEMORY_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                  <SelectField
                    label="Memory (Recent)"
                    value={memoryRecent}
                    onChange={setMemoryRecent}
                    options={MEMORY_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                  <SelectField
                    label="Memory (Remote)"
                    value={memoryRemote}
                    onChange={setMemoryRemote}
                    options={MEMORY_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SelectField
                    label="Fund of Knowledge"
                    value={fundKnowledge}
                    onChange={setFundKnowledge}
                    options={FUND_KNOWLEDGE_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                  <SelectField
                    label="Abstract Thinking"
                    value={abstractThinking}
                    onChange={setAbstractThinking}
                    options={ABSTRACT_THINKING_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                  <SelectField
                    label="Calculation"
                    value={calculation}
                    onChange={setCalculation}
                    options={CALCULATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                  />
                </div>
              </div>
            </div>

            {/* Insight, Judgment & Impulse Control */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Insight, Judgment & Impulse Control</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Insight"
                  value={insight}
                  onChange={setInsight}
                  options={INSIGHT_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Judgment"
                  value={judgment}
                  onChange={setJudgment}
                  options={JUDGMENT_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
                <SelectField
                  label="Impulse Control"
                  value={impulseControl}
                  onChange={setImpulseControl}
                  options={IMPULSE_CONTROL_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
            </div>
          </FormSection>

          {/* Enhanced Safety Assessment */}
          <FormSection title="Safety Assessment" number={7}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CheckboxField label="Self-Harm" checked={selfHarm} onChange={setSelfHarm} />
              </div>

              {suicidalIdeation && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-3">Suicidal Ideation Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                      label="Frequency"
                      value={siFrequency}
                      onChange={setSiFrequency}
                      options={FREQUENCY_OPTIONS.map((o) => ({ value: o, label: o }))}
                    />
                    <SelectField
                      label="Intensity"
                      value={siIntensity}
                      onChange={setSiIntensity}
                      options={INTENSITY_OPTIONS.map((o) => ({ value: o, label: o }))}
                    />
                  </div>
                </div>
              )}

              {homicidalIdeation && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-3">Homicidal Ideation Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                      label="Frequency"
                      value={hiFrequency}
                      onChange={setHiFrequency}
                      options={FREQUENCY_OPTIONS.map((o) => ({ value: o, label: o }))}
                    />
                    <SelectField
                      label="Intensity"
                      value={hiIntensity}
                      onChange={setHiIntensity}
                      options={INTENSITY_OPTIONS.map((o) => ({ value: o, label: o }))}
                    />
                  </div>
                </div>
              )}

              <SelectField
                label="Overall Risk Level"
                value={riskLevel}
                onChange={setRiskLevel}
                options={RISK_LEVELS.map((level) => ({ value: level, label: level }))}
                required
              />

              <TextAreaField
                label="Risk Factors"
                value={riskFactors}
                onChange={setRiskFactors}
                rows={3}
                placeholder="Identify specific risk factors (e.g., previous attempts, access to means, isolation, substance use)..."
              />

              <TextAreaField
                label="Protective Factors"
                value={protectiveFactors}
                onChange={setProtectiveFactors}
                rows={3}
                placeholder="Identify protective factors (e.g., social support, reasons for living, coping skills)..."
              />

              <TextAreaField
                label="Safety Plan"
                value={safetyPlan}
                onChange={setSafetyPlan}
                rows={4}
                placeholder="Document safety planning steps, coping strategies, crisis resources..."
              />

              <TextAreaField
                label="Emergency Contacts"
                value={emergencyContacts}
                onChange={setEmergencyContacts}
                rows={2}
                placeholder="List emergency contacts, crisis hotlines, support persons..."
              />
            </div>
          </FormSection>

          {/* Clinical Assessment */}
          <FormSection title="Clinical Assessment" number={8}>
            <div className="space-y-6">
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
                  rows={5}
                  placeholder="Clinical impressions, diagnostic formulation, severity assessment, prognosis..."
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
                  rows={5}
                  placeholder="Treatment interventions, therapeutic approach, goals, follow-up plans..."
                />
              </ValidatedField>
            </div>
          </FormSection>

          {/* Diagnosis & Billing */}
          <FormSection title="Diagnosis & Billing" number={9}>
            <div className="space-y-6">
              <ValidatedField
                label="Diagnosis Codes (ICD-10)"
                fieldName="diagnosisCodes"
                isRequired={isFieldRequired('diagnosisCodes')}
                helpText={getFieldHelpText('diagnosisCodes')}
                error={validationErrors.find(e => e.field === 'diagnosisCodes')}
                showValidation={showValidation}
              >
                <ICD10Autocomplete
                  selectedCodes={diagnosisCodes}
                  onCodesChange={setDiagnosisCodes}
                />
              </ValidatedField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CPT Code</label>
                  <CPTCodeAutocomplete value={cptCode} onChange={setCptCode} />
                </div>

                <TextField
                  label="Billing Code"
                  value={billingCode}
                  onChange={setBillingCode}
                  placeholder="Internal billing code"
                />
              </div>

              <CheckboxField label="Billable Service" checked={billable} onChange={setBillable} />
            </div>
          </FormSection>

          {/* Treatment Recommendations */}
          <FormSection title="Treatment Recommendations" number={10}>
            <div className="space-y-6">
              <TextAreaField
                label="Treatment Recommendations"
                value={treatmentRecommendations}
                onChange={setTreatmentRecommendations}
                required
                rows={5}
                placeholder="Recommended treatment modalities, referrals, medications, therapy approach, adjunctive services..."
              />
              <TextField
                label="Recommended Frequency"
                value={recommendedFrequency}
                onChange={setRecommendedFrequency}
                placeholder="e.g., Weekly 50-minute sessions for 12 weeks"
              />
            </div>
          </FormSection>

            {/* Phase 1.3: Validation Summary */}
            {showValidation && (
              <div className="mt-6">
                <ValidationSummary
                  errors={validationErrors}
                  requiredFields={summary?.requiredFields || []}
                  noteType="Intake Assessment"
                  showOnlyWhenInvalid={false}
                />
              </div>
            )}

            {/* Form Actions */}
            <FormActions
              onCancel={() => navigate(`/clients/${clientId}/notes`)}
              onSubmit={() => handleSubmit({} as any)}
              submitLabel="Create Intake Assessment"
              isSubmitting={saveMutation.isPending}
              onSaveDraft={() => handleSaveDraft({} as any)}
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
            noteType="Intake Assessment"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}
      </div>
    </div>
  );
}
