import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import TimePicker from '../../components/TimePicker';
import useSessionSafeSave, { SessionExpiredAlert, RecoveredDraftAlert } from '../../hooks/useSessionSafeSave';

interface AppointmentFormData {
  clientId: string;
  clinicianId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  serviceLocation: string;
  cptCode: string;
  timezone: string;
  notes: string;
  isRecurring: boolean;
  recurrenceFrequency: string;
  recurrenceDaysOfWeek: string[];
  recurrenceEndDate: string;
  recurrenceCount: number;
  isGroupAppointment: boolean;
  clientIds: string[];
}

export default function NewAppointment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedDateParam = searchParams.get('date');
  const preselectedClientId = searchParams.get('clientId');

  // Parse the date parameter - it might be a full ISO datetime or just a date
  const parseDate = (dateParam: string | null): string => {
    if (!dateParam) {
      return new Date().toISOString().split('T')[0];
    }
    // If it's a full ISO datetime, extract just the date part
    if (dateParam.includes('T')) {
      return dateParam.split('T')[0];
    }
    return dateParam;
  };

  // Parse the time from the date parameter if it's a full datetime
  const parseTime = (dateParam: string | null): string => {
    if (!dateParam || !dateParam.includes('T')) {
      return '09:00';
    }
    try {
      const date = new Date(dateParam);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '09:00';
    }
  };

  const preselectedDate = parseDate(preselectedDateParam);
  const preselectedStartTime = parseTime(preselectedDateParam);

  const [formData, setFormData] = useState<AppointmentFormData>({
    clientId: preselectedClientId || '',
    clinicianId: '',
    appointmentDate: preselectedDate,
    startTime: preselectedStartTime,
    endTime: '10:00', // Will be auto-calculated based on duration
    duration: 60,
    appointmentType: 'Therapy Session',
    serviceLocation: 'Office',
    cptCode: '', // CPT code - optional
    timezone: 'America/New_York',
    notes: '',
    isRecurring: false,
    recurrenceFrequency: 'weekly', // 'twice_weekly', 'weekly', 'bi_weekly', 'monthly', 'custom'
    recurrenceDaysOfWeek: [], // ['Monday', 'Wednesday']
    recurrenceEndDate: '',
    recurrenceCount: 0,
    // Group appointment support
    isGroupAppointment: false,
    clientIds: [], // For group appointments
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [selectedClientsData, setSelectedClientsData] = useState<any[]>([]); // For group appointments

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
    noteType: 'Appointment',
    clientId: preselectedClientId || 'new',
    noteId: appointmentId,
  });

  // Fetch preselected client if clientId is in URL
  const { data: preselectedClient } = useQuery({
    queryKey: ['client', preselectedClientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${preselectedClientId}`);
      return response.data.data;
    },
    enabled: !!preselectedClientId,
  });

  // Auto-populate client search when preselected client loads
  useEffect(() => {
    if (preselectedClient && !clientSearch) {
      setClientSearch(`${preselectedClient.firstName} ${preselectedClient.lastName}`);
      setSelectedClientData(preselectedClient);
    }
  }, [preselectedClient]);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientSearch) params.append('search', clientSearch);
      const response = await api.get(`/clients?${params.toString()}`);
      return response.data.data;
    },
    enabled: clientSearch.length > 2 && !preselectedClientId,
  });

  // Fetch clinicians
  const { data: clinicians, isLoading: cliniciansLoading, error: cliniciansError, isError: isCliniciansError } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      console.log('Fetching clinicians from /users endpoint...');
      const response = await api.get('/users');
      console.log('Users response:', response.data);

      // Log all user roles to debug
      console.log('All user roles:', response.data.data.map((u: any) => ({
        name: `${u.firstName} ${u.lastName}`,
        roles: u.roles
      })));

      const filtered = response.data.data.filter((user: any) =>
        user.roles && Array.isArray(user.roles) && user.roles.some((role: string) =>
          ['CLINICIAN', 'SUPERVISOR'].includes(role)
        )
      );
      console.log('Filtered clinicians:', filtered);
      return filtered;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug logging
  if (isCliniciansError) {
    console.error('Clinicians query error:', cliniciansError);
  }

  // Fetch service codes (CPT codes)
  const { data: serviceCodes } = useQuery({
    queryKey: ['serviceCodes'],
    queryFn: async () => {
      const response = await api.get('/service-codes');
      return response.data.data;
    },
  });

  // Fetch existing appointment if editing
  const { data: existingAppointment, isLoading: loadingAppointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await api.get(`/appointments/${appointmentId}`);
      return response.data.data;
    },
    enabled: !!appointmentId,
  });

  // Pre-populate form when editing existing appointment
  useEffect(() => {
    if (existingAppointment && appointmentId) {
      setFormData({
        clientId: existingAppointment.clientId || '',
        clinicianId: existingAppointment.userId || '',
        appointmentDate: existingAppointment.date || '',
        startTime: existingAppointment.startTime || '09:00',
        endTime: existingAppointment.endTime || '10:00',
        duration: existingAppointment.duration || 60,
        appointmentType: existingAppointment.appointmentType || 'Therapy Session',
        serviceLocation: existingAppointment.serviceLocation || 'Office',
        cptCode: existingAppointment.cptCode || '',
        timezone: existingAppointment.timezone || 'America/New_York',
        notes: existingAppointment.notes || '',
        isRecurring: false,
        recurrenceFrequency: 'weekly',
        recurrenceDaysOfWeek: [],
        recurrenceEndDate: '',
        recurrenceCount: 0,
        isGroupAppointment: false,
        clientIds: [],
      });

      // Set client search if client exists
      if (existingAppointment.client) {
        setClientSearch(`${existingAppointment.client.firstName} ${existingAppointment.client.lastName}`);
        setSelectedClientData(existingAppointment.client);
      }
    }
  }, [existingAppointment, appointmentId]);

  // Auto-calculate end time when start time or duration changes
  useEffect(() => {
    if (formData.startTime && formData.duration) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const totalMinutes = startHour * 60 + startMin + formData.duration;
      const endHour = Math.floor(totalMinutes / 60) % 24;
      const endMin = totalMinutes % 60;
      const calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

      if (calculatedEndTime !== formData.endTime) {
        setFormData(prev => ({ ...prev, endTime: calculatedEndTime }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startTime, formData.duration]);

  // Handle recovering draft data
  const handleRecoverDraft = useCallback(() => {
    const recovered = applyRecoveredDraft();
    if (recovered) {
      // Restore form data
      setFormData(prev => ({
        ...prev,
        ...recovered.formData,
      }));
      // Restore client data if available
      if (recovered.selectedClientData) {
        setSelectedClientData(recovered.selectedClientData);
        setClientSearch(recovered.clientSearch || '');
      }
      // Restore group clients if available
      if (recovered.selectedClientsData) {
        setSelectedClientsData(recovered.selectedClientsData);
      }
    }
  }, [applyRecoveredDraft]);

  // Get current form state for backup
  const getCurrentFormState = useCallback(() => ({
    formData,
    selectedClientData,
    selectedClientsData,
    clientSearch,
  }), [formData, selectedClientData, selectedClientsData, clientSearch]);

  // Auto-save draft to localStorage as user types (debounced)
  useEffect(() => {
    // Don't auto-save if we just recovered a draft (avoid overwriting with empty data)
    if (hasRecoveredDraft) return;

    // Only auto-save if user has started filling out the form
    const hasData = formData.clientId || formData.clinicianId || formData.notes ||
                    selectedClientData || selectedClientsData.length > 0;
    if (!hasData) return;

    const timeoutId = setTimeout(() => {
      backupToLocalStorage(getCurrentFormState());
      console.log('[AutoDraft] Form data auto-saved to localStorage');
    }, 1000); // Debounce: save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [formData, selectedClientData, selectedClientsData, clientSearch, hasRecoveredDraft, backupToLocalStorage, getCurrentFormState]);

  // Create/Update appointment mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(getCurrentFormState());

      if (appointmentId) {
        // Update existing appointment
        const response = await api.put(`/appointments/${appointmentId}`, data);
        return response.data;
      } else {
        // Create new appointment
        const response = await api.post('/appointments', data);
        return response.data;
      }
    },
    onSuccess: () => {
      // Clear backup on successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      navigate('/appointments');
    },
    onError: (error: any, variables: any) => {
      // Handle session expiration with draft preservation
      handleSaveError(error, getCurrentFormState());

      if (error.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
    },
  });

  // Create recurring appointment mutation
  const createRecurringMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(getCurrentFormState());

      const response = await api.post('/appointments/recurring', data);
      return response.data;
    },
    onSuccess: () => {
      // Clear backup on successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/appointments');
    },
    onError: (error: any) => {
      // Handle session expiration with draft preservation
      handleSaveError(error, getCurrentFormState());

      if (error.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    // Client validation: different for individual vs group
    if (formData.isGroupAppointment) {
      if (!formData.clientIds || formData.clientIds.length < 2) {
        newErrors.clientId = 'Select at least 2 clients for group appointment';
      }
    } else {
      if (!formData.clientId) newErrors.clientId = 'Client is required';
    }

    if (!formData.clinicianId) newErrors.clinicianId = 'Clinician is required';
    if (!formData.cptCode) newErrors.cptCode = 'Service Code (CPT Code) is required';
    if (!formData.appointmentDate) newErrors.appointmentDate = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.appointmentType) newErrors.appointmentType = 'Type is required';

    // Recurring appointment validation
    if (formData.isRecurring) {
      if (formData.recurrenceFrequency === 'custom' && formData.recurrenceDaysOfWeek.length === 0) {
        newErrors.recurrenceDaysOfWeek = 'Select at least one day for custom recurrence';
      }
      if (!formData.recurrenceEndDate && !formData.recurrenceCount) {
        newErrors.recurrenceEndDate = 'Specify either an end date or number of occurrences';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert date + time to ISO datetime format for backend
    const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.startTime}:00`).toISOString();

    // Prepare data for backend
    const submitData: any = {
      ...formData,
      appointmentDate: appointmentDateTime,
      appointmentNotes: formData.notes, // Map notes to appointmentNotes
    };

    // Remove frontend-only fields
    delete submitData.notes;
    delete submitData.isRecurring;
    delete submitData.recurrenceFrequency;
    delete submitData.recurrenceDaysOfWeek;
    delete submitData.recurrenceEndDate;
    delete submitData.recurrenceCount;

    // For individual appointments, remove clientIds to avoid backend validation error
    if (!formData.isGroupAppointment) {
      delete submitData.clientIds;
    }

    // Handle recurring appointments vs single appointments
    if (formData.isRecurring) {
      createRecurringMutation.mutate({
        ...submitData,
        isRecurring: true,
        recurrencePattern: {
          frequency: formData.recurrenceFrequency,
          daysOfWeek: formData.recurrenceDaysOfWeek,
          endDate: formData.recurrenceEndDate || undefined,
          count: formData.recurrenceCount || undefined,
        },
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/appointments')}
            className="mb-4 flex items-center text-purple-600 hover:text-purple-700 font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Calendar
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {appointmentId ? 'Edit Appointment' : 'Schedule New Appointment'}
          </h1>
          <p className="text-gray-600">
            {appointmentId ? 'Update the appointment details' : 'Create a new appointment for a client'}
          </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Appointment Type Toggle: Individual / Group */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Appointment Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    isGroupAppointment: false,
                    clientIds: [],
                    clientId: ''
                  });
                  setSelectedClientsData([]);
                  setSelectedClientData(null);
                  setClientSearch('');
                }}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  !formData.isGroupAppointment
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    isGroupAppointment: true,
                    clientId: '',
                    clientIds: []
                  });
                  setSelectedClientData(null);
                  setSelectedClientsData([]);
                  setClientSearch('');
                }}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.isGroupAppointment
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                }`}
              >
                👥 Group
              </button>
            </div>
          </div>

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {formData.isGroupAppointment ? 'Clients (Select 2+)' : 'Client'} <span className="text-red-500">*</span>
            </label>
            {/* Individual Appointment: Single client selection */}
            {!formData.isGroupAppointment && (
              <>
                {formData.clientId && selectedClientData ? (
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl p-4 mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedClientData.firstName} {selectedClientData.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{selectedClientData.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, clientId: '' });
                          setClientSearch('');
                          setSelectedClientData(null);
                        }}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Search for client by name..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                      data-testid="client-search-input"
                    />
                    {clientSearch.length > 2 && clients && clients.length > 0 && (
                      <div className="max-h-48 overflow-y-auto bg-white border-2 border-purple-200 rounded-xl" data-testid="client-search-results">
                        {clients.map((client: any) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, clientId: client.id });
                              setClientSearch(`${client.firstName} ${client.lastName}`);
                              setSelectedClientData(client);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${
                              formData.clientId === client.id ? 'bg-purple-100' : ''
                            }`}
                            data-testid={`client-option-${client.id}`}
                            data-client-name={`${client.firstName} ${client.lastName}`}
                          >
                            <div className="font-semibold">{client.firstName} {client.lastName}</div>
                            <div className="text-sm text-gray-600">{client.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Group Appointment: Multi-client selection */}
            {formData.isGroupAppointment && (
              <>
                {/* Selected Clients Display */}
                {selectedClientsData.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {selectedClientsData.map((client) => (
                      <div
                        key={client.id}
                        className="bg-gradient-to-r from-teal-100 to-cyan-100 border-2 border-teal-300 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">
                            {client.firstName} {client.lastName}
                          </div>
                          <div className="text-sm text-gray-600">{client.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedClients = selectedClientsData.filter(c => c.id !== client.id);
                            const updatedClientIds = updatedClients.map(c => c.id);
                            setSelectedClientsData(updatedClients);
                            setFormData({ ...formData, clientIds: updatedClientIds });
                          }}
                          className="text-teal-600 hover:text-teal-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="text-sm text-gray-600 font-semibold">
                      {selectedClientsData.length} client{selectedClientsData.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                )}

                {/* Client Search */}
                <input
                  type="text"
                  placeholder="Search to add clients to group..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
                />
                {clientSearch.length > 2 && clients && clients.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-white border-2 border-teal-200 rounded-xl">
                    {clients
                      .filter((client: any) => !formData.clientIds.includes(client.id))
                      .map((client: any) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            const updatedClients = [...selectedClientsData, client];
                            const updatedClientIds = updatedClients.map(c => c.id);
                            setSelectedClientsData(updatedClients);
                            setFormData({ ...formData, clientIds: updatedClientIds });
                            setClientSearch('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors"
                        >
                          <div className="font-semibold">{client.firstName} {client.lastName}</div>
                          <div className="text-sm text-gray-600">{client.email}</div>
                        </button>
                      ))
                    }
                  </div>
                )}
              </>
            )}
            {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
          </div>

          {/* Clinician Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Clinician (Therapist) <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.clinicianId}
              onChange={(e) => {
                console.log('Selected clinician ID:', e.target.value);
                setFormData({ ...formData, clinicianId: e.target.value });
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
            >
              <option value="">Select Clinician</option>
              {clinicians?.map((clinician: any) => (
                <option key={clinician.id} value={clinician.id}>
                  {clinician.title ? `${clinician.title} ` : ''}{clinician.firstName} {clinician.lastName}
                </option>
              ))}
            </select>
            {cliniciansLoading && (
              <p className="text-amber-600 text-sm mt-1">Loading clinicians...</p>
            )}
            {isCliniciansError && (
              <p className="text-red-600 text-sm mt-1">Error loading clinicians: {(cliniciansError as any)?.message || 'Unknown error'}. Check console for details.</p>
            )}
            {!cliniciansLoading && !isCliniciansError && (!clinicians || clinicians.length === 0) && (
              <p className="text-red-600 text-sm mt-1">No clinicians found. Please contact your administrator.</p>
            )}
            {errors.clinicianId && <p className="text-red-500 text-sm mt-1">{errors.clinicianId}</p>}
          </div>

          {/* Service Code (CPT Code) - Required */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Service Code (CPT Code) <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.cptCode}
              onChange={(e) => {
                const selectedCode = serviceCodes?.find((sc: any) => sc.code === e.target.value);
                setFormData({
                  ...formData,
                  cptCode: e.target.value,
                  // Auto-fill appointment type if service code has serviceType
                  ...(selectedCode?.serviceType && { appointmentType: selectedCode.serviceType }),
                  // Auto-fill duration if service code has defaultDuration
                  ...(selectedCode?.defaultDuration && { duration: selectedCode.defaultDuration }),
                });
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select Service Code</option>
              {serviceCodes?.map((code: any) => (
                <option key={code.id} value={code.code}>
                  {code.code} - {code.description} {code.defaultDuration ? `(${code.defaultDuration} min)` : ''}
                </option>
              ))}
            </select>
            {errors.cptCode && <p className="text-red-500 text-sm mt-1">{errors.cptCode}</p>}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {errors.appointmentDate && <p className="text-red-500 text-sm mt-1">{errors.appointmentDate}</p>}
            </div>

            <TimePicker
              label="Start Time"
              required
              value={formData.startTime}
              onChange={(time) => setFormData({ ...formData, startTime: time })}
              error={errors.startTime}
            />

            <TimePicker
              label="End Time"
              required
              value={formData.endTime}
              onChange={(time) => {
                // Calculate duration when end time is manually changed
                const [startHour, startMin] = formData.startTime.split(':').map(Number);
                const [endHour, endMin] = time.split(':').map(Number);
                const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

                setFormData({
                  ...formData,
                  endTime: time,
                  duration: durationMinutes > 0 ? durationMinutes : formData.duration
                });
              }}
              error={errors.endTime}
            />
          </div>

          {/* Duration Display */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-xl">
            <div className="text-sm font-semibold text-gray-700 mb-1">Duration</div>
            <div className="text-2xl font-bold text-purple-600">{formData.duration} minutes</div>
          </div>

          {/* Appointment Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Appointment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.appointmentType}
              onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Intake Assessment">Intake Assessment</option>
              <option value="Initial Consultation">Initial Consultation</option>
              <option value="Therapy Session">Therapy Session</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Medication Management">Medication Management</option>
              <option value="Crisis Intervention">Crisis Intervention</option>
              <option value="Group Therapy">Group Therapy</option>
              <option value="Family Therapy">Family Therapy</option>
              <option value="Psychiatric Evaluation">Psychiatric Evaluation</option>
            </select>
            {errors.appointmentType && <p className="text-red-500 text-sm mt-1">{errors.appointmentType}</p>}
          </div>

          {/* Service Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Location</label>
            <select
              value={formData.serviceLocation}
              onChange={(e) => setFormData({ ...formData, serviceLocation: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Office">Office</option>
              <option value="Telehealth">Telehealth</option>
              <option value="Home Visit">Home Visit</option>
              <option value="Hospital">Hospital</option>
              <option value="Community">Community</option>
            </select>
          </div>

          {/* Recurring Appointment Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-2 border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
              />
              <label htmlFor="isRecurring" className="ml-3 text-sm font-semibold text-gray-700">
                Make this a recurring appointment
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4 mt-4">
                {/* Recurrence Frequency */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Session Frequency</label>
                  <select
                    value={formData.recurrenceFrequency}
                    onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="twice_weekly">Twice Weekly</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly (Every 2 Weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Custom Days Selection */}
                {formData.recurrenceFrequency === 'custom' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <label key={day} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.recurrenceDaysOfWeek.includes(day)}
                            onChange={(e) => {
                              const days = e.target.checked
                                ? [...formData.recurrenceDaysOfWeek, day]
                                : formData.recurrenceDaysOfWeek.filter((d) => d !== day);
                              setFormData({ ...formData, recurrenceDaysOfWeek: days });
                            }}
                            className="w-4 h-4 text-purple-600 border-2 border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{day}</span>
                        </label>
                      ))}
                    </div>
                    {errors.recurrenceDaysOfWeek && (
                      <p className="text-red-500 text-sm mt-1">{errors.recurrenceDaysOfWeek}</p>
                    )}
                  </div>
                )}

                {/* End Date or Count */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value, recurrenceCount: 0 })}
                      min={formData.appointmentDate}
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Or Number of Occurrences</label>
                    <input
                      type="number"
                      value={formData.recurrenceCount || ''}
                      onChange={(e) => setFormData({ ...formData, recurrenceCount: parseInt(e.target.value) || 0, recurrenceEndDate: '' })}
                      min="1"
                      max="52"
                      placeholder="e.g., 10"
                      className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                {errors.recurrenceEndDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.recurrenceEndDate}</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Internal Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Add any internal notes about this appointment..."
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {(createMutation.isError || createRecurringMutation.isError) && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-semibold">
                {(createMutation.error as any)?.response?.data?.message ||
                 (createRecurringMutation.error as any)?.response?.data?.message ||
                 'Failed to create appointment'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending || createRecurringMutation.isPending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(createMutation.isPending || createRecurringMutation.isPending) ? 'Creating...' : 'Schedule Appointment'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
