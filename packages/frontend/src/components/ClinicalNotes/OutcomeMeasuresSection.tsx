import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface OutcomeMeasure {
  id: string;
  measureType: string;
  totalScore: number;
  severity: string;
  severityLabel: string;
  administeredDate: string;
  administeredBy: {
    firstName: string;
    lastName: string;
    title?: string;
  };
}

interface OutcomeMeasuresSectionProps {
  clientId: string;
  clinicalNoteId?: string;
  sessionDate?: string;
}

export default function OutcomeMeasuresSection({
  clientId,
  clinicalNoteId,
  sessionDate,
}: OutcomeMeasuresSectionProps) {
  const navigate = useNavigate();
  const [measures, setMeasures] = useState<OutcomeMeasure[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadOutcomeMeasures();
    }
  }, [clientId, clinicalNoteId]);

  const loadOutcomeMeasures = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/outcome-measures/client/${clientId}?limit=5`);
      const allMeasures = res.data.data.measures || [];

      // Filter measures from the session date if provided
      let filteredMeasures = allMeasures;
      if (sessionDate) {
        const sessionDateObj = new Date(sessionDate);
        const sessionStart = new Date(sessionDateObj.setHours(0, 0, 0, 0));
        const sessionEnd = new Date(sessionDateObj.setHours(23, 59, 59, 999));

        filteredMeasures = allMeasures.filter((m: OutcomeMeasure) => {
          const measureDate = new Date(m.administeredDate);
          return measureDate >= sessionStart && measureDate <= sessionEnd;
        });
      }

      setMeasures(filteredMeasures);
    } catch (error) {
      console.error('Error loading outcome measures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'MINIMAL':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'MILD':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'MODERATE':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MODERATELY_SEVERE':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'SEVERE':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Loading outcome measures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Outcome Measures</h3>
          <p className="text-sm text-gray-600">
            {sessionDate ? 'Assessments from this session' : 'Recent assessments'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/clients/${clientId}/outcome-measures`)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          Administer Assessment
        </button>
      </div>

      {measures.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            {sessionDate
              ? 'No assessments administered during this session'
              : 'No outcome measures recorded yet'}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/clients/${clientId}/outcome-measures`)}
            className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Administer PHQ-9, GAD-7, or PCL-5 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {measures.map((measure) => (
            <div
              key={measure.id}
              className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-base font-semibold text-gray-900">
                      {measure.measureType}
                    </h4>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                        measure.severity
                      )}`}
                    >
                      {measure.severityLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Administered by {measure.administeredBy.firstName}{' '}
                    {measure.administeredBy.lastName}
                    {measure.administeredBy.title && `, ${measure.administeredBy.title}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(measure.administeredDate).toLocaleDateString()} at{' '}
                    {new Date(measure.administeredDate).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {measure.totalScore}
                  </div>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => navigate(`/clients/${clientId}/outcome-measures`)}
            className="w-full py-2 text-sm text-purple-600 hover:text-purple-800 font-medium hover:bg-purple-50 rounded-lg transition-colors"
          >
            View All Assessments & Progress →
          </button>
        </div>
      )}
    </div>
  );
}
