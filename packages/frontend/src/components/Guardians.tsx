import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { GUARDIAN_RELATIONSHIP_OPTIONS } from '../constants/clientFormOptions';

interface GuardiansProps {
  clientId: string;
}

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Guardians({ clientId }: GuardiansProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    phoneNumber: '',
    email: '',
    address: '',
    isPrimary: false,
    notes: '',
  });

  // Fetch guardians
  const { data: guardians, isLoading } = useQuery({
    queryKey: ['guardians', clientId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/guardians/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data as Guardian[];
    },
  });

  // Create guardian
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/guardians',
        { ...data, clientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', clientId] });
      resetForm();
      setIsAdding(false);
    },
  });

  // Update guardian
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`/guardians/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', clientId] });
      resetForm();
      setEditingId(null);
    },
  });

  // Delete guardian
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/guardians/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', clientId] });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      relationship: '',
      phoneNumber: '',
      email: '',
      address: '',
      isPrimary: false,
      notes: '',
    });
  };

  const handleEdit = (guardian: Guardian) => {
    setFormData({
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      relationship: guardian.relationship,
      phoneNumber: guardian.phoneNumber,
      email: guardian.email || '',
      address: guardian.address || '',
      isPrimary: guardian.isPrimary,
      notes: guardian.notes || '',
    });
    setEditingId(guardian.id);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-rose-500">
        <div className="text-center text-gray-600">Loading guardians...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-rose-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <span className="mr-2">⚖️</span> Legal Guardians
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            + Add Guardian
          </button>
        )}
      </div>

      {/* Guardian List */}
      {guardians && guardians.length > 0 ? (
        <div className="space-y-4 mb-6">
          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border-2 border-rose-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {guardian.firstName} {guardian.lastName}
                    </h3>
                    {guardian.isPrimary && (
                      <span className="ml-3 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">Relationship:</span>{' '}
                      <span className="text-gray-800">{guardian.relationship}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Phone:</span>{' '}
                      <span className="text-gray-800">{guardian.phoneNumber}</span>
                    </div>
                    {guardian.email && (
                      <div>
                        <span className="font-semibold text-gray-600">Email:</span>{' '}
                        <span className="text-gray-800">{guardian.email}</span>
                      </div>
                    )}
                    {guardian.address && (
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-600">Address:</span>{' '}
                        <span className="text-gray-800">{guardian.address}</span>
                      </div>
                    )}
                    {guardian.notes && (
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-600">Notes:</span>{' '}
                        <span className="text-gray-800">{guardian.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(guardian)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this guardian?')) {
                        deleteMutation.mutate(guardian.id);
                      }
                    }}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <div className="text-center py-8 text-gray-500">
            No guardians added yet. Click "Add Guardian" to get started.
          </div>
        )
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-rose-50 rounded-xl border-2 border-rose-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? 'Edit Guardian' : 'Add New Guardian'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Relationship <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              >
                <option value="">Select Relationship</option>
                {GUARDIAN_RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="guardian@example.com"
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State ZIP"
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes about guardian..."
                className="w-full px-4 py-2 border-2 border-rose-200 rounded-lg focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="w-5 h-5 text-rose-600 border-2 border-rose-300 rounded focus:ring-4 focus:ring-rose-300"
                />
                <span className="text-sm font-bold text-gray-700">
                  Set as Primary Guardian (will unset other primary guardians)
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-6 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingId
                ? 'Update Guardian'
                : 'Add Guardian'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
