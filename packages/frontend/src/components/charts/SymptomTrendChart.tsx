import React, { useRef } from 'react';
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
  AreaChart,
  TooltipProps,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface SymptomTrendData {
  date: string;
  averageSeverity: number;
  logCount?: number;
}

interface SymptomTrendChartProps {
  data: SymptomTrendData[];
  title?: string;
  height?: number;
  showArea?: boolean;
}

export const SymptomTrendChart: React.FC<SymptomTrendChartProps> = ({
  data,
  title = 'Symptom Severity Over Time',
  height = 300,
  showArea = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'symptom-trend-chart');
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-rose-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <p className="text-sm text-rose-600">
            Severity: {payload[0].value.toFixed(1)}
          </p>
          {payload[0].payload.logCount && (
            <p className="text-xs text-gray-500">
              {payload[0].payload.logCount} log(s)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const ChartComponent = showArea ? AreaChart : LineChart;
  const DataComponent = showArea ? Area : Line;

  return (
    <div className="relative bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💊</span>
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
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              label={{ value: 'Severity (1-10)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {showArea ? (
              <Area
                type="monotone"
                dataKey="averageSeverity"
                stroke="#f43f5e"
                fill="#f43f5e"
                fillOpacity={0.3}
                name="Severity"
              />
            ) : (
              <Line
                type="monotone"
                dataKey="averageSeverity"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ fill: '#f43f5e', r: 5 }}
                activeDot={{ r: 7 }}
                name="Severity"
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SymptomTrendChart;
