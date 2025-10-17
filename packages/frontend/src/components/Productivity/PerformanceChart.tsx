import React from 'react';
import { useMetricsHistory } from '../../hooks/productivity/useProductivityMetrics';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceChartProps {
  userId: string;
  metricType?: string;
  title?: string;
  height?: number;
}

export default function PerformanceChart({
  userId,
  metricType,
  title = 'Performance Trend',
  height = 300,
}: PerformanceChartProps) {
  const { data: historyData, isLoading, error } = useMetricsHistory(userId, metricType);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Loading trend data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !historyData || historyData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <p className="text-gray-500">No trend data available</p>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions
  const maxValue = Math.max(...historyData.map((d: any) => d.value));
  const minValue = Math.min(...historyData.map((d: any) => d.value));
  const valueRange = maxValue - minValue || 1;

  // Calculate trend
  const firstValue = historyData[0]?.value || 0;
  const lastValue = historyData[historyData.length - 1]?.value || 0;
  const trendDirection = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable';
  const trendPercentage = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {trendDirection === 'up' ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : trendDirection === 'down' ? (
            <TrendingDown className="w-5 h-5 text-red-600" />
          ) : null}
          <span
            className={`text-sm font-semibold ${
              trendDirection === 'up'
                ? 'text-green-600'
                : trendDirection === 'down'
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
          >
            {trendPercentage > 0 ? '+' : ''}
            {trendPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-600 font-semibold">
          <span>{maxValue.toFixed(0)}</span>
          <span>{((maxValue + minValue) / 2).toFixed(0)}</span>
          <span>{minValue.toFixed(0)}</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-14 right-0 top-0 bottom-8">
          {/* Grid lines */}
          <div className="absolute inset-0">
            <div className="h-full border-l border-b border-gray-200 relative">
              <div className="absolute top-0 left-0 right-0 border-t border-gray-200"></div>
              <div className="absolute top-1/2 left-0 right-0 border-t border-gray-200"></div>
            </div>
          </div>

          {/* Line graph */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Generate path for line */}
            <path
              d={historyData
                .map((point: any, index: number) => {
                  const x = (index / (historyData.length - 1)) * 100;
                  const y = ((maxValue - point.value) / valueRange) * 100;
                  return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                })
                .join(' ')}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            {/* Data points */}
            {historyData.map((point: any, index: number) => {
              const x = (index / (historyData.length - 1)) * 100;
              const y = ((maxValue - point.value) / valueRange) * 100;

              return (
                <g key={index}>
                  <circle cx={`${x}%`} cy={`${y}%`} r="5" fill="#6366f1" />
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="8"
                    fill="transparent"
                    className="hover:fill-indigo-200 cursor-pointer transition-all"
                  >
                    <title>
                      {new Date(point.periodStart).toLocaleDateString()}: {point.value.toFixed(1)}
                    </title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-14 right-0 bottom-0 h-6 flex justify-between text-xs text-gray-600 font-semibold">
          {historyData.map((point: any, index: number) => {
            // Only show labels for first, middle, and last points to avoid overcrowding
            if (index === 0 || index === Math.floor(historyData.length / 2) || index === historyData.length - 1) {
              return (
                <span key={index}>
                  {new Date(point.periodStart).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-600">Current: </span>
            <span className="font-bold text-gray-900">{lastValue.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-600">Average: </span>
            <span className="font-bold text-gray-900">
              {(historyData.reduce((sum: number, d: any) => sum + d.value, 0) / historyData.length).toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Peak: </span>
            <span className="font-bold text-gray-900">{maxValue.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
