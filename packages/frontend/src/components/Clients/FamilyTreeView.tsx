import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

interface RelatedClient {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  dateOfBirth: string;
}

interface Relationship {
  id: string;
  clientId: string;
  relatedClientId: string;
  relationshipType: 'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING' | 'GUARDIAN' | 'EMERGENCY_CONTACT';
  isEmergencyContact: boolean;
  canScheduleAppointments: boolean;
  canAccessPortal: boolean;
  canViewRecords: boolean;
  canSignConsent: boolean;
  hasROIConsent: boolean;
  roiExpirationDate?: string;
  notes?: string;
  relatedClient: RelatedClient;
}

interface FamilyTreeViewProps {
  clientId: string;
  relationships: Relationship[];
  isLoading: boolean;
  onRefetch: () => void;
}

export default function FamilyTreeView({ clientId, relationships, isLoading, onRefetch }: FamilyTreeViewProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/client-relationships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-relationships', clientId] });
      onRefetch();
    },
  });

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
    deleteMutation.mutate(deleteConfirm.id);
    setDeleteConfirm({ isOpen: false, id: '', name: '' });
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'PARENT':
        return '👨‍👩‍👦';
      case 'CHILD':
        return '👶';
      case 'SPOUSE':
        return '💑';
      case 'SIBLING':
        return '👥';
      case 'GUARDIAN':
        return '🛡️';
      case 'EMERGENCY_CONTACT':
        return '🚨';
      default:
        return '👤';
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'PARENT':
        return 'from-blue-500 to-cyan-500';
      case 'CHILD':
        return 'from-green-500 to-emerald-500';
      case 'SPOUSE':
        return 'from-pink-500 to-rose-500';
      case 'SIBLING':
        return 'from-purple-500 to-indigo-500';
      case 'GUARDIAN':
        return 'from-orange-500 to-amber-500';
      case 'EMERGENCY_CONTACT':
        return 'from-red-500 to-rose-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!relationships || relationships.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12">
        <div className="text-center">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Family Relationships</h3>
          <p className="text-gray-600">
            Add family relationships to track connections and permissions.
          </p>
        </div>
      </div>
    );
  }

  // Group relationships by type
  const groupedRelationships = relationships.reduce((acc, rel) => {
    if (!acc[rel.relationshipType]) {
      acc[rel.relationshipType] = [];
    }
    acc[rel.relationshipType].push(rel);
    return acc;
  }, {} as Record<string, Relationship[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedRelationships).map(([type, rels]) => (
        <div key={type} className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">{getRelationshipIcon(type)}</span>
            {type.replace(/_/g, ' ')}
            <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
              {rels.length}
            </span>
          </h3>

          <div className="space-y-4">
            {rels.map((rel) => (
              <div
                key={rel.id}
                className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:border-indigo-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {rel.relatedClient.firstName.charAt(0)}
                          {rel.relatedClient.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">
                          {rel.relatedClient.firstName} {rel.relatedClient.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          MRN: {rel.relatedClient.medicalRecordNumber} | Age: {calculateAge(rel.relatedClient.dateOfBirth)}
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-3 py-1 bg-gradient-to-r ${getRelationshipColor(rel.relationshipType)} text-white text-xs font-bold rounded-full shadow-md`}>
                        {rel.relationshipType.replace(/_/g, ' ')}
                      </span>
                      {rel.isEmergencyContact && (
                        <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold rounded-full shadow-md">
                          EMERGENCY CONTACT
                        </span>
                      )}
                      {rel.hasROIConsent && (
                        <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-md">
                          ROI CONSENT
                        </span>
                      )}
                    </div>

                    {/* Permissions */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mb-3">
                      <div className={`flex items-center ${rel.canScheduleAppointments ? 'text-green-700' : 'text-gray-400'}`}>
                        <span className="mr-1">{rel.canScheduleAppointments ? '✓' : '✗'}</span>
                        Schedule Appointments
                      </div>
                      <div className={`flex items-center ${rel.canAccessPortal ? 'text-green-700' : 'text-gray-400'}`}>
                        <span className="mr-1">{rel.canAccessPortal ? '✓' : '✗'}</span>
                        Access Portal
                      </div>
                      <div className={`flex items-center ${rel.canViewRecords ? 'text-green-700' : 'text-gray-400'}`}>
                        <span className="mr-1">{rel.canViewRecords ? '✓' : '✗'}</span>
                        View Records
                      </div>
                      <div className={`flex items-center ${rel.canSignConsent ? 'text-green-700' : 'text-gray-400'}`}>
                        <span className="mr-1">{rel.canSignConsent ? '✓' : '✗'}</span>
                        Sign Consent
                      </div>
                    </div>

                    {/* ROI Info */}
                    {rel.hasROIConsent && rel.roiExpirationDate && (
                      <div className="p-3 bg-white rounded-lg border border-green-200 mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">ROI Expires:</span> {formatDate(rel.roiExpirationDate)}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {rel.notes && (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Notes:</span> {rel.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleDeleteClick(rel.id, `${rel.relatedClient.firstName} ${rel.relatedClient.lastName}`)}
                      disabled={deleteMutation.isPending}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Remove Relationship"
        message={`Are you sure you want to remove the relationship with ${deleteConfirm.name}?`}
        confirmText="Remove"
        confirmVariant="danger"
      />
    </div>
  );
}
