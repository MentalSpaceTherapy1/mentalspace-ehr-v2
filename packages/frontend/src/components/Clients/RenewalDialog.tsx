import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ICD10Autocomplete from '../ClinicalNotes/ICD10Autocomplete';

interface PriorAuthorization {
  id: string;
  clientId: string;
  insuranceId: string;
  insurance: {
    id: string;
    payerName: string;
    rank: number;
  };
  authorizationNumber: string;
  authorizationType: string;
  status: string;
  sessionsAuthorized: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  startDate: string;
  endDate: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  clinicalJustification?: string;
  requestingProviderId: string;
  requestingProvider?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

interface RenewalDialogProps {
  authorization: PriorAuthorization;
  onClose: () => void;
}

// Common CPT codes for mental health
const COMMON_CPT_CODES = [
  { code: '90791', description: 'Psychiatric diagnostic evaluation' },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services' },
  { code: '90832', description: 'Psychotherapy, 30 minutes' },
  { code: '90834', description: 'Psychotherapy, 45 minutes' },
  { code: '90837', description: 'Psychotherapy, 60 minutes' },
  { code: '90846', description: 'Family psychotherapy without patient' },
  { code: '90847', description: 'Family psychotherapy with patient' },
  { code: '90853', description: 'Group psychotherapy' },
];

export default function RenewalDialog({ authorization, onClose }: RenewalDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: Review Old, 2: New Request Form
  const [cptSearchTerm, setCptSearchTerm] = useState('');
  const [showCptDropdown, setShowCptDropdown] = useState(false);

  const [formData, setFormData] = useState({
    authorizationNumber: '',
    authorizationType: authorization.authorizationType,
    sessionsAuthorized: '',
    startDate: '',
    endDate: '',
    cptCodes: authorization.cptCodes,
    diagnosisCodes: authorization.diagnosisCodes,
    clinicalJustification: '',
    requestingProviderId: authorization.requestingProviderId,
  });

  // Fetch providers
  const { data: providers } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await api.get('/users?role=PSYCHIATRIST,PSYCHOLOGIST,THERAPIST,SOCIAL_WORKER');
      return response.data.data;
    },
  });

  // Set default dates on mount
  useEffect(() => {
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    setFormData(prev => ({
      ...prev,
      startDate: today.toISOString().split('T')[0],
      endDate: sixMonthsFromNow.toISOString().split('T')[0],
    }));
  }, []);

  // Renewal mutation
  const renewalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/prior-authorizations/${authorization.id}/renew`, {
        ...data,
        clientId: authorization.clientId,
        insuranceId: authorization.insuranceId,
        sessionsAuthorized: parseInt(data.sessionsAuthorized),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prior-authorizations', authorization.clientId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    renewalMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCptCode = (code: string) => {
    if (!formData.cptCodes.includes(code)) {
      setFormData(prev => ({ ...prev, cptCodes: [...prev.cptCodes, code] }));
    }
    setCptSearchTerm('');
    setShowCptDropdown(false);
  };

  const handleRemoveCptCode = (code: string) => {
    setFormData(prev => ({ ...prev, cptCodes: prev.cptCodes.filter(c => c !== code) }));
  };

  const filteredCptCodes = COMMON_CPT_CODES.filter(
    item =>
      item.code.toLowerCase().includes(cptSearchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(cptSearchTerm.toLowerCase())
  );

  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full my-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Authorization Renewal</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {step} of 2: {step === 1 ? 'Review Current Authorization' : 'New Authorization Request'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Review Old Authorization */}
        {step === 1 && (
          <div>
            <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📋</span> Current Authorization Details
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Authorization Number</p>
                  <p className="text-base font-bold text-gray-900">{authorization.authorizationNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Insurance</p>
                  <p className="text-base font-bold text-gray-900">{authorization.insurance.payerName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Type</p>
                  <p className="text-base font-bold text-gray-900">{authorization.authorizationType}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    authorization.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    authorization.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {authorization.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white/70 rounded-lg">
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-600">Authorized</p>
                  <p className="text-2xl font-bold text-gray-900">{authorization.sessionsAuthorized}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-600">Used</p>
                  <p className="text-2xl font-bold text-gray-900">{authorization.sessionsUsed}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-red-600">{authorization.sessionsRemaining}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Start Date</p>
                  <p className="text-base font-bold text-gray-900">
                    {new Date(authorization.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">End Date</p>
                  <p className="text-base font-bold text-gray-900">
                    {new Date(authorization.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">CPT Codes</p>
                <div className="flex flex-wrap gap-2">
                  {authorization.cptCodes.map((code) => (
                    <span
                      key={code}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-lg"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Diagnosis Codes</p>
                <div className="flex flex-wrap gap-2">
                  {authorization.diagnosisCodes.map((code) => (
                    <span
                      key={code}
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {authorization.clinicalJustification && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Previous Clinical Justification</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white/50 p-3 rounded-lg">
                    {authorization.clinicalJustification}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Continue to Renewal Request →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: New Authorization Request Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
              <p className="text-sm font-semibold text-green-800 flex items-center">
                <span className="mr-2">ℹ️</span>
                The data from the previous authorization has been pre-filled. Modify as needed for the renewal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Authorization Number */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  New Authorization Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="authorizationNumber"
                  value={formData.authorizationNumber}
                  onChange={handleChange}
                  required
                  placeholder="e.g., AUTH-2024-67890"
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                />
              </div>

              {/* Authorization Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Authorization Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="authorizationType"
                  value={formData.authorizationType}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                >
                  <option value="OUTPATIENT_MENTAL_HEALTH">Outpatient Mental Health</option>
                  <option value="INTENSIVE_OUTPATIENT">Intensive Outpatient Program (IOP)</option>
                  <option value="PARTIAL_HOSPITALIZATION">Partial Hospitalization Program (PHP)</option>
                  <option value="PSYCHOLOGICAL_TESTING">Psychological Testing</option>
                  <option value="FAMILY_THERAPY">Family Therapy</option>
                  <option value="GROUP_THERAPY">Group Therapy</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Sessions Authorized */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Sessions Authorized <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="sessionsAuthorized"
                  value={formData.sessionsAuthorized}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="e.g., 20"
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">Duration: {calculateDuration()} days</p>
              </div>

              {/* Requesting Provider */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Requesting Provider <span className="text-red-500">*</span>
                </label>
                <select
                  name="requestingProviderId"
                  value={formData.requestingProviderId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                >
                  <option value="">Select Provider</option>
                  {providers?.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.firstName} {provider.lastName} {provider.title ? `- ${provider.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CPT Codes */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                CPT Codes <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cptSearchTerm}
                  onChange={(e) => setCptSearchTerm(e.target.value)}
                  onFocus={() => setShowCptDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCptDropdown(false), 200)}
                  placeholder="Search CPT codes (e.g., 90834)"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />

                {showCptDropdown && filteredCptCodes.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    {filteredCptCodes.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onMouseDown={() => handleAddCptCode(item.code)}
                        disabled={formData.cptCodes.includes(item.code)}
                        className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          formData.cptCodes.includes(item.code) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                        }`}
                      >
                        <div className="font-semibold text-purple-700">{item.code}</div>
                        <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formData.cptCodes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.cptCodes.map((code) => (
                    <div
                      key={code}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg group"
                    >
                      <span className="font-semibold text-gray-800">{code}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCptCode(code)}
                        className="text-red-500 hover:text-red-700 font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diagnosis Codes */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Diagnosis Codes <span className="text-red-500">*</span>
              </label>
              <ICD10Autocomplete
                selectedCodes={formData.diagnosisCodes}
                onCodesChange={(codes) => setFormData(prev => ({ ...prev, diagnosisCodes: codes }))}
              />
            </div>

            {/* Clinical Justification */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Clinical Justification for Renewal <span className="text-red-500">*</span>
              </label>
              <textarea
                name="clinicalJustification"
                value={formData.clinicalJustification}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Provide clinical justification for the renewal request, including progress made, continued need for treatment, and treatment goals..."
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 resize-none"
              />
            </div>

            {/* Error Message */}
            {renewalMutation.isError && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl">
                <p className="text-sm font-semibold text-red-800">
                  Failed to submit renewal request. Please try again.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={renewalMutation.isPending}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                ← Back
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={renewalMutation.isPending}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewalMutation.isPending || formData.cptCodes.length === 0 || formData.diagnosisCodes.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {renewalMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Renewal Request'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
