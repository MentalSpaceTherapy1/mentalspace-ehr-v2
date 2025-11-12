import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface HeatMapProps {
  data: any[];
  xKey: string;
  yKey: string;
  valueKey: string;
  title?: string;
  height?: number;
  formatValue?: (value: any) => string;
  onCellClick?: (data: any) => void;
  colorScale?: string[];
  showValues?: boolean;
}

const DEFAULT_COLOR_SCALE = [
  '#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8',
  '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'
];

export default function HeatMap({
  data,
  xKey,
  yKey,
  valueKey,
  title,
  height = 400,
  formatValue,
  onCellClick,
  colorScale = DEFAULT_COLOR_SCALE,
  showValues = true,
}: HeatMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'heat-map');
    }
  };

  // Get unique x and y values
  const xValues = Array.from(new Set(data.map(d => d[xKey]))).sort();
  const yValues = Array.from(new Set(data.map(d => d[yKey]))).sort();

  // Find min and max values for color scaling
  const values = data.map(d => d[valueKey]).filter(v => v !== null && v !== undefined);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const getColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '#f3f4f6';
    const normalized = (value - minValue) / (maxValue - minValue);
    const index = Math.floor(normalized * (colorScale.length - 1));
    return colorScale[index];
  };

  const getValue = (x: any, y: any) => {
    const cell = data.find(d => d[xKey] === x && d[yKey] === y);
    return cell ? cell[valueKey] : null;
  };

  const cellSize = Math.min(
    (height - 100) / yValues.length,
    600 / xValues.length
  );

  return (
    <div className="relative bg-gradient-to-br from-red-50 via-orange-50 to-red-100 rounded-2xl shadow-lg overflow-hidden border border-red-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between">
        {title && (
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔥</span>
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
        <div className="overflow-x-auto bg-white p-4 rounded-lg">
        <div className="inline-block min-w-full">
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-around mr-2">
              <div style={{ height: cellSize }} /> {/* Header spacer */}
              {yValues.map((y, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-end text-xs font-medium text-gray-700"
                  style={{ height: cellSize }}
                >
                  {y}
                </div>
              ))}
            </div>
            {/* Heat map grid */}
            <div>
              {/* X-axis labels */}
              <div className="flex mb-1">
                {xValues.map((x, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-center text-xs font-medium text-gray-700"
                    style={{ width: cellSize }}
                  >
                    {x}
                  </div>
                ))}
              </div>
              {/* Grid cells */}
              {yValues.map((y, yIdx) => (
                <div key={yIdx} className="flex">
                  {xValues.map((x, xIdx) => {
                    const value = getValue(x, y);
                    const bgColor = getColor(value);
                    return (
                      <div
                        key={xIdx}
                        className="border border-gray-200 flex items-center justify-center cursor-pointer hover:opacity-75 transition"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: bgColor,
                        }}
                        onClick={() => onCellClick?.({ x, y, value })}
                        title={`${x} - ${y}: ${formatValue ? formatValue(value) : value}`}
                      >
                        {showValues && value !== null && value !== undefined && (
                          <span className="text-xs font-semibold" style={{
                            color: value > (maxValue - minValue) / 2 + minValue ? '#ffffff' : '#000000'
                          }}>
                            {formatValue ? formatValue(value) : value}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Color scale legend */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-gray-600">Low</span>
            <div className="flex h-4 rounded overflow-hidden" style={{ width: 200 }}>
              {colorScale.map((color, idx) => (
                <div
                  key={idx}
                  style={{ backgroundColor: color, flex: 1 }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">High</span>
            <span className="text-xs text-gray-600 ml-2">
              ({formatValue ? formatValue(minValue) : minValue} - {formatValue ? formatValue(maxValue) : maxValue})
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
