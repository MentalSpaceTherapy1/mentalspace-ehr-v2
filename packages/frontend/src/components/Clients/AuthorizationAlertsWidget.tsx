import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface PriorAuthorization {
  id: string;
  clientId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
  authorizationNumber: string;
  sessionsRemaining: number;
  endDate: string;
  insurance: {
    insuranceCompany: string;
  };
}

interface AuthorizationAlertsWidgetProps {
  expiringDays?: number;
  lowSessionThreshold?: number;
}

export default function AuthorizationAlertsWidget({
  expiringDays = 30,
  lowSessionThreshold = 5,
}: AuthorizationAlertsWidgetProps) {
  const navigate = useNavigate();

  // Fetch expiring authorizations
  const { data: expiringAuths, isLoading: loadingExpiring } = useQuery<PriorAuthorization[]>({
    queryKey: ['prior-authorizations', 'expiring', expiringDays],
    queryFn: async () => {
      const response = await api.get(`/prior-authorizations/expiring?days=${expiringDays}`);
      return response.data.data;
    },
  });

  // Fetch low session authorizations
  const { data: lowSessionAuths, isLoading: loadingLowSessions } = useQuery<PriorAuthorization[]>({
    queryKey: ['prior-authorizations', 'low-sessions', lowSessionThreshold],
    queryFn: async () => {
      const response = await api.get(`/prior-authorizations/low-sessions?threshold=${lowSessionThreshold}`);
      return response.data.data;
    },
  });

  const isLoading = loadingExpiring || loadingLowSessions;

  const getDaysUntilExpiration = (endDate: string) => {
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getPriorityColor = (daysUntilExpiration: number, sessionsRemaining: number) => {
    if (daysUntilExpiration <= 7 || sessionsRemaining <= 2) {
      return 'from-red-500 to-rose-500';
    }
    if (daysUntilExpiration <= 14 || sessionsRemaining <= 4) {
      return 'from-amber-500 to-orange-500';
    }
    return 'from-blue-500 to-cyan-500';
  };

  const getPriorityIcon = (daysUntilExpiration: number, sessionsRemaining: number) => {
    if (daysUntilExpiration <= 7 || sessionsRemaining <= 2) {
      return '🔴';
    }
    if (daysUntilExpiration <= 14 || sessionsRemaining <= 4) {
      return '🟡';
    }
    return '🔵';
  };

  const handleNavigateToClient = (clientId: string) => {
    navigate(`/clients/${clientId}?tab=authorizations`);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-amber-500">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      </div>
    );
  }

  const totalAlerts = (expiringAuths?.length || 0) + (lowSessionAuths?.length || 0);

  if (totalAlerts === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">✓</span> Authorization Alerts
          </h3>
          <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full">
            All Clear
          </span>
        </div>
        <div className="text-center py-4">
          <p className="text-gray-600">No authorization alerts at this time.</p>
          <p className="text-sm text-gray-500 mt-1">All authorizations are in good standing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-amber-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="mr-2">⚠️</span> Authorization Alerts
        </h3>
        <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full">
          {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {/* Expiring Authorizations */}
        {expiringAuths && expiringAuths.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
              <span className="mr-2">📅</span> Expiring Soon ({expiringAuths.length})
            </h4>
            <div className="space-y-2">
              {expiringAuths.map((auth) => {
                const daysLeft = getDaysUntilExpiration(auth.endDate);
                return (
                  <div
                    key={auth.id}
                    onClick={() => handleNavigateToClient(auth.clientId)}
                    className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl cursor-pointer hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {getPriorityIcon(daysLeft, auth.sessionsRemaining)}
                          </span>
                          <p className="font-bold text-gray-900">
                            {auth.client.firstName} {auth.client.lastName}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          MRN: {auth.client.medicalRecordNumber}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          Auth: {auth.authorizationNumber}
                        </p>
                        <p className="text-xs text-gray-600">
                          {auth.insurance.insuranceCompany}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          daysLeft <= 7 ? 'text-red-600' :
                          daysLeft <= 14 ? 'text-amber-600' :
                          'text-blue-600'
                        }`}>
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-500">until expiration</p>
                      </div>
                    </div>
                    <button
                      className="mt-2 w-full px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      View & Renew
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low Session Authorizations */}
        {lowSessionAuths && lowSessionAuths.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
              <span className="mr-2">🎯</span> Low Sessions ({lowSessionAuths.length})
            </h4>
            <div className="space-y-2">
              {lowSessionAuths.map((auth) => {
                const daysLeft = getDaysUntilExpiration(auth.endDate);
                return (
                  <div
                    key={auth.id}
                    onClick={() => handleNavigateToClient(auth.clientId)}
                    className="p-3 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl cursor-pointer hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {getPriorityIcon(daysLeft, auth.sessionsRemaining)}
                          </span>
                          <p className="font-bold text-gray-900">
                            {auth.client.firstName} {auth.client.lastName}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          MRN: {auth.client.medicalRecordNumber}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          Auth: {auth.authorizationNumber}
                        </p>
                        <p className="text-xs text-gray-600">
                          {auth.insurance.insuranceCompany}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          auth.sessionsRemaining <= 2 ? 'text-red-600' :
                          auth.sessionsRemaining <= 4 ? 'text-amber-600' :
                          'text-blue-600'
                        }`}>
                          {auth.sessionsRemaining}
                        </p>
                        <p className="text-xs text-gray-500">sessions left</p>
                      </div>
                    </div>
                    <button
                      className="mt-2 w-full px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold rounded-lg hover:from-red-600 hover:to-rose-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      View & Request More
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t-2 border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-2">Priority Levels:</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span>🔴</span>
            <span className="text-gray-600">Critical (7 days or 2 sessions)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🟡</span>
            <span className="text-gray-600">Warning (14 days or 4 sessions)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔵</span>
            <span className="text-gray-600">Attention Needed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
