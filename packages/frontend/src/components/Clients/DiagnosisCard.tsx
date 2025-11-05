import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface DiagnosisCardProps {
  diagnosis: {
    id: string;
    clientId: string;
    diagnosisType: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT' | 'HISTORICAL' | 'PROVISIONAL';
    icd10Code?: string;
    dsm5Code?: string;
    diagnosisName: string;
    diagnosisCategory?: string;
    severitySpecifier?: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
    courseSpecifier?: string;
    status: 'ACTIVE' | 'RESOLVED' | 'RULE_OUT_REJECTED';
    dateDiagnosed: string;
    onsetDate?: string;
    remissionDate?: string;
    dateResolved?: string;
    resolutionNotes?: string;
    supportingEvidence?: string;
    differentialConsiderations?: string;
    diagnosedBy: {
      id: string;
      firstName: string;
      lastName: string;
      title: string;
    };
    lastReviewedBy?: {
      id: string;
      firstName: string;
      lastName: string;
      title: string;
    };
    lastReviewedDate?: string;
  };
  onEdit: (diagnosis: any) => void;
  onDelete: (diagnosisId: string) => void;
}

export default function DiagnosisCard({ diagnosis, onEdit, onDelete }: DiagnosisCardProps) {
  const queryClient = useQueryClient();

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: 'ACTIVE' | 'RESOLVED' | 'RULE_OUT_REJECTED') => {
      const response = await api.patch(`/diagnoses/${diagnosis.id}/status`, {
        status: newStatus,
        dateResolved: newStatus === 'RESOLVED' ? new Date().toISOString() : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-diagnoses', diagnosis.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-diagnoses-stats', diagnosis.clientId] });
    },
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'RESOLVED':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'RULE_OUT_REJECTED':
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity?: string) => {
    switch (severity) {
      case 'MILD':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'MODERATE':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      case 'SEVERE':
        return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      case 'EXTREME':
        return 'bg-gradient-to-r from-red-600 to-rose-700 text-white';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'PRIMARY':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white';
      case 'SECONDARY':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'RULE_OUT':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'HISTORICAL':
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
      case 'PROVISIONAL':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStatusChange = (newStatus: 'ACTIVE' | 'RESOLVED' | 'RULE_OUT_REJECTED') => {
    if (newStatus === 'RESOLVED' || newStatus === 'RULE_OUT_REJECTED') {
      if (window.confirm(`Are you sure you want to mark this diagnosis as ${newStatus.replace('_', ' ')}?`)) {
        updateStatusMutation.mutate(newStatus);
      }
    } else {
      updateStatusMutation.mutate(newStatus);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getTypeBadgeColor(diagnosis.diagnosisType)}`}>
                {diagnosis.diagnosisType.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusBadgeColor(diagnosis.status)}`}>
                {diagnosis.status.replace('_', ' ')}
              </span>
              {diagnosis.severitySpecifier && (
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getSeverityBadgeColor(diagnosis.severitySpecifier)}`}>
                  {diagnosis.severitySpecifier}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">{diagnosis.diagnosisName}</h3>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Codes */}
        <div className="flex items-center space-x-4">
          {diagnosis.icd10Code && (
            <div className="bg-indigo-50 px-3 py-2 rounded-lg">
              <span className="text-xs font-bold text-indigo-600">ICD-10:</span>
              <span className="ml-2 text-sm font-semibold text-gray-800">{diagnosis.icd10Code}</span>
            </div>
          )}
          {diagnosis.dsm5Code && (
            <div className="bg-purple-50 px-3 py-2 rounded-lg">
              <span className="text-xs font-bold text-purple-600">DSM-5:</span>
              <span className="ml-2 text-sm font-semibold text-gray-800">{diagnosis.dsm5Code}</span>
            </div>
          )}
        </div>

        {/* Category */}
        {diagnosis.diagnosisCategory && (
          <div className="flex items-center">
            <span className="text-xs font-bold text-gray-600 mr-2">Category:</span>
            <span className="text-sm text-gray-800">{diagnosis.diagnosisCategory}</span>
          </div>
        )}

        {/* Course Specifier */}
        {diagnosis.courseSpecifier && (
          <div className="flex items-center">
            <span className="text-xs font-bold text-gray-600 mr-2">Course:</span>
            <span className="text-sm text-gray-800">{diagnosis.courseSpecifier}</span>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-xs font-bold text-gray-600 block">Diagnosed</span>
            <span className="text-gray-800">{formatDate(diagnosis.dateDiagnosed)}</span>
          </div>
          {diagnosis.onsetDate && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-xs font-bold text-gray-600 block">Onset</span>
              <span className="text-gray-800">{formatDate(diagnosis.onsetDate)}</span>
            </div>
          )}
          {diagnosis.dateResolved && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-xs font-bold text-gray-600 block">Resolved</span>
              <span className="text-gray-800">{formatDate(diagnosis.dateResolved)}</span>
            </div>
          )}
          {diagnosis.remissionDate && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-xs font-bold text-gray-600 block">Remission</span>
              <span className="text-gray-800">{formatDate(diagnosis.remissionDate)}</span>
            </div>
          )}
        </div>

        {/* Provider Info */}
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-600">
            <span className="font-bold">Diagnosed by:</span>{' '}
            <span className="text-gray-800">
              {diagnosis.diagnosedBy.firstName} {diagnosis.diagnosedBy.lastName}, {diagnosis.diagnosedBy.title}
            </span>
          </div>
          {diagnosis.lastReviewedBy && (
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-bold">Last reviewed by:</span>{' '}
              <span className="text-gray-800">
                {diagnosis.lastReviewedBy.firstName} {diagnosis.lastReviewedBy.lastName}
              </span>
              {diagnosis.lastReviewedDate && (
                <span className="text-gray-600 ml-1">
                  on {formatDate(diagnosis.lastReviewedDate)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Supporting Evidence (collapsed) */}
        {diagnosis.supportingEvidence && (
          <details className="bg-blue-50 p-3 rounded-lg">
            <summary className="text-xs font-bold text-blue-700 cursor-pointer">
              Supporting Evidence
            </summary>
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
              {diagnosis.supportingEvidence}
            </p>
          </details>
        )}

        {/* Differential Considerations (collapsed) */}
        {diagnosis.differentialConsiderations && (
          <details className="bg-amber-50 p-3 rounded-lg">
            <summary className="text-xs font-bold text-amber-700 cursor-pointer">
              Differential Considerations
            </summary>
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
              {diagnosis.differentialConsiderations}
            </p>
          </details>
        )}

        {/* Resolution Notes (if resolved) */}
        {diagnosis.resolutionNotes && (
          <div className="bg-green-50 p-3 rounded-lg">
            <span className="text-xs font-bold text-green-700 block mb-1">Resolution Notes:</span>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {diagnosis.resolutionNotes}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
        {/* Status Quick Actions */}
        <div className="flex space-x-2">
          {diagnosis.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={updateStatusMutation.isPending}
                className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs rounded-lg hover:shadow-md transition-all duration-200 font-semibold disabled:opacity-50"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleStatusChange('RULE_OUT_REJECTED')}
                disabled={updateStatusMutation.isPending}
                className="px-3 py-1 bg-gradient-to-r from-gray-500 to-slate-500 text-white text-xs rounded-lg hover:shadow-md transition-all duration-200 font-semibold disabled:opacity-50"
              >
                Reject Rule-Out
              </button>
            </>
          )}
          {diagnosis.status === 'RESOLVED' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              disabled={updateStatusMutation.isPending}
              className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-lg hover:shadow-md transition-all duration-200 font-semibold disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
        </div>

        {/* Edit/Delete Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(diagnosis)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm rounded-lg hover:shadow-md transition-all duration-200 font-semibold"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(diagnosis.id)}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm rounded-lg hover:shadow-md transition-all duration-200 font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
