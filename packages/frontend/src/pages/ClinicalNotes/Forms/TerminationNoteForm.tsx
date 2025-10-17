import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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

const TERMINATION_REASON_OPTIONS = [
  { value: 'Treatment completed', label: 'Treatment completed' },
  { value: 'Client request', label: 'Client request' },
  { value: 'Mutual agreement', label: 'Mutual agreement' },
  { value: 'No-show', label: 'No-show' },
  { value: 'Moved away', label: 'Moved away' },
  { value: 'Financial reasons', label: 'Financial reasons' },
  { value: 'Referral to another provider', label: 'Referral to another provider' },
  { value: 'Other', label: 'Other' },
];

export default function TerminationNoteForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [terminationDate, setTerminationDate] = useState('');

  // Termination Details
  const [terminationReason, setTerminationReason] = useState('');
  const [progressAchieved, setProgressAchieved] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState('');
  const [aftercareRecommendations, setAftercareRecommendations] = useState('');
  const [referralsMade, setReferralsMade] = useState('');
  const [emergencyPlan, setEmergencyPlan] = useState('');

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

  const token = localStorage.getItem('token');
  const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/clinical-notes', data);
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
      noteType: 'Termination Note',
      appointmentId: 'temp-appointment-id',
      sessionDate: new Date(terminationDate).toISOString(),
      subjective: `Termination Reason: ${terminationReason}\n\nProgress Achieved:\n${progressAchieved}`,
      objective: `Current Status and Functioning:\n${currentStatus}`,
      assessment: `Final diagnosis codes: ${finalDiagnosis.join(', ')}`,
      plan: `Aftercare Recommendations:\n${aftercareRecommendations}\n\nReferrals Made:\n${referralsMade}\n\nEmergency Plan:\n${emergencyPlan}`,
      terminationReason,
      progressAchieved,
      finalDiagnosis,
      currentStatus,
      aftercareRecommendations,
      referralsMade,
      emergencyPlan,
      diagnosisCodes: finalDiagnosis,
      cptCode,
      billingCode,
      billable,
      dueDate: new Date(terminationDate).toISOString(),
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
            Termination Note
          </h1>
          <p className="text-gray-600 mt-2">Document client discharge from services</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save termination note'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <FormSection title="Termination Information" number={1}>
            <div className="space-y-6">
              <TextField
                label="Termination Date"
                type="date"
                value={terminationDate}
                onChange={setTerminationDate}
                required
              />

              <SelectField
                label="Reason for Termination"
                value={terminationReason}
                onChange={setTerminationReason}
                options={TERMINATION_REASON_OPTIONS}
                required
              />
            </div>
          </FormSection>

          {/* Treatment Outcome */}
          <FormSection title="Treatment Outcome" number={2}>
            <div className="space-y-6">
              <TextAreaField
                label="Progress Achieved"
                value={progressAchieved}
                onChange={setProgressAchieved}
                required
                rows={5}
                placeholder="Summary of progress made during treatment, goals achieved, improvements in functioning..."
              />

              <TextAreaField
                label="Current Status/Functioning"
                value={currentStatus}
                onChange={setCurrentStatus}
                required
                rows={4}
                placeholder="Client's current mental health status, level of functioning, symptom severity at discharge..."
              />
            </div>
          </FormSection>

          {/* Final Diagnosis */}
          <FormSection title="Final Diagnosis" number={3}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Final Diagnosis Codes (ICD-10) <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Final diagnostic impressions at time of discharge
              </p>
              <ICD10Autocomplete
                selectedCodes={finalDiagnosis}
                onCodesChange={setFinalDiagnosis}
              />
            </div>
          </FormSection>

          {/* Aftercare Planning */}
          <FormSection title="Aftercare Planning" number={4}>
            <div className="space-y-6">
              <TextAreaField
                label="Aftercare Recommendations"
                value={aftercareRecommendations}
                onChange={setAftercareRecommendations}
                required
                rows={5}
                placeholder="Recommendations for continued care, self-help strategies, support groups, maintenance plans..."
              />

              <TextAreaField
                label="Referrals Made"
                value={referralsMade}
                onChange={setReferralsMade}
                rows={3}
                placeholder="Any referrals to other providers, services, or resources (include names and contact information)..."
              />

              <TextAreaField
                label="Emergency Plan (if applicable)"
                value={emergencyPlan}
                onChange={setEmergencyPlan}
                rows={4}
                placeholder="Crisis resources, emergency contacts, warning signs to monitor, when to seek help..."
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={5}>
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
            submitLabel="Create Termination Note"
            isSubmitting={saveMutation.isPending}
          />
        </form>
      </div>
    </div>
  );
}
