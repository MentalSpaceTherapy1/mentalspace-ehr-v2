import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface AssessmentResult {
  id: string;
  assessmentName: string;
  assessmentType: string;
  description: string | null;
  score: number | null;
  interpretation: string | null;
  completedAt: string | null;
  responses: Record<number, number>;
}

export default function PortalAssessmentResults() {
  const navigate = useNavigate();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [assessmentId]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/portal/assessments/${assessmentId}/results`);
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading results:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/portal/login');
      } else if (error.response?.status === 404) {
        toast.error('Assessment results not found');
        navigate('/portal/assessments');
      } else {
        toast.error('Failed to load results');
        navigate('/portal/assessments');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number | null, type: string): string => {
    if (score === null) return 'text-gray-600';

    switch (type) {
      case 'PHQ9':
        if (score <= 4) return 'text-green-600';
        if (score <= 9) return 'text-yellow-600';
        if (score <= 14) return 'text-orange-600';
        return 'text-red-600';
      case 'GAD7':
        if (score <= 4) return 'text-green-600';
        if (score <= 9) return 'text-yellow-600';
        if (score <= 14) return 'text-orange-600';
        return 'text-red-600';
      case 'PCL5':
        if (score < 31) return 'text-green-600';
        if (score <= 32) return 'text-yellow-600';
        return 'text-red-600';
      case 'PSS':
        if (score <= 13) return 'text-green-600';
        if (score <= 26) return 'text-yellow-600';
        return 'text-red-600';
      case 'AUDIT':
        if (score <= 7) return 'text-green-600';
        if (score <= 15) return 'text-yellow-600';
        if (score <= 19) return 'text-orange-600';
        return 'text-red-600';
      case 'DAST10':
        if (score === 0) return 'text-green-600';
        if (score <= 2) return 'text-yellow-600';
        if (score <= 5) return 'text-orange-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreBackground = (score: number | null, type: string): string => {
    if (score === null) return 'bg-gray-100';

    switch (type) {
      case 'PHQ9':
        if (score <= 4) return 'bg-green-100';
        if (score <= 9) return 'bg-yellow-100';
        if (score <= 14) return 'bg-orange-100';
        return 'bg-red-100';
      case 'GAD7':
        if (score <= 4) return 'bg-green-100';
        if (score <= 9) return 'bg-yellow-100';
        if (score <= 14) return 'bg-orange-100';
        return 'bg-red-100';
      case 'PCL5':
        if (score < 31) return 'bg-green-100';
        if (score <= 32) return 'bg-yellow-100';
        return 'bg-red-100';
      case 'PSS':
        if (score <= 13) return 'bg-green-100';
        if (score <= 26) return 'bg-yellow-100';
        return 'bg-red-100';
      case 'AUDIT':
        if (score <= 7) return 'bg-green-100';
        if (score <= 15) return 'bg-yellow-100';
        if (score <= 19) return 'bg-orange-100';
        return 'bg-red-100';
      case 'DAST10':
        if (score === 0) return 'bg-green-100';
        if (score <= 2) return 'bg-yellow-100';
        if (score <= 5) return 'bg-orange-100';
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getMaxScore = (type: string): number => {
    switch (type) {
      case 'PHQ9': return 27;
      case 'GAD7': return 21;
      case 'PCL5': return 80;
      case 'PSS': return 40;
      case 'AUDIT': return 40;
      case 'DAST10': return 10;
      default: return 100;
    }
  };

  const getAssessmentDescription = (type: string): string => {
    switch (type) {
      case 'PHQ9':
        return 'The PHQ-9 (Patient Health Questionnaire-9) is a validated screening tool for depression. It assesses the frequency of depressive symptoms over the past two weeks.';
      case 'GAD7':
        return 'The GAD-7 (Generalized Anxiety Disorder 7-item scale) is a screening tool for anxiety disorders. It measures the severity of generalized anxiety symptoms.';
      case 'PCL5':
        return 'The PCL-5 (PTSD Checklist for DSM-5) is a self-report measure that assesses the presence and severity of PTSD symptoms.';
      case 'PSS':
        return 'The PSS (Perceived Stress Scale) measures the degree to which situations in life are appraised as stressful during the past month.';
      case 'AUDIT':
        return 'The AUDIT (Alcohol Use Disorders Identification Test) is a screening tool for hazardous and harmful alcohol consumption.';
      case 'DAST10':
        return 'The DAST-10 (Drug Abuse Screening Test) is a brief self-report instrument for screening drug problems.';
      default:
        return 'This assessment helps your provider understand your current symptoms and experiences.';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Results Not Found</h2>
          <p className="text-gray-600 mb-4">This assessment has not been completed yet.</p>
          <button
            onClick={() => navigate('/portal/assessments')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const maxScore = getMaxScore(result.assessmentType);
  const scorePercentage = result.score !== null ? (result.score / maxScore) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{result.assessmentName}</h1>
              <p className="text-sm text-gray-500">{result.assessmentType}</p>
            </div>
            <button
              onClick={() => navigate('/portal/assessments')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {result.completedAt && (
            <p className="text-sm text-gray-500">
              Completed on {new Date(result.completedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        {/* Score Card */}
        <div className={`rounded-xl shadow-sm p-8 mb-6 ${getScoreBackground(result.score, result.assessmentType)}`}>
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Your Score</h2>
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.score, result.assessmentType)}`}>
              {result.score !== null ? result.score : 'N/A'}
            </div>
            <p className="text-gray-600 mb-4">out of {maxScore}</p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto bg-white rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  result.score !== null
                    ? getScoreColor(result.score, result.assessmentType).replace('text-', 'bg-')
                    : 'bg-gray-400'
                }`}
                style={{ width: `${scorePercentage}%` }}
              ></div>
            </div>

            {result.interpretation && (
              <div className={`inline-block px-4 py-2 rounded-full ${getScoreBackground(result.score, result.assessmentType)} border-2 ${getScoreColor(result.score, result.assessmentType).replace('text-', 'border-')}`}>
                <span className={`font-semibold ${getScoreColor(result.score, result.assessmentType)}`}>
                  {result.interpretation}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* What This Means */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">What This Assessment Measures</h3>
          <p className="text-gray-600 mb-4">{getAssessmentDescription(result.assessmentType)}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Important Note</h4>
                <p className="text-sm text-blue-700">
                  This screening result is not a diagnosis. Your therapist will review these results
                  with you and discuss what they mean for your treatment plan. If you have questions
                  or concerns about your results, please discuss them at your next appointment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interpretation Guide */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Ranges for {result.assessmentType}</h3>

          {result.assessmentType === 'PHQ9' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-sm font-medium text-green-700">0-4: Minimal depression</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm font-medium text-yellow-700">5-9: Mild depression</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                <span className="text-sm font-medium text-orange-700">10-14: Moderate depression</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-100">
                <span className="text-sm font-medium text-orange-800">15-19: Moderately severe depression</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm font-medium text-red-700">20-27: Severe depression</span>
              </div>
            </div>
          )}

          {result.assessmentType === 'GAD7' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-sm font-medium text-green-700">0-4: Minimal anxiety</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm font-medium text-yellow-700">5-9: Mild anxiety</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                <span className="text-sm font-medium text-orange-700">10-14: Moderate anxiety</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm font-medium text-red-700">15-21: Severe anxiety</span>
              </div>
            </div>
          )}

          {result.assessmentType === 'PCL5' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-sm font-medium text-green-700">0-30: PTSD unlikely</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm font-medium text-yellow-700">31-32: PTSD possible</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm font-medium text-red-700">33-80: PTSD probable</span>
              </div>
            </div>
          )}

          {result.assessmentType === 'PSS' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-sm font-medium text-green-700">0-13: Low stress</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm font-medium text-yellow-700">14-26: Moderate stress</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm font-medium text-red-700">27-40: High perceived stress</span>
              </div>
            </div>
          )}

          {result.assessmentType === 'AUDIT' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-sm font-medium text-green-700">0-7: Low risk</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm font-medium text-yellow-700">8-15: Hazardous/harmful use</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                <span className="text-sm font-medium text-orange-700">16-19: Harmful use</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm font-medium text-red-700">20-40: Possible dependence</span>
              </div>
            </div>
          )}

          {result.assessmentType === 'DAST10' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-sm font-medium text-green-700">0: No problems reported</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
                <span className="text-sm font-medium text-yellow-700">1-2: Low level</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                <span className="text-sm font-medium text-orange-700">3-5: Moderate level</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-100">
                <span className="text-sm font-medium text-orange-800">6-8: Substantial level</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-sm font-medium text-red-700">9-10: Severe level</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/portal/assessments')}
            className="px-6 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-100 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assessments
          </button>

          <button
            onClick={() => navigate('/portal/messages')}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Message Therapist
          </button>
        </div>
      </div>
    </div>
  );
}
