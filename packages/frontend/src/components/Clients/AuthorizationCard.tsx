import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import UseSessionDialog from './UseSessionDialog';
import RenewalDialog from './RenewalDialog';
import ConfirmModal from '../ConfirmModal';
import PAQuestionnaireForm from './PAQuestionnaireForm';

interface PriorAuthorization {
  id: string;
  clientId: string;
  insuranceId: string;
  insurance: {
    id: string;
    insuranceCompany: string;
    rank: string;
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

interface AuthorizationCardProps {
  authorization: PriorAuthorization;
  onEdit: (auth: PriorAuthorization) => void;
}

export default function AuthorizationCard({ authorization, onEdit }: AuthorizationCardProps) {
  const queryClient = useQueryClient();
  const [showUseSessionDialog, setShowUseSessionDialog] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/prior-authorizations/${authorization.id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prior-authorizations', authorization.clientId] });
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  // Calculate progress percentage
  const progressPercentage = (authorization.sessionsUsed / authorization.sessionsAuthorized) * 100;

  // Calculate days until expiration
  const daysUntilExpiration = Math.ceil((new Date(authorization.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Color coding for sessions remaining
  const getSessionsColor = () => {
    if (authorization.sessionsRemaining < 5) return 'text-red-600';
    if (authorization.sessionsRemaining < 10) return 'text-amber-600';
    return 'text-green-600';
  };

  const getProgressBarColor = () => {
    if (authorization.sessionsRemaining < 5) return 'from-red-500 to-rose-500';
    if (authorization.sessionsRemaining < 10) return 'from-amber-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  const getStatusBadgeColor = () => {
    switch (authorization.status) {
      case 'APPROVED': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'PENDING': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'DENIED': return 'bg-gradient-to-r from-red-500 to-rose-500';
      case 'EXPIRED': return 'bg-gradient-to-r from-gray-500 to-slate-500';
      case 'EXHAUSTED': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getExpirationWarning = () => {
    if (authorization.status !== 'APPROVED') return null;

    if (daysUntilExpiration <= 0) {
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
          <span>⚠️</span> Expired
        </div>
      );
    }

    if (daysUntilExpiration <= 7) {
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
          <span>⚠️</span> Expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
        </div>
      );
    }

    if (daysUntilExpiration <= 30) {
      return (
        <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold">
          <span>⚠️</span> Expires in {daysUntilExpiration} days
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500 transition-all duration-200 hover:shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-800">
                {authorization.authorizationNumber}
              </h3>
              <span className={`px-3 py-1 ${getStatusBadgeColor()} text-white text-sm font-bold rounded-full shadow-md`}>
                {authorization.status}
              </span>
            </div>
            <p className="text-gray-600 font-semibold">{authorization.insurance.insuranceCompany}</p>
            <p className="text-sm text-gray-500">{authorization.authorizationType}</p>
          </div>
        </div>

        {/* Sessions Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Sessions</span>
            <span className={`text-xl font-bold ${getSessionsColor()}`}>
              {authorization.sessionsRemaining} remaining
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${getProgressBarColor()} transition-all duration-500 shadow-lg`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{authorization.sessionsUsed} used</span>
            <span>{authorization.sessionsAuthorized} authorized</span>
          </div>
        </div>

        {/* Warnings */}
        {getExpirationWarning() && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-red-50 border-2 border-amber-300 rounded-xl">
            {getExpirationWarning()}
          </div>
        )}

        {authorization.sessionsRemaining < 5 && authorization.status === 'APPROVED' && (
          <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
              <span>⚠️</span> Low sessions remaining
            </div>
          </div>
        )}

        {/* Date Information */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl">
            <p className="text-xs font-semibold text-gray-600">Start Date</p>
            <p className="text-sm font-bold text-gray-900">
              {new Date(authorization.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl">
            <p className="text-xs font-semibold text-gray-600">End Date</p>
            <p className="text-sm font-bold text-gray-900">
              {new Date(authorization.endDate).toLocaleDateString()}
            </p>
          </div>
          {authorization.lastUsedDate && (
            <div className="col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl">
              <p className="text-xs font-semibold text-gray-600">Last Used</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date(authorization.lastUsedDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center"
        >
          {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Details
        </button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">CPT Codes</p>
              <div className="flex flex-wrap gap-2">
                {authorization.cptCodes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Diagnosis Codes</p>
              <div className="flex flex-wrap gap-2">
                {authorization.diagnosisCodes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
            {authorization.requestingProvider && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Requesting Provider</p>
                <p className="text-sm font-bold text-gray-900">
                  {authorization.requestingProvider.firstName} {authorization.requestingProvider.lastName}
                </p>
              </div>
            )}
            {authorization.clinicalJustification && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Clinical Justification</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {authorization.clinicalJustification}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {authorization.status === 'APPROVED' && authorization.sessionsRemaining > 0 && (
            <button
              onClick={() => setShowUseSessionDialog(true)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm"
            >
              Use Session
            </button>
          )}
          {(authorization.status === 'APPROVED' || authorization.status === 'EXHAUSTED' || authorization.status === 'EXPIRED') && (
            <button
              onClick={() => setShowRenewalDialog(true)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm"
            >
              Renew
            </button>
          )}
          <button
            onClick={() => setShowQuestionnaire(true)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm"
          >
            Questionnaire
          </button>
          <button
            onClick={() => onEdit(authorization)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Dialogs */}
      {showUseSessionDialog && (
        <UseSessionDialog
          authorization={authorization}
          onClose={() => setShowUseSessionDialog(false)}
        />
      )}

      {showRenewalDialog && (
        <RenewalDialog
          authorization={authorization}
          onClose={() => setShowRenewalDialog(false)}
        />
      )}

      {/* Clinical Questionnaire Form */}
      {showQuestionnaire && (
        <PAQuestionnaireForm
          priorAuthorizationId={authorization.id}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Authorization"
        message={`Are you sure you want to delete authorization ${authorization.authorizationNumber}?`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
}
