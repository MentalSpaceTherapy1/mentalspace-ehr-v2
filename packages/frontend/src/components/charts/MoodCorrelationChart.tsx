import React, { useRef } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface MoodCorrelationData {
  x: number;
  y: number;
  label?: string;
  size?: number;
}

interface MoodCorrelationChartProps {
  data: MoodCorrelationData[];
  title?: string;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: any; color: string; payload?: any }>;
  label?: string;
}

export const MoodCorrelationChart: React.FC<MoodCorrelationChartProps> = ({
  data,
  title = 'Mood Correlation',
  height = 300,
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  color = '#9c27b0',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'mood-correlation-chart');
    }
  };

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-purple-200 rounded-lg shadow-lg p-3">
          {payload[0].payload.label && (
            <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.label}</p>
          )}
          <p className="text-sm text-purple-600">
            {xLabel}: {payload[0].value}
          </p>
          <p className="text-sm text-pink-600">
            {yLabel}: {payload[1]?.value || payload[0].payload.y}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">😊</span>
            {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-lg hover:bg-white/30 transition-all duration-200 hover:scale-105"
            aria-label="Export chart as image"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              tick={{ fontSize: 12 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -10 }}
              stroke="#6b7280"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              tick={{ fontSize: 12 }}
              label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
            />
            <ZAxis type="number" dataKey="size" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Scatter name="Data Points" data={data} fill={color} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MoodCorrelationChart;
