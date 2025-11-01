import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface PayerRule {
  id: string;
  payerId: string;
  clinicianCredential: string;
  placeOfService: string;
  serviceType: string;
  supervisionRequired: boolean;
  cosignRequired: boolean;
  cosignTimeframeDays: number | null;
  noteCompletionDays: number | null;
  isProhibited: boolean;
  prohibitionReason: string | null;
  isActive: boolean;
  effectiveDate: string;
  terminationDate: string | null;
}

interface Payer {
  id: string;
  name: string;
  payerType: string;
}

const PayerRuleList: React.FC = () => {
  const navigate = useNavigate();
  const { payerId } = useParams<{ payerId: string }>();

  const [payer, setPayer] = useState<Payer | null>(null);
  const [rules, setRules] = useState<PayerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<string>('ACTIVE');
  const [filterCredential, setFilterCredential] = useState<string>('ALL');

  useEffect(() => {
    fetchPayer();
    fetchRules();
  }, [payerId]);

  const fetchPayer = async () => {
    try {
      const response = await axios.get(`/api/v1/payers/${payerId}`);
      setPayer(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payer');
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/payer-rules?payerId=${payerId}`);
      setRules(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payer rules');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId: string, credential: string) => {
    if (!window.confirm(`Delete rule for ${credential}?`)) {
      return;
    }

    try {
      await axios.delete(`/api/v1/payer-rules/${ruleId}`);
      fetchRules();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  const handleClone = async (ruleId: string) => {
    try {
      const response = await axios.post(`/api/v1/payer-rules/${ruleId}/clone`);
      fetchRules();
      alert('Rule cloned successfully! You can now edit the new rule.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clone rule');
    }
  };

  const filteredRules = rules.filter((rule) => {
    if (filterActive === 'ACTIVE' && !rule.isActive) return false;
    if (filterActive === 'INACTIVE' && rule.isActive) return false;
    if (filterActive === 'PROHIBITED' && !rule.isProhibited) return false;
    if (filterCredential !== 'ALL' && rule.clinicianCredential !== filterCredential) return false;
    return true;
  });

  const uniqueCredentials = Array.from(new Set(rules.map((r) => r.clinicianCredential)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/billing/payers')}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          ← Back to Payers
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing Rules: {payer?.name || 'Loading...'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure billing requirements for different credential and service combinations
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/billing/payers/${payerId}/rules/import`)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => navigate(`/billing/payers/${payerId}/rules/new`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Rule
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Rules</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
            <option value="PROHIBITED">Prohibited Only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Credential</label>
          <select
            value={filterCredential}
            onChange={(e) => setFilterCredential(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Credentials</option>
            {uniqueCredentials.map((cred) => (
              <option key={cred} value={cred}>
                {cred}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credential
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Place
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cosign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Note Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No rules found. Click "Add Rule" to create your first one.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className={`hover:bg-gray-50 ${rule.isProhibited ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rule.clinicianCredential}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.serviceType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.placeOfService}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {rule.cosignRequired ? (
                        <span className="text-yellow-600">
                          {rule.cosignTimeframeDays} days
                        </span>
                      ) : (
                        <span className="text-gray-400">Not required</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.noteCompletionDays ? `${rule.noteCompletionDays} days` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rule.isProhibited ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Prohibited
                        </span>
                      ) : rule.isActive ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/billing/payers/${payerId}/rules/${rule.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleClone(rule.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id, rule.clinicianCredential)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Rules</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{rules.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {rules.filter((r) => r.isActive && !r.isProhibited).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Prohibited</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">
            {rules.filter((r) => r.isProhibited).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Require Cosign</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">
            {rules.filter((r) => r.cosignRequired).length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayerRuleList;
