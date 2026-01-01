import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Plus,
  Check,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  medicalRecordNumber: string;
}

interface QuestionnaireQuestion {
  id: string;
  text: string;
}

interface QuestionnaireDefinition {
  type: 'PHQ9' | 'GAD7' | 'PCL5';
  name: string;
  description: string;
  questions: QuestionnaireQuestion[];
  scoringInfo: {
    minScore: number;
    maxScore: number;
    severityRanges: { min: number; max: number; severity: string; label: string }[];
  };
}

const MEASURE_TYPES = [
  {
    type: 'PHQ9',
    name: 'PHQ-9',
    description: 'Patient Health Questionnaire - Depression screening',
    color: 'blue',
  },
  {
    type: 'GAD7',
    name: 'GAD-7',
    description: 'Generalized Anxiety Disorder - Anxiety screening',
    color: 'purple',
  },
  {
    type: 'PCL5',
    name: 'PCL-5',
    description: 'PTSD Checklist - Trauma screening',
    color: 'orange',
  },
];

const AssignMeasures: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  // Fetch clients assigned to this clinician
  const {
    data: clients,
    isLoading: loadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['assignedClients', currentUser?.id, searchTerm],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      let url = `/clients?therapistId=${currentUser.id}&status=ACTIVE`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const response = await api.get(url);
      return response.data.data || [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch questionnaire definition when a measure type is selected
  const { data: questionnaire, isLoading: loadingQuestionnaire } = useQuery<QuestionnaireDefinition>({
    queryKey: ['questionnaire', selectedMeasure],
    queryFn: async () => {
      const response = await api.get(`/outcome-measures/questionnaire/${selectedMeasure}`);
      return response.data.data;
    },
    enabled: !!selectedMeasure && showQuestionnaire,
  });

  // Mutation to administer the outcome measure
  const administerMeasure = useMutation({
    mutationFn: async (data: { clientId: string; measureType: string; responses: Record<string, number> }) => {
      const response = await api.post('/outcome-measures/administer', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`${selectedMeasure} assessment recorded successfully!`);
      queryClient.invalidateQueries({ queryKey: ['clientsProgress'] });
      queryClient.invalidateQueries({ queryKey: ['assignedClients'] });
      // Reset form
      setShowQuestionnaire(false);
      setSelectedMeasure(null);
      setSelectedClient(null);
      setResponses({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record assessment');
    },
  });

  const handleSubmitAssessment = () => {
    if (!selectedClient || !selectedMeasure || !questionnaire) return;

    // Check if all questions are answered
    const allAnswered = questionnaire.questions.every((q) => responses[q.id] !== undefined);
    if (!allAnswered) {
      toast.error('Please answer all questions');
      return;
    }

    administerMeasure.mutate({
      clientId: selectedClient.id,
      measureType: selectedMeasure,
      responses,
    });
  };

  const filteredClients = clients || [];

  if (showQuestionnaire && selectedClient && selectedMeasure) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowQuestionnaire(false);
              setResponses({});
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Selection
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {MEASURE_TYPES.find((m) => m.type === selectedMeasure)?.name} Assessment
              </h1>
              <p className="text-gray-600">
                For {selectedClient.firstName} {selectedClient.lastName}
              </p>
            </div>
          </div>
        </div>

        {loadingQuestionnaire ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Loading questionnaire...</span>
          </div>
        ) : questionnaire ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-6">
              <p className="text-gray-600 mb-4">{questionnaire.description}</p>
              <p className="text-sm text-gray-500">
                Answer each question based on the past 2 weeks. Score range: {questionnaire.scoringInfo.minScore} -{' '}
                {questionnaire.scoringInfo.maxScore}
              </p>
            </div>

            <div className="space-y-4">
              {questionnaire.questions.map((question, index) => (
                <div key={question.id} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                  <p className="font-medium text-gray-900 mb-4">
                    {index + 1}. {question.text}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((score) => (
                      <button
                        key={score}
                        onClick={() => setResponses({ ...responses, [question.id]: score })}
                        className={`py-3 px-4 rounded-lg border text-center transition-all ${
                          responses[question.id] === score
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-bold">{score}</div>
                        <div className="text-xs mt-1">
                          {score === 0
                            ? 'Not at all'
                            : score === 1
                              ? 'Several days'
                              : score === 2
                                ? 'More than half'
                                : 'Nearly every day'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowQuestionnaire(false);
                  setResponses({});
                }}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssessment}
                disabled={administerMeasure.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {administerMeasure.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit Assessment
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/progress-tracking')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Progress Tracking
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Assign Outcome Measures</h1>
            <p className="text-gray-600">Select a client and administer standardized assessments</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Select Client */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
              1
            </span>
            Select Client
          </h2>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Client List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : clientsError ? (
              <div className="flex items-center gap-2 text-red-600 py-4">
                <AlertCircle className="w-5 h-5" />
                <span>Error loading clients</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No clients found</p>
              </div>
            ) : (
              filteredClients.map((client: Client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedClient?.id === client.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {client.firstName[0]}
                    {client.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{client.medicalRecordNumber}</p>
                  </div>
                  {selectedClient?.id === client.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Step 2: Select Measure */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
              2
            </span>
            Select Measure Type
          </h2>

          {!selectedClient ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Select a client first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {MEASURE_TYPES.map((measure) => (
                <button
                  key={measure.type}
                  onClick={() => setSelectedMeasure(measure.type)}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    selectedMeasure === measure.type
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{measure.name}</p>
                      <p className="text-sm text-gray-500">{measure.description}</p>
                    </div>
                    {selectedMeasure === measure.type && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </div>
                </button>
              ))}

              {selectedMeasure && (
                <button
                  onClick={() => setShowQuestionnaire(true)}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Administer {MEASURE_TYPES.find((m) => m.type === selectedMeasure)?.name}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignMeasures;
