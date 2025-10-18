import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

const PURPOSE_CATEGORY_OPTIONS = [
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Coordination of care', label: 'Coordination of care' },
  { value: 'Documentation review', label: 'Documentation review' },
  { value: 'Clinical observation', label: 'Clinical observation' },
  { value: 'Collateral contact', label: 'Collateral contact' },
  { value: 'Other', label: 'Other' },
];

export default function MiscellaneousNoteForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [noteDate, setNoteDate] = useState('');

  // Note Details
  const [subject, setSubject] = useState('');
  const [purposeCategory, setPurposeCategory] = useState('');
  const [content, setContent] = useState('');
  const [relatedToTreatment, setRelatedToTreatment] = useState(true);

  // Billing
  const [billable, setBillable] = useState(false);
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');


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
      noteType: 'Miscellaneous Note',
      appointmentId: 'temp-appointment-id',
      sessionDate: new Date(noteDate).toISOString(),
      subjective: `Subject: ${subject}\nCategory: ${purposeCategory}`,
      objective: content,
      assessment: `Miscellaneous note - ${relatedToTreatment ? 'Related to treatment' : 'Administrative'}`,
      plan: 'Continue as planned',
      subject,
      purposeCategory,
      content,
      relatedToTreatment,
      cptCode: billable ? cptCode : '',
      billingCode: billable ? billingCode : '',
      billable,
      dueDate: new Date(noteDate).toISOString(),
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
            Miscellaneous Note
          </h1>
          <p className="text-gray-600 mt-2">Flexible documentation for various purposes</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save miscellaneous note'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <FormSection title="Note Information" number={1}>
            <div className="space-y-6">
              <TextField
                label="Note Date"
                type="date"
                value={noteDate}
                onChange={setNoteDate}
                required
              />

              <TextField
                label="Subject/Title"
                value={subject}
                onChange={setSubject}
                required
                placeholder="Brief title describing the purpose of this note..."
              />

              <SelectField
                label="Purpose/Category"
                value={purposeCategory}
                onChange={setPurposeCategory}
                options={PURPOSE_CATEGORY_OPTIONS}
                required
              />
            </div>
          </FormSection>

          {/* Note Content */}
          <FormSection title="Note Content" number={2}>
            <div className="space-y-6">
              <TextAreaField
                label="Content/Notes"
                value={content}
                onChange={setContent}
                required
                rows={10}
                placeholder="Detailed notes, observations, or documentation. Be thorough and specific..."
              />

              <CheckboxField
                label="Related to Treatment"
                checked={relatedToTreatment}
                onChange={setRelatedToTreatment}
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={3}>
            <div className="space-y-6">
              <CheckboxField
                label="Billable Service"
                checked={billable}
                onChange={setBillable}
              />

              {billable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CPT Code <span className="text-red-500">*</span>
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
              )}
            </div>
          </FormSection>

          {/* Form Actions */}
          <FormActions
            onCancel={() => navigate(`/clients/${clientId}/notes`)}
            onSubmit={handleSubmit}
            submitLabel="Create Miscellaneous Note"
            isSubmitting={saveMutation.isPending}
          />
        </form>
      </div>
    </div>
  );
}
