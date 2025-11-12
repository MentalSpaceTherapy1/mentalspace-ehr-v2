import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface LocationData {
  name: string;
  lat: number;
  lng: number;
  value: number;
}

interface GeographicMapProps {
  data: LocationData[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  onMarkerClick?: (location: LocationData) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

export default function GeographicMap({
  data,
  title,
  height = 500,
  formatValue,
  onMarkerClick,
  centerLat = 33.749, // Default to Georgia
  centerLng = -84.388,
  zoom = 7,
}: GeographicMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'geographic-map');
    }
  };

  // Find min and max values for sizing
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const getMarkerSize = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    return 10 + normalized * 30; // 10 to 40 pixels
  };

  const getMarkerColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    if (normalized < 0.33) return '#10b981'; // Green
    if (normalized < 0.66) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="relative bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
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
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl">
          <div
            className="bg-gradient-to-br from-blue-100 to-cyan-200 rounded-lg relative overflow-hidden"
            style={{ height }}
          >
            {/* Placeholder map background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-700 font-medium mb-2">Geographic Map Visualization</p>
                <p className="text-sm text-gray-600">
                  This is a placeholder. For production, integrate with Google Maps, Mapbox, or Leaflet.
                </p>
              </div>
            </div>

            {/* Data points overlay */}
            <div className="absolute inset-0">
              {data.map((location, idx) => {
                const size = getMarkerSize(location.value);
                const color = getMarkerColor(location.value);

                // Simple projection (this would use actual map coordinates in production)
                const x = ((location.lng + 180) / 360) * 100;
                const y = ((90 - location.lat) / 180) * 100;

                return (
                  <div
                    key={idx}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-all duration-200"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    onClick={() => onMarkerClick?.(location)}
                  >
                    <div
                      className="rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold animate-pulse hover:animate-none"
                      style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                      }}
                      title={`${location.name}: ${formatValue ? formatValue(location.value) : location.value}`}
                    >
                      {location.value}
                    </div>
                    <div className="text-xs text-gray-900 font-medium mt-1 whitespace-nowrap">
                      {location.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between text-xs bg-white/50 backdrop-blur-sm p-3 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow" />
                <span className="text-gray-700">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow" />
                <span className="text-gray-700">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow" />
                <span className="text-gray-700">High</span>
              </div>
            </div>
            <div className="text-gray-700 font-medium">
              {data.length} locations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
