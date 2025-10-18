import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface MoodEntry {
  id: string;
  moodScore: number;
  entryDate: string;
  timeOfDay: string;
  notes?: string;
  activities?: string[];
  sleepHours?: number;
  stressLevel?: number;
}

export default function PortalMoodTracking() {
  const navigate = useNavigate();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  // New entry form state
  const [moodScore, setMoodScore] = useState<number>(5);
  const [timeOfDay, setTimeOfDay] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night'>('Morning');
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [stressLevel, setStressLevel] = useState<number>(5);

  const availableActivities = [
    'Exercise',
    'Meditation',
    'Socializing',
    'Work',
    'Hobbies',
    'Family Time',
    'Therapy',
    'Reading',
    'Outdoors',
    'Music',
    'Cooking',
    'Gaming',
  ];

  useEffect(() => {
    fetchMoodEntries();
  }, [selectedPeriod]);

  const fetchMoodEntries = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (selectedPeriod === 'week') {
        params.append('days', '7');
      } else if (selectedPeriod === 'month') {
        params.append('days', '30');
      }

      const response = await api.get(`/portal/mood-entries?${params.toString()}`, {
      });

      if (response.data.success) {
        setMoodEntries(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalRefreshToken');
        localStorage.removeItem('portalClient');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load mood entries');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMoodEntry = async () => {
    if (!notes.trim()) {
      toast.error('Please add some notes about your mood');
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.post(
        '/portal/mood-entries',
        {
          moodScore,
          timeOfDay,
          notes,
          activities,
          sleepHours,
          stressLevel,
        },
      );

      if (response.data.success) {
        toast.success('Mood entry saved successfully');
        setShowNewEntry(false);
        resetForm();
        fetchMoodEntries();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save mood entry');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setMoodScore(5);
    setTimeOfDay('Morning');
    setNotes('');
    setActivities([]);
    setSleepHours(7);
    setStressLevel(5);
  };

  const toggleActivity = (activity: string) => {
    if (activities.includes(activity)) {
      setActivities(activities.filter((a) => a !== activity));
    } else {
      setActivities([...activities, activity]);
    }
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 9) return '😊';
    if (score >= 7) return '🙂';
    if (score >= 5) return '😐';
    if (score >= 3) return '😕';
    return '😢';
  };

  const getMoodLabel = (score: number) => {
    if (score >= 9) return 'Great';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Okay';
    if (score >= 3) return 'Not Good';
    return 'Bad';
  };

  const getMoodColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-100';
    if (score >= 7) return 'text-blue-600 bg-blue-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    if (score >= 3) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStressColor = (level: number) => {
    if (level >= 8) return 'text-red-600';
    if (level >= 5) return 'text-orange-600';
    return 'text-green-600';
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

  // Calculate average mood for the selected period
  const averageMood = moodEntries.length > 0
    ? (moodEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / moodEntries.length).toFixed(1)
    : '0';

  const averageStress = moodEntries.length > 0
    ? (moodEntries.reduce((sum, entry) => sum + (entry.stressLevel || 5), 0) / moodEntries.length).toFixed(1)
    : '0';

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mood Journal</h1>
          <p className="text-gray-600">Track your mental wellbeing over time</p>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Entry
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Average Mood</h3>
            <span className="text-3xl">{getMoodEmoji(Number(averageMood))}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{averageMood}</p>
          <p className="text-sm text-gray-500 mt-1">{getMoodLabel(Number(averageMood))}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Entries</h3>
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{moodEntries.length}</p>
          <p className="text-sm text-gray-500 mt-1">This {selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Stress Level</h3>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className={`text-3xl font-bold ${getStressColor(Number(averageStress))}`}>{averageStress}</p>
          <p className="text-sm text-gray-500 mt-1">Out of 10</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => setSelectedPeriod('week')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'week'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'month'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Mood Entries List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Your Mood History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : moodEntries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No mood entries yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Start tracking your mood to see insights over time
              </p>
              <button
                onClick={() => setShowNewEntry(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Entry
              </button>
            </div>
          ) : (
            moodEntries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-5xl">{getMoodEmoji(entry.moodScore)}</div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMoodColor(entry.moodScore)}`}>
                          {entry.moodScore}/10 - {getMoodLabel(entry.moodScore)}
                        </span>
                        <span className="text-sm text-gray-500">{entry.timeOfDay}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(entry.entryDate)} at {new Date(entry.entryDate).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {entry.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{entry.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {entry.activities && entry.activities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Activities</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.activities.map((activity, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-6">
                    {entry.sleepHours !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Sleep</p>
                        <p className="text-sm font-medium text-gray-900">{entry.sleepHours}h</p>
                      </div>
                    )}
                    {entry.stressLevel !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Stress</p>
                        <p className={`text-sm font-medium ${getStressColor(entry.stressLevel)}`}>
                          {entry.stressLevel}/10
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Mood Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900">New Mood Entry</h3>
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
              {/* Mood Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How are you feeling? <span className="text-red-500">*</span>
                </label>
                <div className="text-center mb-4">
                  <div className="text-6xl mb-2">{getMoodEmoji(moodScore)}</div>
                  <p className="text-2xl font-bold text-gray-900">{moodScore}/10</p>
                  <p className="text-sm text-gray-600">{getMoodLabel(moodScore)}</p>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={moodScore}
                  onChange={(e) => setMoodScore(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={isSaving}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Bad</span>
                  <span>Great</span>
                </div>
              </div>

              {/* Time of Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((time) => (
                    <button
                      key={time}
                      onClick={() => setTimeOfDay(time)}
                      disabled={isSaving}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        timeOfDay === time
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                  placeholder="What's on your mind? Any specific events or thoughts?"
                  disabled={isSaving}
                />
              </div>

              {/* Activities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activities Today</label>
                <div className="flex flex-wrap gap-2">
                  {availableActivities.map((activity) => (
                    <button
                      key={activity}
                      onClick={() => toggleActivity(activity)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        activities.includes(activity)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {activity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sleep Last Night: {sleepHours} hours
                </label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={isSaving}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0h</span>
                  <span>12h</span>
                </div>
              </div>

              {/* Stress Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stress Level: {stressLevel}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={isSaving}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
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
                onClick={handleSaveMoodEntry}
                disabled={isSaving || !notes.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
