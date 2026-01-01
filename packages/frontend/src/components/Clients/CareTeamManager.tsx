import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import AddProviderDialog from './AddProviderDialog';
import ConfirmModal from '../ConfirmModal';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email?: string;
  phone?: string;
}

interface CareTeamMember {
  id: string;
  clientId: string;
  providerId?: string;
  providerType: 'INTERNAL' | 'EXTERNAL';
  role: 'PRIMARY_CARE' | 'PSYCHIATRIST' | 'THERAPIST' | 'CASE_MANAGER' | 'SPECIALIST' | 'OTHER';
  externalProviderName?: string;
  externalProviderNPI?: string;
  externalProviderPhone?: string;
  externalProviderFax?: string;
  externalProviderEmail?: string;
  hasROIConsent: boolean;
  roiExpirationDate?: string;
  canReceiveReports: boolean;
  canReceiveUpdates: boolean;
  preferredContactMethod?: string;
  notes?: string;
  provider?: Provider;
  createdAt: string;
}

interface CareTeamManagerProps {
  clientId: string;
  careTeam: CareTeamMember[];
  isLoading: boolean;
  onRefetch: () => void;
}

export default function CareTeamManager({ clientId, careTeam, isLoading, onRefetch }: CareTeamManagerProps) {
  const queryClient = useQueryClient();
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/client-relationships/providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-team', clientId] });
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PRIMARY_CARE':
        return '🏥';
      case 'PSYCHIATRIST':
        return '💊';
      case 'THERAPIST':
        return '🧠';
      case 'CASE_MANAGER':
        return '📋';
      case 'SPECIALIST':
        return '⚕️';
      case 'OTHER':
        return '👤';
      default:
        return '👨‍⚕️';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PRIMARY_CARE':
        return 'from-blue-500 to-cyan-500';
      case 'PSYCHIATRIST':
        return 'from-purple-500 to-indigo-500';
      case 'THERAPIST':
        return 'from-green-500 to-emerald-500';
      case 'CASE_MANAGER':
        return 'from-orange-500 to-amber-500';
      case 'SPECIALIST':
        return 'from-pink-500 to-rose-500';
      case 'OTHER':
        return 'from-gray-500 to-slate-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Care Team</h2>
            <p className="text-gray-600 mt-1">
              Manage providers and external care team members
            </p>
          </div>
          <button
            onClick={() => setIsAddProviderOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center"
          >
            <span className="text-xl mr-2">+</span>
            Add Provider
          </button>
        </div>
      </div>

      {/* Care Team List */}
      {careTeam && careTeam.length > 0 ? (
        <div className="space-y-4">
          {careTeam.map((member) => {
            const providerName = member.providerType === 'INTERNAL' && member.provider
              ? `${member.provider.firstName} ${member.provider.lastName}, ${member.provider.title}`
              : member.externalProviderName || 'Unknown Provider';

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500 hover:shadow-2xl transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`h-12 w-12 bg-gradient-to-br ${getRoleColor(member.role)} rounded-full flex items-center justify-center shadow-lg text-2xl`}>
                        {getRoleIcon(member.role)}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{providerName}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-3 py-1 bg-gradient-to-r ${getRoleColor(member.role)} text-white text-xs font-bold rounded-full shadow-md`}>
                            {member.role.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-3 py-1 ${member.providerType === 'INTERNAL' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} text-white text-xs font-bold rounded-full shadow-md`}>
                            {member.providerType}
                          </span>
                          {member.hasROIConsent && (
                            <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-md">
                              ROI CONSENT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Provider Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* Internal Provider */}
                      {member.providerType === 'INTERNAL' && member.provider && (
                        <>
                          {member.provider.email && (
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600">Email:</span>
                              <p className="text-sm font-bold text-gray-900">{member.provider.email}</p>
                            </div>
                          )}
                          {member.provider.phone && (
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600">Phone:</span>
                              <p className="text-sm font-bold text-gray-900">{member.provider.phone}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* External Provider */}
                      {member.providerType === 'EXTERNAL' && (
                        <>
                          {member.externalProviderNPI && (
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600">NPI:</span>
                              <p className="text-sm font-bold text-gray-900">{member.externalProviderNPI}</p>
                            </div>
                          )}
                          {member.externalProviderPhone && (
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600">Phone:</span>
                              <p className="text-sm font-bold text-gray-900">{member.externalProviderPhone}</p>
                            </div>
                          )}
                          {member.externalProviderFax && (
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600">Fax:</span>
                              <p className="text-sm font-bold text-gray-900">{member.externalProviderFax}</p>
                            </div>
                          )}
                          {member.externalProviderEmail && (
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600">Email:</span>
                              <p className="text-sm font-bold text-gray-900">{member.externalProviderEmail}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Communication Preferences */}
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg mb-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Communication Permissions:</div>
                      <div className="flex flex-wrap gap-2">
                        <div className={`flex items-center text-sm ${member.canReceiveReports ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-1">{member.canReceiveReports ? '✓' : '✗'}</span>
                          Can Receive Reports
                        </div>
                        <div className={`flex items-center text-sm ${member.canReceiveUpdates ? 'text-green-700' : 'text-gray-400'}`}>
                          <span className="mr-1">{member.canReceiveUpdates ? '✓' : '✗'}</span>
                          Can Receive Updates
                        </div>
                        {member.preferredContactMethod && (
                          <div className="text-sm text-gray-700">
                            <span className="font-semibold">Preferred:</span> {member.preferredContactMethod}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ROI Info */}
                    {member.hasROIConsent && member.roiExpirationDate && (
                      <div className="p-3 bg-white rounded-lg border border-green-200 mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">ROI Expires:</span> {formatDate(member.roiExpirationDate)}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {member.notes && (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Notes:</span> {member.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleDeleteClick(member.id, providerName)}
                      disabled={deleteMutation.isPending}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">👨‍⚕️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Care Team Members</h3>
            <p className="text-gray-600">
              Add internal providers or external care team members to coordinate care.
            </p>
          </div>
        </div>
      )}

      {/* Add Provider Dialog */}
      <AddProviderDialog
        open={isAddProviderOpen}
        onClose={() => setIsAddProviderOpen(false)}
        clientId={clientId}
        onSuccess={() => {
          onRefetch();
          setIsAddProviderOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Remove Care Team Member"
        message={`Are you sure you want to remove ${deleteConfirm.name} from the care team?`}
        confirmText="Remove"
        confirmVariant="danger"
      />
    </div>
  );
}
