/**
 * Treatment Plan Compliance Dashboard Widget
 * Phase 5.x: Dashboard widget showing treatment plan compliance status
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface ClientStatus {
  clientId: string;
  clientName: string;
  medicalRecordNumber: string;
  status: 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'NEVER';
  lastTreatmentPlanDate: string | null;
  daysSincePlan: number | null;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  clinicianId: string;
  clinicianName: string;
}

interface ComplianceSummary {
  current: number;
  dueSoon: number;
  overdue: number;
  never: number;
  total: number;
  complianceRate: number;
}

interface DashboardData {
  summary: ComplianceSummary;
  overdueClients: ClientStatus[];
  dueSoonClients: ClientStatus[];
}

interface TreatmentPlanComplianceWidgetProps {
  clinicianId?: string;
  compact?: boolean;
}

export const TreatmentPlanComplianceWidget: React.FC<TreatmentPlanComplianceWidgetProps> = ({
  clinicianId,
  compact = false,
}) => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['treatment-plan-compliance-dashboard', clinicianId],
    queryFn: async () => {
      const params = clinicianId ? `?clinicianId=${clinicianId}` : '';
      const response = await api.get(`/treatment-plan-compliance/dashboard${params}`);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-red-600">
        Failed to load treatment plan compliance data
      </div>
    );
  }

  const { summary, overdueClients, dueSoonClients } = data;
  const hasIssues = summary.overdue > 0 || summary.never > 0 || summary.dueSoon > 0;

  if (compact) {
    return (
      <div className={`rounded-lg shadow p-4 ${hasIssues ? 'bg-gradient-to-r from-red-50 to-orange-50' : 'bg-green-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Treatment Plans
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            summary.complianceRate >= 95 ? 'bg-green-100 text-green-800' :
            summary.complianceRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {summary.complianceRate}% Compliant
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="bg-red-100 rounded p-2">
            <div className="text-red-700 font-bold text-lg">{summary.overdue + summary.never}</div>
            <div className="text-red-600 text-xs">Overdue</div>
          </div>
          <div className="bg-orange-100 rounded p-2">
            <div className="text-orange-700 font-bold text-lg">{summary.dueSoon}</div>
            <div className="text-orange-600 text-xs">Due Soon</div>
          </div>
          <div className="bg-green-100 rounded p-2">
            <div className="text-green-700 font-bold text-lg">{summary.current}</div>
            <div className="text-green-600 text-xs">Current</div>
          </div>
          <div className="bg-gray-100 rounded p-2">
            <div className="text-gray-700 font-bold text-lg">{summary.total}</div>
            <div className="text-gray-600 text-xs">Total</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${hasIssues ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Treatment Plan Compliance</h3>
              <p className="text-sm opacity-80">90-day review requirement (Georgia Board)</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{summary.complianceRate}%</div>
            <div className="text-sm opacity-80">Compliance Rate</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b">
        <div className="p-4 text-center hover:bg-red-50 transition-colors cursor-pointer"
             onClick={() => navigate('/clinical-notes?filter=overdue-treatment-plans')}>
          <div className="text-2xl font-bold text-red-600">{summary.overdue + summary.never}</div>
          <div className="text-xs text-gray-500 mt-1">Overdue / Never</div>
          {(summary.overdue + summary.never) > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                Action Required
              </span>
            </div>
          )}
        </div>
        <div className="p-4 text-center hover:bg-orange-50 transition-colors cursor-pointer"
             onClick={() => navigate('/clinical-notes?filter=due-soon-treatment-plans')}>
          <div className="text-2xl font-bold text-orange-600">{summary.dueSoon}</div>
          <div className="text-xs text-gray-500 mt-1">Due Soon</div>
          {summary.dueSoon > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Within 30 Days
              </span>
            </div>
          )}
        </div>
        <div className="p-4 text-center hover:bg-green-50 transition-colors">
          <div className="text-2xl font-bold text-green-600">{summary.current}</div>
          <div className="text-xs text-gray-500 mt-1">Current</div>
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Up to Date
            </span>
          </div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{summary.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Clients</div>
        </div>
      </div>

      {/* Overdue Clients List */}
      {overdueClients.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Overdue Treatment Plans
          </h4>
          <div className="space-y-2">
            {overdueClients.slice(0, 5).map((client) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between bg-red-50 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => navigate(`/clients/${client.clientId}`)}
              >
                <div>
                  <div className="font-medium text-gray-900">{client.clientName}</div>
                  <div className="text-xs text-gray-500">MRN: {client.medicalRecordNumber}</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-800">
                    {client.status === 'NEVER' ? 'No Plan' : `${client.daysOverdue}d overdue`}
                  </span>
                </div>
              </div>
            ))}
            {overdueClients.length > 5 && (
              <button
                onClick={() => navigate('/clinical-notes?filter=overdue-treatment-plans')}
                className="w-full text-center text-sm text-red-600 hover:text-red-800 py-2"
              >
                View all {overdueClients.length} overdue clients
              </button>
            )}
          </div>
        </div>
      )}

      {/* Due Soon Clients List */}
      {dueSoonClients.length > 0 && (
        <div className="p-4">
          <h4 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Due Within 30 Days
          </h4>
          <div className="space-y-2">
            {dueSoonClients.slice(0, 3).map((client) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between bg-orange-50 rounded-lg p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => navigate(`/clients/${client.clientId}`)}
              >
                <div>
                  <div className="font-medium text-gray-900">{client.clientName}</div>
                  <div className="text-xs text-gray-500">MRN: {client.medicalRecordNumber}</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-200 text-orange-800">
                    {client.daysUntilDue}d remaining
                  </span>
                </div>
              </div>
            ))}
            {dueSoonClients.length > 3 && (
              <button
                onClick={() => navigate('/clinical-notes?filter=due-soon-treatment-plans')}
                className="w-full text-center text-sm text-orange-600 hover:text-orange-800 py-2"
              >
                View all {dueSoonClients.length} clients
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Good State */}
      {!hasIssues && (
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900">All Treatment Plans Current</h4>
          <p className="text-sm text-gray-500 mt-1">No action required at this time</p>
        </div>
      )}
    </div>
  );
};

export default TreatmentPlanComplianceWidget;
