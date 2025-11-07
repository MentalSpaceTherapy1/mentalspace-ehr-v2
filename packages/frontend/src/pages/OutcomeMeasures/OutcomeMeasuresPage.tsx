import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import ProgressChart from '../../components/OutcomeMeasures/ProgressChart';

type MeasureType = 'PHQ9' | 'GAD7' | 'PCL5';
type ViewMode = 'administer' | 'progress' | 'history';

interface QuestionnaireDefinition {
  type: MeasureType;
  name: string;
  description: string;
  questions: Array<{ id: string; text: string }>;
  scoringInfo: {
    minScore: number;
    maxScore: number;
    severityRanges: Array<{
      min: number;
      max: number;
      severity: string;
      label: string;
    }>;
  };
}

interface OutcomeMeasure {
  id: string;
  measureType: MeasureType;
  totalScore: number;
  severity: string;
  severityLabel: string;
  administeredDate: string;
  responses: Record<string, number>;
  clinicalNotes?: string;
  administeredBy: {
    id: string;
    firstName: string;
    lastName: string;
    title?: string;
  };
}

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const PCL5_RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'A little bit' },
  { value: 2, label: 'Moderately' },
  { value: 3, label: 'Quite a bit' },
  { value: 4, label: 'Extremely' },
];

export default function OutcomeMeasuresPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureType | null>(null);
  const [progressMeasure, setProgressMeasure] = useState<MeasureType>('PHQ9');
  const [definition, setDefinition] = useState<QuestionnaireDefinition | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<OutcomeMeasure[]>([]);
  const [clientName, setClientName] = useState('');
  const [startTime] = useState(Date.now());

  // Fetch client name
  useEffect(() => {
    if (clientId) {
      api.get(`/clients/${clientId}`)
        .then(res => {
          const client = res.data.data;
          setClientName(`${client.firstName} ${client.lastName}`);
        })
        .catch(err => console.error('Error fetching client:', err));
    }
  }, [clientId]);

  // Fetch history
  useEffect(() => {
    if (clientId && viewMode === 'history') {
      loadHistory();
    }
  }, [clientId, viewMode]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/outcome-measures/client/${clientId}?limit=10`);
      setHistory(res.data.data.measures || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadQuestionnaire = async (measureType: MeasureType) => {
    setLoading(true);
    try {
      const res = await api.get(`/outcome-measures/questionnaire/${measureType}`);
      setDefinition(res.data.data);
      setSelectedMeasure(measureType);
      setResponses({});
      setClinicalNotes('');
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      alert('Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!definition) return;

    // Validate all questions answered
    const allAnswered = definition.questions.every(q => responses[q.id] !== undefined);
    if (!allAnswered) {
      alert('Please answer all questions before submitting');
      return;
    }

    const completionTime = Math.floor((Date.now() - startTime) / 1000);

    setSubmitting(true);
    try {
      await api.post('/outcome-measures/administer', {
        clientId,
        measureType: selectedMeasure,
        responses,
        clinicalNotes: clinicalNotes || undefined,
        completionTime,
      });

      alert('Outcome measure administered successfully!');
      setSelectedMeasure(null);
      setDefinition(null);
      setResponses({});
      setClinicalNotes('');
      setViewMode('history');
      loadHistory();
    } catch (error: any) {
      console.error('Error submitting outcome measure:', error);
      alert(error.response?.data?.message || 'Failed to submit outcome measure');
    } finally {
      setSubmitting(false);
    }
  };

  const getResponseOptions = () => {
    return selectedMeasure === 'PCL5' ? PCL5_RESPONSE_OPTIONS : RESPONSE_OPTIONS;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'MINIMAL': return 'text-green-600 bg-green-50';
      case 'MILD': return 'text-yellow-600 bg-yellow-50';
      case 'MODERATE': return 'text-orange-600 bg-orange-50';
      case 'MODERATELY_SEVERE': return 'text-red-600 bg-red-50';
      case 'SEVERE': return 'text-red-700 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading questionnaire...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Client
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Outcome Measures</h1>
        {clientName && <p className="text-gray-600 mt-1">Client: {clientName}</p>}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Assessment History
          </button>
          <button
            onClick={() => setViewMode('administer')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'administer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Administer Assessment
          </button>
          <button
            onClick={() => setViewMode('progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Progress Tracking
          </button>
        </nav>
      </div>

      {/* Measure Selection */}
      {viewMode === 'administer' && !selectedMeasure && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Outcome Measure</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => loadQuestionnaire('PHQ9')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PHQ-9</h3>
              <p className="text-sm text-gray-600">Patient Health Questionnaire for Depression</p>
              <p className="text-xs text-gray-500 mt-2">9 questions • 5-10 minutes</p>
            </button>

            <button
              onClick={() => loadQuestionnaire('GAD7')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">GAD-7</h3>
              <p className="text-sm text-gray-600">Generalized Anxiety Disorder Assessment</p>
              <p className="text-xs text-gray-500 mt-2">7 questions • 3-5 minutes</p>
            </button>

            <button
              onClick={() => loadQuestionnaire('PCL5')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PCL-5</h3>
              <p className="text-sm text-gray-600">PTSD Checklist for DSM-5</p>
              <p className="text-xs text-gray-500 mt-2">20 questions • 10-15 minutes</p>
            </button>
          </div>
        </div>
      )}

      {/* Questionnaire */}
      {viewMode === 'administer' && definition && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{definition.name}</h2>
              <p className="text-gray-600 mt-1">{definition.description}</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel? All responses will be lost.')) {
                  setSelectedMeasure(null);
                  setDefinition(null);
                  setResponses({});
                  setViewMode('history');
                }
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-4 p-4 bg-blue-50 rounded">
                Over the last 2 weeks, how often have you been bothered by the following:
              </p>

              <div className="space-y-6">
                {definition.questions.map((question, index) => (
                  <div key={question.id} className="border-b border-gray-200 pb-6">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      {index + 1}. {question.text}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {getResponseOptions().map(option => (
                        <label
                          key={option.value}
                          className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                            responses[question.id] === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option.value}
                            checked={responses[question.id] === option.value}
                            onChange={() => setResponses({ ...responses, [question.id]: option.value })}
                            className="mr-2"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Notes (Optional)
              </label>
              <textarea
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any clinical observations or interpretation..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Progress Tracking */}
      {viewMode === 'progress' && clientId && (
        <div className="space-y-6">
          {/* Measure Type Selector */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Select Measure to View Progress</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => setProgressMeasure('PHQ9')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  progressMeasure === 'PHQ9'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PHQ-9
              </button>
              <button
                onClick={() => setProgressMeasure('GAD7')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  progressMeasure === 'GAD7'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                GAD-7
              </button>
              <button
                onClick={() => setProgressMeasure('PCL5')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  progressMeasure === 'PCL5'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PCL-5
              </button>
            </div>
          </div>

          {/* Progress Chart */}
          <ProgressChart clientId={clientId} measureType={progressMeasure} />
        </div>
      )}

      {/* History */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Assessment History</h2>

          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No outcome measures recorded yet</p>
          ) : (
            <div className="space-y-4">
              {history.map(measure => (
                <div key={measure.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{measure.measureType}</h3>
                      <p className="text-sm text-gray-600">
                        Administered by {measure.administeredBy.firstName} {measure.administeredBy.lastName}
                        {measure.administeredBy.title && `, ${measure.administeredBy.title}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(measure.administeredDate).toLocaleDateString()} at{' '}
                        {new Date(measure.administeredDate).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {measure.totalScore}
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(measure.severity)}`}>
                        {measure.severityLabel}
                      </span>
                    </div>
                  </div>

                  {measure.clinicalNotes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-1">Clinical Notes:</p>
                      <p className="text-sm text-gray-600">{measure.clinicalNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
