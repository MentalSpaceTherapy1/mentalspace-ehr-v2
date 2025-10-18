import React from 'react';
import { X, Download, Printer } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  format?: (value: any) => string;
}

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
}

export default function ReportViewModal({
  isOpen,
  onClose,
  title,
  description,
  data,
  columns,
  isLoading,
  error,
  summary,
}: ReportViewModalProps) {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    // Create CSV header
    const headers = columns.map((col) => col.label).join(',');

    // Create CSV rows
    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        // Escape commas and quotes
        return `"${String(formatted || '').replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // Download
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
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
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
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
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
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
