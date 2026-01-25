import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ICD10Autocomplete from '../ClinicalNotes/ICD10Autocomplete';
import PriorAuthorizationForm from '../../pages/PriorAuthorization/PriorAuthorizationForm';

interface PriorAuthorization {
  id: string;
  clientId: string;
  insuranceId: string;
  insurance: {
    id: string;
    insuranceCompany: string;
    rank: string;
  };
  authorizationNumber: string;
  authorizationType: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'EXHAUSTED';
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
  lastUsedDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Insurance {
  id: string;
  insuranceCompany: string;
  rank: string;
}

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

interface AuthorizationFormProps {
  clientId: string;
  authorization?: PriorAuthorization | null;
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

export default function AuthorizationForm({ clientId, authorization, onClose }: AuthorizationFormProps) {
  const queryClient = useQueryClient();
  const [cptSearchTerm, setCptSearchTerm] = useState('');
  const [showCptDropdown, setShowCptDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'questionnaire'>('details');
  const [createdAuthId, setCreatedAuthId] = useState<string | null>(authorization?.id || null);

  const [formData, setFormData] = useState<{
    insuranceId: string;
    authorizationNumber: string;
    authorizationType: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'EXHAUSTED';
    sessionsAuthorized: string;
    startDate: string;
    endDate: string;
    cptCodes: string[];
    diagnosisCodes: string[];
    clinicalJustification: string;
    requestingProviderId: string;
  }>({
    insuranceId: '',
    authorizationNumber: '',
    authorizationType: 'OUTPATIENT_MENTAL_HEALTH',
    status: 'PENDING',
    sessionsAuthorized: '',
    startDate: '',
    endDate: '',
    cptCodes: [],
    diagnosisCodes: [],
    clinicalJustification: '',
    requestingProviderId: '',
  });

  // Fetch client's insurance
  const { data: insuranceList } = useQuery<Insurance[]>({
    queryKey: ['insurance', clientId],
    queryFn: async () => {
      const response = await api.get(`/insurance/client/${clientId}`);
      return response.data.data;
    },
  });

  // Fetch providers
  const { data: providers } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await api.get('/users?role=PSYCHIATRIST,PSYCHOLOGIST,THERAPIST,SOCIAL_WORKER');
      return response.data.data;
    },
  });

  // Initialize form with authorization data
  useEffect(() => {
    if (authorization) {
      setFormData({
        insuranceId: authorization.insuranceId,
        authorizationNumber: authorization.authorizationNumber,
        authorizationType: authorization.authorizationType,
        status: authorization.status,
        sessionsAuthorized: authorization.sessionsAuthorized.toString(),
        startDate: new Date(authorization.startDate).toISOString().split('T')[0],
        endDate: new Date(authorization.endDate).toISOString().split('T')[0],
        cptCodes: authorization.cptCodes,
        diagnosisCodes: authorization.diagnosisCodes,
        clinicalJustification: authorization.clinicalJustification || '',
        requestingProviderId: authorization.requestingProviderId,
      });
    }
  }, [authorization]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const submitData = {
        ...data,
        clientId,
        sessionsAuthorized: parseInt(data.sessionsAuthorized),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };

      if (authorization || createdAuthId) {
        const id = authorization?.id || createdAuthId;
        const response = await api.put(`/prior-authorizations/${id}`, submitData);
        return response.data;
      } else {
        const response = await api.post('/prior-authorizations', submitData);
        return response.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prior-authorizations', clientId] });
      // If creating new, capture the ID and switch to questionnaire tab
      if (!authorization && !createdAuthId && data?.data?.id) {
        setCreatedAuthId(data.data.id);
        setActiveTab('questionnaire');
      } else if (!authorization && !createdAuthId && data?.id) {
        setCreatedAuthId(data.id);
        setActiveTab('questionnaire');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {authorization || createdAuthId ? 'Edit Authorization' : 'New Authorization'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === 'details'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Authorization Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('questionnaire')}
          disabled={!authorization && !createdAuthId}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === 'questionnaire'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          } ${!authorization && !createdAuthId ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Clinical Questionnaire
          {!authorization && !createdAuthId && (
            <span className="ml-2 text-xs text-gray-500">(Save details first)</span>
          )}
        </button>
      </div>

      {/* Clinical Questionnaire Tab */}
      {activeTab === 'questionnaire' && (authorization?.id || createdAuthId) && (
        <div className="mb-6">
          <PriorAuthorizationForm
            priorAuthorizationId={authorization?.id || createdAuthId!}
            onClose={onClose}
            onSaveSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['prior-authorizations', clientId] });
            }}
          />
        </div>
      )}

      {/* Authorization Details Tab */}
      {activeTab === 'details' && (
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Insurance */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Insurance <span className="text-red-500">*</span>
            </label>
            <select
              name="insuranceId"
              value={formData.insuranceId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
            >
              <option value="">Select Insurance</option>
              {insuranceList?.map((insurance) => (
                <option key={insurance.id} value={insurance.id}>
                  {insurance.insuranceCompany} ({insurance.rank})
                </option>
              ))}
            </select>
          </div>

          {/* Authorization Number */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Authorization Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="authorizationNumber"
              value={formData.authorizationNumber}
              onChange={handleChange}
              required
              placeholder="e.g., AUTH-2024-12345"
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

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="EXPIRED">Expired</option>
              <option value="EXHAUSTED">Exhausted</option>
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
            Clinical Justification
          </label>
          <textarea
            name="clinicalJustification"
            value={formData.clinicalJustification}
            onChange={handleChange}
            rows={4}
            placeholder="Provide clinical justification for the authorization request..."
            className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending || formData.cptCodes.length === 0 || formData.diagnosisCodes.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saveMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>{authorization || createdAuthId ? 'Update' : 'Save & Continue to Questionnaire'}</>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
