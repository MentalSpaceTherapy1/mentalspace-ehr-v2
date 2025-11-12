import React, { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  TooltipProps,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface SleepQualityData {
  date: string;
  hoursSlept?: number;
  quality?: number;
}

interface SleepQualityChartProps {
  data: SleepQualityData[];
  title?: string;
  height?: number;
  showHours?: boolean;
  showQuality?: boolean;
}

export const SleepQualityChart: React.FC<SleepQualityChartProps> = ({
  data,
  title = 'Sleep Quality',
  height = 300,
  showHours = true,
  showQuality = true,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'sleep-quality-chart');
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-indigo-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {showHours && payload.find((p: any) => p.dataKey === 'hoursSlept') && (
            <p className="text-sm text-indigo-600">
              Hours: {payload.find((p: any) => p.dataKey === 'hoursSlept').value.toFixed(1)}
            </p>
          )}
          {showQuality && payload.find((p: any) => p.dataKey === 'quality') && (
            <p className="text-sm text-purple-600">
              Quality: {payload.find((p: any) => p.dataKey === 'quality').value}/5
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">😴</span>
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
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis
              yAxisId="left"
              domain={[0, 12]}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 5]}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              label={{ value: 'Quality (1-5)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {showHours && (
              <Bar
                yAxisId="left"
                dataKey="hoursSlept"
                fill="#6366f1"
                name="Hours Slept"
                radius={[8, 8, 0, 0]}
              />
            )}
            {showQuality && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="quality"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5 }}
                name="Quality"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SleepQualityChart;
