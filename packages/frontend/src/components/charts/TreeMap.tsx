import React, { useRef } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface TreeMapProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  title?: string;
  height?: number;
  formatValue?: (value: any) => string;
  onCellClick?: (data: any) => void;
  colors?: string[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

const CustomContent = (props: any) => {
  const { x, y, width, height, index, name, value, colors, formatValue } = props;

  if (width < 30 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length],
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 10}
        textAnchor="middle"
        fill="#fff"
        fontSize={width > 100 ? 14 : 12}
        fontWeight="bold"
      >
        {name}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="#fff"
        fontSize={width > 100 ? 12 : 10}
      >
        {formatValue ? formatValue(value) : value}
      </text>
    </g>
  );
};

export default function TreeMap({
  data,
  nameKey,
  valueKey,
  title,
  height = 400,
  formatValue,
  onCellClick,
  colors = COLORS,
}: TreeMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'tree-map');
    }
  };

  // Transform data for Treemap
  const treemapData = data.map((item, index) => ({
    name: item[nameKey],
    value: item[valueKey],
    index,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-700">
            Value: {formatValue ? formatValue(data.value) : data.value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌳</span>
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
          <Treemap
            data={treemapData}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
            content={<CustomContent colors={colors} formatValue={formatValue} />}
            onClick={onCellClick}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
