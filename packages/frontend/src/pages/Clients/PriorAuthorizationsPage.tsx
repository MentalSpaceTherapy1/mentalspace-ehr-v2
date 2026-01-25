import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import AuthorizationCard from '../../components/Clients/AuthorizationCard';
import AuthorizationForm from '../../components/Clients/AuthorizationForm';

interface PriorAuthorization {
  id: string;
  clientId: string;
  insuranceId: string;
  insurance: {
    id: string;
    payerName: string;
    rank: number;
  };
  authorizationNumber: string;
  authorizationType: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'EXHAUSTED';
  sessionsAuthorized: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  startDate: string;
  endDate: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  clinicalJustification?: string;
  requestingProviderId: string;
  requestingProvider?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastUsedDate?: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'EXHAUSTED';

export default function PriorAuthorizationsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<PriorAuthorization | null>(null);

  // Fetch authorizations
  const { data: authorizations, isLoading, error } = useQuery<PriorAuthorization[]>({
    queryKey: ['prior-authorizations', clientId],
    queryFn: async () => {
      const response = await api.get(`/prior-authorizations?clientId=${clientId}`);
      return response.data.data?.authorizations || response.data.authorizations || [];
    },
  });

  // Filter authorizations by status
  const filteredAuthorizations = authorizations?.filter(auth => {
    if (selectedStatus === 'ALL') return true;
    return auth.status === selectedStatus;
  }) || [];

  // Calculate statistics
  const totalAuthorizations = authorizations?.length || 0;
  const activeAuthorizations = authorizations?.filter(a => a.status === 'APPROVED').length || 0;
  const totalSessionsRemaining = authorizations
    ?.filter(a => a.status === 'APPROVED')
    .reduce((sum, a) => sum + a.sessionsRemaining, 0) || 0;
  const expiringCount = authorizations?.filter(a => {
    if (a.status !== 'APPROVED') return false;
    const daysUntilExpiration = Math.ceil((new Date(a.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  }).length || 0;
  const lowSessionsCount = authorizations?.filter(a => a.status === 'APPROVED' && a.sessionsRemaining < 5).length || 0;

  const handleEdit = (auth: PriorAuthorization) => {
    setEditingAuth(auth);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingAuth(null);
    setIsFormOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'from-green-500 to-emerald-500';
      case 'PENDING': return 'from-amber-500 to-orange-500';
      case 'DENIED': return 'from-red-500 to-rose-500';
      case 'EXPIRED': return 'from-gray-500 to-slate-500';
      case 'EXHAUSTED': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Prior Authorizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-2">Error Loading Authorizations</h2>
          <p>Unable to load prior authorizations. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-800">Prior Authorizations</h1>
          <button
            onClick={() => {
              setEditingAuth(null);
              setIsFormOpen(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center"
          >
            <span className="mr-2">+</span> New Authorization
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Total Authorizations</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{totalAuthorizations}</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Active Authorizations</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{activeAuthorizations}</p>
              </div>
              <div className="text-4xl">✓</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Sessions Remaining</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{totalSessionsRemaining}</p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Alerts</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{expiringCount + lowSessionsCount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {expiringCount} expiring, {lowSessionsCount} low
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-2xl shadow-xl p-4">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'APPROVED', 'PENDING', 'DENIED', 'EXPIRED', 'EXHAUSTED'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                  selectedStatus === status
                    ? `bg-gradient-to-r ${status === 'ALL' ? 'from-indigo-600 to-purple-600' : getStatusColor(status)} text-white shadow-lg`
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {status}
                {status !== 'ALL' && (
                  <span className="ml-2 px-2 py-0.5 bg-white/30 rounded-full text-xs">
                    {authorizations?.filter(a => a.status === status).length || 0}
                  </span>
                )}
                {status === 'ALL' && (
                  <span className="ml-2 px-2 py-0.5 bg-white/30 rounded-full text-xs">
                    {totalAuthorizations}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Authorization Form */}
      {isFormOpen && (
        <div className="mb-6">
          <AuthorizationForm
            clientId={clientId!}
            authorization={editingAuth}
            onClose={handleCloseForm}
          />
        </div>
      )}

      {/* Authorizations List */}
      {filteredAuthorizations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAuthorizations.map((auth) => (
            <AuthorizationCard
              key={auth.id}
              authorization={auth}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {selectedStatus === 'ALL' ? 'No Prior Authorizations' : `No ${selectedStatus} Authorizations`}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedStatus === 'ALL'
              ? 'Get started by creating a new prior authorization.'
              : `There are no authorizations with status ${selectedStatus}.`}
          </p>
          {selectedStatus === 'ALL' && (
            <button
              onClick={() => {
                setEditingAuth(null);
                setIsFormOpen(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
            >
              Create First Authorization
            </button>
          )}
        </div>
      )}
    </div>
  );
}
