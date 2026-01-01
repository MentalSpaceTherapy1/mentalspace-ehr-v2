import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';

interface Payment {
  id: string;
  clientId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  unappliedAmount?: number;
  checkNumber?: string;
  referenceNumber?: string;
  client: {
    firstName: string;
    lastName: string;
  };
}

interface Charge {
  id: string;
  clientId: string;
  serviceDate: string;
  chargeAmount: number;
  paymentAmount?: number;
  chargeStatus: string;
  cptCode?: string;
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filters, setFilters] = useState({
    method: '',
    search: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; paymentId: string | null }>({
    open: false,
    paymentId: null,
  });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.method) params.append('method', filters.method);
      if (filters.search) params.append('search', filters.search);
      const response = await api.get(`/billing/payments?${params.toString()}`);
      return response.data.data as Payment[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/billing/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      setSelectedPayment(null);
    },
  });

  const handleDeleteClick = (paymentId: string) => {
    setDeleteConfirm({ open: true, paymentId });
  };

  const confirmDelete = () => {
    if (deleteConfirm.paymentId) {
      deleteMutation.mutate(deleteConfirm.paymentId);
    }
    setDeleteConfirm({ open: false, paymentId: null });
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      'Cash': 'bg-green-100 text-green-800 border-green-300',
      'Check': 'bg-blue-100 text-blue-800 border-blue-300',
      'Credit Card': 'bg-purple-100 text-purple-800 border-purple-300',
      'Debit Card': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'EFT/ACH': 'bg-teal-100 text-teal-800 border-teal-300',
      'Insurance': 'bg-amber-100 text-amber-800 border-amber-300',
      'Other': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[method] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading payments...</p>
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
              Payment Records
            </h1>
            <p className="text-gray-600">Manage payment postings and allocations</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post Payment
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
              <select
                value={filters.method}
                onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="EFT/ACH">EFT/ACH</option>
                <option value="Insurance">Insurance</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gradient-to-r from-green-100 to-emerald-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Payment Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Unapplied
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-green-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {payment.client.firstName} {payment.client.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      ${payment.paymentAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-600">
                      ${(payment.unappliedAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border-2 ${getMethodColor(payment.paymentMethod)}`}>
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.checkNumber || payment.referenceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="text-green-600 hover:text-green-900 font-semibold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment.id)}
                          className="text-red-600 hover:text-red-900 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!payments || payments.length === 0) && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <p className="text-gray-600 font-semibold">No payments found</p>
              <p className="text-gray-500 text-sm mt-2">Post a new payment to get started</p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <CreatePaymentModal
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              setIsCreateModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['payments'] });
              queryClient.invalidateQueries({ queryKey: ['charges'] });
            }}
          />
        )}

        {/* Detail Modal */}
        {selectedPayment && (
          <PaymentDetailModal
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, paymentId: null })}
          onConfirm={confirmDelete}
          title="Delete Payment"
          message="Are you sure you want to delete this payment?"
          confirmText="Delete"
          confirmVariant="danger"
        />
      </div>
    </div>
  );
}

// Create Payment Modal Component
function CreatePaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientId: '',
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    checkNumber: '',
    referenceNumber: '',
    notes: '',
  });
  const [appliedPayments, setAppliedPayments] = useState<Array<{ chargeId: string; amount: number }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientSearch, setClientSearch] = useState('');

  // Fetch clients for search
  const { data: clients } = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientSearch) params.append('search', clientSearch);
      const response = await api.get(`/clients?${params.toString()}`);
      return response.data.data;
    },
    enabled: clientSearch.length > 2,
  });

  // Fetch outstanding charges for selected client
  const { data: charges } = useQuery<Charge[]>({
    queryKey: ['charges', formData.clientId, 'outstanding'],
    queryFn: async () => {
      const params = new URLSearchParams({ clientId: formData.clientId, status: 'Pending,Submitted,Partial Payment' });
      const response = await api.get(`/billing/charges?${params.toString()}`);
      return response.data.data;
    },
    enabled: !!formData.clientId && step === 2,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/billing/payments', data);
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

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientId) newErrors.clientId = 'Client is required';
    if (!formData.paymentAmount) newErrors.paymentAmount = 'Payment amount is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setStep(2);
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      paymentAmount: parseFloat(formData.paymentAmount),
      paymentDate: new Date(formData.paymentDate).toISOString(),
      appliedPaymentsJson: appliedPayments,
    });
  };

  const getTotalApplied = () => {
    return appliedPayments.reduce((sum, ap) => sum + ap.amount, 0);
  };

  const getUnapplied = () => {
    const total = parseFloat(formData.paymentAmount) || 0;
    return total - getTotalApplied();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              Post Payment {step === 2 && '- Apply to Charges'}
            </h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
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
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                />
                {clientSearch.length > 2 && clients && clients.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-white border-2 border-green-200 rounded-xl">
                    {clients.map((client: any) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, clientId: client.id });
                          setClientSearch(`${client.firstName} ${client.lastName}`);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-green-50 transition-colors ${
                          formData.clientId === client.id ? 'bg-green-100' : ''
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

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.paymentAmount && <p className="text-red-500 text-sm mt-1">{errors.paymentAmount}</p>}
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="EFT/ACH">EFT/ACH</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Reference Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check Number</label>
                  <input
                    type="text"
                    value={formData.checkNumber}
                    onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Next: Apply to Charges
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm font-semibold text-gray-600">Total Payment</div>
                    <div className="text-2xl font-bold text-green-600">${parseFloat(formData.paymentAmount).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-600">Applied</div>
                    <div className="text-2xl font-bold text-blue-600">${getTotalApplied().toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-600">Unapplied</div>
                    <div className="text-2xl font-bold text-amber-600">${getUnapplied().toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Outstanding Charges */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Apply Payment to Charges</h3>
                <div className="space-y-3">
                  {charges?.map((charge) => {
                    const balance = charge.chargeAmount - (charge.paymentAmount || 0);
                    const appliedIndex = appliedPayments.findIndex(ap => ap.chargeId === charge.id);
                    const appliedAmount = appliedIndex >= 0 ? appliedPayments[appliedIndex].amount : 0;

                    return (
                      <div key={charge.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-600">
                              {new Date(charge.serviceDate).toLocaleDateString()} - {charge.cptCode || 'N/A'}
                            </div>
                            <div className="text-lg font-bold text-gray-800">Balance: ${balance.toFixed(2)}</div>
                          </div>
                          <button
                            onClick={() => {
                              const remaining = getUnapplied();
                              const applyAmount = Math.min(remaining + appliedAmount, balance);
                              const newApplied = [...appliedPayments];
                              if (appliedIndex >= 0) {
                                newApplied[appliedIndex] = { chargeId: charge.id, amount: applyAmount };
                              } else {
                                newApplied.push({ chargeId: charge.id, amount: applyAmount });
                              }
                              setAppliedPayments(newApplied);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                          >
                            Auto Apply
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Apply Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={appliedAmount || ''}
                            onChange={(e) => {
                              const amount = parseFloat(e.target.value) || 0;
                              const newApplied = [...appliedPayments];
                              if (appliedIndex >= 0) {
                                if (amount === 0) {
                                  newApplied.splice(appliedIndex, 1);
                                } else {
                                  newApplied[appliedIndex] = { chargeId: charge.id, amount };
                                }
                              } else if (amount > 0) {
                                newApplied.push({ chargeId: charge.id, amount });
                              }
                              setAppliedPayments(newApplied);
                            }}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(!charges || charges.length === 0) && (
                  <div className="text-center py-8 text-gray-600">
                    No outstanding charges for this client
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Posting...' : 'Post Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Payment Detail Modal Component
function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Payment Details</h2>
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
                {payment.client.firstName} {payment.client.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Payment Date</div>
              <div className="text-lg font-bold text-gray-800">
                {new Date(payment.paymentDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Payment Method</div>
              <div className="text-lg font-bold text-gray-800">{payment.paymentMethod}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Reference</div>
              <div className="text-lg font-bold text-gray-800">
                {payment.checkNumber || payment.referenceNumber || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Payment Amount</div>
              <div className="text-lg font-bold text-green-600">${payment.paymentAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Unapplied Amount</div>
              <div className="text-lg font-bold text-amber-600">${(payment.unappliedAmount || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
