import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface SymptomLog {
  id: string;
  symptoms: string[];
  severity: number;
  triggers: string[];
  notes?: string;
  mood?: string;
  duration?: string;
  medications: string[];
  loggedAt: string;
}

interface SymptomTrends {
  averageSeverity: number;
  severityTrend: string;
  totalEntries: number;
  streakDays: number;
  mostCommonSymptoms: { symptom: string; count: number }[];
  mostCommonTriggers: { trigger: string; count: number }[];
  weeklyAverage: { week: string; average: number }[];
}

const COMMON_SYMPTOMS = [
  'Anxiety',
  'Depression',
  'Insomnia',
  'Fatigue',
  'Headache',
  'Irritability',
  'Panic',
  'Racing Thoughts',
  'Difficulty Concentrating',
  'Loss of Appetite',
  'Overeating',
  'Social Withdrawal',
  'Restlessness',
  'Hopelessness',
  'Numbness',
];

const COMMON_TRIGGERS = [
  'Work Stress',
  'Family Issues',
  'Relationship Problems',
  'Financial Worries',
  'Health Concerns',
  'Sleep Problems',
  'Social Situations',
  'Deadline Pressure',
  'Conflict',
  'Loneliness',
  'News/Media',
  'Weather',
];

const MOOD_OPTIONS = [
  { value: 'VERY_POOR', label: 'Very Poor', emoji: '😢' },
  { value: 'POOR', label: 'Poor', emoji: '😕' },
  { value: 'NEUTRAL', label: 'Neutral', emoji: '😐' },
  { value: 'GOOD', label: 'Good', emoji: '🙂' },
  { value: 'VERY_GOOD', label: 'Very Good', emoji: '😊' },
];

