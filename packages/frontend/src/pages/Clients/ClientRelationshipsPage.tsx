import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import FamilyTreeView from '../../components/Clients/FamilyTreeView';
import CareTeamManager from '../../components/Clients/CareTeamManager';
import AddRelationshipDialog from '../../components/Clients/AddRelationshipDialog';

type TabType = 'family' | 'care-team';

export default function ClientRelationshipsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('family');
  const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);

  // Fetch client data
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch family relationships
  const { data: relationships, isLoading: relationshipsLoading, refetch: refetchRelationships } = useQuery({
    queryKey: ['client-relationships', clientId],
    queryFn: async () => {
      const response = await api.get(`/client-relationships/client/${clientId}`);
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch care team
  const { data: careTeam, isLoading: careTeamLoading, refetch: refetchCareTeam } = useQuery({
    queryKey: ['care-team', clientId],
    queryFn: async () => {
      const response = await api.get(`/client-relationships/care-team/${clientId}`);
      return response.data.data;
    },
    enabled: !!clientId,
  });

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Client...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-2 flex items-center">
            <span className="mr-2">Warning</span> Client Not Found
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
          onClick={() => navigate(`/clients/${clientId}`)}
          className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
        >
          Back to Client Details
        </button>

        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-white/20 backdrop-blur-sm h-24 w-24 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-4xl">
                  {clientData.firstName.charAt(0)}
                  {clientData.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Relationships & Care Team
                </h1>
                <p className="text-indigo-100 text-lg">
                  {clientData.firstName} {clientData.lastName}
                </p>
                <p className="text-indigo-200">
                  MRN: <span className="font-mono font-bold">{clientData.medicalRecordNumber}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-2 inline-flex space-x-2">
          <button
            onClick={() => setActiveTab('family')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'family'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Family Relationships
          </button>
          <button
            onClick={() => setActiveTab('care-team')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'care-team'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Care Team
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'family' && (
        <div className="space-y-6">
          {/* Add Relationship Button */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Family Relationships</h2>
              <button
                onClick={() => setIsAddRelationshipOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center"
              >
                <span className="text-xl mr-2">+</span>
                Add Relationship
              </button>
            </div>
          </div>

          {/* Family Tree */}
          <FamilyTreeView
            clientId={clientId!}
            relationships={relationships || []}
            isLoading={relationshipsLoading}
            onRefetch={refetchRelationships}
          />
        </div>
      )}

      {activeTab === 'care-team' && (
        <CareTeamManager
          clientId={clientId!}
          careTeam={careTeam || []}
          isLoading={careTeamLoading}
          onRefetch={refetchCareTeam}
        />
      )}

      {/* Add Relationship Dialog */}
      <AddRelationshipDialog
        open={isAddRelationshipOpen}
        onClose={() => setIsAddRelationshipOpen(false)}
        clientId={clientId!}
        onSuccess={() => {
          refetchRelationships();
          setIsAddRelationshipOpen(false);
        }}
      />
    </div>
  );
}
