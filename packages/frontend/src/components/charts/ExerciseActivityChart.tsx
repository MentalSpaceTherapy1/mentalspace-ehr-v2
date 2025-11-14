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
  Cell,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface ExerciseActivityData {
  week?: string;
  date?: string;
  minutes?: number;
  sessions?: number;
  activity?: string;
  count?: number;
}

interface ExerciseActivityChartProps {
  data: ExerciseActivityData[];
  title?: string;
  height?: number;
  dataKey?: string;
  nameKey?: string;
  barColor?: string;
  showSessions?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: any; color: string; payload?: any }>;
  label?: string;
}

export const ExerciseActivityChart: React.FC<ExerciseActivityChartProps> = ({
  data,
  title = 'Exercise Activity',
  height = 300,
  dataKey = 'minutes',
  nameKey = 'week',
  barColor = '#2196f3',
  showSessions = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'exercise-activity-chart');
    }
  };

  const COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-green-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <p className="text-sm text-green-600">
            {payload[0].name}: {payload[0].value} {dataKey === 'minutes' ? 'min' : ''}
          </p>
          {showSessions && payload[0].payload.sessions && (
            <p className="text-xs text-gray-500">
              {payload[0].payload.sessions} session(s)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏃</span>
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
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              label={{
                value: dataKey === 'minutes' ? 'Minutes' : 'Count',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar dataKey={dataKey} name={dataKey === 'minutes' ? 'Exercise Minutes' : 'Sessions'} radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExerciseActivityChart;
