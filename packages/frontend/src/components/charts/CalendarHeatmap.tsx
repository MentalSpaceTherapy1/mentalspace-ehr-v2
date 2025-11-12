import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface HeatmapData {
  date: string;
  value: number;
  label?: string;
}

interface CalendarHeatmapProps {
  data: HeatmapData[];
  title?: string;
  colorScale?: string[];
  maxValue?: number;
  minValue?: number;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  data,
  title = 'Activity Calendar',
  colorScale = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
  maxValue,
  minValue = 0,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'calendar-heatmap');
    }
  };

  // Calculate max value if not provided
  const calculatedMaxValue = maxValue || Math.max(...data.map((d) => d.value));

  // Get color based on value
  const getColor = (value: number): string => {
    if (value === 0) return colorScale[0];

    const normalized = (value - minValue) / (calculatedMaxValue - minValue);
    const index = Math.min(Math.floor(normalized * (colorScale.length - 1)) + 1, colorScale.length - 1);

    return colorScale[index];
  };

  // Group data by week
  const groupByWeek = () => {
    const weeks: { [key: string]: HeatmapData[] } = {};
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedData.forEach((item) => {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(item);
    });

    return weeks;
  };

  const weeks = groupByWeek();
  const weekKeys = Object.keys(weeks).sort();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📅</span>
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
        <div className="flex gap-2 overflow-x-auto pb-4">
          {/* Day labels */}
          <div className="flex flex-col gap-2 mr-2">
            {dayLabels.map((day, index) => (
              <div
                key={day}
                className="h-4 flex items-center text-[10px] text-gray-500"
              >
                {index % 2 === 1 && day}
              </div>
            ))}
          </div>

          {/* Heatmap cells */}
          {weekKeys.map((weekKey) => (
            <div key={weekKey} className="flex flex-col gap-2">
              {dayLabels.map((_, dayIndex) => {
                const item = weeks[weekKey].find((d) => {
                  const date = new Date(d.date);
                  return date.getDay() === dayIndex;
                });

                if (!item) {
                  return <div key={dayIndex} className="w-4 h-4" />;
                }

                return (
                  <div
                    key={item.date}
                    className="w-4 h-4 rounded cursor-pointer transition-all duration-200 hover:scale-125 hover:z-10 shadow-sm"
                    style={{ backgroundColor: getColor(item.value) }}
                    title={`${item.date}\n${item.label || `Value: ${item.value}`}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 bg-white/50 backdrop-blur-sm p-3 rounded-lg">
          <span className="text-xs text-gray-600">Less</span>
          <div className="flex gap-1">
            {colorScale.map((color, index) => (
              <div
                key={index}
                className="w-3 h-3 rounded shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">More</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeatmap;
