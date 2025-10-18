import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Insurance {
  id: string;
  rank: number;
  insuranceType: string;
  payerName: string;
  payerId?: string;
  memberNumber: string;
  groupNumber?: string;
  planName?: string;
  planType?: string;
  effectiveDate: string;
  terminationDate?: string;
  subscriberFirstName: string;
  subscriberLastName: string;
  subscriberDOB: string;
  subscriberRelationship: string;
  subscriberSSN?: string;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
  verificationStatus: string;
  verificationDate?: string;
  verifiedBy?: string;
  authorizationRequired: boolean;
  authorizationNumber?: string;
  notes?: string;
}

interface InsuranceInfoProps {
  clientId: string;
}

export default function InsuranceInfo({ clientId }: InsuranceInfoProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [formData, setFormData] = useState({
    rank: 1,
    insuranceType: 'COMMERCIAL',
    payerName: '',
    payerId: '',
    memberNumber: '',
    groupNumber: '',
    planName: '',
    planType: '',
    effectiveDate: '',
    terminationDate: '',
    subscriberFirstName: '',
    subscriberLastName: '',
    subscriberDOB: '',
    subscriberRelationship: 'SELF',
    subscriberSSN: '',
    copay: '',
    deductible: '',
    outOfPocketMax: '',
    authorizationRequired: false,
    authorizationNumber: '',
    notes: '',
  });

  // Fetch insurance
  const { data: insurance, isLoading } = useQuery({
    queryKey: ['insurance', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/insurance/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const submitData = {
        ...data,
        clientId,
        copay: data.copay ? parseFloat(data.copay) : undefined,
        deductible: data.deductible ? parseFloat(data.deductible) : undefined,
        outOfPocketMax: data.outOfPocketMax ? parseFloat(data.outOfPocketMax) : undefined,
        effectiveDate: new Date(data.effectiveDate).toISOString(),
        terminationDate: data.terminationDate ? new Date(data.terminationDate).toISOString() : undefined,
        subscriberDOB: new Date(data.subscriberDOB).toISOString(),
      };

      if (editingInsurance) {
        const response = await axios.patch(`/insurance/${editingInsurance.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } else {
        const response = await axios.post('/insurance', submitData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', clientId] });
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/insurance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', clientId] });
    },
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/insurance/${id}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', clientId] });
    },
  });

  const handleEdit = (ins: Insurance) => {
    setEditingInsurance(ins);
    setFormData({
      rank: ins.rank,
      insuranceType: ins.insuranceType,
      payerName: ins.payerName,
      payerId: ins.payerId || '',
      memberNumber: ins.memberNumber,
      groupNumber: ins.groupNumber || '',
      planName: ins.planName || '',
      planType: ins.planType || '',
      effectiveDate: new Date(ins.effectiveDate).toISOString().split('T')[0],
      terminationDate: ins.terminationDate ? new Date(ins.terminationDate).toISOString().split('T')[0] : '',
      subscriberFirstName: ins.subscriberFirstName,
      subscriberLastName: ins.subscriberLastName,
      subscriberDOB: new Date(ins.subscriberDOB).toISOString().split('T')[0],
      subscriberRelationship: ins.subscriberRelationship,
      subscriberSSN: ins.subscriberSSN || '',
      copay: ins.copay?.toString() || '',
      deductible: ins.deductible?.toString() || '',
      outOfPocketMax: ins.outOfPocketMax?.toString() || '',
      authorizationRequired: ins.authorizationRequired,
      authorizationNumber: ins.authorizationNumber || '',
      notes: ins.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, payer: string) => {
    if (window.confirm(`Are you sure you want to delete insurance from ${payer}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      rank: 1,
      insuranceType: 'COMMERCIAL',
      payerName: '',
      payerId: '',
      memberNumber: '',
      groupNumber: '',
      planName: '',
      planType: '',
      effectiveDate: '',
      terminationDate: '',
      subscriberFirstName: '',
      subscriberLastName: '',
      subscriberDOB: '',
      subscriberRelationship: 'SELF',
      subscriberSSN: '',
      copay: '',
      deductible: '',
      outOfPocketMax: '',
      authorizationRequired: false,
      authorizationNumber: '',
      notes: '',
    });
    setEditingInsurance(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return 'Primary';
      case 2: return 'Secondary';
      case 3: return 'Tertiary';
      default: return `Rank ${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-blue-500 to-cyan-500';
      case 2: return 'from-purple-500 to-pink-500';
      case 3: return 'from-amber-500 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'PENDING': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'EXPIRED': return 'bg-gradient-to-r from-red-500 to-rose-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-blue-500">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <span className="mr-2">🏥</span> Insurance Information
        </h2>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm flex items-center"
        >
          <span className="mr-2">➕</span> Add Insurance
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingInsurance ? 'Edit Insurance' : 'New Insurance'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Rank <span className="text-red-500">*</span>
                </label>
                <select
                  name="rank"
                  value={formData.rank}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                >
                  <option value={1}>Primary (1)</option>
                  <option value={2}>Secondary (2)</option>
                  <option value={3}>Tertiary (3)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Insurance Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="insuranceType"
                  value={formData.insuranceType}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                >
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="MEDICARE">Medicare</option>
                  <option value="MEDICAID">Medicaid</option>
                  <option value="TRICARE">Tricare</option>
                  <option value="WORKERS_COMP">Workers Comp</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Payer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="payerName"
                  value={formData.payerName}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Blue Cross Blue Shield"
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Payer ID</label>
                <input
                  type="text"
                  name="payerId"
                  value={formData.payerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Member Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="memberNumber"
                  value={formData.memberNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Group Number</label>
                <input
                  type="text"
                  name="groupNumber"
                  value={formData.groupNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  name="planName"
                  value={formData.planName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Plan Type</label>
                <input
                  type="text"
                  name="planType"
                  value={formData.planType}
                  onChange={handleChange}
                  placeholder="HMO, PPO, EPO, etc."
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Termination Date</label>
                <input
                  type="date"
                  name="terminationDate"
                  value={formData.terminationDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Subscriber First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subscriberFirstName"
                  value={formData.subscriberFirstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Subscriber Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subscriberLastName"
                  value={formData.subscriberLastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Subscriber DOB <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="subscriberDOB"
                  value={formData.subscriberDOB}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Relationship to Subscriber <span className="text-red-500">*</span>
                </label>
                <select
                  name="subscriberRelationship"
                  value={formData.subscriberRelationship}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                >
                  <option value="SELF">Self</option>
                  <option value="SPOUSE">Spouse</option>
                  <option value="CHILD">Child</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Copay ($)</label>
                <input
                  type="number"
                  name="copay"
                  value={formData.copay}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Deductible ($)</label>
                <input
                  type="number"
                  name="deductible"
                  value={formData.deductible}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Out-of-Pocket Max ($)</label>
                <input
                  type="number"
                  name="outOfPocketMax"
                  value={formData.outOfPocketMax}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="authorizationRequired"
                    checked={formData.authorizationRequired}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-300"
                  />
                  <span className="text-sm font-bold text-gray-700">Authorization Required</span>
                </label>
              </div>

              {formData.authorizationRequired && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Authorization Number</label>
                  <input
                    type="text"
                    name="authorizationNumber"
                    value={formData.authorizationNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💾</span>
                    {editingInsurance ? 'Update' : 'Save'} Insurance
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Insurance List */}
      {insurance && insurance.length > 0 ? (
        <div className="space-y-4">
          {insurance.map((ins: Insurance) => (
            <div
              key={ins.id}
              className={`p-4 rounded-xl border-2 bg-gradient-to-br from-${getRankColor(ins.rank).split(' ')[0].replace('from-', '')}/5 to-${getRankColor(ins.rank).split(' ')[2].replace('to-', '')}/5 border-${getRankColor(ins.rank).split(' ')[0].replace('from-', '')}/30 transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-3 py-1 bg-gradient-to-r ${getRankColor(ins.rank)} text-white text-sm font-bold rounded-full shadow-lg`}>
                      {getRankLabel(ins.rank)}
                    </span>
                    <span className={`px-3 py-1 ${getVerificationColor(ins.verificationStatus)} text-sm font-bold rounded-full shadow-md`}>
                      {ins.verificationStatus}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{ins.payerName}</h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">Type:</span>{' '}
                      <span className="text-gray-900">{ins.insuranceType}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Member #:</span>{' '}
                      <span className="text-gray-900">{ins.memberNumber}</span>
                    </div>
                    {ins.groupNumber && (
                      <div>
                        <span className="font-semibold text-gray-600">Group #:</span>{' '}
                        <span className="text-gray-900">{ins.groupNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-gray-600">Effective:</span>{' '}
                      <span className="text-gray-900">{new Date(ins.effectiveDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Subscriber:</span>{' '}
                      <span className="text-gray-900">{ins.subscriberFirstName} {ins.subscriberLastName}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Relationship:</span>{' '}
                      <span className="text-gray-900">{ins.subscriberRelationship}</span>
                    </div>
                    {ins.copay && (
                      <div>
                        <span className="font-semibold text-gray-600">Copay:</span>{' '}
                        <span className="text-gray-900">${ins.copay}</span>
                      </div>
                    )}
                    {ins.deductible && (
                      <div>
                        <span className="font-semibold text-gray-600">Deductible:</span>{' '}
                        <span className="text-gray-900">${ins.deductible}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  {ins.verificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => verifyMutation.mutate(ins.id)}
                      disabled={verifyMutation.isPending}
                      className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold disabled:opacity-50"
                    >
                      ✓ Verify
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(ins)}
                    className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ins.id, ins.payerName)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold disabled:opacity-50"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🏥</div>
          <p className="text-gray-600 font-semibold">No insurance information added yet</p>
          <p className="text-sm text-gray-500 mt-1">Click "Add Insurance" to create one</p>
        </div>
      )}
    </div>
  );
}
