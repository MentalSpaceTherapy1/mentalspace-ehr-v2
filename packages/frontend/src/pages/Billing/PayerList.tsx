import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

interface Payer {
  id: string;
  name: string;
  payerType: 'COMMERCIAL' | 'MEDICAID' | 'MEDICARE' | 'EAP' | 'SELF_PAY';
  requiresPreAuth: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: {
    rules: number;
  };
}

interface PayerStats {
  total: number;
  active: number;
  byType: Record<string, number>;
}

const PayerList: React.FC = () => {
  const navigate = useNavigate();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [stats, setStats] = useState<PayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterActive, setFilterActive] = useState<string>('ALL');

  useEffect(() => {
    fetchPayers();
    fetchStats();
  }, []);

  const fetchPayers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payers');
      setPayers(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch payers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/payers/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/payers/${deleteConfirm.id}`);
      fetchPayers();
      fetchStats();
      toast.success('Payer deleted successfully');
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete payer');
    }
  };

  const filteredPayers = payers.filter((payer) => {
    if (filterType !== 'ALL' && payer.payerType !== filterType) return false;
    if (filterActive === 'ACTIVE' && !payer.isActive) return false;
    if (filterActive === 'INACTIVE' && payer.isActive) return false;
    return true;
  });

  const payerTypeColors: Record<string, string> = {
    COMMERCIAL: 'bg-blue-100 text-blue-800',
    MEDICAID: 'bg-green-100 text-green-800',
    MEDICARE: 'bg-purple-100 text-purple-800',
    EAP: 'bg-yellow-100 text-yellow-800',
    SELF_PAY: 'bg-gray-100 text-gray-800',
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Payers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage insurance payers and their billing requirements
          </p>
        </div>
        <button
          onClick={() => navigate('/billing/payers/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Payer
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Payers</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Active</div>
            <div className="mt-1 text-3xl font-semibold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Commercial</div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">
              {stats.byType.COMMERCIAL || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Government</div>
            <div className="mt-1 text-3xl font-semibold text-purple-600">
              {(stats.byType.MEDICAID || 0) + (stats.byType.MEDICARE || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payer Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Types</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="MEDICAID">Medicaid</option>
            <option value="MEDICARE">Medicare</option>
            <option value="EAP">EAP</option>
            <option value="SELF_PAY">Self-Pay</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Payers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payer Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rules
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pre-Auth
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No payers found. Click "Add Payer" to create your first one.
                </td>
              </tr>
            ) : (
              filteredPayers.map((payer) => (
                <tr key={payer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payerTypeColors[payer.payerType]
                      }`}
                    >
                      {payer.payerType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payer._count?.rules || 0} rules
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payer.requiresPreAuth ? (
                      <span className="text-yellow-600">Required</span>
                    ) : (
                      <span className="text-gray-400">Not Required</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payer.isActive ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/billing/payers/${payer.id}/rules`)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Rules
                    </button>
                    <button
                      onClick={() => navigate(`/billing/payers/${payer.id}/edit`)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(payer.id, payer.name)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Delete Payer"
        message={`Are you sure you want to delete ${deleteConfirm.name}? This will also delete all associated rules.`}
        confirmText="Delete"
        cancelText="Cancel"
        icon="warning"
      />
    </div>
  );
};

export default PayerList;
