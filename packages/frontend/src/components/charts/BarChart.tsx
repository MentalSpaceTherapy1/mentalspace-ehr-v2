import React, { useRef } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface BarChartProps {
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
  horizontal?: boolean;
  colorByValue?: boolean;
}

const CustomTooltip = ({ active, payload, label, formatTooltip }: TooltipProps<any, any> & { formatTooltip?: (value: any) => string }) => {
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

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function BarChart({
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
  horizontal = false,
  colorByValue = false,
}: BarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'bar-chart');
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 rounded-2xl shadow-lg overflow-hidden border border-indigo-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
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
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          layout={horizontal ? 'vertical' : 'horizontal'}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={formatYAxis} stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis dataKey={xKey} type="category" tickFormatter={formatXAxis} stroke="#6b7280" style={{ fontSize: '12px' }} width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tickFormatter={formatXAxis} stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis tickFormatter={formatYAxis} stroke="#6b7280" style={{ fontSize: '12px' }} />
            </>
          )}
          <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: '14px' }} />}
          {yKeys.map((yKey, index) => (
            <Bar
              key={yKey.key}
              dataKey={yKey.key}
              name={yKey.name}
              fill={yKey.color}
              onClick={onBarClick}
              animationDuration={animate ? 1000 : 0}
              radius={[8, 8, 0, 0]}
            >
              {colorByValue && data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
