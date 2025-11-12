/**
 * Module 8: AI & Predictive Analytics
 * Predictions Dashboard - Main dashboard for all ML predictions and forecasts
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RevenueForecast } from '../../components/Predictions/RevenueForecast';
import { DemandForecast } from '../../components/Predictions/DemandForecast';

interface DashboardData {
  models: {
    modelType: string;
    name: string;
    description: string;
    version: string;
    algorithm: string;
    features: string[];
    status: string;
  }[];
  revenue: {
    summary: {
      totalPredicted: number;
      averageDaily: number;
      trend: string;
      trendPercent: number;
      confidence: number;
    };
    baseline: {
      last30Days: number;
      last60Days: number;
      last90Days: number;
    };
  };
  demand: {
    summary: {
      totalPredictedAppointments: number;
      averageDailyDemand: number;
      peakDays: string[];
      peakHours: number[];
      averageUtilization: number;
      capacityRecommendations: string[];
    };
  };
  insights: {
    type: string;
    severity: string;
    message: string;
    recommendation: string;
  }[];
}

export const PredictionsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'demand' | 'models'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/predictions/dashboard');
      setDashboardData(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 text-yellow-900';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-900';
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-900';
      default:
        return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 text-blue-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '🚨';
      case 'success':
        return '✅';
      default:
        return '💡';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-700 font-semibold">Loading AI predictions...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-300 rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-4">
              <span className="text-5xl mr-4">🚨</span>
              <h3 className="text-2xl font-bold text-red-900">Error Loading Dashboard</h3>
            </div>
            <p className="text-red-800 mb-6 text-lg">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-bold"
            >
              <span className="mr-2">🔄</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center">
            <span className="mr-4">🤖</span> AI & Predictive Analytics
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Advanced machine learning models for no-show prediction, dropout risk, revenue forecasting, and demand planning
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-2 inline-flex space-x-2">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'revenue', label: 'Revenue Forecast', icon: '💰' },
              { id: 'demand', label: 'Demand Forecast', icon: '📅' },
              { id: 'models', label: 'ML Models', icon: '🤖' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-600 uppercase">Revenue Forecast</h3>
                  <span className="text-4xl">💰</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {formatCurrency(dashboardData.revenue.summary.totalPredicted)}
                </div>
                <div className="text-sm text-gray-600 mb-3">Next 30 days</div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-2xl ${
                      dashboardData.revenue.summary.trend === 'INCREASING'
                        ? 'text-green-600'
                        : dashboardData.revenue.summary.trend === 'DECREASING'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {dashboardData.revenue.summary.trend === 'INCREASING' ? '📈' :
                     dashboardData.revenue.summary.trend === 'DECREASING' ? '📉' : '➡️'}
                  </span>
                  <span className={`font-bold ${
                      dashboardData.revenue.summary.trend === 'INCREASING'
                        ? 'text-green-600'
                        : dashboardData.revenue.summary.trend === 'DECREASING'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                    {Math.abs(dashboardData.revenue.summary.trendPercent).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-6 hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-600 uppercase">Predicted Appointments</h3>
                  <span className="text-4xl">📅</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {dashboardData.demand.summary.totalPredictedAppointments}
                </div>
                <div className="text-sm text-gray-600 mb-3">Next 30 days</div>
                <div className="text-sm font-semibold text-blue-600">
                  Avg: {dashboardData.demand.summary.averageDailyDemand.toFixed(1)}/day
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6 hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-600 uppercase">Capacity Utilization</h3>
                  <span className="text-4xl">⚡</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                  {dashboardData.demand.summary.averageUtilization.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 mb-3">Average utilization</div>
                <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      dashboardData.demand.summary.averageUtilization > 85
                        ? 'bg-gradient-to-r from-red-500 to-rose-600'
                        : dashboardData.demand.summary.averageUtilization > 65
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-600'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600'
                    }`}
                    style={{ width: `${dashboardData.demand.summary.averageUtilization}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-6 hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-600 uppercase">Active ML Models</h3>
                  <span className="text-4xl">🤖</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {dashboardData.models.filter(m => m.status === 'ACTIVE').length}
                </div>
                <div className="text-sm text-gray-600 mb-3">Production ready</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">✅</span>
                  <span className="text-sm font-bold text-green-600">All systems operational</span>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {dashboardData.insights.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center">
                  <span className="mr-3">💡</span> AI Insights & Recommendations
                </h2>
                <div className="space-y-4">
                  {dashboardData.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-2xl p-6 ${getSeverityColor(insight.severity)} shadow-lg hover:shadow-xl transition-all duration-200`}
                    >
                      <div className="flex items-start">
                        <span className="text-3xl mr-4">{getSeverityIcon(insight.severity)}</span>
                        <div className="flex-1">
                          <div className="font-bold text-lg mb-2">{insight.message}</div>
                          <div className="text-sm opacity-90 mb-3">{insight.recommendation}</div>
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white bg-opacity-50">
                            {insight.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-blue-200 hover:shadow-2xl transition-all duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📆</span> Peak Demand Days
                </h3>
                <div className="flex flex-wrap gap-3">
                  {dashboardData.demand.summary.peakDays.map((day, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-4 font-medium">
                  ℹ️ These days typically have the highest appointment volume
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-green-200 hover:shadow-2xl transition-all duration-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">⏰</span> Peak Demand Hours
                </h3>
                <div className="flex flex-wrap gap-3">
                  {dashboardData.demand.summary.peakHours.map((hour, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {hour}:00 - {hour + 1}:00
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-4 font-medium">
                  ℹ️ Ensure adequate staffing during these high-demand times
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 border-2 border-purple-300 rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-3">⚡</span> Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('revenue')}
                  className="flex items-center p-5 bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-green-200"
                >
                  <span className="text-4xl mr-4">💰</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg">View Revenue Forecast</div>
                    <div className="text-sm text-gray-600">30/60/90 day projections</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('demand')}
                  className="flex items-center p-5 bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-blue-200"
                >
                  <span className="text-4xl mr-4">📅</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg">View Demand Forecast</div>
                    <div className="text-sm text-gray-600">Capacity & staffing insights</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('models')}
                  className="flex items-center p-5 bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-purple-200"
                >
                  <span className="text-4xl mr-4">🤖</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg">View ML Models</div>
                    <div className="text-sm text-gray-600">Model details & performance</div>
                  </div>
                </button>

                <button
                  onClick={fetchDashboardData}
                  className="flex items-center p-5 bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-amber-200"
                >
                  <span className="text-4xl mr-4">🔄</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg">Refresh All Data</div>
                    <div className="text-sm text-gray-600">Update predictions</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div>
            <RevenueForecast onRefresh={fetchDashboardData} />
          </div>
        )}

        {activeTab === 'demand' && (
          <div>
            <DemandForecast onRefresh={fetchDashboardData} />
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center">
                <span className="mr-3">🤖</span> Active Machine Learning Models
              </h2>
              <div className="space-y-4">
                {dashboardData.models.map((model, index) => (
                  <div
                    key={index}
                    className="border-2 border-purple-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-purple-50 to-pink-50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl mb-2">{model.name}</h3>
                        <p className="text-sm text-gray-700">{model.description}</p>
                      </div>
                      <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">
                        ✅ {model.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-600 mb-1">VERSION</div>
                        <div className="text-sm font-bold text-purple-600">{model.version}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-600 mb-1">ALGORITHM</div>
                        <div className="text-sm font-bold text-pink-600">{model.algorithm}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-600 mb-1">MODEL TYPE</div>
                        <div className="text-sm font-bold text-indigo-600">
                          {model.modelType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-600 mb-3">FEATURES:</div>
                      <div className="flex flex-wrap gap-2">
                        {model.features.map((feature, fIndex) => (
                          <span
                            key={fIndex}
                            className="px-3 py-1 bg-white text-purple-700 rounded-lg text-xs font-medium shadow-sm border border-purple-200"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionsDashboard;
