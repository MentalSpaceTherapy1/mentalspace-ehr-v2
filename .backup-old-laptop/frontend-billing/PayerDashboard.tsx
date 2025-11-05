import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DashboardStats {
  payers: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  rules: {
    total: number;
    active: number;
    prohibited: number;
  };
  holds: {
    count: number;
    byReason: Record<string, number>;
  };
}

interface RecentHold {
  id: string;
  holdReason: string;
  holdPlacedAt: string;
  note?: {
    client: { firstName: string; lastName: string };
    clinician: { firstName: string; lastName: string };
  };
}

const PayerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentHolds, setRecentHolds] = useState<RecentHold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [payersRes, rulesRes, holdsCountRes, holdsByReasonRes, recentHoldsRes] = await Promise.all([
        axios.get('/api/v1/payers/stats'),
        axios.get('/api/v1/payer-rules/stats'),
        axios.get('/api/v1/billing-holds/count'),
        axios.get('/api/v1/billing-holds/by-reason'),
        axios.get('/api/v1/billing-holds?limit=5'),
      ]);

      setStats({
        payers: payersRes.data.data,
        rules: rulesRes.data.data,
        holds: {
          count: holdsCountRes.data.data.count,
          byReason: holdsByReasonRes.data.data,
        },
      });

      setRecentHolds(recentHoldsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatReason = (reason: string): string => {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const topHoldReasons = stats
    ? Object.entries(stats.holds.byReason)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payer Policy Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of payers, billing rules, and holds
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Active Payers</div>
              <div className="mt-1 text-3xl font-semibold text-blue-600">
                {stats?.payers.active || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">of {stats?.payers.total || 0} total</div>
            </div>
            <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Active Rules</div>
              <div className="mt-1 text-3xl font-semibold text-green-600">
                {stats?.rules.active || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">of {stats?.rules.total || 0} total</div>
            </div>
            <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Billing Holds</div>
              <div className="mt-1 text-3xl font-semibold text-red-600">
                {stats?.holds.count || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">notes blocked</div>
            </div>
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Prohibited Combos</div>
              <div className="mt-1 text-3xl font-semibold text-purple-600">
                {stats?.rules.prohibited || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">rules marked</div>
            </div>
            <svg className="h-12 w-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/billing/payers/new')}
            className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium text-gray-700">Add New Payer</span>
          </button>

          <button
            onClick={() => navigate('/billing/readiness')}
            className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium text-gray-700">Check Note Readiness</span>
          </button>

          <button
            onClick={() => navigate('/billing/payers')}
            className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z"
              />
            </svg>
            <span className="font-medium text-gray-700">Manage Payers & Rules</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Hold Reasons */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Top Hold Reasons</h2>
          </div>
          <div className="p-6">
            {topHoldReasons.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No billing holds - Great job!</p>
            ) : (
              <div className="space-y-4">
                {topHoldReasons.map(([reason, count]) => (
                  <div key={reason}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{formatReason(reason)}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${(count / (stats?.holds.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {topHoldReasons.length > 0 && (
              <button
                onClick={() => navigate('/billing/holds')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Holds →
              </button>
            )}
          </div>
        </div>

        {/* Recent Holds */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Billing Holds</h2>
          </div>
          <div className="p-6">
            {recentHolds.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No recent holds</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentHolds.map((hold) => (
                  <li key={hold.id} className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {hold.note?.client
                            ? `${hold.note.client.lastName}, ${hold.note.client.firstName}`
                            : 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatReason(hold.holdReason)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(hold.holdPlacedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/billing/holds')}
                        className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Payer Coverage Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Payer Coverage</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats?.payers.byType &&
                Object.entries(stats.payers.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
            <button
              onClick={() => navigate('/billing/payers')}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Payers →
            </button>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Payer Rules Engine</span>
              </div>
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`h-3 w-3 rounded-full mr-2 ${
                    stats?.holds.count === 0 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                ></div>
                <span className="text-sm text-gray-700">Billing Holds</span>
              </div>
              <span
                className={`text-sm font-medium ${
                  stats?.holds.count === 0 ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {stats?.holds.count === 0 ? 'All Clear' : `${stats?.holds.count} Active`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Rule Coverage</span>
              </div>
              <span className="text-sm font-medium text-green-600">
                {stats?.rules.active || 0} Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayerDashboard;
