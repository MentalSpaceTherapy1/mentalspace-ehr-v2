import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface SleepLog {
  id: string;
  logDate: string;
  bedtime: string;
  wakeTime: string;
  hoursSlept: number;
  quality: number;
  disturbances: string[];
  notes?: string;
}

interface SleepTrends {
  averageHoursSlept: number;
  averageQuality: number;
  sleepTrend: string;
  totalNights: number;
  sleepDebt: number;
  consistencyScore: number;
  streakDays: number;
  mostCommonDisturbances: { disturbance: string; count: number }[];
  weeklyAverage: { week: string; hours: number; quality: number }[];
}

const DISTURBANCE_OPTIONS = [
  { value: 'NIGHTMARES', label: 'Nightmares', icon: '😱' },
  { value: 'INSOMNIA', label: 'Insomnia', icon: '😳' },
  { value: 'WOKE_FREQUENTLY', label: 'Woke Frequently', icon: '👀' },
  { value: 'SLEEP_APNEA', label: 'Sleep Apnea', icon: '😮‍💨' },
  { value: 'RESTLESS_LEGS', label: 'Restless Legs', icon: '🦵' },
  { value: 'NOISE', label: 'Noise', icon: '🔊' },
  { value: 'PAIN', label: 'Pain', icon: '😣' },
  { value: 'BATHROOM', label: 'Bathroom', icon: '🚽' },
  { value: 'ANXIETY', label: 'Anxiety', icon: '😰' },
  { value: 'OTHER', label: 'Other', icon: '❓' },
];

