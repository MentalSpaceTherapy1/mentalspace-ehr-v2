import React, { useRef } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface AreaChartProps {
  data: any[];
  xKey: string;
  yKeys: { key: string; name: string; color: string }[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  onAreaClick?: (data: any) => void;
  animate?: boolean;
  stacked?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: any; color: string }>;
  label?: string;
  formatTooltip?: (value: any) => string;
}

const CustomTooltip = ({ active, payload, label, formatTooltip }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatTooltip ? formatTooltip(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AreaChart({
  data,
  xKey,
  yKeys,
  title,
  height = 400,
  showGrid = true,
  showLegend = true,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  onAreaClick,
  animate = true,
  stacked = false,
}: AreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'area-chart');
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 rounded-2xl shadow-lg overflow-hidden border border-cyan-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between">
        {title && (
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📉</span>
            {title}
          </h3>
        )}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-lg hover:bg-white/30 transition-all duration-200 border border-white/30"
          aria-label="Export chart as image"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            {yKeys.map((yKey) => (
              <linearGradient key={yKey.key} id={`gradient-${yKey.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={yKey.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={yKey.color} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            dataKey={xKey}
            tickFormatter={formatXAxis}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: '14px' }} />}
          {yKeys.map((yKey) => (
            <Area
              key={yKey.key}
              type="monotone"
              dataKey={yKey.key}
              name={yKey.name}
              stroke={yKey.color}
              strokeWidth={2}
              fill={`url(#gradient-${yKey.key})`}
              fillOpacity={1}
              onClick={onAreaClick}
              animationDuration={animate ? 1000 : 0}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
