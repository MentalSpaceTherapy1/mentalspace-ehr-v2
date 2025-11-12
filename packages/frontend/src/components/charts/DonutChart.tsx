import React, { useRef, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface DonutChartProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  title?: string;
  height?: number;
  showLegend?: boolean;
  formatTooltip?: (value: any) => string;
  onSliceClick?: (data: any) => void;
  animate?: boolean;
  colors?: string[];
  centerLabel?: string;
  centerValue?: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

export default function DonutChart({
  data,
  nameKey,
  valueKey,
  title,
  height = 400,
  showLegend = true,
  formatTooltip,
  onSliceClick,
  animate = true,
  colors = COLORS,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'donut-chart');
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = payload[0].payload.totalValue || data.value;
      const percent = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-700">
            Value: {formatTooltip ? formatTooltip(data.value) : data.value}
          </p>
          <p className="text-sm text-gray-700">
            Percentage: {percent}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCenterLabel = () => {
    if (!centerLabel && !centerValue) return null;

    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
        {centerLabel && (
          <tspan x="50%" dy="-0.5em" className="text-sm fill-gray-600">
            {centerLabel}
          </tspan>
        )}
        {centerValue && (
          <tspan x="50%" dy="1.5em" className="text-2xl font-bold fill-gray-900">
            {centerValue}
          </tspan>
        )}
      </text>
    );
  };

  return (
    <div className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 rounded-2xl shadow-lg overflow-hidden border border-purple-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
        {title && (
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🍩</span>
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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={height / 4}
            outerRadius={height / 3}
            fill="#8884d8"
            paddingAngle={2}
            dataKey={valueKey}
            nameKey={nameKey}
            onClick={onSliceClick}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            animationDuration={animate ? 1000 : 0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.6}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: '14px' }}
            />
          )}
          {renderCenterLabel()}
        </PieChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