export default function PortalSymptomDiary() {
  const navigate = useNavigate();
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [trends, setTrends] = useState<SymptomTrends | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  // New entry form state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(5);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<string>('NEUTRAL');
  const [duration, setDuration] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [newMedication, setNewMedication] = useState('');

  useEffect(() => {
    fetchSymptomLogs();
    fetchTrends();
  }, [selectedPeriod]);

  const fetchSymptomLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (selectedPeriod === 'week') {
        params.append('days', '7');
      } else if (selectedPeriod === 'month') {
        params.append('days', '30');
      }

      const response = await api.get(`/portal/symptom-diary?${params.toString()}`);

      if (response.data.success) {
        setSymptomLogs(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalRefreshToken');
        localStorage.removeItem('portalClient');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load symptom logs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await api.get('/portal/symptom-diary/trends');
      if (response.data.success) {
        setTrends(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    }
  };

  const handleSaveEntry = async () => {
    if (selectedSymptoms.length === 0) {
      toast.error('Please select at least one symptom');
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.post('/portal/symptom-diary', {
        symptoms: selectedSymptoms,
        severity,
        triggers: selectedTriggers,
        notes,
        mood,
        duration,
        medications,
      });

      if (response.data.success) {
        toast.success('Symptom log saved successfully');
        setShowNewEntry(false);
        resetForm();
        fetchSymptomLogs();
        fetchTrends();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save symptom log');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedSymptoms([]);
    setSeverity(5);
    setSelectedTriggers([]);
    setNotes('');
    setMood('NEUTRAL');
    setDuration('');
    setMedications([]);
    setNewMedication('');
  };

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const toggleTrigger = (trigger: string) => {
    if (selectedTriggers.includes(trigger)) {
      setSelectedTriggers(selectedTriggers.filter((t) => t !== trigger));
    } else {
      setSelectedTriggers([...selectedTriggers, trigger]);
    }
  };

  const addMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()]);
      setNewMedication('');
    }
  };

  const removeMedication = (med: string) => {
    setMedications(medications.filter((m) => m !== med));
  };

  const getSeverityColor = (sev: number) => {
    if (sev <= 3) return 'text-green-600 bg-green-100';
    if (sev <= 5) return 'text-yellow-600 bg-yellow-100';
    if (sev <= 7) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityLabel = (sev: number) => {
    if (sev <= 2) return 'Mild';
    if (sev <= 4) return 'Moderate';
    if (sev <= 6) return 'Significant';
    if (sev <= 8) return 'Severe';
    return 'Very Severe';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'worsening') return '📉';
    return '➡️';
  };

  const getMoodEmoji = (moodValue: string) => {
    const option = MOOD_OPTIONS.find((m) => m.value === moodValue);
    return option?.emoji || '😐';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Symptom Diary</h1>
          <p className="text-gray-600">Track your symptoms and identify patterns</p>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Symptoms
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Severity</h3>
            <span className="text-2xl">{getTrendIcon(trends?.severityTrend || 'stable')}</span>
          </div>
          <p className={`text-3xl font-bold ${trends?.averageSeverity && trends.averageSeverity > 5 ? 'text-orange-600' : 'text-green-600'}`}>
            {trends?.averageSeverity || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Out of 10</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Entries</h3>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{trends?.totalEntries || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Tracking Streak</h3>
            <span className="text-2xl">🔥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{trends?.streakDays || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Trend</h3>
            <span className="text-2xl">{getTrendIcon(trends?.severityTrend || 'stable')}</span>
          </div>
          <p className="text-xl font-bold text-gray-900 capitalize">{trends?.severityTrend || 'Stable'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {trends?.severityTrend === 'improving' ? 'Getting better!' :
             trends?.severityTrend === 'worsening' ? 'Needs attention' : 'Steady'}
          </p>
        </div>
      </div>

      {/* Most Common Symptoms & Triggers */}
      {trends && (trends.mostCommonSymptoms.length > 0 || trends.mostCommonTriggers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {trends.mostCommonSymptoms.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Most Common Symptoms</h3>
              <div className="space-y-3">
                {trends.mostCommonSymptoms.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.symptom}</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      {item.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trends.mostCommonTriggers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Most Common Triggers</h3>
              <div className="space-y-3">
                {trends.mostCommonTriggers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.trigger}</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      {item.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Period Filter */}
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => setSelectedPeriod('week')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'week'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'month'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Symptom Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Symptom History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : symptomLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No symptom logs yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Start tracking your symptoms to identify patterns
              </p>
              <button
                onClick={() => setShowNewEntry(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Log First Entry
              </button>
            </div>
          ) : (
            symptomLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-2 rounded-lg ${getSeverityColor(log.severity)}`}>
                      <span className="text-lg font-bold">{log.severity}</span>
                      <span className="text-xs">/10</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(log.severity)}`}>
                          {getSeverityLabel(log.severity)}
                        </span>
                        {log.mood && <span className="text-xl">{getMoodEmoji(log.mood)}</span>}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(log.loggedAt)} at {new Date(log.loggedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {log.symptoms.map((symptom, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Triggers */}
                {log.triggers && log.triggers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Triggers</p>
                    <div className="flex flex-wrap gap-2">
                      {log.triggers.map((trigger, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{log.notes}</p>
                  </div>
                )}

                {/* Duration & Medications */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {log.duration && (
                    <div>
                      <span className="text-gray-500">Duration:</span>{' '}
                      <span className="font-medium text-gray-900">{log.duration}</span>
                    </div>
                  )}
                  {log.medications && log.medications.length > 0 && (
                    <div>
                      <span className="text-gray-500">Medications:</span>{' '}
                      <span className="font-medium text-gray-900">{log.medications.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Symptom Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900">Log Symptoms</h3>
              <button
                onClick={() => {
                  setShowNewEntry(false);
                  resetForm();
                }}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Symptoms Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What symptoms are you experiencing? <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <button
                      key={symptom}
                      onClick={() => toggleSymptom(symptom)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        selectedSymptoms.includes(symptom)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Severity Level <span className="text-red-500">*</span>
                </label>
                <div className="text-center mb-4">
                  <p className={`text-4xl font-bold ${severity > 7 ? 'text-red-600' : severity > 4 ? 'text-orange-600' : 'text-green-600'}`}>
                    {severity}/10
                  </p>
                  <p className="text-sm text-gray-600">{getSeverityLabel(severity)}</p>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={isSaving}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mild</span>
                  <span>Severe</span>
                </div>
              </div>

              {/* Current Mood */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Mood</label>
                <div className="grid grid-cols-5 gap-2">
                  {MOOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMood(option.value)}
                      disabled={isSaving}
                      className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                        mood === option.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-2xl mb-1">{option.emoji}</span>
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Triggers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Possible Triggers</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TRIGGERS.map((trigger) => (
                    <button
                      key={trigger}
                      onClick={() => toggleTrigger(trigger)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        selectedTriggers.includes(trigger)
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How long have you been feeling this way?</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="e.g., A few hours, Since yesterday, All week"
                  disabled={isSaving}
                />
              </div>

              {/* Medications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medications Taken</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Add medication..."
                    disabled={isSaving}
                  />
                  <button
                    onClick={addMedication}
                    disabled={isSaving || !newMedication.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {medications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {medications.map((med, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {med}
                        <button
                          onClick={() => removeMedication(med)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Any additional details about your symptoms..."
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 border-t border-gray-200 rounded-b-xl">
              <button
                onClick={() => {
                  setShowNewEntry(false);
                  resetForm();
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={isSaving || selectedSymptoms.length === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Entry
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
