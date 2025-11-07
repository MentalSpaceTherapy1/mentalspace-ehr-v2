import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import ProviderUtilizationReport from './ProviderUtilizationReport';
import NoShowRatesReport from './NoShowRatesReport';
import RevenueAnalysisReport from './RevenueAnalysisReport';
import CancellationPatternsReport from './CancellationPatternsReport';
import CapacityPlanningReport from './CapacityPlanningReport';

type ReportType = 'utilization' | 'no-show' | 'revenue' | 'cancellation' | 'capacity';

export default function AnalyticsDashboard() {
  const [activeReport, setActiveReport] = useState<ReportType>('utilization');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const reports = [
    { id: 'utilization' as ReportType, name: 'Provider Utilization', icon: '📊', color: 'purple' },
    { id: 'no-show' as ReportType, name: 'No-Show Rates', icon: '❌', color: 'red' },
    { id: 'revenue' as ReportType, name: 'Revenue Analysis', icon: '💰', color: 'green' },
    { id: 'cancellation' as ReportType, name: 'Cancellation Patterns', icon: '🔄', color: 'orange' },
    { id: 'capacity' as ReportType, name: 'Capacity Planning', icon: '📈', color: 'blue' },
  ];

  const handleQuickDate = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handleThisMonth = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      purple: isActive
        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
        : 'bg-purple-50 text-purple-700 hover:bg-purple-100',
      red: isActive
        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
        : 'bg-red-50 text-red-700 hover:bg-red-100',
      green: isActive
        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
        : 'bg-green-50 text-green-700 hover:bg-green-100',
      orange: isActive
        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
        : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
      blue: isActive
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
        : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    };
    return colors[color as keyof typeof colors] || colors.purple;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
          <span className="mr-3">📊</span> Analytics Dashboard
        </h1>
        <p className="text-gray-600 text-lg mt-2">
          Comprehensive scheduling and revenue analytics for data-driven decision making
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
              />
              <span className="flex items-center text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ⚡ Quick Select
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickDate(7)}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold text-sm"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleQuickDate(30)}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold text-sm"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => handleQuickDate(90)}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold text-sm"
              >
                Last 90 Days
              </button>
              <button
                onClick={handleThisMonth}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all font-semibold text-sm"
              >
                This Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex-1 min-w-[150px] px-6 py-4 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${getColorClasses(
                report.color,
                activeReport === report.id
              )}`}
            >
              <span className="text-2xl">{report.icon}</span>
              <span className="whitespace-nowrap">{report.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        {activeReport === 'utilization' && (
          <ProviderUtilizationReport startDate={startDate} endDate={endDate} />
        )}
        {activeReport === 'no-show' && <NoShowRatesReport startDate={startDate} endDate={endDate} />}
        {activeReport === 'revenue' && <RevenueAnalysisReport startDate={startDate} endDate={endDate} />}
        {activeReport === 'cancellation' && (
          <CancellationPatternsReport startDate={startDate} endDate={endDate} />
        )}
        {activeReport === 'capacity' && <CapacityPlanningReport startDate={startDate} endDate={endDate} />}
      </div>
    </div>
  );
}
