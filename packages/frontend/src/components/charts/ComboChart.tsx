import React, { useRef } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
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

interface SeriesConfig {
  key: string;
  name: string;
  color: string;
  type: 'line' | 'bar' | 'area';
  yAxisId?: 'left' | 'right';
}

interface ComboChartProps {
  data: any[];
  xKey: string;
  series: SeriesConfig[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxisLeft?: (value: any) => string;
  formatYAxisRight?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  onElementClick?: (data: any) => void;
  animate?: boolean;
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

export default function ComboChart({
  data,
  xKey,
  series,
  title,
  height = 400,
  showGrid = true,
  showLegend = true,
  formatXAxis,
  formatYAxisLeft,
  formatYAxisRight,
  formatTooltip,
  onElementClick,
  animate = true,
}: ComboChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'combo-chart');
    }
  };

  const hasRightAxis = series.some(s => s.yAxisId === 'right');

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
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
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis
              dataKey={xKey}
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatYAxisLeft}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatYAxisRight}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
            )}
            <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '14px' }} />}
            {series.map((s) => {
              const commonProps = {
                key: s.key,
                dataKey: s.key,
                name: s.name,
                yAxisId: s.yAxisId || 'left',
                onClick: onElementClick,
                animationDuration: animate ? 1000 : 0,
              };

              if (s.type === 'line') {
                return (
                  <Line
                    {...commonProps}
                    type="monotone"
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ fill: s.color, r: 4 }}
                  />
                );
              } else if (s.type === 'bar') {
                return (
                  <Bar
                    {...commonProps}
                    fill={s.color}
                    radius={[8, 8, 0, 0]}
                  />
                );
              } else if (s.type === 'area') {
                return (
                  <Area
                    {...commonProps}
                    type="monotone"
                    fill={s.color}
                    fillOpacity={0.6}
                    stroke={s.color}
                    strokeWidth={2}
                  />
                );
              }
              return null;
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
