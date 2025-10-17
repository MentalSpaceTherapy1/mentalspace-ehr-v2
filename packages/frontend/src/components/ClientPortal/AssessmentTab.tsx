import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as assessmentApi from '../../lib/assessmentApi';

interface AssessmentTabProps {
  clientId: string;
}

export default function AssessmentTab({ clientId }: AssessmentTabProps) {
  const queryClient = useQueryClient();

  // Assessment assignment state
  const [selectedAssessmentType, setSelectedAssessmentType] =
    useState<assessmentApi.AssessmentType | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');

  // Fetch client assessments
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['clientAssessments', clientId],
    queryFn: () => assessmentApi.getClientAssessments(clientId),
  });

  // Separate pending and completed assessments
  const pendingAssessments = assessments.filter((a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS');
  const completedAssessments = assessments.filter((a) => a.status === 'COMPLETED');

  // Assign assessment mutation
  const assignAssessmentMutation = useMutation({
    mutationFn: (data: assessmentApi.AssignAssessmentRequest) =>
      assessmentApi.assignAssessmentToClient(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientAssessments', clientId] });
      setSelectedAssessmentType('');
      setDueDate('');
      setInstructions('');
      alert('Assessment assigned successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to assign assessment');
    },
  });

  // Remove assessment mutation
  const removeAssessmentMutation = useMutation({
    mutationFn: (assessmentId: string) =>
      assessmentApi.removeAssessmentAssignment(clientId, assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientAssessments', clientId] });
      alert('Assessment removed successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to remove assessment');
    },
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: (assessmentId: string) =>
      assessmentApi.sendAssessmentReminder(clientId, assessmentId),
    onSuccess: () => {
      alert('Reminder sent successfully!');
    },
    onError: () => {
      alert('Failed to send reminder');
    },
  });

  const handleAssignAssessment = () => {
    if (!selectedAssessmentType) {
      alert('Please select an assessment type');
      return;
    }

    const assessmentInfo = assessmentApi.ASSESSMENT_TYPES[selectedAssessmentType];

    assignAssessmentMutation.mutate({
      assessmentType: selectedAssessmentType,
      assessmentName: assessmentInfo.name,
      description: assessmentInfo.description,
      dueDate: dueDate || undefined,
      instructions: instructions || undefined,
    });
  };

  const handleQuickAssign = (type: assessmentApi.AssessmentType) => {
    const assessmentInfo = assessmentApi.ASSESSMENT_TYPES[type];

    assignAssessmentMutation.mutate({
      assessmentType: type,
      assessmentName: assessmentInfo.name,
      description: assessmentInfo.description,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'COMPLETED':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get selected assessment info
  const selectedAssessmentInfo = selectedAssessmentType
    ? assessmentApi.ASSESSMENT_TYPES[selectedAssessmentType]
    : null;

  return (
    <div className="space-y-6">
      {/* Assessments Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
        <h2 className="text-3xl font-bold mb-2 flex items-center">
          <span className="mr-3">📋</span> Assessment Assignments
        </h2>
        <p className="text-violet-100">
          Assign standardized assessments (PHQ-9, GAD-7, PCL-5, etc.) to track client progress
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Assign New Assessment */}
        <div className="space-y-6">
          {/* Assign Assessment Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-violet-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">➕</span> Assign New Assessment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Assessment Type
                </label>
                <select
                  value={selectedAssessmentType}
                  onChange={(e) =>
                    setSelectedAssessmentType(e.target.value as assessmentApi.AssessmentType | '')
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                >
                  <option value="">Choose an assessment...</option>
                  {Object.entries(assessmentApi.ASSESSMENT_TYPES).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssessmentInfo && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border-2 border-violet-200">
                  <h4 className="font-bold text-gray-800 mb-2">{selectedAssessmentInfo.fullName}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Purpose:</strong> {selectedAssessmentInfo.purpose}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Questions:</strong> {selectedAssessmentInfo.questions} items
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Scoring:</strong> {selectedAssessmentInfo.scoringRange}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Instructions for Client
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Optional instructions or context..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                ></textarea>
              </div>

              <button
                onClick={handleAssignAssessment}
                disabled={assignAssessmentMutation.isPending}
                className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
              >
                {assignAssessmentMutation.isPending ? 'Assigning...' : 'Assign Assessment'}
              </button>
            </div>
          </div>

          {/* Assessment Library */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📚</span> Assessment Library
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(assessmentApi.ASSESSMENT_TYPES).map(([key, info]) => (
                <div
                  key={key}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{info.name}</h4>
                      <p className="text-xs text-gray-600">{info.description}</p>
                    </div>
                    <button
                      onClick={() => handleQuickAssign(key as assessmentApi.AssessmentType)}
                      disabled={assignAssessmentMutation.isPending}
                      className="px-3 py-1 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Assigned Assessments & Results */}
        <div className="space-y-6">
          {/* Pending Assessments */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-amber-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">⏳</span> Pending Assessments
            </h3>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                </div>
              ) : pendingAssessments.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>No pending assessments</p>
                </div>
              ) : (
                pendingAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-1">
                          {assessment.assessmentName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Assigned: {new Date(assessment.assignedAt).toLocaleDateString()}
                        </p>
                        {assessment.dueDate && (
                          <p className="text-sm text-gray-600">
                            Due: {new Date(assessment.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 ${getStatusBadgeColor(
                          assessment.status
                        )} text-white text-xs font-bold rounded-full`}
                      >
                        {assessment.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => sendReminderMutation.mutate(assessment.id)}
                        disabled={sendReminderMutation.isPending}
                        className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        Send Reminder
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to remove this assessment?')) {
                            removeAssessmentMutation.mutate(assessment.id);
                          }
                        }}
                        disabled={removeAssessmentMutation.isPending}
                        className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Assessments */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">✅</span> Completed Assessments
            </h3>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
              ) : completedAssessments.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>No completed assessments yet</p>
                </div>
              ) : (
                completedAssessments.map((assessment) => {
                  const severityColor = assessment.score
                    ? assessmentApi.getSeverityColor(assessment.assessmentType, assessment.score)
                    : 'text-gray-600';

                  return (
                    <div
                      key={assessment.id}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 mb-1">
                            {assessment.assessmentName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Completed: {assessment.completedAt && new Date(assessment.completedAt).toLocaleDateString()}
                          </p>
                          {assessment.score !== undefined && (
                            <p className={`text-sm font-bold ${severityColor} mt-1`}>
                              Score: {assessment.score} ({assessment.interpretation})
                            </p>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                          COMPLETED
                        </span>
                      </div>
                      {assessment.interpretation && (
                        <div className="mt-3 bg-white p-3 rounded-lg border border-green-300">
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            Clinical Interpretation:
                          </p>
                          <p className="text-xs text-gray-600">{assessment.interpretation}</p>
                        </div>
                      )}
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => {
                            alert('View details feature coming soon!');
                          }}
                          className="px-3 py-1 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            alert('Export PDF feature coming soon!');
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
