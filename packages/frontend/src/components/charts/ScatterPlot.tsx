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

interface ScatterPlotProps {
  data: any[];
  xKey: string;
  yKey: string;
  zKey?: string; // For bubble size
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  onPointClick?: (data: any) => void;
  animate?: boolean;
  color?: string;
}

export default function ScatterPlot({
  data,
  xKey,
  yKey,
  zKey,
  title,
  height = 400,
  showGrid = true,
  showLegend = false,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  onPointClick,
  animate = true,
  color = '#6366f1',
}: ScatterPlotProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'scatter-plot');
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-700">
            {xKey}: {formatXAxis ? formatXAxis(data[xKey]) : data[xKey]}
          </p>
          <p className="text-sm text-gray-700">
            {yKey}: {formatYAxis ? formatYAxis(data[yKey]) : data[yKey]}
          </p>
          {zKey && (
            <p className="text-sm text-gray-700">
              {zKey}: {formatTooltip ? formatTooltip(data[zKey]) : data[zKey]}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl shadow-lg overflow-hidden border border-amber-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
        {title && (
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔴</span>
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
        <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis
            dataKey={xKey}
            tickFormatter={formatXAxis}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            name={xKey}
            type="number"
          />
          <YAxis
            dataKey={yKey}
            tickFormatter={formatYAxis}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            name={yKey}
            type="number"
          />
          {zKey && <ZAxis dataKey={zKey} range={[50, 400]} />}
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          {showLegend && <Legend wrapperStyle={{ fontSize: '14px' }} />}
          <Scatter
            name="Data Points"
            data={data}
            fill={color}
            onClick={onPointClick}
            animationDuration={animate ? 1000 : 0}
          />
        </ScatterChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
