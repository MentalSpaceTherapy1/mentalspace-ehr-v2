import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

interface EmergencyContact {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
  canPickup: boolean;
  notes?: string;
}

interface EmergencyContactsProps {
  clientId: string;
}

export default function EmergencyContacts({ clientId }: EmergencyContactsProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    phoneNumber: '',
    alternatePhone: '',
    email: '',
    address: '',
    isPrimary: false,
    canPickup: false,
    notes: '',
  });

  // Fetch emergency contacts
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['emergency-contacts', clientId],
    queryFn: async () => {
      const response = await api.get(`/emergency-contacts/client/${clientId}`);
      return response.data.data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingContact) {
        const response = await api.patch(`/emergency-contacts/${editingContact.id}`, data);
        return response.data;
      } else {
        const response = await api.post('/emergency-contacts', { ...data, clientId });
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts', clientId] });
      toast.success('Emergency contact saved successfully');
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to save emergency contact:', error);
      toast.error(error.response?.data?.error || 'Failed to save emergency contact');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/emergency-contacts/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts', clientId] });
      toast.success('Emergency contact deleted successfully');
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
    },
    onError: (error: any) => {
      console.error('Failed to delete emergency contact:', error);
      toast.error(error.response?.data?.error || 'Failed to delete emergency contact');
    },
  });

  const handleEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      relationship: contact.relationship,
      phoneNumber: contact.phoneNumber,
      alternatePhone: contact.alternatePhone || '',
      email: contact.email || '',
      address: contact.address || '',
      isPrimary: contact.isPrimary,
      canPickup: contact.canPickup,
      notes: contact.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      relationship: '',
      phoneNumber: '',
      alternatePhone: '',
      email: '',
      address: '',
      isPrimary: false,
      canPickup: false,
      notes: '',
    });
    setEditingContact(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-orange-500">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-orange-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <span className="mr-2">🚨</span> Emergency Contacts
        </h2>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm flex items-center"
        >
          <span className="mr-2">➕</span> Add Contact
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="mb-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingContact ? 'Edit Emergency Contact' : 'New Emergency Contact'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  required
                  placeholder="Parent, Spouse, Sibling, etc."
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  placeholder="(555) 987-6543"
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@example.com"
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Additional information..."
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all duration-200"
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    checked={formData.isPrimary}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-300"
                  />
                  <span className="text-sm font-bold text-gray-700">Primary Contact</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="canPickup"
                    checked={formData.canPickup}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-300"
                  />
                  <span className="text-sm font-bold text-gray-700">Authorized for Pickup</span>
                </label>
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
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💾</span>
                    {editingContact ? 'Update' : 'Save'} Contact
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts List */}
      {contacts && contacts.length > 0 ? (
        <div className="space-y-4">
          {contacts.map((contact: EmergencyContact) => (
            <div
              key={contact.id}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                contact.isPrimary
                  ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.isPrimary && (
                      <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                        PRIMARY
                      </span>
                    )}
                    {contact.canPickup && (
                      <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full">
                        AUTHORIZED PICKUP
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">Relationship:</span>{' '}
                      <span className="text-gray-900">{contact.relationship}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Phone:</span>{' '}
                      <span className="text-gray-900">{contact.phoneNumber}</span>
                    </div>
                    {contact.alternatePhone && (
                      <div>
                        <span className="font-semibold text-gray-600">Alt Phone:</span>{' '}
                        <span className="text-gray-900">{contact.alternatePhone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div>
                        <span className="font-semibold text-gray-600">Email:</span>{' '}
                        <span className="text-gray-900">{contact.email}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-600">Address:</span>{' '}
                        <span className="text-gray-900">{contact.address}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-600">Notes:</span>{' '}
                        <span className="text-gray-900">{contact.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id, `${contact.firstName} ${contact.lastName}`)}
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
          <div className="text-5xl mb-3">🚨</div>
          <p className="text-gray-600 font-semibold">No emergency contacts added yet</p>
          <p className="text-sm text-gray-500 mt-1">Click "Add Contact" to create one</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Delete Emergency Contact"
        message={`Are you sure you want to delete ${deleteConfirm.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        icon="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
