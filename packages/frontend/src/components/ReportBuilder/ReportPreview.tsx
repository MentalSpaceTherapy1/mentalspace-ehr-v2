import React from 'react';

interface QueryField {
  source: string;
  field: string;
  alias?: string;
}

interface ReportPreviewProps {
  data: any[];
  fields: QueryField[];
  isLoading: boolean;
  onRefresh: () => void;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({
  data,
  fields,
  isLoading,
  onRefresh
}) => {
  const getColumnLabel = (field: QueryField) => {
    return field.alias || `${field.source}_${field.field}`;
  };

  const getColumnKey = (field: QueryField) => {
    return field.alias || `${field.source}_${field.field}`;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value instanceof Date) {
      return new Date(value).toLocaleDateString();
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    // Generate CSV headers
    const headers = fields.map(getColumnLabel);
    const csvHeaders = headers.join(',');

    // Generate CSV rows
    const csvRows = data.map((row) => {
      return fields
        .map((field) => {
          const key = getColumnKey(field);
          const value = row[key];
          // Escape commas and quotes in values
          const formatted = formatValue(value).replace(/"/g, '""');
          return `"${formatted}"`;
        })
        .join(',');
    });

    // Combine headers and rows
    const csv = [csvHeaders, ...csvRows].join('\n');

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-preview-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-4xl">📊</span>
              <h2 className="text-2xl font-bold text-white">Report Preview</h2>
            </div>
            <p className="text-purple-100 text-sm">
              Showing up to 10 rows. Execute the full report after saving.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg">🔄</span>
              <span className="font-semibold">Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={isLoading || data.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg">📥</span>
              <span className="font-semibold">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-lg p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading preview...</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        /* Empty State */
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-xl p-8">
          <div className="flex flex-col items-center text-center space-y-3">
            <span className="text-6xl">📭</span>
            <p className="text-blue-700 font-medium text-lg">No data available</p>
            <p className="text-blue-600 text-sm">
              Check your query configuration and try again.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Rows</p>
                  <p className="text-3xl font-bold">{data.length}</p>
                </div>
                <span className="text-5xl opacity-80">📊</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Columns</p>
                  <p className="text-3xl font-bold">{fields.length}</p>
                </div>
                <span className="text-5xl opacity-80">📋</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-500 to-violet-600">
                    {fields.map((field, index) => (
                      <th
                        key={index}
                        className="px-6 py-4 text-left text-sm font-semibold text-white whitespace-nowrap"
                      >
                        <div className="flex items-center space-x-2">
                          <span>📌</span>
                          <span>{getColumnLabel(field)}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`
                        border-b border-gray-200 transition-colors duration-200
                        ${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                        hover:bg-purple-50
                      `}
                    >
                      {fields.map((field, colIndex) => {
                        const key = getColumnKey(field);
                        const value = row[key];
                        return (
                          <td
                            key={colIndex}
                            className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap"
                          >
                            {formatValue(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-md">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <p className="text-amber-800 font-medium">
                This is a limited preview. Save and execute the report to see all results.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPreview;
