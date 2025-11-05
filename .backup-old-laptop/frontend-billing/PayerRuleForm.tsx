import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface PayerRuleFormData {
  clinicianCredential: string;
  placeOfService: string;
  serviceType: string;
  supervisionRequired: boolean;
  cosignRequired: boolean;
  incidentToBillingAllowed: boolean;
  renderingClinicianOverride: boolean;
  cosignTimeframeDays: number | null;
  noteCompletionDays: number | null;
  diagnosisRequired: boolean;
  treatmentPlanRequired: boolean;
  medicalNecessityRequired: boolean;
  priorAuthRequired: boolean;
  isProhibited: boolean;
  prohibitionReason: string;
  effectiveDate: string;
  terminationDate: string;
  isActive: boolean;
}

const PayerRuleForm: React.FC = () => {
  const navigate = useNavigate();
  const { payerId, id } = useParams<{ payerId: string; id?: string }>();
  const isEditMode = !!id;

  const [payerName, setPayerName] = useState<string>('');
  const [formData, setFormData] = useState<PayerRuleFormData>({
    clinicianCredential: 'LAMFT',
    placeOfService: 'OFFICE',
    serviceType: 'PSYCHOTHERAPY',
    supervisionRequired: false,
    cosignRequired: false,
    incidentToBillingAllowed: false,
    renderingClinicianOverride: false,
    cosignTimeframeDays: null,
    noteCompletionDays: null,
    diagnosisRequired: true,
    treatmentPlanRequired: true,
    medicalNecessityRequired: true,
    priorAuthRequired: false,
    isProhibited: false,
    prohibitionReason: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    terminationDate: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPayer();
    if (isEditMode) {
      fetchRule();
    }
  }, [payerId, id]);

  const fetchPayer = async () => {
    try {
      const response = await axios.get(`/api/v1/payers/${payerId}`);
      setPayerName(response.data.data.name);
    } catch (err) {
      console.error('Failed to fetch payer:', err);
    }
  };

  const fetchRule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/payer-rules/${id}`);
      const rule = response.data.data;

      setFormData({
        clinicianCredential: rule.clinicianCredential,
        placeOfService: rule.placeOfService,
        serviceType: rule.serviceType,
        supervisionRequired: rule.supervisionRequired,
        cosignRequired: rule.cosignRequired,
        incidentToBillingAllowed: rule.incidentToBillingAllowed,
        renderingClinicianOverride: rule.renderingClinicianOverride,
        cosignTimeframeDays: rule.cosignTimeframeDays,
        noteCompletionDays: rule.noteCompletionDays,
        diagnosisRequired: rule.diagnosisRequired,
        treatmentPlanRequired: rule.treatmentPlanRequired,
        medicalNecessityRequired: rule.medicalNecessityRequired,
        priorAuthRequired: rule.priorAuthRequired,
        isProhibited: rule.isProhibited,
        prohibitionReason: rule.prohibitionReason || '',
        effectiveDate: rule.effectiveDate.split('T')[0],
        terminationDate: rule.terminationDate ? rule.terminationDate.split('T')[0] : '',
        isActive: rule.isActive,
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch rule');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        payerId,
        effectiveDate: new Date(formData.effectiveDate).toISOString(),
        terminationDate: formData.terminationDate ? new Date(formData.terminationDate).toISOString() : null,
      };

      if (isEditMode) {
        await axios.put(`/api/v1/payer-rules/${id}`, payload);
      } else {
        await axios.post('/api/v1/payer-rules', payload);
      }
      navigate(`/billing/payers/${payerId}/rules`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : null }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/billing/payers/${payerId}/rules`)}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          ← Back to Rules
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Payer Rule' : 'Add New Payer Rule'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {payerName} - Configure billing requirements for specific credential/service combinations
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Rule Identification */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Rule Identification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinician Credential <span className="text-red-500">*</span>
              </label>
              <select
                name="clinicianCredential"
                required
                value={formData.clinicianCredential}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="LAMFT">LAMFT</option>
                <option value="LPC">LPC</option>
                <option value="LAPC">LAPC</option>
                <option value="LMFT">LMFT</option>
                <option value="LCSW">LCSW</option>
                <option value="PSYCHIATRIST">Psychiatrist</option>
                <option value="PSYCHOLOGIST">Psychologist</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                name="serviceType"
                required
                value={formData.serviceType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="PSYCHOTHERAPY">Psychotherapy</option>
                <option value="EVALUATION">Evaluation</option>
                <option value="INTAKE">Intake Assessment</option>
                <option value="TESTING">Psychological Testing</option>
                <option value="CRISIS">Crisis Intervention</option>
                <option value="FAMILY_THERAPY">Family Therapy</option>
                <option value="GROUP_THERAPY">Group Therapy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place of Service <span className="text-red-500">*</span>
              </label>
              <select
                name="placeOfService"
                required
                value={formData.placeOfService}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="OFFICE">Office (11)</option>
                <option value="TELEHEALTH">Telehealth (02)</option>
                <option value="HOME">Home (12)</option>
                <option value="SCHOOL">School (03)</option>
                <option value="INPATIENT">Inpatient (21)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Supervision & Cosign Requirements */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Supervision & Cosign</h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                name="supervisionRequired"
                checked={formData.supervisionRequired}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Supervision Required</label>
                <p className="text-xs text-gray-500">Unlicensed clinician must be under supervision</p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="cosignRequired"
                checked={formData.cosignRequired}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Cosign Required</label>
                <p className="text-xs text-gray-500">Note must be cosigned by supervisor</p>
              </div>
            </div>

            {formData.cosignRequired && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cosign Timeframe (Days)
                </label>
                <input
                  type="number"
                  name="cosignTimeframeDays"
                  min="1"
                  max="90"
                  value={formData.cosignTimeframeDays || ''}
                  onChange={handleChange}
                  placeholder="e.g., 7"
                  className="w-32 border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Days within which note must be cosigned</p>
              </div>
            )}

            <div className="flex items-start">
              <input
                type="checkbox"
                name="incidentToBillingAllowed"
                checked={formData.incidentToBillingAllowed}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Incident-To Billing Allowed</label>
                <p className="text-xs text-gray-500">Bill under supervisor's credentials</p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="renderingClinicianOverride"
                checked={formData.renderingClinicianOverride}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Rendering Clinician Override</label>
                <p className="text-xs text-gray-500">Allow override of rendering clinician on claim</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeframe Requirements */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Timeframe Requirements</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Completion Timeframe (Days)
              </label>
              <input
                type="number"
                name="noteCompletionDays"
                min="1"
                max="365"
                value={formData.noteCompletionDays || ''}
                onChange={handleChange}
                placeholder="e.g., 30"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Days after service date within which note must be completed
              </p>
            </div>
          </div>
        </div>

        {/* Validation Requirements */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Documentation Requirements</h2>

          <div className="space-y-3">
            <div className="flex items-start">
              <input
                type="checkbox"
                name="diagnosisRequired"
                checked={formData.diagnosisRequired}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Diagnosis Code Required</label>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="treatmentPlanRequired"
                checked={formData.treatmentPlanRequired}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Current Treatment Plan Required</label>
                <p className="text-xs text-gray-500">Treatment plan must be less than 90 days old</p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="medicalNecessityRequired"
                checked={formData.medicalNecessityRequired}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Medical Necessity Documentation Required</label>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="priorAuthRequired"
                checked={formData.priorAuthRequired}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Prior Authorization Required</label>
              </div>
            </div>
          </div>
        </div>

        {/* Prohibited Combination */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prohibited Combination</h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                name="isProhibited"
                checked={formData.isProhibited}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">
                  Mark as Prohibited Combination
                </label>
                <p className="text-xs text-gray-500">
                  This credential/service combination is NOT allowed for billing
                </p>
              </div>
            </div>

            {formData.isProhibited && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prohibition Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="prohibitionReason"
                  required={formData.isProhibited}
                  value={formData.prohibitionReason}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g., Medicare does not reimburse LAMFTs for psychotherapy services"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* Effective Dates */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Effective Dates</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="effectiveDate"
                required
                value={formData.effectiveDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termination Date
              </label>
              <input
                type="date"
                name="terminationDate"
                value={formData.terminationDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank if rule has no end date</p>
            </div>

            <div className="flex items-start pt-7">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
              />
              <div className="ml-3">
                <label className="font-medium text-gray-700">Active</label>
                <p className="text-xs text-gray-500">Only active rules will be enforced</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate(`/billing/payers/${payerId}/rules`)}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PayerRuleForm;
