/**
 * Module 8: AI & Predictive Analytics
 * Demand Forecast - Heat map of predicted appointment demand
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface DemandForecast {
  period: number;
  forecasts: {
    date: string;
    dayOfWeek: string;
    hourlyDemand: {
      hour: number;
      predicted: number;
      capacity: number;
      utilization: number;
    }[];
    totalPredicted: number;
  }[];
  summary: {
    totalPredictedAppointments: number;
    averageDailyDemand: number;
    peakDays: string[];
    peakHours: number[];
    averageUtilization: number;
    capacityRecommendations: string[];
  };
  staffingRecommendations: {
    date: string;
    dayOfWeek: string;
    recommendations: {
      hour: number;
      suggestedStaff: number;
      reason: string;
    }[];
  }[];
}

interface DemandForecastProps {
  period?: number;
  onRefresh?: () => void;
}

export const DemandForecast: React.FC<DemandForecastProps> = ({
  period = 30,
  onRefresh
}) => {
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    fetchForecast();
  }, [selectedPeriod]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/predictions/demand?period=${selectedPeriod}`);
      setForecast(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching demand forecast:', err);
      setError(err.response?.data?.message || 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchForecast();
    if (onRefresh) {
      onRefresh();
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 75) return 'bg-orange-500';
    if (utilization >= 50) return 'bg-yellow-500';
    if (utilization >= 25) return 'bg-green-500';
    return 'bg-blue-300';
  };

  const getUtilizationText = (utilization: number) => {
    if (utilization >= 90) return 'text-white';
    if (utilization >= 50) return 'text-gray-900';
    return 'text-gray-700';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm">
        <div className="text-red-600 mb-2">Failed to load demand forecast</div>
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  const selectedDayData = forecast.forecasts[selectedDay];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Appointment Demand Forecast</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
          <button
            onClick={handleRefresh}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Total Appointments</div>
          <div className="text-lg font-bold text-gray-900">
            {forecast.summary.totalPredictedAppointments}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Avg Daily Demand</div>
          <div className="text-lg font-bold text-gray-900">
            {forecast.summary.averageDailyDemand.toFixed(1)}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Avg Utilization</div>
          <div className="text-lg font-bold text-gray-900">
            {forecast.summary.averageUtilization.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Peak Days</div>
          <div className="text-sm font-semibold text-gray-900">
            {forecast.summary.peakDays.join(', ')}
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Select Day to View:
        </label>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(parseInt(e.target.value))}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          {forecast.forecasts.map((day, index) => (
            <option key={index} value={index}>
              {formatDate(day.date)} - {day.dayOfWeek} ({day.totalPredicted} appointments)
            </option>
          ))}
        </select>
      </div>

      {/* Hourly Heat Map */}
      {selectedDayData && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Hourly Demand Heat Map - {selectedDayData.dayOfWeek}, {formatDate(selectedDayData.date)}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {selectedDayData.hourlyDemand.map((hour) => (
              <div
                key={hour.hour}
                className={`${getUtilizationColor(
                  hour.utilization
                )} rounded p-3 text-center ${getUtilizationText(hour.utilization)}`}
              >
                <div className="font-bold text-sm">
                  {hour.hour}:00 - {hour.hour + 1}:00
                </div>
                <div className="text-xs mt-1">
                  {hour.predicted} / {hour.capacity}
                </div>
                <div className="text-xs font-semibold mt-1">
                  {hour.utilization.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-300 rounded mr-1"></div>
              <span>0-25%</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-1"></div>
              <span>25-50%</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded mr-1"></div>
              <span>50-75%</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded mr-1"></div>
              <span>75-90%</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-1"></div>
              <span>90%+</span>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Recommendations */}
      {forecast.summary.capacityRecommendations.length > 0 && (
        <div className="mb-6 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Capacity Recommendations
          </h4>
          <div className="space-y-2">
            {forecast.summary.capacityRecommendations.map((rec, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900"
              >
                <span className="text-blue-500 mr-2">💡</span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staffing Recommendations */}
      {forecast.staffingRecommendations.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Staffing Recommendations (Next 7 Days)
          </h4>
          <div className="space-y-3">
            {forecast.staffingRecommendations.slice(0, 7).map((day, dayIndex) => (
              <div key={dayIndex} className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="font-semibold text-sm text-gray-900 mb-2">
                  {day.dayOfWeek}, {formatDate(day.date)}
                </div>
                <div className="space-y-1">
                  {day.recommendations.map((rec, recIndex) => (
                    <div key={recIndex} className="text-xs text-gray-700 flex items-start">
                      <span className="text-orange-500 mr-2">→</span>
                      <span>
                        <strong>{rec.hour}:00</strong> - {rec.suggestedStaff} staff -{' '}
                        {rec.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Hours Insight */}
      {forecast.summary.peakHours.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">⚡</span>
            <div className="text-sm text-yellow-900">
              Peak demand hours are typically{' '}
              {forecast.summary.peakHours.map(h => `${h}:00`).join(', ')}.
              Ensure adequate staffing during these times for optimal service delivery.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandForecast;
