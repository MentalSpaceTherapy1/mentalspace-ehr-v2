import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparkLineProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
  width?: number;
  showDots?: boolean;
  strokeWidth?: number;
}

export default function SparkLine({
  data,
  dataKey,
  color = '#6366f1',
  height = 40,
  width = 100,
  showDots = false,
  strokeWidth = 2,
}: SparkLineProps) {
  if (!data || data.length === 0) {
    return <div style={{ width, height }} className="bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100 rounded-lg border border-violet-200" />;
  }

  // Calculate trend
  const values = data.map(d => d[dataKey]);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'neutral';

  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : color;

  return (
    <div className="inline-flex items-center gap-2 bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100 rounded-lg px-3 py-2 border border-violet-200 shadow-md hover:shadow-lg transition-all duration-200">
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={trendColor}
            strokeWidth={strokeWidth}
            dot={showDots}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
      {trend === 'up' && (
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-green-600">⚡</span>
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 10l5-5 5 5H5z" />
          </svg>
        </div>
      )}
      {trend === 'down' && (
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-red-600">⚡</span>
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 10l-5 5-5-5h10z" />
          </svg>
        </div>
      )}
    </div>
  );
}
