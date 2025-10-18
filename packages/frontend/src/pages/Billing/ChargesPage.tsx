import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Charge {
  id: string;
  clientId: string;
  appointmentId?: string;
  serviceDate: string;
  chargeAmount: number;
  paymentAmount?: number;
  adjustmentAmount?: number;
  cptCode?: string;
  diagnosis?: string;
  chargeStatus: string;
  client: {
    firstName: string;
    lastName: string;
  };
}

export default function ChargesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  // Fetch charges
  const { data: charges, isLoading } = useQuery({
    queryKey: ['charges', filters],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const response = await axios.get(`/billing/charges?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data as Charge[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`/billing/charges/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      setSelectedCharge(null);
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Submitted': 'bg-blue-100 text-blue-800 border-blue-300',
      'Paid': 'bg-green-100 text-green-800 border-green-300',
      'Partial Payment': 'bg-amber-100 text-amber-800 border-amber-300',
      'Denied': 'bg-red-100 text-red-800 border-red-300',
      'Void': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading charges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Charge Entries
            </h1>
            <p className="text-gray-600">Manage billing charges and service fees</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Charge
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by client name..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
                <option value="Paid">Paid</option>
                <option value="Partial Payment">Partial Payment</option>
                <option value="Denied">Denied</option>
                <option value="Void">Void</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charges List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Service Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    CPT Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Charge Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Paid Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {charges?.map((charge) => {
                  const balance = charge.chargeAmount - (charge.paymentAmount || 0) - (charge.adjustmentAmount || 0);
                  return (
                    <tr key={charge.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(charge.serviceDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {charge.client.firstName} {charge.client.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.cptCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${charge.chargeAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ${(charge.paymentAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-600">
                        ${balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border-2 ${getStatusColor(charge.chargeStatus)}`}>
                          {charge.chargeStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCharge(charge)}
                            className="text-purple-600 hover:text-purple-900 font-semibold"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to void this charge?')) {
                                deleteMutation.mutate(charge.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900 font-semibold"
                          >
                            Void
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(!charges || charges.length === 0) && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-600 font-semibold">No charges found</p>
              <p className="text-gray-500 text-sm mt-2">Create a new charge to get started</p>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {isCreateModalOpen && (
          <CreateChargeModal
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              setIsCreateModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['charges'] });
            }}
          />
        )}

        {/* Detail Modal */}
        {selectedCharge && (
          <ChargeDetailModal
            charge={selectedCharge}
            onClose={() => setSelectedCharge(null)}
          />
        )}
      </div>
    </div>
  );
}

// Create Charge Modal Component
function CreateChargeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    clientId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    chargeAmount: '',
    cptCode: '',
    diagnosis: '',
    chargeStatus: 'Pending',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientSearch, setClientSearch] = useState('');

  // Fetch clients for search
  const { data: clients } = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (clientSearch) params.append('search', clientSearch);
      const response = await axios.get(`/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: clientSearch.length > 2,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await axios.post('/billing/charges', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        const newErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.clientId) newErrors.clientId = 'Client is required';
    if (!formData.chargeAmount) newErrors.chargeAmount = 'Charge amount is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate({
      ...formData,
      chargeAmount: parseFloat(formData.chargeAmount),
      serviceDate: new Date(formData.serviceDate).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create New Charge</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search for client..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
            />
            {clientSearch.length > 2 && clients && clients.length > 0 && (
              <div className="max-h-48 overflow-y-auto bg-white border-2 border-purple-200 rounded-xl">
                {clients.map((client: any) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, clientId: client.id });
                      setClientSearch(`${client.firstName} ${client.lastName}`);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${
                      formData.clientId === client.id ? 'bg-purple-100' : ''
                    }`}
                  >
                    <div className="font-semibold">{client.firstName} {client.lastName}</div>
                    <div className="text-sm text-gray-600">{client.email}</div>
                  </button>
                ))}
              </div>
            )}
            {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
          </div>

          {/* Service Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Date</label>
            <input
              type="date"
              value={formData.serviceDate}
              onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Charge Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Charge Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.chargeAmount}
              onChange={(e) => setFormData({ ...formData, chargeAmount: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.chargeAmount && <p className="text-red-500 text-sm mt-1">{errors.chargeAmount}</p>}
          </div>

          {/* CPT Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">CPT Code</label>
            <input
              type="text"
              placeholder="90834"
              value={formData.cptCode}
              onChange={(e) => setFormData({ ...formData, cptCode: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis (ICD-10)</label>
            <input
              type="text"
              placeholder="F41.1"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Charge'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Charge Detail Modal Component
function ChargeDetailModal({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const balance = charge.chargeAmount - (charge.paymentAmount || 0) - (charge.adjustmentAmount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Charge Details</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-600">Client</div>
              <div className="text-lg font-bold text-gray-800">
                {charge.client.firstName} {charge.client.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Service Date</div>
              <div className="text-lg font-bold text-gray-800">
                {new Date(charge.serviceDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">CPT Code</div>
              <div className="text-lg font-bold text-gray-800">{charge.cptCode || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Diagnosis</div>
              <div className="text-lg font-bold text-gray-800">{charge.diagnosis || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Charge Amount</div>
              <div className="text-lg font-bold text-gray-800">${charge.chargeAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Payment Amount</div>
              <div className="text-lg font-bold text-green-600">${(charge.paymentAmount || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Adjustment Amount</div>
              <div className="text-lg font-bold text-amber-600">${(charge.adjustmentAmount || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Balance</div>
              <div className="text-lg font-bold text-red-600">${balance.toFixed(2)}</div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
