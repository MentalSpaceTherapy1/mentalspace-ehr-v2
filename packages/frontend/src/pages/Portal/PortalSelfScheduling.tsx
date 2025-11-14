import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  FormControlLabel,
  Skeleton,
  Alert,
  Tooltip,
  Box,
  Typography,
  Divider,
  Grid,
} from '@mui/material';
import {
  Search,
  Person,
  CalendarToday,
  AccessTime,
  VideoCall,
  LocationOn,
  Edit,
  Cancel as CancelIcon,
  CheckCircle,
  Event,
  ArrowBack,
  ArrowForward,
  Download,
  Close,
  Refresh,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(isSameOrBefore);
dayjs.extend(relativeTime);

/**
 * Module 7: Enhanced Client Self-Scheduling Interface
 *
 * Enterprise-grade appointment self-scheduling with:
 * - 4-step wizard with progress tracking
 * - Intelligent slot calculation
 * - Conflict prevention
 * - Scheduling rules enforcement
 * - Mobile-responsive design
 * - Accessibility features
 *
 * Total Lines: 1450+ (comprehensive implementation)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email: string;
  specialty?: string;
  bio?: string;
  photoUrl?: string;
  nextAvailable?: string;
}

interface AppointmentType {
  id: string;
  typeName: string;
  category: string;
  description?: string;
  defaultDuration: number;
  colorCode?: string;
  iconName?: string;
  allowOnlineBooking?: boolean;
  allowTelehealth?: boolean;
  allowInPerson?: boolean;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  available: boolean;
  reason?: string;
}

interface DaySlots {
  date: string;
  slots: TimeSlot[];
}

interface MyAppointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  appointmentType: string | AppointmentType;
  serviceLocation: string;
  notes?: string;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title?: string;
  };
  canCancel?: boolean;
  canReschedule?: boolean;
  cancellationDeadline?: string;
}

interface WizardState {
  currentStep: number;
  selectedClinician: Clinician | null;
  selectedAppointmentType: AppointmentType | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  modality: 'TELEHEALTH' | 'IN_PERSON';
  notes: string;
  emailConfirmation: boolean;
  smsReminder: boolean;
  agreedToPolicy: boolean;
  rescheduleAppointmentId: string | null;
}

interface WaitlistEntry {
  id: string;
  clientId: string;
  clinicianId?: string;
  appointmentTypeId: string;
  preferredDays: string[];
  preferredTimes: string[];
  priority: number;
  status: string;
  joinedAt: string;
  notes?: string;
  clinician?: Clinician;
  appointmentType?: AppointmentType;
}

interface WaitlistOffer {
  id: string;
  waitlistEntryId: string;
  clinicianId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  expiresAt: string;
  matchScore: number;
  matchReasons: string[];
  clinician?: Clinician;
  appointmentType?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PortalSelfScheduling() {
  const navigate = useNavigate();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Wizard state
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 0,
    selectedClinician: null,
    selectedAppointmentType: null,
    selectedDate: null,
    selectedSlot: null,
    modality: 'TELEHEALTH',
    notes: '',
    emailConfirmation: true,
    smsReminder: true,
    agreedToPolicy: false,
    rescheduleAppointmentId: null,
  });

  // Data state
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [availableSlots, setAvailableSlots] = useState<DaySlots[]>([]);
  const [myAppointments, setMyAppointments] = useState<MyAppointment[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Waitlist state
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistOffers, setWaitlistOffers] = useState<WaitlistOffer[]>([]);
  const [showJoinWaitlistDialog, setShowJoinWaitlistDialog] = useState(false);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);

  // Join Waitlist form state
  const [waitlistForm, setWaitlistForm] = useState({
    clinicianId: '',
    appointmentTypeId: '',
    preferredDays: [] as string[],
    preferredTimes: [] as string[],
    priority: 1,
    notes: '',
  });

  // Filter and search state
  const [clinicianSearch, setClinicianSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [clinicianSort, setClinicianSort] = useState<'name' | 'nextAvailable'>('name');
  const [modalityPreference, setModalityPreference] = useState<'TELEHEALTH' | 'IN_PERSON' | 'ALL'>('ALL');

  // Calendar state
  const [dateRangeStart, setDateRangeStart] = useState(new Date());
  const [selectedDateView, setSelectedDateView] = useState<Date | null>(null);

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  useEffect(() => {
    fetchClinicians();
    fetchAppointmentTypes();
    fetchMyAppointments();
    fetchWaitlistEntries();
    fetchWaitlistOffers();
  }, []);

  useEffect(() => {
    if (wizardState.selectedClinician && wizardState.currentStep === 2) {
      fetchAvailableSlots();
    }
  }, [wizardState.selectedClinician, dateRangeStart, wizardState.currentStep]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchClinicians = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/self-schedule/clinicians');

      if (response.data.success) {
        setClinicians(response.data.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load available clinicians');
      console.error('Error fetching clinicians:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointmentTypes = async () => {
    try {
      const response = await api.get('/self-schedule/appointment-types');

      if (response.data.success) {
        // Filter only online bookable types (default to true if not specified)
        const bookableTypes = (response.data.data || []).filter(
          (type: AppointmentType) => type.allowOnlineBooking !== false
        );
        setAppointmentTypes(bookableTypes);
      }
    } catch (error: any) {
      toast.error('Failed to load appointment types');
      console.error('Error fetching appointment types:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!wizardState.selectedClinician) return;

    try {
      setIsFetchingSlots(true);
      const startDate = dayjs(dateRangeStart).format('YYYY-MM-DD');
      const endDate = dayjs(dateRangeStart).add(14, 'day').format('YYYY-MM-DD');

      const response = await api.get(
        `/self-schedule/available-slots/${wizardState.selectedClinician.id}`,
        {
          params: { startDate, endDate },
        }
      );

      if (response.data.success) {
        setAvailableSlots(response.data.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load available slots');
      console.error('Error fetching slots:', error);
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const response = await api.get('/self-schedule/my-appointments');

      if (response.data.success) {
        setMyAppointments(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load appointments', error);
    }
  };

  const handleBookAppointment = async () => {
    if (!wizardState.selectedClinician || !wizardState.selectedAppointmentType ||
        !wizardState.selectedSlot || !wizardState.selectedDate) {
      toast.error('Please complete all selections');
      return;
    }

    if (!wizardState.agreedToPolicy) {
      toast.error('Please agree to the cancellation policy');
      return;
    }

    try {
      setIsBooking(true);

      // Use startTime directly as it's already an ISO datetime string from backend
      const appointmentDateTime = new Date(wizardState.selectedSlot.startTime);

      let response;
      if (wizardState.rescheduleAppointmentId) {
        // Rescheduling existing appointment
        response = await api.put(`/self-schedule/reschedule/${wizardState.rescheduleAppointmentId}`, {
          newAppointmentDate: appointmentDateTime.toISOString(),
          reason: wizardState.notes,
        });
      } else {
        // Creating new appointment
        response = await api.post('/self-schedule/book', {
          clinicianId: wizardState.selectedClinician.id,
          appointmentType: wizardState.selectedAppointmentType.typeName,
          appointmentDate: appointmentDateTime.toISOString(),
          duration: wizardState.selectedAppointmentType.defaultDuration,
          serviceLocation: wizardState.modality,
          notes: wizardState.notes,
        });
      }

      if (response.data.success) {
        setConfirmationNumber(response.data.data?.confirmationNumber || `APT-${Date.now()}`);
        setShowSuccessDialog(true);
        fetchMyAppointments();

        // Reset wizard after short delay
        setTimeout(() => {
          resetWizard();
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to book appointment';
      toast.error(errorMessage);

      // If slot was taken, refresh slots
      if (errorMessage.includes('no longer available') || errorMessage.includes('conflict')) {
        fetchAvailableSlots();
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel || !cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      const response = await api.delete(`/self-schedule/cancel/${appointmentToCancel}`, {
        data: { reason: cancelReason },
      });

      if (response.data.success) {
        toast.success('Appointment cancelled successfully');
        setShowCancelDialog(false);
        setAppointmentToCancel(null);
        setCancelReason('');
        fetchMyAppointments();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const handleReschedule = (appointment: MyAppointment) => {
    // Pre-fill clinician and type, go to date selection
    const selectedClinician = clinicians.find(c => c.id === appointment.clinician.id) || null;
    const selectedAppointmentType = appointmentTypes.find(at => at.typeName === appointment.appointmentType) || null;

    setWizardState({
      ...wizardState,
      currentStep: 2,
      selectedClinician,
      selectedAppointmentType,
      selectedDate: null,
      selectedSlot: null,
      rescheduleAppointmentId: appointment.id,
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Select a new date and time for your appointment', { icon: 'ℹ️' });
  };

  // ============================================================================
  // WAITLIST API CALLS
  // ============================================================================

  const fetchWaitlistEntries = async () => {
    try {
      const response = await api.get('/waitlist/my-entries');
      if (response.data.success) {
        setWaitlistEntries(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load waitlist entries', error);
    }
  };

  const fetchWaitlistOffers = async () => {
    try {
      const response = await api.get('/waitlist/my-offers');
      if (response.data.success) {
        setWaitlistOffers(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load waitlist offers', error);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!waitlistForm.appointmentTypeId) {
      toast.error('Please select an appointment type');
      return;
    }

    if (waitlistForm.preferredDays.length === 0) {
      toast.error('Please select at least one preferred day');
      return;
    }

    if (waitlistForm.preferredTimes.length === 0) {
      toast.error('Please select at least one preferred time');
      return;
    }

    try {
      setIsLoadingWaitlist(true);
      const response = await api.post('/waitlist', waitlistForm);

      if (response.data.success) {
        toast.success('Successfully joined the waitlist!');
        setShowJoinWaitlistDialog(false);
        resetWaitlistForm();
        fetchWaitlistEntries();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setIsLoadingWaitlist(false);
    }
  };

  const handleAcceptOffer = async (entryId: string, offerId: string) => {
    try {
      setIsLoadingWaitlist(true);
      const response = await api.post(`/waitlist/${entryId}/accept/${offerId}`);

      if (response.data.success) {
        toast.success('Offer accepted! Your appointment has been scheduled.');
        fetchWaitlistEntries();
        fetchWaitlistOffers();
        fetchMyAppointments();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept offer');
    } finally {
      setIsLoadingWaitlist(false);
    }
  };

  const handleDeclineOffer = async (entryId: string, offerId: string) => {
    try {
      setIsLoadingWaitlist(true);
      const response = await api.post(`/waitlist/${entryId}/decline/${offerId}`);

      if (response.data.success) {
        toast.success('Offer declined');
        fetchWaitlistOffers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to decline offer');
    } finally {
      setIsLoadingWaitlist(false);
    }
  };

  const handleRemoveWaitlistEntry = async (entryId: string) => {
    try {
      setIsLoadingWaitlist(true);
      const response = await api.delete(`/waitlist/${entryId}`);

      if (response.data.success) {
        toast.success('Removed from waitlist');
        fetchWaitlistEntries();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove from waitlist');
    } finally {
      setIsLoadingWaitlist(false);
    }
  };

  const resetWaitlistForm = () => {
    setWaitlistForm({
      clinicianId: '',
      appointmentTypeId: '',
      preferredDays: [],
      preferredTimes: [],
      priority: 1,
      notes: '',
    });
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const resetWizard = () => {
    setWizardState({
      currentStep: 0,
      selectedClinician: null,
      selectedAppointmentType: null,
      selectedDate: null,
      selectedSlot: null,
      modality: 'TELEHEALTH',
      notes: '',
      emailConfirmation: true,
      smsReminder: true,
      agreedToPolicy: false,
      rescheduleAppointmentId: null,
    });
    setDateRangeStart(new Date());
    setSelectedDateView(null);
    setClinicianSearch('');
    setSpecialtyFilter('all');
    setModalityPreference('ALL');
  };

  const getFilteredClinicians = () => {
    let filtered = [...clinicians];

    // Search filter
    if (clinicianSearch) {
      const search = clinicianSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.specialty?.toLowerCase().includes(search)
      );
    }

    // Specialty filter
    if (specialtyFilter !== 'all') {
      filtered = filtered.filter((c) => c.specialty === specialtyFilter);
    }

    // Sort
    if (clinicianSort === 'name') {
      filtered.sort((a, b) => a.lastName.localeCompare(b.lastName));
    } else if (clinicianSort === 'nextAvailable') {
      filtered.sort((a, b) => {
        if (!a.nextAvailable) return 1;
        if (!b.nextAvailable) return -1;
        return new Date(a.nextAvailable).getTime() - new Date(b.nextAvailable).getTime();
      });
    }

    return filtered;
  };

  const getFilteredAppointmentTypes = () => {
    if (modalityPreference === 'ALL') {
      return appointmentTypes;
    }

    return appointmentTypes.filter((type) => {
      if (modalityPreference === 'TELEHEALTH') {
        return type.allowTelehealth !== false;
      } else {
        return type.allowInPerson !== false;
      }
    });
  };

  const getSlotsForDate = (date: Date): TimeSlot[] => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const daySlots = availableSlots.find((d) => d.date === dateStr);
    return daySlots?.slots.filter((s) => s.available) || [];
  };

  const get14DayRange = (): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 14; i++) {
      days.push(dayjs(dateRangeStart).add(i, 'day').toDate());
    }
    return days;
  };

  const groupSlotsByTimeOfDay = (slots: TimeSlot[]) => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    slots.forEach((slot) => {
      // Parse ISO datetime string and extract hour
      const slotDate = new Date(slot.startTime);
      const hour = slotDate.getHours();
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  };

  const getUniqueSpecialties = (): string[] => {
    const specialties = clinicians
      .map((c) => c.specialty)
      .filter((s): s is string => !!s);
    return Array.from(new Set(specialties));
  };

  const canProceedToNextStep = (): boolean => {
    switch (wizardState.currentStep) {
      case 0:
        return !!wizardState.selectedClinician;
      case 1:
        return !!wizardState.selectedAppointmentType;
      case 2:
        return !!wizardState.selectedDate && !!wizardState.selectedSlot;
      case 3:
        return wizardState.agreedToPolicy;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      setWizardState({ ...wizardState, currentStep: wizardState.currentStep + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setWizardState({ ...wizardState, currentStep: wizardState.currentStep - 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadICS = () => {
    if (!wizardState.selectedClinician || !wizardState.selectedAppointmentType ||
        !wizardState.selectedSlot || !wizardState.selectedDate) {
      return;
    }

    // Use startTime directly as it's already an ISO datetime string from backend
    const startDateTime = new Date(wizardState.selectedSlot.startTime);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + wizardState.selectedAppointmentType.defaultDuration);

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MentalSpace EHR//Appointment//EN
BEGIN:VEVENT
UID:${confirmationNumber}@mentalspace
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:${wizardState.selectedAppointmentType.typeName} with ${wizardState.selectedClinician.firstName} ${wizardState.selectedClinician.lastName}
DESCRIPTION:Appointment Type: ${wizardState.selectedAppointmentType.typeName}\\nModality: ${wizardState.modality}\\nConfirmation: ${confirmationNumber}
LOCATION:${wizardState.modality === 'TELEHEALTH' ? 'Virtual Meeting' : 'Office'}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointment-${confirmationNumber}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER FUNCTIONS - WIZARD STEPS
  // ============================================================================

  const renderClinicianSelection = () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Select a Clinician
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose the therapist you'd like to schedule with
      </Typography>

      {/* Search and Filter Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name or specialty..."
          value={clinicianSearch}
          onChange={(e) => setClinicianSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Specialty</InputLabel>
          <Select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            label="Specialty"
          >
            <MenuItem value="all">All Specialties</MenuItem>
            {getUniqueSpecialties().map((specialty) => (
              <MenuItem key={specialty} value={specialty}>
                {specialty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={clinicianSort}
            onChange={(e) => setClinicianSort(e.target.value as 'name' | 'nextAvailable')}
            label="Sort By"
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="nextAvailable">Next Available</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Clinician Cards - Modernized */}
      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {getFilteredClinicians().map((clinician) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={clinician.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  borderRadius: 3,
                  border: wizardState.selectedClinician?.id === clinician.id ? 3 : 1,
                  borderColor:
                    wizardState.selectedClinician?.id === clinician.id
                      ? 'primary.main'
                      : 'divider',
                  boxShadow: wizardState.selectedClinician?.id === clinician.id
                    ? '0 8px 24px rgba(0, 0, 0, 0.12)'
                    : '0 2px 8px rgba(0, 0, 0, 0.08)',
                  transform: wizardState.selectedClinician?.id === clinician.id
                    ? 'translateY(-4px)'
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                  },
                  position: 'relative',
                  overflow: 'visible',
                }}
                onClick={() =>
                  setWizardState({ ...wizardState, selectedClinician: clinician })
                }
              >
                {wizardState.selectedClinician?.id === clinician.id && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 20 }} />
                  </Box>
                )}
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 2 }}>
                    <Avatar
                      src={clinician.photoUrl}
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        mb: 2,
                        border: '4px solid',
                        borderColor: 'background.paper',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      <Typography variant="h5">
                        {clinician.firstName[0]}
                        {clinician.lastName[0]}
                      </Typography>
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                      {clinician.firstName} {clinician.lastName}
                    </Typography>
                    {clinician.title && (
                      <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ mb: 1 }}>
                        {clinician.title}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
                    {clinician.specialty && (
                      <Chip
                        label={clinician.specialty}
                        size="small"
                        sx={{
                          bgcolor: 'primary.50',
                          color: 'primary.main',
                          fontWeight: 500,
                          borderRadius: 2,
                        }}
                      />
                    )}
                    {clinician.nextAvailable && (
                      <Chip
                        label={`Available ${dayjs(clinician.nextAvailable).format('MMM D')}`}
                        size="small"
                        color="success"
                        icon={<CalendarToday sx={{ fontSize: 16 }} />}
                        sx={{ borderRadius: 2, fontWeight: 500 }}
                      />
                    )}
                  </Box>

                  {clinician.bio && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textAlign: 'center',
                        lineHeight: 1.6,
                      }}
                    >
                      {clinician.bio}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!isLoading && getFilteredClinicians().length === 0 && (
        <Alert severity="info">No clinicians found matching your criteria</Alert>
      )}
    </Box>
  );

  const renderAppointmentTypeSelection = () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Select Appointment Type
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Scheduling with {wizardState.selectedClinician?.firstName}{' '}
        {wizardState.selectedClinician?.lastName}
      </Typography>

      {/* Modality Preference Toggle */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Preference
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant={modalityPreference === 'ALL' ? 'contained' : 'outlined'}
            onClick={() => setModalityPreference('ALL')}
            size="small"
          >
            All Types
          </Button>
          <Button
            variant={modalityPreference === 'TELEHEALTH' ? 'contained' : 'outlined'}
            onClick={() => {
              setModalityPreference('TELEHEALTH');
              setWizardState({ ...wizardState, modality: 'TELEHEALTH' });
            }}
            startIcon={<VideoCall />}
            size="small"
          >
            Telehealth
          </Button>
          <Button
            variant={modalityPreference === 'IN_PERSON' ? 'contained' : 'outlined'}
            onClick={() => {
              setModalityPreference('IN_PERSON');
              setWizardState({ ...wizardState, modality: 'IN_PERSON' });
            }}
            startIcon={<LocationOn />}
            size="small"
          >
            In-Person
          </Button>
        </Box>
      </Box>

      {/* Appointment Type Cards */}
      <Grid container spacing={2}>
        {getFilteredAppointmentTypes().map((type) => (
          <Grid size={{ xs: 12, md: 6 }} key={type.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: 2,
                borderColor:
                  wizardState.selectedAppointmentType?.id === type.id
                    ? 'primary.main'
                    : 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
                transition: 'all 0.2s',
              }}
              onClick={() =>
                setWizardState({ ...wizardState, selectedAppointmentType: type })
              }
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {type.typeName}
                </Typography>
                {type.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {type.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    icon={<AccessTime />}
                    label={`${type.defaultDuration} minutes`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {type.category && (
                    <Chip label={type.category} size="small" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {getFilteredAppointmentTypes().length === 0 && (
        <Alert severity="info">
          No appointment types available for your selected preference
        </Alert>
      )}
    </Box>
  );

  const renderDateTimeSelection = () => {
    const dateRange = get14DayRange();

    return (
      <Box>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Choose Date & Time
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {wizardState.selectedAppointmentType?.typeName} (
          {wizardState.selectedAppointmentType?.defaultDuration} min) with{' '}
          {wizardState.selectedClinician?.firstName}{' '}
          {wizardState.selectedClinician?.lastName}
        </Typography>

        {/* Date Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton
            onClick={() => setDateRangeStart(dayjs(dateRangeStart).subtract(14, 'day').toDate())}
            disabled={dayjs(dateRangeStart).subtract(14, 'day').isBefore(dayjs(), 'day')}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="subtitle1" fontWeight="bold">
            {dayjs(dateRangeStart).format('MMM D')} -{' '}
            {dayjs(dateRangeStart).add(13, 'day').format('MMM D, YYYY')}
          </Typography>
          <IconButton
            onClick={() => setDateRangeStart(dayjs(dateRangeStart).add(14, 'day').toDate())}
          >
            <ArrowForward />
          </IconButton>
        </Box>

        {/* Calendar View */}
        <Grid container spacing={1} sx={{ mb: 3 }}>
          {dateRange.map((date) => {
            const slots = getSlotsForDate(date);
            const hasSlots = slots.length > 0;
            const isSelected = selectedDateView && dayjs(date).isSame(dayjs(selectedDateView), 'day');
            const isPast = dayjs(date).isBefore(dayjs(), 'day');

            return (
              <Grid size={{ xs: 12 / 7 }} key={date.toISOString()}>
                <Card
                  sx={{
                    cursor: hasSlots && !isPast ? 'pointer' : 'not-allowed',
                    bgcolor: isPast
                      ? 'action.disabledBackground'
                      : isSelected
                      ? 'primary.main'
                      : hasSlots
                      ? 'success.light'
                      : 'grey.200',
                    color: isSelected ? 'primary.contrastText' : 'text.primary',
                    textAlign: 'center',
                    py: 1,
                    opacity: isPast ? 0.5 : 1,
                    border: isSelected ? 2 : 0,
                    borderColor: 'primary.dark',
                    '&:hover': !isPast && hasSlots
                      ? {
                          bgcolor: isSelected ? 'primary.dark' : 'success.main',
                          transform: 'scale(1.05)',
                        }
                      : {},
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    if (hasSlots && !isPast) {
                      setSelectedDateView(date);
                    }
                  }}
                >
                  <Typography variant="caption" display="block">
                    {dayjs(date).format('ddd')}
                  </Typography>
                  <Typography variant="h6">{dayjs(date).format('D')}</Typography>
                  {hasSlots && !isPast && (
                    <Typography variant="caption" display="block">
                      {slots.length} slots
                    </Typography>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Time Slots */}
        {isFetchingSlots ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading available slots...</Typography>
          </Box>
        ) : selectedDateView ? (
          (() => {
            const slots = getSlotsForDate(selectedDateView);
            const { morning, afternoon, evening } = groupSlotsByTimeOfDay(slots);

            return (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Available Times for {dayjs(selectedDateView).format('dddd, MMMM D, YYYY')}
                </Typography>

                {slots.length === 0 ? (
                  <Alert severity="info">No available slots for this date</Alert>
                ) : (
                  <Box>
                    {morning.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          Morning
                        </Typography>
                        <Grid container spacing={1}>
                          {morning.map((slot, idx) => (
                            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={idx}>
                              <Button
                                fullWidth
                                variant={
                                  wizardState.selectedSlot === slot &&
                                  wizardState.selectedDate &&
                                  dayjs(wizardState.selectedDate).isSame(dayjs(selectedDateView), 'day')
                                    ? 'contained'
                                    : 'outlined'
                                }
                                onClick={() =>
                                  setWizardState({
                                    ...wizardState,
                                    selectedSlot: slot,
                                    selectedDate: selectedDateView,
                                  })
                                }
                              >
                                {slot.startTime}
                              </Button>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}

                    {afternoon.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          Afternoon
                        </Typography>
                        <Grid container spacing={1}>
                          {afternoon.map((slot, idx) => (
                            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={idx}>
                              <Button
                                fullWidth
                                variant={
                                  wizardState.selectedSlot === slot &&
                                  wizardState.selectedDate &&
                                  dayjs(wizardState.selectedDate).isSame(dayjs(selectedDateView), 'day')
                                    ? 'contained'
                                    : 'outlined'
                                }
                                onClick={() =>
                                  setWizardState({
                                    ...wizardState,
                                    selectedSlot: slot,
                                    selectedDate: selectedDateView,
                                  })
                                }
                              >
                                {slot.startTime}
                              </Button>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}

                    {evening.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          Evening
                        </Typography>
                        <Grid container spacing={1}>
                          {evening.map((slot, idx) => (
                            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={idx}>
                              <Button
                                fullWidth
                                variant={
                                  wizardState.selectedSlot === slot &&
                                  wizardState.selectedDate &&
                                  dayjs(wizardState.selectedDate).isSame(dayjs(selectedDateView), 'day')
                                    ? 'contained'
                                    : 'outlined'
                                }
                                onClick={() =>
                                  setWizardState({
                                    ...wizardState,
                                    selectedSlot: slot,
                                    selectedDate: selectedDateView,
                                  })
                                }
                              >
                                {slot.startTime}
                              </Button>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })()
        ) : (
          <Alert severity="info">Please select a date to view available time slots</Alert>
        )}
      </Box>
    );
  };

  const renderConfirmation = () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Review & Confirm
      </Typography>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Clinician
                    </Typography>
                    <Typography variant="h6">
                      {wizardState.selectedClinician?.firstName}{' '}
                      {wizardState.selectedClinician?.lastName}
                      {wizardState.selectedClinician?.title &&
                        `, ${wizardState.selectedClinician.title}`}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => setWizardState({ ...wizardState, currentStep: 0 })}>
                  <Edit fontSize="small" />
                </IconButton>
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <CalendarToday color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date & Time
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {wizardState.selectedDate &&
                      dayjs(wizardState.selectedDate).format('dddd, MMMM D, YYYY')}
                  </Typography>
                  <Typography variant="body2">
                    {wizardState.selectedSlot?.startTime} -{' '}
                    {wizardState.selectedSlot?.endTime}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <AccessTime color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Appointment Type
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {wizardState.selectedAppointmentType?.typeName}
                  </Typography>
                  <Typography variant="body2">
                    {wizardState.selectedAppointmentType?.defaultDuration} minutes
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {wizardState.modality === 'TELEHEALTH' ? (
                  <VideoCall color="action" />
                ) : (
                  <LocationOn color="action" />
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Modality
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={wizardState.modality === 'TELEHEALTH' ? 'contained' : 'outlined'}
                      onClick={() =>
                        setWizardState({ ...wizardState, modality: 'TELEHEALTH' })
                      }
                      startIcon={<VideoCall />}
                    >
                      Telehealth
                    </Button>
                    <Button
                      size="small"
                      variant={wizardState.modality === 'IN_PERSON' ? 'contained' : 'outlined'}
                      onClick={() =>
                        setWizardState({ ...wizardState, modality: 'IN_PERSON' })
                      }
                      startIcon={<LocationOn />}
                    >
                      In-Person
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Notes (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Anything you'd like your clinician to know?"
            value={wizardState.notes}
            onChange={(e) =>
              setWizardState({ ...wizardState, notes: e.target.value.slice(0, 500) })
            }
            helperText={`${wizardState.notes.length}/500 characters`}
          />
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Notifications
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={wizardState.emailConfirmation}
                onChange={(e) =>
                  setWizardState({ ...wizardState, emailConfirmation: e.target.checked })
                }
              />
            }
            label="Send me email confirmation"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={wizardState.smsReminder}
                onChange={(e) =>
                  setWizardState({ ...wizardState, smsReminder: e.target.checked })
                }
              />
            }
            label="Send me SMS reminder 1 hour before"
          />
        </CardContent>
      </Card>

      {/* Policy Agreement */}
      <Card sx={{ mb: 3, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main' }}>
        <CardContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={wizardState.agreedToPolicy}
                onChange={(e) =>
                  setWizardState({ ...wizardState, agreedToPolicy: e.target.checked })
                }
                color="warning"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the appointment cancellation policy (24-hour notice required)
              </Typography>
            }
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleBookAppointment}
          disabled={!wizardState.agreedToPolicy || isBooking}
          startIcon={isBooking ? null : <CheckCircle />}
        >
          {isBooking ? 'Booking...' : 'Confirm Appointment'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={resetWizard}
          disabled={isBooking}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );

  // ============================================================================
  // RENDER FUNCTIONS - MY APPOINTMENTS
  // ============================================================================

  const renderMyAppointments = () => (
    <Box sx={{ mt: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          My Upcoming Appointments
        </Typography>
        {myAppointments.length > 0 && (
          <Chip
            label={`${myAppointments.length} appointment${myAppointments.length > 1 ? 's' : ''}`}
            color="primary"
            size="small"
          />
        )}
      </Box>

      {myAppointments.length === 0 ? (
        <Card
          sx={{
            borderRadius: 3,
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 3,
              }}
            >
              <Event sx={{ fontSize: 56, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              No Upcoming Appointments
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 400, mx: 'auto' }}>
              You don't have any appointments scheduled yet. Book your first session with one of our experienced clinicians.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              startIcon={<CalendarToday />}
              sx={{
                mt: 2,
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Schedule Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {myAppointments.map((appointment, index) => (
            <Card
              key={appointment.id}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  {/* Date & Time Column */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: 2,
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="h4" fontWeight={700}>
                          {dayjs(appointment.appointmentDate).format('DD')}
                        </Typography>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                          {dayjs(appointment.appointmentDate).format('MMM')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          {dayjs(appointment.appointmentDate).format('dddd')}
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {appointment.startTime}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeof appointment.appointmentType === 'object'
                            ? appointment.appointmentType.defaultDuration
                            : appointment.duration || 50} minutes
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Clinician Column */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: 'primary.main',
                          border: '2px solid',
                          borderColor: 'background.paper',
                        }}
                      >
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontSize={11} textTransform="uppercase" fontWeight={600}>
                          Clinician
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {appointment.clinician.firstName} {appointment.clinician.lastName}
                        </Typography>
                        {appointment.clinician.title && (
                          <Typography variant="caption" color="text.secondary">
                            {appointment.clinician.title}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Type & Modality Column */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" fontSize={11} textTransform="uppercase" fontWeight={600} gutterBottom>
                        Session Type
                      </Typography>
                      <Typography variant="body1" fontWeight={500} gutterBottom>
                        {typeof appointment.appointmentType === 'object'
                          ? appointment.appointmentType.typeName
                          : appointment.appointmentType}
                      </Typography>
                      <Chip
                        size="small"
                        label={appointment.serviceLocation === 'TELEHEALTH' ? 'Video Call' : 'In Person'}
                        icon={
                          appointment.serviceLocation === 'TELEHEALTH' ? (
                            <VideoCall sx={{ fontSize: 16 }} />
                          ) : (
                            <LocationOn sx={{ fontSize: 16 }} />
                          )
                        }
                        sx={{
                          bgcolor: appointment.serviceLocation === 'TELEHEALTH' ? 'info.50' : 'success.50',
                          color: appointment.serviceLocation === 'TELEHEALTH' ? 'info.main' : 'success.main',
                          fontWeight: 500,
                          borderRadius: 1.5,
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* Actions Column */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Chip
                        label={appointment.status}
                        color={
                          appointment.status === 'CONFIRMED'
                            ? 'success'
                            : appointment.status === 'PENDING'
                            ? 'warning'
                            : 'default'
                        }
                        size="small"
                        sx={{ width: 'fit-content', fontWeight: 600, borderRadius: 1.5 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={appointment.canReschedule === false ? 'Cannot reschedule' : 'Reschedule'}>
                          <span style={{ flex: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleReschedule(appointment)}
                              disabled={appointment.canReschedule === false}
                              startIcon={<Refresh sx={{ fontSize: 18 }} />}
                              sx={{
                                width: '100%',
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontWeight: 500,
                              }}
                            >
                              Reschedule
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            appointment.canCancel === false
                              ? 'Cannot cancel within 24 hours'
                              : 'Cancel appointment'
                          }
                        >
                          <span style={{ flex: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                setAppointmentToCancel(appointment.id);
                                setShowCancelDialog(true);
                              }}
                              disabled={appointment.canCancel === false}
                              startIcon={<CancelIcon sx={{ fontSize: 18 }} />}
                              sx={{
                                width: '100%',
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontWeight: 500,
                              }}
                            >
                              Cancel
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  // ============================================================================
  // RENDER FUNCTIONS - WAITLIST
  // ============================================================================

  const renderWaitlistSection = () => (
    <Box sx={{ mt: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Waitlist Management
        </Typography>
        <Button
          variant="contained"
          onClick={() => setShowJoinWaitlistDialog(true)}
          sx={{
            borderRadius: 2,
            px: 3,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          + Join Waitlist
        </Button>
      </Box>

      {/* Waitlist Offers */}
      {waitlistOffers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Available Appointments for You
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            We found appointments matching your waitlist preferences!
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {waitlistOffers.map((offer) => (
              <Card
                key={offer.id}
                sx={{
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: 'success.main',
                  bgcolor: 'success.50',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box>
                        <Chip
                          label={`Match Score: ${offer.matchScore}%`}
                          size="small"
                          color="success"
                          sx={{ mb: 2, fontWeight: 600 }}
                        />
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {dayjs(offer.appointmentDate).format('dddd, MMMM D, YYYY')}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          <strong>Time:</strong> {offer.startTime} - {offer.endTime}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Type:</strong> {offer.appointmentType}
                        </Typography>
                        {offer.matchReasons && offer.matchReasons.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Why this matches:
                            </Typography>
                            {offer.matchReasons.map((reason, idx) => (
                              <Chip
                                key={idx}
                                label={reason}
                                size="small"
                                sx={{ mr: 0.5, mt: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Typography variant="caption" color="error.main" fontWeight={600}>
                        Expires: {dayjs(offer.expiresAt).fromNow()}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleAcceptOffer(offer.waitlistEntryId, offer.id)}
                          disabled={isLoadingWaitlist}
                          fullWidth
                          startIcon={<CheckCircle />}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeclineOffer(offer.waitlistEntryId, offer.id)}
                          disabled={isLoadingWaitlist}
                          fullWidth
                          startIcon={<Close />}
                        >
                          Decline
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* My Waitlist Entries */}
      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          My Waitlist Entries
        </Typography>
        {waitlistEntries.length === 0 ? (
          <Card
            sx={{
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary" paragraph>
                You're not on any waitlists yet.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setShowJoinWaitlistDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Join Waitlist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {waitlistEntries.map((entry) => (
              <Card
                key={entry.id}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          {entry.appointmentType?.typeName || 'Any Type'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Clinician:</strong>{' '}
                          {entry.clinician
                            ? `${entry.clinician.firstName} ${entry.clinician.lastName}`
                            : 'Any Available Clinician'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {entry.preferredDays.length > 0 && (
                            <Chip
                              label={`Days: ${entry.preferredDays.join(', ')}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {entry.preferredTimes.length > 0 && (
                            <Chip
                              label={`Times: ${entry.preferredTimes.join(', ')}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={entry.status}
                            size="small"
                            color={entry.status === 'ACTIVE' ? 'success' : 'default'}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Joined: {dayjs(entry.joinedAt).format('MMM D, YYYY')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRemoveWaitlistEntry(entry.id)}
                        disabled={isLoadingWaitlist}
                        fullWidth
                        startIcon={<CancelIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        Remove from Waitlist
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  // ============================================================================
  // RENDER FUNCTIONS - DIALOGS
  // ============================================================================

  const renderSuccessDialog = () => (
    <Dialog
      open={showSuccessDialog}
      onClose={() => setShowSuccessDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight="bold">
          Appointment Confirmed!
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body1" paragraph>
            Your appointment has been successfully booked.
          </Typography>
          <Card sx={{ bgcolor: 'grey.100', p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Confirmation Number
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {confirmationNumber}
            </Typography>
          </Card>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          {wizardState.emailConfirmation &&
            'A confirmation email has been sent to your email address. '}
          {wizardState.smsReminder &&
            'You will receive an SMS reminder 1 hour before your appointment.'}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Download />}
          onClick={downloadICS}
        >
          Add to Calendar
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            setShowSuccessDialog(false);
            navigate('/portal/appointments');
          }}
        >
          Go to My Appointments
        </Button>
        <Button
          fullWidth
          variant="text"
          onClick={() => {
            setShowSuccessDialog(false);
          }}
        >
          Book Another Appointment
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderCancelDialog = () => (
    <Dialog
      open={showCancelDialog}
      onClose={() => {
        setShowCancelDialog(false);
        setAppointmentToCancel(null);
        setCancelReason('');
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Cancel Appointment
          <IconButton
            onClick={() => {
              setShowCancelDialog(false);
              setAppointmentToCancel(null);
              setCancelReason('');
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Are you sure you want to cancel this appointment? This action cannot be undone.
        </Alert>
        <TextField
          fullWidth
          label="Reason for Cancellation"
          multiline
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          required
          helperText="Please provide a reason for cancellation"
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={() => {
            setShowCancelDialog(false);
            setAppointmentToCancel(null);
            setCancelReason('');
          }}
        >
          Keep Appointment
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleCancelAppointment}
          disabled={!cancelReason.trim()}
        >
          Cancel Appointment
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderJoinWaitlistDialog = () => (
    <Dialog
      open={showJoinWaitlistDialog}
      onClose={() => {
        setShowJoinWaitlistDialog(false);
        resetWaitlistForm();
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Join Waitlist
          <IconButton
            onClick={() => {
              setShowJoinWaitlistDialog(false);
              resetWaitlistForm();
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            We'll notify you when an appointment matching your preferences becomes available.
          </Alert>

          {/* Clinician Selection (Optional) */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Preferred Clinician (Optional)</InputLabel>
            <Select
              value={waitlistForm.clinicianId}
              onChange={(e) =>
                setWaitlistForm({ ...waitlistForm, clinicianId: e.target.value })
              }
              label="Preferred Clinician (Optional)"
            >
              <MenuItem value="">
                <em>Any Available Clinician</em>
              </MenuItem>
              {clinicians.map((clinician) => (
                <MenuItem key={clinician.id} value={clinician.id}>
                  {clinician.firstName} {clinician.lastName}
                  {clinician.title && `, ${clinician.title}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Appointment Type Selection (Required) */}
          <FormControl fullWidth sx={{ mb: 3 }} required>
            <InputLabel>Appointment Type *</InputLabel>
            <Select
              value={waitlistForm.appointmentTypeId}
              onChange={(e) =>
                setWaitlistForm({ ...waitlistForm, appointmentTypeId: e.target.value })
              }
              label="Appointment Type *"
              required
            >
              <MenuItem value="">
                <em>Select Type</em>
              </MenuItem>
              {appointmentTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.typeName} ({type.defaultDuration} min)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Preferred Days (Required) */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Preferred Days *
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                (day) => (
                  <Chip
                    key={day}
                    label={day}
                    onClick={() => {
                      const newDays = waitlistForm.preferredDays.includes(day)
                        ? waitlistForm.preferredDays.filter((d) => d !== day)
                        : [...waitlistForm.preferredDays, day];
                      setWaitlistForm({ ...waitlistForm, preferredDays: newDays });
                    }}
                    color={waitlistForm.preferredDays.includes(day) ? 'primary' : 'default'}
                    variant={waitlistForm.preferredDays.includes(day) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                )
              )}
            </Box>
          </Box>

          {/* Preferred Times (Required) */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Preferred Times *
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['Morning', 'Afternoon', 'Evening'].map((time) => (
                <Chip
                  key={time}
                  label={time}
                  onClick={() => {
                    const newTimes = waitlistForm.preferredTimes.includes(time)
                      ? waitlistForm.preferredTimes.filter((t) => t !== time)
                      : [...waitlistForm.preferredTimes, time];
                    setWaitlistForm({ ...waitlistForm, preferredTimes: newTimes });
                  }}
                  color={waitlistForm.preferredTimes.includes(time) ? 'primary' : 'default'}
                  variant={waitlistForm.preferredTimes.includes(time) ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>

          {/* Priority */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={waitlistForm.priority}
              onChange={(e) =>
                setWaitlistForm({ ...waitlistForm, priority: Number(e.target.value) })
              }
              label="Priority"
            >
              <MenuItem value={1}>Normal</MenuItem>
              <MenuItem value={2}>High</MenuItem>
              <MenuItem value={3}>Urgent</MenuItem>
            </Select>
          </FormControl>

          {/* Notes */}
          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={3}
            value={waitlistForm.notes}
            onChange={(e) =>
              setWaitlistForm({ ...waitlistForm, notes: e.target.value.slice(0, 500) })
            }
            helperText={`${waitlistForm.notes.length}/500 characters`}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={() => {
            setShowJoinWaitlistDialog(false);
            resetWaitlistForm();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleJoinWaitlist}
          disabled={
            isLoadingWaitlist ||
            !waitlistForm.appointmentTypeId ||
            waitlistForm.preferredDays.length === 0 ||
            waitlistForm.preferredTimes.length === 0
          }
        >
          {isLoadingWaitlist ? 'Joining...' : 'Join Waitlist'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const steps = [
    'Select Clinician',
    'Select Appointment Type',
    'Choose Date & Time',
    'Review & Confirm',
  ];

  const getStepContent = () => {
    switch (wizardState.currentStep) {
      case 0:
        return renderClinicianSelection();
      case 1:
        return renderAppointmentTypeSelection();
      case 2:
        return renderDateTimeSelection();
      case 3:
        return renderConfirmation();
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Page Header - Professional Colorful Theme */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)',
          borderRadius: 4,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(8, 145, 178, 0.3)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: 40 }}>📅</Typography>
            </Box>
            <Box>
              <Typography variant="h3" fontWeight="800" gutterBottom sx={{ mb: 0 }}>
                Book an Appointment
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 300 }}>
                Schedule your appointment in just a few simple steps
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Wizard Stepper */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(8, 145, 178, 0.15)',
          border: '1px solid',
          borderColor: 'rgba(8, 145, 178, 0.1)',
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)',
            p: 3,
          }}
        >
          <Stepper
            activeStep={wizardState.currentStep}
            alternativeLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontWeight: 600,
                fontSize: '0.95rem',
              },
              '& .MuiStepLabel-label.Mui-active': {
                color: '#0891b2',
                fontWeight: 700,
              },
              '& .MuiStepLabel-label.Mui-completed': {
                color: '#0891b2',
                fontWeight: 600,
              },
              '& .MuiStepIcon-root': {
                fontSize: '2rem',
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: '#0891b2',
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: '#22d3ee',
              },
              '& .MuiStepConnector-line': {
                borderColor: '#e0e0e0',
              },
              '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
                borderColor: '#0891b2',
              },
              '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
                borderColor: '#22d3ee',
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Card>

      {/* Wizard Content */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>{getStepContent()}</CardContent>
        <Divider />
        <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button
            disabled={wizardState.currentStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
          {wizardState.currentStep < 3 && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
              endIcon={<ArrowForward />}
            >
              Next
            </Button>
          )}
        </CardActions>
      </Card>

      {/* My Appointments Section */}
      {renderMyAppointments()}

      {/* Waitlist Section */}
      {renderWaitlistSection()}

      {/* Dialogs */}
      {renderSuccessDialog()}
      {renderCancelDialog()}
      {renderJoinWaitlistDialog()}
    </Box>
  );
}
