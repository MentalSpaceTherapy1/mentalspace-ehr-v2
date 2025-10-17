import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Assessment {
  id: string;
  assessmentName: string;
  assessmentType: string;
  description: string | null;
  assignedAt: string;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  score: number | null;
  interpretation: string | null;
}

export default function PortalAssessments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, [activeTab]);

  const fetchAssessments = async () => {
    try {
      setIsLoading(true);

      if (activeTab === 'pending') {
        const response = await axios.get('/api/v1/portal/assessments/pending');
        if (response.data.success) {
          setPendingAssessments(response.data.data);
        }
      } else {
        const response = await axios.get('/api/v1/portal/assessments/completed');
        if (response.data.success) {
          setCompletedAssessments(response.data.data);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load assessments');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentStart = (assessmentId: string) => {
    navigate(`/portal/assessments/${assessmentId}/take`);
  };

  const handleViewResults = (assessmentId: string) => {
    navigate(`/portal/assessments/${assessmentId}/results`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAssessmentIcon = (type: string) => {
    const icons: Record<string, string> = {
      PHQ9: '😔',
      GAD7: '😰',
      PCL5: '💭',
      BAI: '❤️',
      BDI: '🌤️',
      Custom: '📋',
    };
    return icons[type] || '📝';
  };

  const assessments = activeTab === 'pending' ? pendingAssessments : completedAssessments;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessments & Screenings</h1>
        <p className="text-gray-600">Complete mental health assessments and track your progress</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">About Assessments</h4>
            <p className="text-sm text-blue-800">
              These assessments help you and your therapist track your symptoms and progress over time. Results are
              shared with your therapist to inform your treatment plan.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending ({pendingAssessments.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'completed'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed ({completedAssessments.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'pending' ? 'No pending assessments' : 'No completed assessments'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'pending'
                  ? "You don't have any assessments to complete at this time."
                  : "You haven't completed any assessments yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Assessment Icon */}
                      <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center text-3xl">
                        {getAssessmentIcon(assessment.assessmentType)}
                      </div>

                      {/* Assessment Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{assessment.assessmentName}</h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              assessment.status
                            )}`}
                          >
                            {assessment.status}
                          </span>
                        </div>

                        {assessment.description && (
                          <p className="text-sm text-gray-600 mb-3">{assessment.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>Assigned {formatDate(assessment.assignedAt)}</span>
                          </div>
                          {assessment.dueDate && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span>Due {formatDate(assessment.dueDate)}</span>
                            </div>
                          )}
                        </div>

                        {/* Completed Assessment Score */}
                        {assessment.status === 'COMPLETED' && assessment.score !== null && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Score</span>
                              <span className="text-2xl font-bold text-indigo-600">{assessment.score}</span>
                            </div>
                            {assessment.interpretation && (
                              <p className="text-xs text-gray-600 mt-2">{assessment.interpretation}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      {assessment.status === 'COMPLETED' ? (
                        <button
                          onClick={() => handleViewResults(assessment.id)}
                          className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          View Results
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssessmentStart(assessment.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                          {assessment.status === 'IN_PROGRESS' ? 'Continue' : 'Start Assessment'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
