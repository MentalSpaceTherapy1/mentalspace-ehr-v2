import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  label?: string;
  height?: number;
  formatValue?: (value: number) => string;
  thresholds?: { value: number; color: string; label?: string }[];
  showValue?: boolean;
}

const DEFAULT_THRESHOLDS = [
  { value: 0, color: '#ef4444', label: 'Low' },
  { value: 40, color: '#f59e0b', label: 'Medium' },
  { value: 70, color: '#10b981', label: 'High' },
];

export default function Gauge({
  value,
  min = 0,
  max = 100,
  title,
  label,
  height = 300,
  formatValue,
  thresholds = DEFAULT_THRESHOLDS,
  showValue = true,
}: GaugeProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'gauge');
    }
  };

  // Calculate percentage and angle
  const percentage = ((value - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 180 - 90; // -90 to 90 degrees

  // Determine color based on thresholds
  const getColor = () => {
    const sortedThresholds = [...thresholds].sort((a, b) => b.value - a.value);
    for (const threshold of sortedThresholds) {
      if (value >= threshold.value) {
        return threshold.color;
      }
    }
    return thresholds[0].color;
  };

  const color = getColor();

  const gaugeSize = height * 0.8;
  const needleLength = gaugeSize / 2 - 20;

  return (
    <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 rounded-2xl shadow-lg overflow-hidden border border-green-200 transition-all duration-300 hover:shadow-2xl" ref={chartRef}>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
        {title && (
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚡</span>
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
        <div className="flex flex-col items-center bg-white p-6 rounded-lg">
        <svg width={gaugeSize} height={gaugeSize / 2 + 50} style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path
            d={`M ${gaugeSize * 0.1} ${gaugeSize / 2} A ${needleLength + 20} ${needleLength + 20} 0 0 1 ${gaugeSize * 0.9} ${gaugeSize / 2}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Colored segments */}
          {thresholds.map((threshold, idx) => {
            const nextThreshold = thresholds[idx + 1];
            const startPercent = ((threshold.value - min) / (max - min)) * 100;
            const endPercent = nextThreshold
              ? ((nextThreshold.value - min) / (max - min)) * 100
              : 100;

            const startAngle = (startPercent / 100) * 180;
            const endAngle = (endPercent / 100) * 180;

            const x1 = gaugeSize / 2 - (needleLength + 20) * Math.cos((startAngle * Math.PI) / 180);
            const y1 = gaugeSize / 2 - (needleLength + 20) * Math.sin((startAngle * Math.PI) / 180);
            const x2 = gaugeSize / 2 - (needleLength + 20) * Math.cos((endAngle * Math.PI) / 180);
            const y2 = gaugeSize / 2 - (needleLength + 20) * Math.sin((endAngle * Math.PI) / 180);

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} A ${needleLength + 20} ${needleLength + 20} 0 0 0 ${x2} ${y2}`}
                fill="none"
                stroke={threshold.color}
                strokeWidth="20"
                strokeLinecap="round"
              />
            );
          })}

          {/* Needle */}
          <g transform={`translate(${gaugeSize / 2}, ${gaugeSize / 2})`}>
            <line
              x1="0"
              y1="0"
              x2={needleLength * Math.cos((angle * Math.PI) / 180)}
              y2={needleLength * Math.sin((angle * Math.PI) / 180)}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="8" fill={color} />
          </g>

          {/* Min/Max labels */}
          <text
            x={gaugeSize * 0.1}
            y={gaugeSize / 2 + 30}
            textAnchor="start"
            className="text-xs fill-gray-600"
          >
            {min}
          </text>
          <text
            x={gaugeSize * 0.9}
            y={gaugeSize / 2 + 30}
            textAnchor="end"
            className="text-xs fill-gray-600"
          >
            {max}
          </text>
        </svg>

        {/* Value display */}
        {showValue && (
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold" style={{ color }}>
              {formatValue ? formatValue(value) : value}
            </div>
            {label && <div className="text-sm text-gray-600 mt-1">{label}</div>}
          </div>
        )}

        {/* Threshold legend */}
        <div className="mt-4 flex gap-4 text-xs">
          {thresholds.map((threshold, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: threshold.color }}
              />
              <span className="text-gray-600">
                {threshold.label || `≥${threshold.value}`}
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
