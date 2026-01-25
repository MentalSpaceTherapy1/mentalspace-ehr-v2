/**
 * Treatment Plan Compliance Banner
 * Phase 5.x: Visual alert for treatment plan status
 *
 * Displays:
 * - Orange banner for upcoming treatment plans (within 30 days of expiry)
 * - Red banner for overdue treatment plans (past 90 days)
 * - Green banner for current treatment plans
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface TreatmentPlanStatus {
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

interface TreatmentPlanComplianceBannerProps {
  clientId: string;
  showWhenCurrent?: boolean;
  compact?: boolean;
  onCreateTreatmentPlan?: () => void;
}

export const TreatmentPlanComplianceBanner: React.FC<TreatmentPlanComplianceBannerProps> = ({
  clientId,
  showWhenCurrent = false,
  compact = false,
  onCreateTreatmentPlan,
}) => {
  const navigate = useNavigate();

  const { data: status, isLoading, error } = useQuery<TreatmentPlanStatus>({
    queryKey: ['treatment-plan-status', clientId],
    queryFn: async () => {
      const response = await api.get(`/treatment-plan-compliance/client/${clientId}`);
      return response.data.data;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return null;
  }

  if (error || !status) {
    return null;
  }

  // Don't show anything if current and showWhenCurrent is false
  if (status.status === 'CURRENT' && !showWhenCurrent) {
    return null;
  }

  const handleCreateTreatmentPlan = () => {
    if (onCreateTreatmentPlan) {
      onCreateTreatmentPlan();
    } else {
      navigate(`/clients/${clientId}/clinical-notes/new?noteType=Treatment%20Plan`);
    }
  };

  const getBannerConfig = () => {
    switch (status.status) {
      case 'OVERDUE':
        return {
          bgColor: 'bg-gradient-to-r from-red-50 to-red-100',
          borderColor: 'border-l-4 border-red-500',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          textColor: 'text-red-700',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          title: 'Treatment Plan Overdue',
          message: status.daysOverdue
            ? `Treatment plan is ${status.daysOverdue} days overdue. Clinical notes are blocked until the treatment plan is updated.`
            : 'No treatment plan exists. A treatment plan is required before clinical notes can be created.',
          urgent: true,
        };
      case 'NEVER':
        return {
          bgColor: 'bg-gradient-to-r from-red-50 to-red-100',
          borderColor: 'border-l-4 border-red-500',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          textColor: 'text-red-700',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          title: 'No Treatment Plan',
          message: 'This client does not have a treatment plan. Georgia Board requires a treatment plan before clinical notes can be created.',
          urgent: true,
        };
      case 'DUE_SOON':
        return {
          bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50',
          borderColor: 'border-l-4 border-orange-500',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-800',
          textColor: 'text-orange-700',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Treatment Plan Due Soon',
          message: `Treatment plan expires in ${status.daysUntilDue} days. Please review and update before the deadline.`,
          urgent: false,
        };
      case 'CURRENT':
        return {
          bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
          borderColor: 'border-l-4 border-green-500',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          textColor: 'text-green-700',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Treatment Plan Current',
          message: `Treatment plan is up to date. Next review due in ${status.daysUntilDue} days.`,
          urgent: false,
        };
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  if (compact) {
    return (
      <div className={`${config.bgColor} ${config.borderColor} px-4 py-2 rounded-r-lg shadow-sm flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={config.iconColor}>{config.icon}</span>
          <span className={`${config.titleColor} font-medium text-sm`}>{config.title}</span>
          {status.status === 'OVERDUE' && status.daysOverdue && (
            <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              {status.daysOverdue}d overdue
            </span>
          )}
          {status.status === 'DUE_SOON' && status.daysUntilDue && (
            <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              {status.daysUntilDue}d remaining
            </span>
          )}
        </div>
        {(status.status === 'OVERDUE' || status.status === 'NEVER' || status.status === 'DUE_SOON') && (
          <button
            onClick={handleCreateTreatmentPlan}
            className={`${config.buttonColor} text-white px-3 py-1 rounded text-xs font-medium transition-colors`}
          >
            {status.status === 'NEVER' ? 'Create Plan' : 'Update Plan'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${config.bgColor} ${config.borderColor} p-4 rounded-r-lg shadow-md`}>
      <div className="flex items-start gap-4">
        <div className={`${config.iconColor} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`${config.titleColor} font-semibold`}>{config.title}</h3>
            {config.urgent && (
              <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className={`${config.textColor} mt-1 text-sm`}>{config.message}</p>
          {status.lastTreatmentPlanDate && (
            <p className={`${config.textColor} mt-1 text-xs opacity-75`}>
              Last treatment plan: {new Date(status.lastTreatmentPlanDate).toLocaleDateString()}
            </p>
          )}
        </div>
        {(status.status === 'OVERDUE' || status.status === 'NEVER' || status.status === 'DUE_SOON') && (
          <button
            onClick={handleCreateTreatmentPlan}
            className={`${config.buttonColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0`}
          >
            {status.status === 'NEVER' ? 'Create Treatment Plan' : 'Update Treatment Plan'}
          </button>
        )}
      </div>
      {(status.status === 'OVERDUE' || status.status === 'NEVER') && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-red-700 text-xs flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Georgia Board requires treatment plans to be reviewed every 90 days. Clinical note creation is blocked until the treatment plan is updated.
          </p>
        </div>
      )}
    </div>
  );
};

export default TreatmentPlanComplianceBanner;
