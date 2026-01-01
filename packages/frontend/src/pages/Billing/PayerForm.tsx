import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface PayerFormData {
  name: string;
  payerType: 'COMMERCIAL' | 'MEDICAID' | 'MEDICARE' | 'EAP' | 'SELF_PAY';
  requiresPreAuth: boolean;
  isActive: boolean;
}

const PayerForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<PayerFormData>({
    name: '',
    payerType: 'COMMERCIAL',
    requiresPreAuth: false,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetchPayer();
    }
  }, [id]);

  const fetchPayer = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payers/${id}`);
      const payer = response.data.data;
      setFormData({
        name: payer.name,
        payerType: payer.payerType,
        requiresPreAuth: payer.requiresPreAuth,
        isActive: payer.isActive,
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payer');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEditMode) {
        await api.put(`/payers/${id}`, formData);
      } else {
        await api.post('/payers', formData);
      }
      navigate('/billing/payers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save payer');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Payer' : 'Add New Payer'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode
            ? 'Update payer information and billing requirements'
            : 'Add a new insurance payer to the system'}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Payer Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Payer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., BlueCross BlueShield of Georgia"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">Full legal name of the insurance payer</p>
        </div>

        {/* Payer Type */}
        <div>
          <label htmlFor="payerType" className="block text-sm font-medium text-gray-700 mb-1">
            Payer Type <span className="text-red-500">*</span>
          </label>
          <select
            id="payerType"
            name="payerType"
            required
            value={formData.payerType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="COMMERCIAL">Commercial Insurance</option>
            <option value="MEDICAID">Medicaid</option>
            <option value="MEDICARE">Medicare</option>
            <option value="EAP">Employee Assistance Program (EAP)</option>
            <option value="SELF_PAY">Self-Pay / Cash</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Category of payer (affects billing rules and requirements)
          </p>
        </div>

        {/* Requires Pre-Authorization */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="requiresPreAuth"
              name="requiresPreAuth"
              checked={formData.requiresPreAuth}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="requiresPreAuth" className="font-medium text-gray-700">
              Requires Prior Authorization
            </label>
            <p className="text-xs text-gray-500">
              Check if this payer requires prior authorization for services
            </p>
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="isActive" className="font-medium text-gray-700">
              Active
            </label>
            <p className="text-xs text-gray-500">
              Only active payers will be available for billing
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/billing/payers')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Payer' : 'Create Payer'}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• After creating the payer, add billing rules for different service types</li>
          <li>• Configure supervision requirements and cosign timeframes</li>
          <li>• Set prohibited credential/service combinations if needed</li>
          <li>• Test the rules against existing clinical notes before activating</li>
        </ul>
      </div>
    </div>
  );
};

export default PayerForm;
