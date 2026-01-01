import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface ExerciseLog {
  id: string;
  activityType: string;
  duration: number;
  intensity: string;
  caloriesBurned?: number;
  notes?: string;
  moodBefore?: string;
  moodAfter?: string;
  loggedAt: string;
}

interface ExerciseStats {
  totalMinutes: number;
  totalCalories: number;
  averageDuration: number;
  totalSessions: number;
  streakDays: number;
  currentStreak: number;
  activityBreakdown: { activity: string; count: number; minutes: number }[];
  intensityBreakdown: { intensity: string; count: number }[];
  weeklyTrend: { week: string; minutes: number; sessions: number }[];
  moodImprovement: number;
}

const ACTIVITY_OPTIONS = [
  { value: 'WALKING', label: 'Walking', icon: '🚶', color: 'bg-green-100 text-green-800' },
  { value: 'RUNNING', label: 'Running', icon: '🏃', color: 'bg-blue-100 text-blue-800' },
  { value: 'CYCLING', label: 'Cycling', icon: '🚴', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SWIMMING', label: 'Swimming', icon: '🏊', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'YOGA', label: 'Yoga', icon: '🧘', color: 'bg-purple-100 text-purple-800' },
  { value: 'WEIGHTS', label: 'Weight Training', icon: '🏋️', color: 'bg-red-100 text-red-800' },
  { value: 'HIIT', label: 'HIIT', icon: '💪', color: 'bg-orange-100 text-orange-800' },
  { value: 'STRETCHING', label: 'Stretching', icon: '🤸', color: 'bg-pink-100 text-pink-800' },
  { value: 'DANCING', label: 'Dancing', icon: '💃', color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'SPORTS', label: 'Sports', icon: '⚽', color: 'bg-lime-100 text-lime-800' },
  { value: 'HIKING', label: 'Hiking', icon: '🥾', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'OTHER', label: 'Other', icon: '🎯', color: 'bg-gray-100 text-gray-800' },
];

const INTENSITY_OPTIONS = [
  { value: 'LOW', label: 'Low', description: 'Easy, can hold a conversation', color: 'text-green-600 bg-green-100' },
  { value: 'MODERATE', label: 'Moderate', description: 'Somewhat breathless', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'HIGH', label: 'High', description: 'Very challenging, breathless', color: 'text-red-600 bg-red-100' },
];

const MOOD_OPTIONS = [
  { value: 'VERY_LOW', label: 'Very Low', emoji: '😢' },
  { value: 'LOW', label: 'Low', emoji: '😕' },
  { value: 'NEUTRAL', label: 'Neutral', emoji: '😐' },
  { value: 'GOOD', label: 'Good', emoji: '🙂' },
  { value: 'GREAT', label: 'Great', emoji: '😊' },
];

export default function PortalExerciseLog() {
  const navigate = useNavigate();
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  // New entry form state
  const [activityType, setActivityType] = useState('WALKING');
  const [duration, setDuration] = useState<number>(30);
  const [intensity, setIntensity] = useState('MODERATE');
  const [caloriesBurned, setCaloriesBurned] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [moodBefore, setMoodBefore] = useState<string>('NEUTRAL');
  const [moodAfter, setMoodAfter] = useState<string>('GOOD');

  useEffect(() => {
    fetchExerciseLogs();
    fetchStats();
  }, [selectedPeriod]);

  const fetchExerciseLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (selectedPeriod === 'week') {
        params.append('days', '7');
      } else if (selectedPeriod === 'month') {
        params.append('days', '30');
      }

      const response = await api.get(`/portal/exercise-log?${params.toString()}`);

      if (response.data.success) {
        setExerciseLogs(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalRefreshToken');
        localStorage.removeItem('portalClient');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load exercise logs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/portal/exercise-log/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSaveEntry = async () => {
    if (duration < 1) {
      toast.error('Please enter a valid duration');
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.post('/portal/exercise-log', {
        activityType,
        duration,
        intensity,
        caloriesBurned: caloriesBurned || undefined,
        notes,
        moodBefore,
        moodAfter,
      });

      if (response.data.success) {
        toast.success('Exercise logged successfully!');
        setShowNewEntry(false);
        resetForm();
        fetchExerciseLogs();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save exercise log');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setActivityType('WALKING');
    setDuration(30);
    setIntensity('MODERATE');
    setCaloriesBurned(undefined);
    setNotes('');
    setMoodBefore('NEUTRAL');
    setMoodAfter('GOOD');
  };

  const getActivityOption = (value: string) => {
    return ACTIVITY_OPTIONS.find((a) => a.value === value) || ACTIVITY_OPTIONS[ACTIVITY_OPTIONS.length - 1];
  };

  const getIntensityOption = (value: string) => {
    return INTENSITY_OPTIONS.find((i) => i.value === value) || INTENSITY_OPTIONS[1];
  };

  const getMoodOption = (value: string) => {
    return MOOD_OPTIONS.find((m) => m.value === value) || MOOD_OPTIONS[2];
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exercise Log</h1>
          <p className="text-gray-600">Track your physical activity and fitness progress</p>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Exercise
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Time</h3>
            <span className="text-3xl">⏱️</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatDuration(stats?.totalMinutes || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Sessions</h3>
            <span className="text-3xl">🏃</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalSessions || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Workouts completed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Calories Burned</h3>
            <span className="text-3xl">🔥</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats?.totalCalories || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Estimated</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Streak</h3>
            <span className="text-3xl">🔥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.currentStreak || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Days active</p>
        </div>
      </div>

      {/* Activity Breakdown */}
      {stats && stats.activityBreakdown.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Activity Breakdown</h3>
            <div className="space-y-3">
              {stats.activityBreakdown.slice(0, 5).map((item, idx) => {
                const activity = getActivityOption(item.activity);
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{activity.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{activity.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{item.count}x</span>
                      <span className="text-xs text-gray-500 ml-2">({formatDuration(item.minutes)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Intensity Distribution</h3>
            <div className="space-y-4">
              {stats.intensityBreakdown.map((item, idx) => {
                const intensityOpt = getIntensityOption(item.intensity);
                const percentage = stats.totalSessions > 0
                  ? Math.round((item.count / stats.totalSessions) * 100)
                  : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm font-medium ${intensityOpt.color.split(' ')[0]}`}>
                        {intensityOpt.label}
                      </span>
                      <span className="text-sm text-gray-600">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.intensity === 'LOW' ? 'bg-green-500' :
                          item.intensity === 'MODERATE' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mood Improvement */}
      {stats && stats.moodImprovement !== undefined && stats.totalSessions > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Mood Improvement</h3>
              <p className="text-sm text-gray-600">Average mood change after exercise</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${stats.moodImprovement > 0 ? 'text-green-600' : stats.moodImprovement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.moodImprovement > 0 ? '+' : ''}{stats.moodImprovement.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">
                {stats.moodImprovement > 0 ? '😊 Feeling better!' : stats.moodImprovement < 0 ? 'Consider adjusting intensity' : 'Stable'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Filter */}
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => setSelectedPeriod('week')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'week'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'month'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Exercise Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Exercise History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : exerciseLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <span className="text-3xl">🏃</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No exercise logs yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Start tracking your workouts to see your progress
              </p>
              <button
                onClick={() => setShowNewEntry(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Log First Workout
              </button>
            </div>
          ) : (
            exerciseLogs.map((log) => {
              const activity = getActivityOption(log.activityType);
              const intensityOpt = getIntensityOption(log.intensity);
              const moodBeforeOpt = log.moodBefore ? getMoodOption(log.moodBefore) : null;
              const moodAfterOpt = log.moodAfter ? getMoodOption(log.moodAfter) : null;

              return (
                <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${activity.color}`}>
                        <span className="text-3xl">{activity.icon}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{activity.label}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(log.loggedAt)} at {formatTime(log.loggedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatDuration(log.duration)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${intensityOpt.color}`}>
                        {intensityOpt.label} Intensity
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {log.caloriesBurned && (
                      <div className="flex items-center space-x-1">
                        <span className="text-orange-500">🔥</span>
                        <span className="font-medium text-gray-900">{log.caloriesBurned} cal</span>
                      </div>
                    )}

                    {moodBeforeOpt && moodAfterOpt && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Mood:</span>
                        <span>{moodBeforeOpt.emoji}</span>
                        <span className="text-gray-400">→</span>
                        <span>{moodAfterOpt.emoji}</span>
                      </div>
                    )}
                  </div>

                  {log.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-700 leading-relaxed">{log.notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Exercise Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900">Log Exercise</h3>
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
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Activity Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ACTIVITY_OPTIONS.map((activity) => (
                    <button
                      key={activity.value}
                      onClick={() => setActivityType(activity.value)}
                      disabled={isSaving}
                      className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                        activityType === activity.value
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-2xl mb-1">{activity.icon}</span>
                      <span className="text-xs font-medium text-center">{activity.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                    min="1"
                    max="480"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    disabled={isSaving}
                  />
                  <div className="flex space-x-2">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setDuration(mins)}
                        disabled={isSaving}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          duration === mins
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Intensity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intensity <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {INTENSITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setIntensity(option.value)}
                      disabled={isSaving}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        intensity === option.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className={`font-semibold ${
                        option.value === 'LOW' ? 'text-green-600' :
                        option.value === 'MODERATE' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calories Burned (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calories Burned (optional)
                </label>
                <input
                  type="number"
                  value={caloriesBurned || ''}
                  onChange={(e) => setCaloriesBurned(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="0"
                  placeholder="Enter if known"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  disabled={isSaving}
                />
              </div>

              {/* Mood Before & After */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mood Before</label>
                  <div className="flex justify-between">
                    {MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMoodBefore(option.value)}
                        disabled={isSaving}
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                          moodBefore === option.value
                            ? 'bg-green-100 ring-2 ring-green-600'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mood After</label>
                  <div className="flex justify-between">
                    {MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMoodAfter(option.value)}
                        disabled={isSaving}
                        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                          moodAfter === option.value
                            ? 'bg-green-100 ring-2 ring-green-600'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                  placeholder="How did the workout feel? Any achievements?"
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
                disabled={isSaving || duration < 1}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                    Save Exercise
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
