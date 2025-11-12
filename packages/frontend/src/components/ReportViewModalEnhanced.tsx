import React, { useState } from 'react';
import { X, Download, Printer, BarChart3, Table2, PieChart as PieChartIcon, LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import {
  LineChart,
  BarChart,
  PieChart,
  DonutChart,
  AreaChart,
  HeatMap,
} from './charts';

interface Column {
  key: string;
  label: string;
  format?: (value: any) => string;
}

type ViewMode = 'table' | 'chart';
type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'heatmap';

interface ReportViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  data: any[];
  columns: Column[];
  isLoading?: boolean;
  error?: Error | null;
  summary?: { label: string; value: string | number }[];
  chartConfig?: {
    xKey: string;
    yKeys?: { key: string; name: string; color: string }[];
    nameKey?: string;
    valueKey?: string;
    defaultChartType?: ChartType;
    enabledChartTypes?: ChartType[];
  };
}

export default function ReportViewModalEnhanced({
  isOpen,
  onClose,
  title,
  description,
  data,
  columns,
  isLoading,
  error,
  summary,
  chartConfig,
}: ReportViewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [chartType, setChartType] = useState<ChartType>(chartConfig?.defaultChartType || 'bar');

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    const headers = columns.map((col) => col.label).join(',');
    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        return `"${String(formatted || '').replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderChart = () => {
    if (!chartConfig || !data || data.length === 0) return null;

    const enabledTypes = chartConfig.enabledChartTypes || ['bar', 'line', 'pie', 'donut', 'area'];
    const commonProps = {
      data,
      height: 400,
      animate: true,
    };

    switch (chartType) {
      case 'bar':
        if (!enabledTypes.includes('bar')) return null;
        return (
          <BarChart
            {...commonProps}
            xKey={chartConfig.xKey}
            yKeys={chartConfig.yKeys || []}
            title={undefined}
            formatTooltip={(value) => {
              if (typeof value === 'number') {
                return `$${value.toLocaleString()}`;
              }
              return value;
            }}
            colorByValue={true}
          />
        );

      case 'line':
        if (!enabledTypes.includes('line')) return null;
        return (
          <LineChart
            {...commonProps}
            xKey={chartConfig.xKey}
            yKeys={chartConfig.yKeys || []}
            title={undefined}
            formatTooltip={(value) => {
              if (typeof value === 'number') {
                return `$${value.toLocaleString()}`;
              }
              return value;
            }}
          />
        );

      case 'pie':
        if (!enabledTypes.includes('pie') || !chartConfig.nameKey || !chartConfig.valueKey) return null;
        return (
          <PieChart
            {...commonProps}
            nameKey={chartConfig.nameKey}
            valueKey={chartConfig.valueKey}
            title={undefined}
            formatTooltip={(value) => {
              if (typeof value === 'number') {
                return `$${value.toLocaleString()}`;
              }
              return value;
            }}
          />
        );

      case 'donut':
        if (!enabledTypes.includes('donut') || !chartConfig.nameKey || !chartConfig.valueKey) return null;
        return (
          <DonutChart
            {...commonProps}
            nameKey={chartConfig.nameKey}
            valueKey={chartConfig.valueKey}
            title={undefined}
            formatTooltip={(value) => {
              if (typeof value === 'number') {
                return `$${value.toLocaleString()}`;
              }
              return value;
            }}
          />
        );

      case 'area':
        if (!enabledTypes.includes('area')) return null;
        return (
          <AreaChart
            {...commonProps}
            xKey={chartConfig.xKey}
            yKeys={chartConfig.yKeys || []}
            title={undefined}
            formatTooltip={(value) => {
              if (typeof value === 'number') {
                return `$${value.toLocaleString()}`;
              }
              return value;
            }}
          />
        );

      case 'heatmap':
        if (!enabledTypes.includes('heatmap')) return null;
        return (
          <HeatMap
            {...commonProps}
            xKey={chartConfig.xKey}
            yKey={chartConfig.yKeys?.[0]?.key || 'value'}
            valueKey={chartConfig.valueKey || 'value'}
            title={undefined}
            formatValue={(value) => {
              if (typeof value === 'number') {
                return value.toLocaleString();
              }
              return value;
            }}
          />
        );

      default:
        return null;
    }
  };

  const renderTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-6 py-4 text-sm text-gray-900 border-b border-gray-200"
                  >
                    {col.format
                      ? col.format(row[col.key])
                      : row[col.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const enabledChartTypes = chartConfig?.enabledChartTypes || ['bar', 'line', 'pie', 'donut', 'area'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">{title}</h2>
                <p className="text-indigo-100 text-sm">{description}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                    viewMode === 'chart'
                      ? 'bg-white text-indigo-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Chart
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                  Table
                </button>
              </div>

              {/* Chart Type Selector */}
              {viewMode === 'chart' && chartConfig && (
                <div className="flex bg-white/20 rounded-lg p-1 gap-1">
                  {enabledChartTypes.includes('bar') && (
                    <button
                      onClick={() => setChartType('bar')}
                      className={`p-2 rounded-md transition ${
                        chartType === 'bar'
                          ? 'bg-white text-indigo-600'
                          : 'text-white hover:bg-white/10'
                      }`}
                      title="Bar Chart"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  )}
                  {enabledChartTypes.includes('line') && (
                    <button
                      onClick={() => setChartType('line')}
                      className={`p-2 rounded-md transition ${
                        chartType === 'line'
                          ? 'bg-white text-indigo-600'
                          : 'text-white hover:bg-white/10'
                      }`}
                      title="Line Chart"
                    >
                      <LineChartIcon className="w-4 h-4" />
                    </button>
                  )}
                  {enabledChartTypes.includes('pie') && (
                    <button
                      onClick={() => setChartType('pie')}
                      className={`p-2 rounded-md transition ${
                        chartType === 'pie'
                          ? 'bg-white text-indigo-600'
                          : 'text-white hover:bg-white/10'
                      }`}
                      title="Pie Chart"
                    >
                      <PieChartIcon className="w-4 h-4" />
                    </button>
                  )}
                  {enabledChartTypes.includes('donut') && (
                    <button
                      onClick={() => setChartType('donut')}
                      className={`p-2 rounded-md transition ${
                        chartType === 'donut'
                          ? 'bg-white text-indigo-600'
                          : 'text-white hover:bg-white/10'
                      }`}
                      title="Donut Chart"
                    >
                      <PieChartIcon className="w-4 h-4" />
                    </button>
                  )}
                  {enabledChartTypes.includes('area') && (
                    <button
                      onClick={() => setChartType('area')}
                      className={`p-2 rounded-md transition ${
                        chartType === 'area'
                          ? 'bg-white text-indigo-600'
                          : 'text-white hover:bg-white/10'
                      }`}
                      title="Area Chart"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Export Buttons */}
              <button
                onClick={handleExportCSV}
                disabled={!data || data.length === 0}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                disabled={!data || data.length === 0}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>

          {/* Summary Cards (if provided) */}
          {summary && summary.length > 0 && (
            <div className="px-8 py-6 bg-gray-50 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {summary.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">{item.label}</div>
                    <div className="text-2xl font-bold text-indigo-600">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-8 py-6 overflow-y-auto max-h-[60vh]">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium mb-2">Error Loading Report</p>
                <p className="text-red-500 text-sm">{error.message}</p>
              </div>
            )}

            {!isLoading && !error && (!data || data.length === 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-700 font-medium mb-2">No Data Available</p>
                <p className="text-yellow-600 text-sm">
                  There is no data to display for the selected date range.
                </p>
              </div>
            )}

            {!isLoading && !error && data && data.length > 0 && (
              <>
                {viewMode === 'chart' && chartConfig ? (
                  <div className="bg-white rounded-lg p-4">
                    {renderChart()}
                  </div>
                ) : (
                  renderTable()
                )}
              </>
            )}

            {!isLoading && !error && data && data.length > 0 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {data.length} {data.length === 1 ? 'record' : 'records'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
