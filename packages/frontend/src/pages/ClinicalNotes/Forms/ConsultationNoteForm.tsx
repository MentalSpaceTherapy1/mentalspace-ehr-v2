import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import {
  FormSection,
  TextField,
  TextAreaField,
  CheckboxField,
  FormActions,
} from '../../../components/ClinicalNotes/SharedFormComponents';
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';

export default function ConsultationNoteForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sessionDate, setSessionDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Consultation Details
  const [consultedPerson, setConsultedPerson] = useState('');
  const [organization, setOrganization] = useState('');
  const [reasonForConsultation, setReasonForConsultation] = useState('');
  const [informationShared, setInformationShared] = useState('');
  const [recommendationsReceived, setRecommendationsReceived] = useState('');
  const [followUpActions, setFollowUpActions] = useState('');

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

  const [nextSessionDate, setNextSessionDate] = useState('');


  // Auto-set due date to 7 days from session date
  useEffect(() => {
    if (sessionDate && !dueDate) {
      const date = new Date(sessionDate);
      date.setDate(date.getDate() + 7);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [sessionDate]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      clientId,
      noteType: 'Consultation Note',
      appointmentId: 'temp-appointment-id',
      sessionDate: new Date(sessionDate).toISOString(),
      subjective: `Consultation with: ${consultedPerson}\nOrganization: ${organization}\n\nReason: ${reasonForConsultation}`,
      objective: `Information Shared: ${informationShared}`,
      assessment: `Recommendations Received: ${recommendationsReceived}`,
      plan: `Follow-up Actions: ${followUpActions}`,
      consultedPerson,
      organization,
      reasonForConsultation,
      informationShared,
      recommendationsReceived,
      followUpActions,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : null,
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
            Consultation Note
          </h1>
          <p className="text-gray-600 mt-2">Document consultation with other providers</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save consultation note'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <FormSection title="Session Information" number={1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TextField
                label="Consultation Date"
                type="date"
                value={sessionDate}
                onChange={setSessionDate}
                required
              />
              <TextField
                label="Due Date (7-day rule)"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                required
              />
              <TextField
                label="Next Session Date"
                type="date"
                value={nextSessionDate}
                onChange={setNextSessionDate}
              />
            </div>
          </FormSection>

          {/* Consultation Details */}
          <FormSection title="Consultation Details" number={2}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Person Consulted (Name/Title)"
                  value={consultedPerson}
                  onChange={setConsultedPerson}
                  required
                  placeholder="e.g., Dr. Jane Smith, MD"
                />
                <TextField
                  label="Organization/Affiliation"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="e.g., ABC Mental Health Center"
                />
              </div>

              <TextAreaField
                label="Reason for Consultation"
                value={reasonForConsultation}
                onChange={setReasonForConsultation}
                required
                rows={4}
                placeholder="Purpose of consultation, specific questions or concerns addressed..."
              />

              <TextAreaField
                label="Information Shared"
                value={informationShared}
                onChange={setInformationShared}
                required
                rows={4}
                placeholder="Summary of client information shared during consultation (ensure HIPAA compliance)..."
              />

              <TextAreaField
                label="Recommendations Received"
                value={recommendationsReceived}
                onChange={setRecommendationsReceived}
                required
                rows={4}
                placeholder="Advice, recommendations, or guidance provided by the consulted professional..."
              />

              <TextAreaField
                label="Follow-up Actions"
                value={followUpActions}
                onChange={setFollowUpActions}
                rows={3}
                placeholder="Next steps, referrals to be made, additional consultations needed..."
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={3}>
            <div className="space-y-6">
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
            onSubmit={handleSubmit}
            submitLabel="Create Consultation Note"
            isSubmitting={saveMutation.isPending}
          />
        </form>
      </div>
    </div>
  );
}
