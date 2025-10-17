import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  benchmark?: number;
  status?: 'success' | 'warning' | 'danger';
  inverted?: boolean; // If true, lower is better
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  realtime?: boolean;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  benchmark,
  status,
  inverted = false,
  trend,
  realtime = false,
}: MetricCardProps) {
  // Determine status color
  const getStatusColor = () => {
    if (status) {
      return {
        success: 'bg-green-50 border-green-200',
        warning: 'bg-yellow-50 border-yellow-200',
        danger: 'bg-red-50 border-red-200',
      }[status];
    }
    return 'bg-white border-gray-200';
  };

  const getValueColor = () => {
    if (status) {
      return {
        success: 'text-green-700',
        warning: 'text-yellow-700',
        danger: 'text-red-700',
      }[status];
    }
    return 'text-gray-900';
  };

  const getStatusIcon = () => {
    if (!status) return null;

    const iconProps = { className: 'w-6 h-6' };

    switch (status) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-6 h-6 text-green-600" />;
      case 'warning':
        return <AlertCircle {...iconProps} className="w-6 h-6 text-yellow-600" />;
      case 'danger':
        return <AlertCircle {...iconProps} className="w-6 h-6 text-red-600" />;
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    const iconProps = { className: 'w-4 h-4' };

    switch (trend.direction) {
      case 'up':
        return <TrendingUp {...iconProps} className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown {...iconProps} className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <Minus {...iconProps} className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={`rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </h3>
          {realtime && (
            <div className="flex items-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>
        {getStatusIcon()}
      </div>

      {/* Value */}
      <div className="mb-2">
        <div className={`text-4xl font-bold ${getValueColor()}`}>
          {value}
        </div>
      </div>

      {/* Subtitle or Benchmark */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-2">{subtitle}</p>
      )}

      {benchmark !== undefined && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Target:</span>
          <span className="font-semibold text-gray-700">{benchmark}%</span>
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${
            trend.direction === 'up' ? 'text-green-600' :
            trend.direction === 'down' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {Math.abs(trend.value)}% from last week
          </span>
        </div>
      )}
    </div>
  );
}
