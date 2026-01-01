import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import EmergencyContacts from '../../components/EmergencyContacts';
import InsuranceInfo from '../../components/InsuranceInfo';
import Guardians from '../../components/Guardians';
import ClinicalNotesList from '../../components/ClinicalNotes/ClinicalNotesList';
import AppointmentsTab from '../../components/Appointments/AppointmentsTab';
import PortalTab from '../../components/ClientPortal/PortalTab';
import AssessmentTab from '../../components/ClientPortal/AssessmentTab';
import { PatientSyncSection } from '../../components/AdvancedMD';

export default function ClientDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'demographics' | 'appointments' | 'clinical-notes' | 'diagnoses' | 'portal' | 'assessments'>('demographics');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Fetch client data
  const { data: clientData, isLoading, error } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const response = await api.get(`/clients/${id}`);
      return response.data.data;
    },
  });

  const client = clientData;

  // Deactivate client mutation
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/clients/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deactivated successfully');
      setShowDeactivateModal(false);
    },
    onError: (error: any) => {
      console.error('Failed to deactivate client:', error);
      toast.error(error.response?.data?.error || 'Failed to deactivate client');
    },
  });

  const handleDeactivate = () => {
    setShowDeactivateModal(true);
  };

  const confirmDeactivate = () => {
    deactivateMutation.mutate();
  };

  const formatDOB = (value: Date | string) => {
    // Treat DOB as date-only to avoid timezone shifting
    const iso = typeof value === 'string' ? value : value.toISOString();
    const [year, month, day] = iso.split('T')[0].split('-');
    return `${month}/${day}/${year}`;
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg';
      case 'INACTIVE':
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg';
      case 'DISCHARGED':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg';
      case 'DECEASED':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Client...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-2 flex items-center">
            <span className="mr-2">⚠️</span> Client Not Found
          </h2>
          <p>The requested client could not be found.</p>
          <button
            onClick={() => navigate('/clients')}
            className="mt-4 px-6 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/clients')}
          className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
        >
          ← Back to Clients
        </button>

        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-white/20 backdrop-blur-sm h-24 w-24 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-4xl">
                  {client.firstName.charAt(0)}
                  {client.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {client.firstName} {client.middleName && `${client.middleName} `}
                  {client.lastName}
                  {client.suffix && `, ${client.suffix}`}
                </h1>
                {client.preferredName && (
                  <p className="text-indigo-100 text-lg mb-1">Preferred: {client.preferredName}</p>
                )}
                <p className="text-indigo-200">
                  MRN: <span className="font-mono font-bold">{client.medicalRecordNumber}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getStatusBadgeColor(client.status)}`}>
                {client.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-2 inline-flex space-x-2">
          <button
            onClick={() => setActiveTab('demographics')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'demographics'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'appointments'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('clinical-notes')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'clinical-notes'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Clinical Notes
          </button>
          <button
            onClick={() => setActiveTab('diagnoses')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'diagnoses'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Diagnoses
          </button>
          <button
            onClick={() => setActiveTab('portal')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'portal'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Portal
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'assessments'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Assessments
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
          {/* Demographics */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📊</span> Demographics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Date of Birth</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {formatDOB(client.dateOfBirth)} (Age {calculateAge(client.dateOfBirth)})
                </dd>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Legal Sex</dt>
                <dd className="text-base font-semibold text-gray-900">{client.gender}</dd>
              </div>
              {client.genderIdentity && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">Gender Identity</dt>
                  <dd className="text-base font-semibold text-gray-900">{client.genderIdentity}</dd>
                </div>
              )}
              {client.pronouns && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">Pronouns</dt>
                  <dd className="text-base font-semibold text-gray-900">{client.pronouns}</dd>
                </div>
              )}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Marital Status</dt>
                <dd className="text-base font-semibold text-gray-900">{client.maritalStatus}</dd>
              </div>
              {client.ethnicity && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">Ethnicity</dt>
                  <dd className="text-base font-semibold text-gray-900">{client.ethnicity}</dd>
                </div>
              )}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Primary Language</dt>
                <dd className="text-base font-semibold text-gray-900">{client.primaryLanguage}</dd>
              </div>
              {client.needsInterpreter && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                  <dt className="text-sm font-bold text-amber-700 mb-1">🌐 Interpreter Needed</dt>
                  <dd className="text-base font-semibold text-amber-900">{client.interpreterLanguage}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-purple-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📱</span> Contact Information
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Primary Phone</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {client.primaryPhone} ({client.primaryPhoneType})
                </dd>
              </div>
              {client.secondaryPhone && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">Secondary Phone</dt>
                  <dd className="text-base font-semibold text-gray-900">
                    {client.secondaryPhone} ({client.secondaryPhoneType})
                  </dd>
                </div>
              )}
              {client.email && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">Email</dt>
                  <dd className="text-base font-semibold text-gray-900">{client.email}</dd>
                </div>
              )}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Preferred Contact</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {client.preferredContactMethod}
                  {client.okayToLeaveMessage && ' • OK to leave message'}
                </dd>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-cyan-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🏠</span> Address
            </h2>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl">
              <p className="text-base font-semibold text-gray-900">{client.addressStreet1}</p>
              {client.addressStreet2 && (
                <p className="text-base font-semibold text-gray-900">{client.addressStreet2}</p>
              )}
              <p className="text-base font-semibold text-gray-900">
                {client.addressCity}, {client.addressState} {client.addressZipCode}
              </p>
              {client.addressCounty && (
                <p className="text-sm text-gray-600 mt-1">{client.addressCounty} County</p>
              )}
            </div>
          </div>

          {/* Social Information */}
          {(client.education || client.employmentStatus || client.occupation || client.livingArrangement || client.housingStatus) && (
            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-amber-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">🏢</span> Social Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {client.education && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                    <dt className="text-sm font-bold text-gray-600 mb-1">Education</dt>
                    <dd className="text-base font-semibold text-gray-900">{client.education}</dd>
                  </div>
                )}
                {client.employmentStatus && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                    <dt className="text-sm font-bold text-gray-600 mb-1">Employment</dt>
                    <dd className="text-base font-semibold text-gray-900">{client.employmentStatus}</dd>
                  </div>
                )}
                {client.occupation && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                    <dt className="text-sm font-bold text-gray-600 mb-1">Occupation</dt>
                    <dd className="text-base font-semibold text-gray-900">{client.occupation}</dd>
                  </div>
                )}
                {client.livingArrangement && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                    <dt className="text-sm font-bold text-gray-600 mb-1">Living Arrangement</dt>
                    <dd className="text-base font-semibold text-gray-900">{client.livingArrangement}</dd>
                  </div>
                )}
                {client.housingStatus && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                    <dt className="text-sm font-bold text-gray-600 mb-1">Housing Status</dt>
                    <dd className="text-base font-semibold text-gray-900">{client.housingStatus}</dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legal Guardians */}
          <Guardians clientId={id!} />

          {/* Emergency Contacts */}
          <EmergencyContacts clientId={id!} />

          {/* Insurance Information */}
          <InsuranceInfo clientId={id!} />
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">⚡</span> Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/clients/${id}/notes/create`)}
                className="w-full px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                <span className="mr-2">📝</span> New Clinical Note
              </button>
              <button
                onClick={() => navigate(`/clients/${id}/edit`)}
                className="w-full px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                <span className="mr-2">✏️</span> Edit Client
              </button>
              {client.status === 'ACTIVE' && (
                <button
                  onClick={handleDeactivate}
                  disabled={deactivateMutation.isPending}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center disabled:opacity-50"
                >
                  <span className="mr-2">⏸️</span> Deactivate Client
                </button>
              )}
            </div>
          </div>

          {/* Clinical Assignment */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">👨‍⚕️</span> Clinical Team
            </h3>
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Primary Therapist</dt>
                <dd className="text-base font-semibold text-gray-900">
                  {client.primaryTherapist.firstName} {client.primaryTherapist.lastName}, {client.primaryTherapist.title}
                </dd>
                {client.primaryTherapist.email && (
                  <dd className="text-xs text-gray-600 mt-1">{client.primaryTherapist.email}</dd>
                )}
              </div>
            </div>
          </div>

          {/* AdvancedMD Integration */}
          <PatientSyncSection clientId={id!} />

          {/* System Information */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">ℹ️</span> System Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(client.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {client.statusDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status Date:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(client.statusDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'appointments' && <AppointmentsTab clientId={id!} />}

      {activeTab === 'clinical-notes' && (
        <div>
          <ClinicalNotesList clientId={id!} />
        </div>
      )}

      {activeTab === 'diagnoses' && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Client Diagnoses</h2>
            <button
              onClick={() => navigate(`/clients/${id}/diagnoses`)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Manage Diagnoses
            </button>
          </div>
          <p className="text-gray-600">
            Click "Manage Diagnoses" to view and edit this client's diagnosis history.
          </p>
        </div>
      )}

      {activeTab === 'portal' && <PortalTab clientId={id!} />}

      {activeTab === 'assessments' && <AssessmentTab clientId={id!} />}

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={confirmDeactivate}
        title="Deactivate Client"
        message={`Are you sure you want to deactivate ${client?.firstName} ${client?.lastName}? This will mark the client as inactive.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        icon="warning"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}

