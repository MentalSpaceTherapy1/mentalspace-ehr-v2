/**
 * Module 8: AI & Predictive Analytics
 * Revenue Forecast - Line chart with forecast and confidence intervals
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

interface RevenueForecast {
  period: number;
  forecasts: {
    date: string;
    predicted: number;
    lower: number;
    upper: number;
  }[];
  summary: {
    totalPredicted: number;
    averageDaily: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    trendPercent: number;
    confidence: number;
  };
  historicalBaseline: {
    last30Days: number;
    last60Days: number;
    last90Days: number;
  };
}

interface RevenueForecastProps {
  period?: number;
  onRefresh?: () => void;
}

export const RevenueForecast: React.FC<RevenueForecastProps> = ({
  period = 30,
  onRefresh
}) => {
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchForecast();
  }, [selectedPeriod]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/predictions/revenue?period=${selectedPeriod}`);
      setForecast(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching revenue forecast:', err);
      setError(err.response?.data?.message || 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchForecast();
    if (onRefresh) {
      onRefresh();
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return 'text-green-600';
      case 'DECREASING':
        return 'text-red-600';
      case 'STABLE':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return '📈';
      case 'DECREASING':
        return '📉';
      case 'STABLE':
        return '➡️';
      default:
        return '•';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm">
        <div className="text-red-600 mb-2">Failed to load revenue forecast</div>
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  // Prepare chart data
  const chartData = forecast.forecasts.map(f => ({
    date: formatDate(f.date),
    fullDate: f.date,
    predicted: f.predicted,
    lower: f.lower,
    upper: f.upper,
    range: [f.lower, f.upper]
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Forecast</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
            <option value={60}>60 Days</option>
            <option value={90}>90 Days</option>
          </select>
          <button
            onClick={handleRefresh}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Total Forecast</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(forecast.summary.totalPredicted)}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Avg Daily</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(forecast.summary.averageDaily)}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Trend</div>
          <div className={`text-lg font-bold ${getTrendColor(forecast.summary.trend)}`}>
            {getTrendIcon(forecast.summary.trend)}{' '}
            {Math.abs(forecast.summary.trendPercent).toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Confidence</div>
          <div className="text-lg font-bold text-gray-900">
            {(forecast.summary.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value: any) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            />
            <Legend />

            {/* Confidence interval area */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              name="Lower Bound"
            />

            {/* Predicted line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              name="Predicted Revenue"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Historical Baseline */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Historical Baseline</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-600 mb-1">Last 30 Days</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(forecast.historicalBaseline.last30Days)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Last 60 Days</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(forecast.historicalBaseline.last60Days)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Last 90 Days</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(forecast.historicalBaseline.last90Days)}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {forecast.summary.trend !== 'STABLE' && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">💡</span>
            <div className="text-sm text-blue-900">
              {forecast.summary.trend === 'INCREASING' ? (
                <span>
                  Revenue is trending upward by {forecast.summary.trendPercent.toFixed(1)}%.
                  Continue current strategies and monitor client satisfaction.
                </span>
              ) : (
                <span>
                  Revenue is trending downward by {Math.abs(forecast.summary.trendPercent).toFixed(1)}%.
                  Consider reviewing client retention strategies and marketing efforts.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueForecast;
