import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import { ESignatureSection } from '../../components/ClientPortal/ESignatureSection';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  section?: string;
}

interface FormData {
  form: {
    id: string;
    formName: string;
    formDescription: string;
    formFieldsJson: string;
  };
  assignment: {
    id: string;
    clientMessage?: string;
    dueDate?: string;
    isRequired: boolean;
  };
}

export default function PortalFormViewer() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // E-signature state
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signedByName, setSignedByName] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, [formId, assignmentId]);

  const fetchFormData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/portal/forms/${formId}`, {
        params: { assignmentId },
      });

      if (response.data.success) {
        const data = response.data.data;
        setFormData(data);

        if (data.form.formFieldsJson) {
          const parsedFields = JSON.parse(data.form.formFieldsJson);

          // Map database field names to component field names
          const mappedFields = parsedFields.map((field: any) => ({
            id: field.fieldId,
            label: field.fieldLabel,
            type: field.fieldType,
            required: field.required || false,
            options: field.options,
            section: field.section
          }));

          setFormFields(mappedFields);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load form. Please try again.');
        setTimeout(() => navigate('/portal/documents'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate actual input fields, not section headers or info text
    const inputFields = formFields.filter(
      f => !['section_header', 'info_text'].includes(f.type)
    );

    const missingFields = inputFields
      .filter(field => field.required && !responses[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields`);
      return;
    }

    // Validate e-signature
    if (!consentAgreed) {
      toast.error('Please agree to the e-signature consent before submitting');
      return;
    }

    if (!signedByName.trim()) {
      toast.error('Please enter your full name for the signature');
      return;
    }

    if (!signatureData) {
      toast.error('Please provide your signature before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/portal/forms/${formId}/submit`, {
        assignmentId,
        responses,
        signatureData,
        signedByName,
        consentAgreed,
      });

      toast.success('Form submitted successfully!');
      setTimeout(() => navigate('/portal/documents'), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';

    // Section header - no border, no padding from parent
    if (field.type === 'section_header') {
      return (
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3 first:mt-0">
          {field.label}
        </h2>
      );
    }

    // Info text - no border, different styling
    if (field.type === 'info_text') {
      return (
        <div className="text-sm text-gray-700 leading-relaxed mb-4 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          {field.label}
        </div>
      );
    }

    // All other input fields
    return (
      <div className="mb-4">
        {/* Label for input fields */}
        {field.type !== 'checkbox' && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Render input based on type */}
        {(() => {
          switch (field.type) {
            case 'text':
              return (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              );

            case 'email':
              return (
                <input
                  type="email"
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              );

            case 'phone':
              return (
                <input
                  type="tel"
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              );

            case 'textarea':
              return (
                <textarea
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              );

            case 'date':
              return (
                <input
                  type="date"
                  value={value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              );

            case 'signature':
              return (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                  <input
                    type="text"
                    placeholder="Type your full name"
                    value={value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-serif text-lg"
                  />
                </div>
              );

            case 'checkbox':
              return (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                    required={field.required}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">{field.label}</label>
                </div>
              );

            default:
              return null;
          }
        })()}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Form not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{formData.form.formName}</h1>
          {formData.form.formDescription && (
            <p className="text-gray-600 text-sm mb-4">{formData.form.formDescription}</p>
          )}

          {formData.assignment.clientMessage && (
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mt-4">
              <p className="text-xs font-semibold text-indigo-800 mb-1">Message from your therapist:</p>
              <p className="text-sm text-indigo-700">{formData.assignment.clientMessage}</p>
            </div>
          )}

          {formData.assignment.dueDate && (
            <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Due: {new Date(formData.assignment.dueDate).toLocaleDateString()}</span>
              {formData.assignment.isRequired && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded">
                  Required
                </span>
              )}
            </div>
          )}
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          {formFields.map((field) => (
            <div key={field.id}>
              {renderField(field)}
            </div>
          ))}

          {/* E-Signature Section */}
          <div className="mt-8 pt-8 border-t-2 border-gray-300">
            <ESignatureSection
              signatureData={signatureData}
              signedByName={signedByName}
              consentAgreed={consentAgreed}
              onSignatureChange={setSignatureData}
              onNameChange={setSignedByName}
              onConsentChange={setConsentAgreed}
              required={true}
            />
          </div>

          {/* Submit Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/portal/documents')}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
