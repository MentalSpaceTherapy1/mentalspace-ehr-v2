import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import TimePicker from '../../components/TimePicker';

export default function NewAppointment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedDate = searchParams.get('date');

  const [formData, setFormData] = useState({
    clientId: '',
    clinicianId: '',
    appointmentDate: preselectedDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    appointmentType: 'Therapy Session',
    serviceLocation: 'Office',
    cptCode: '', // CPT code - optional
    timezone: 'America/New_York',
    notes: '',
    isRecurring: false,
    recurrenceFrequency: 'weekly', // 'twice_weekly', 'weekly', 'bi_weekly', 'monthly', 'custom'
    recurrenceDaysOfWeek: [] as string[], // ['Monday', 'Wednesday']
    recurrenceEndDate: '',
    recurrenceCount: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientSearch, setClientSearch] = useState('');

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (clientSearch) params.append('search', clientSearch);
      const response = await axios.get(`/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: clientSearch.length > 2,
  });

  // Fetch clinicians
  const { data: clinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data.filter((user: any) => ['CLINICIAN', 'SUPERVISOR'].includes(user.role));
    },
  });

  // Fetch service codes (CPT codes)
  const { data: serviceCodes } = useQuery({
    queryKey: ['serviceCodes'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/service-codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Auto-calculate duration when times change
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      if (durationMinutes > 0) {
        setFormData(prev => ({ ...prev, duration: durationMinutes }));
      }
    }
  }, [formData.startTime, formData.endTime]);

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await axios.post('/appointments', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/appointments');
    },
    onError: (error: any) => {
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
      const token = localStorage.getItem('token');
      const response = await axios.post('/appointments/recurring', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/appointments');
    },
    onError: (error: any) => {
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
    if (!formData.clientId) newErrors.clientId = 'Client is required';
    if (!formData.clinicianId) newErrors.clinicianId = 'Clinician is required';
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
            Schedule New Appointment
          </h1>
          <p className="text-gray-600">Create a new appointment for a client</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search for client by name..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
            />
            {clientSearch.length > 2 && clients && clients.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-white border-2 border-purple-200 rounded-xl">
                {clients.map((client: any) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, clientId: client.id });
                      setClientSearch(`${client.firstName} ${client.lastName}`);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${
                      formData.clientId === client.id ? 'bg-purple-100' : ''
                    }`}
                  >
                    <div className="font-semibold">{client.firstName} {client.lastName}</div>
                    <div className="text-sm text-gray-600">{client.email}</div>
                  </button>
                ))}
              </div>
            )}
            {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
          </div>

          {/* Clinician Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Clinician <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.clinicianId}
              onChange={(e) => setFormData({ ...formData, clinicianId: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select Clinician</option>
              {clinicians?.map((clinician: any) => (
                <option key={clinician.id} value={clinician.id}>
                  {clinician.title} {clinician.firstName} {clinician.lastName}
                </option>
              ))}
            </select>
            {errors.clinicianId && <p className="text-red-500 text-sm mt-1">{errors.clinicianId}</p>}
          </div>

          {/* Service Code (CPT Code) - Optional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Service Code (CPT Code)
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
              <option value="">Select Service Code (Optional)</option>
              {serviceCodes?.map((code: any) => (
                <option key={code.id} value={code.code}>
                  {code.code} - {code.description} {code.defaultDuration ? `(${code.defaultDuration} min)` : ''}
                </option>
              ))}
            </select>
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
              onChange={(time) => setFormData({ ...formData, endTime: time })}
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
