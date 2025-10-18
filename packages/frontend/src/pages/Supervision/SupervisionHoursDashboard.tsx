import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';

interface HoursSummary {
  supervisee: {
    id: string;
    name: string;
    supervisionStartDate: string;
    supervisionEndDate?: string;
  };
  totalHoursRequired: number;
  totalHoursCompleted: number;
  totalHoursRemaining: number;
  percentComplete: number;
  breakdownByType: {
    directIndividual: { completed: number; required: number; remaining: number };
    directTriadic: { completed: number; required: number; remaining: number };
    group: { completed: number; required: number; remaining: number };
    observation: { completed: number; required: number; remaining: number };
    other: { completed: number; required: number; remaining: number };
  };
  lastSupervisionDate?: string;
  nextSupervisionDate?: string;
  onTrack: boolean;
  recentSessions: any[];
  hoursLogs: any[];
}

export default function SupervisionHoursDashboard() {
  const { superviseeId } = useParams();
  const [summary, setSummary] = useState<HoursSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (superviseeId) {
      fetchHoursSummary();
    }
  }, [superviseeId]);

  const fetchHoursSummary = async () => {
    try {
      const response = await api.get(`/supervision/hours/${superviseeId}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching hours summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600">Supervision hours summary not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Supervision Hours Tracking</h1>
        <p className="mt-2 text-gray-600">{summary.supervisee.name}</p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Overall Progress</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            summary.onTrack ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {summary.onTrack ? 'On Track' : 'Needs Attention'}
          </span>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {summary.totalHoursCompleted} / {summary.totalHoursRequired} hours completed
            </span>
            <span className="text-sm font-medium text-indigo-600">
              {summary.percentComplete}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(summary.percentComplete, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Remaining Hours</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalHoursRemaining}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Session</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary.lastSupervisionDate ? format(new Date(summary.lastSupervisionDate), 'MMM dd') : 'N/A'}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Next Session</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary.nextSupervisionDate ? format(new Date(summary.nextSupervisionDate), 'MMM dd') : 'TBD'}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Hours Breakdown by Type</h2>

        <div className="space-y-4">
          {Object.entries(summary.breakdownByType).map(([type, data]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {type.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm text-gray-600">
                  {data.completed} hours
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: data.required > 0 ? `${(data.completed / data.required) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Sessions</h2>

        <div className="space-y-4">
          {summary.recentSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {format(new Date(session.sessionDate), 'MMMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {session.sessionType} - {session.sessionFormat}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-indigo-600">{session.hoursEarned} hrs</p>
                <p className="text-sm text-gray-600">{session.hourType}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hours Log */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Complete Hours Log</h2>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {summary.hoursLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(log.hourDate), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.hourType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.hoursEarned}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.sessionDescription}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    log.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
