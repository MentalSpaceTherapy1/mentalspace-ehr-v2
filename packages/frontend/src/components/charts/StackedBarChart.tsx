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
  TooltipProps,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface StackedBarChartProps {
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
  onBarClick?: (data: any) => void;
  animate?: boolean;
}

const CustomTooltip = ({ active, payload, label, formatTooltip }: TooltipProps<any, any> & { formatTooltip?: (value: any) => string }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatTooltip ? formatTooltip(entry.value) : entry.value}
          </p>
        ))}
        <p className="text-sm font-semibold text-gray-900 mt-2 pt-2 border-t">
          Total: {formatTooltip ? formatTooltip(total) : total}
        </p>
      </div>
    );
  }
  return null;
};

export default function StackedBarChart({
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
  onBarClick,
  animate = true,
}: StackedBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'stacked-bar-chart');
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-teal-50 via-green-50 to-emerald-100 rounded-2xl shadow-lg overflow-hidden border border-teal-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-teal-600 to-green-600 px-6 py-4 flex items-center justify-between">
        {title && (
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📊</span>
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
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            <Bar
              key={yKey.key}
              dataKey={yKey.key}
              name={yKey.name}
              fill={yKey.color}
              stackId="stack"
              onClick={onBarClick}
              animationDuration={animate ? 1000 : 0}
              radius={yKey === yKeys[yKeys.length - 1] ? [8, 8, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