export default function PortalSleepDiary() {
  const navigate = useNavigate();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [trends, setTrends] = useState<SleepTrends | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  // New entry form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState<number>(3);
  const [selectedDisturbances, setSelectedDisturbances] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchSleepLogs();
    fetchTrends();
  }, [selectedPeriod]);

  const fetchSleepLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (selectedPeriod === 'week') {
        params.append('days', '7');
      } else if (selectedPeriod === 'month') {
        params.append('days', '30');
      }

      const response = await api.get(`/portal/sleep-diary?${params.toString()}`);

      if (response.data.success) {
        setSleepLogs(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalRefreshToken');
        localStorage.removeItem('portalClient');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load sleep logs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await api.get('/portal/sleep-diary/trends');
      if (response.data.success) {
        setTrends(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    }
  };

  const handleSaveEntry = async () => {
    try {
      setIsSaving(true);

      // Combine date with times
      const bedtimeDate = new Date(`${logDate}T${bedtime}:00`);
      const wakeTimeDate = new Date(`${logDate}T${wakeTime}:00`);

      // If wake time is before bedtime, assume next day
      if (wakeTimeDate <= bedtimeDate) {
        wakeTimeDate.setDate(wakeTimeDate.getDate() + 1);
      }

      const response = await api.post('/portal/sleep-diary', {
        logDate: new Date(logDate).toISOString(),
        bedtime: bedtimeDate.toISOString(),
        wakeTime: wakeTimeDate.toISOString(),
        quality,
        disturbances: selectedDisturbances,
        notes,
      });

      if (response.data.success) {
        toast.success('Sleep log saved successfully');
        setShowNewEntry(false);
        resetForm();
        fetchSleepLogs();
        fetchTrends();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save sleep log');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setLogDate(new Date().toISOString().split('T')[0]);
    setBedtime('22:00');
    setWakeTime('07:00');
    setQuality(3);
    setSelectedDisturbances([]);
    setNotes('');
  };

  const toggleDisturbance = (disturbance: string) => {
    if (selectedDisturbances.includes(disturbance)) {
      setSelectedDisturbances(selectedDisturbances.filter((d) => d !== disturbance));
    } else {
      setSelectedDisturbances([...selectedDisturbances, disturbance]);
    }
  };

  const getQualityEmoji = (q: number) => {
    if (q >= 5) return '😴';
    if (q >= 4) return '🙂';
    if (q >= 3) return '😐';
    if (q >= 2) return '😕';
    return '😫';
  };

  const getQualityLabel = (q: number) => {
    if (q >= 5) return 'Excellent';
    if (q >= 4) return 'Good';
    if (q >= 3) return 'Fair';
    if (q >= 2) return 'Poor';
    return 'Very Poor';
  };

  const getQualityColor = (q: number) => {
    if (q >= 5) return 'text-green-600 bg-green-100';
    if (q >= 4) return 'text-blue-600 bg-blue-100';
    if (q >= 3) return 'text-yellow-600 bg-yellow-100';
    if (q >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getHoursColor = (hours: number) => {
    if (hours >= 7 && hours <= 9) return 'text-green-600';
    if (hours >= 6 || hours <= 10) return 'text-yellow-600';
    return 'text-red-600';
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

  const getDisturbanceLabel = (value: string) => {
    const option = DISTURBANCE_OPTIONS.find((d) => d.value === value);
    return option?.label || value;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sleep Diary</h1>
          <p className="text-gray-600">Track your sleep patterns for better rest</p>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Sleep
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Hours</h3>
            <span className="text-3xl">😴</span>
          </div>
          <p className={`text-3xl font-bold ${getHoursColor(trends?.averageHoursSlept || 0)}`}>
            {trends?.averageHoursSlept || 0}h
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {(trends?.averageHoursSlept || 0) >= 7 ? 'On target!' : 'Below recommended'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Quality</h3>
            <span className="text-3xl">{getQualityEmoji(trends?.averageQuality || 3)}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{trends?.averageQuality || 0}/5</p>
          <p className="text-sm text-gray-500 mt-1">{getQualityLabel(trends?.averageQuality || 3)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Sleep Debt</h3>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className={`text-3xl font-bold ${(trends?.sleepDebt || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
            {trends?.sleepDebt || 0}h
          </p>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Consistency</h3>
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{trends?.consistencyScore || 0}%</p>
          <p className="text-sm text-gray-500 mt-1">{trends?.streakDays || 0} day streak</p>
        </div>
      </div>

      {/* Sleep Trend */}
      {trends && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Sleep Trend</h3>
              <p className="text-sm text-gray-500">Based on last 30 days</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-4xl">{getTrendIcon(trends.sleepTrend)}</span>
              <span className={`text-lg font-semibold capitalize ${
                trends.sleepTrend === 'improving' ? 'text-green-600' :
                trends.sleepTrend === 'declining' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trends.sleepTrend}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Most Common Disturbances */}
      {trends && trends.mostCommonDisturbances.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Common Sleep Disturbances</h3>
          <div className="flex flex-wrap gap-3">
            {trends.mostCommonDisturbances.map((item, idx) => {
              const option = DISTURBANCE_OPTIONS.find((d) => d.value === item.disturbance);
              return (
                <div key={idx} className="flex items-center space-x-2 px-3 py-2 bg-orange-50 rounded-lg">
                  <span className="text-xl">{option?.icon || '❓'}</span>
                  <span className="text-sm font-medium text-gray-700">{option?.label || item.disturbance}</span>
                  <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
                    {item.count}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Period Filter */}
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => setSelectedPeriod('week')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setSelectedPeriod('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            selectedPeriod === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Sleep Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Sleep History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sleepLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <span className="text-3xl">🛏️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No sleep logs yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Start tracking your sleep to improve your rest quality
              </p>
              <button
                onClick={() => setShowNewEntry(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Log First Night
              </button>
            </div>
          ) : (
            sleepLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-4xl mb-1">{getQualityEmoji(log.quality)}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getQualityColor(log.quality)}`}>
                        {getQualityLabel(log.quality)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{formatDate(log.logDate)}</p>
                      <p className="text-sm text-gray-600">
                        {formatTime(log.bedtime)} → {formatTime(log.wakeTime)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getHoursColor(log.hoursSlept)}`}>
                      {log.hoursSlept}h
                    </p>
                    <p className="text-sm text-gray-500">slept</p>
                  </div>
                </div>

                {/* Disturbances */}
                {log.disturbances && log.disturbances.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Disturbances</p>
                    <div className="flex flex-wrap gap-2">
                      {log.disturbances.map((disturbance, idx) => {
                        const option = DISTURBANCE_OPTIONS.find((d) => d.value === disturbance);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                          >
                            {option?.icon} {option?.label || disturbance}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <div>
                    <p className="text-sm text-gray-700 leading-relaxed">{log.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Sleep Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900">Log Sleep</h3>
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
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={isSaving}
                />
              </div>

              {/* Bedtime & Wake Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedtime <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wake Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Sleep Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sleep Quality <span className="text-red-500">*</span>
                </label>
                <div className="text-center mb-4">
                  <div className="text-6xl mb-2">{getQualityEmoji(quality)}</div>
                  <p className="text-2xl font-bold text-gray-900">{quality}/5</p>
                  <p className="text-sm text-gray-600">{getQualityLabel(quality)}</p>
                </div>
                <div className="flex justify-between space-x-2">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      disabled={isSaving}
                      className={`flex-1 py-3 text-lg font-medium rounded-lg transition-colors ${
                        quality === q
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Very Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              {/* Disturbances */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Any sleep disturbances?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DISTURBANCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleDisturbance(option.value)}
                      disabled={isSaving}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        selectedDisturbances.includes(option.value)
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Any additional notes about your sleep..."
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
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
