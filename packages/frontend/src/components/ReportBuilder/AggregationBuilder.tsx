import React from 'react';

interface QueryField {
  source: string;
  field: string;
  alias?: string;
}

interface QueryAggregation {
  field: string;
  function: string;
  alias: string;
}

interface AggregationBuilderProps {
  fields: QueryField[];
  aggregations: QueryAggregation[];
  groupBy: string[];
  onChange: (aggregations: QueryAggregation[], groupBy: string[]) => void;
}

const AGGREGATION_FUNCTIONS = [
  { value: 'COUNT', label: 'Count', icon: '🔢', description: 'Count occurrences' },
  { value: 'SUM', label: 'Sum', icon: '➕', description: 'Sum values' },
  { value: 'AVG', label: 'Average', icon: '📊', description: 'Calculate average' },
  { value: 'MIN', label: 'Minimum', icon: '⬇️', description: 'Find minimum' },
  { value: 'MAX', label: 'Maximum', icon: '⬆️', description: 'Find maximum' }
];

const AggregationBuilder: React.FC<AggregationBuilderProps> = ({
  fields,
  aggregations,
  groupBy,
  onChange
}) => {
  const addAggregation = () => {
    const newAgg: QueryAggregation = {
      field: '',
      function: 'COUNT',
      alias: ''
    };
    onChange([...aggregations, newAgg], groupBy);
  };

  const removeAggregation = (index: number) => {
    const newAggs = aggregations.filter((_, i) => i !== index);
    onChange(newAggs, groupBy);
  };

  const updateAggregation = (index: number, updates: Partial<QueryAggregation>) => {
    const newAggs = [...aggregations];
    newAggs[index] = { ...newAggs[index], ...updates };
    onChange(newAggs, groupBy);
  };

  const toggleGroupBy = (fieldKey: string) => {
    const newGroupBy = groupBy.includes(fieldKey)
      ? groupBy.filter((f) => f !== fieldKey)
      : [...groupBy, fieldKey];
    onChange(aggregations, newGroupBy);
  };

  const getFieldKey = (field: QueryField) => {
    return `${field.source}.${field.field}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-4xl">📊</span>
          <h2 className="text-2xl font-bold text-white">Add Aggregations</h2>
        </div>
        <p className="text-purple-100 text-sm">
          Aggregate your data with functions like COUNT, SUM, AVG. Optionally group by specific fields.
        </p>
      </div>

      {/* Group By Section */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">👥</span>
            <h3 className="text-white font-semibold text-lg">Group By Fields</h3>
          </div>
          <p className="text-indigo-100 text-sm mt-1">
            Select fields to group your results by
          </p>
        </div>

        <div className="p-6">
          {fields.length === 0 ? (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">ℹ️</span>
                <p className="text-blue-700 font-medium">
                  No fields available. Please select fields first.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fields.map((field) => {
                const fieldKey = getFieldKey(field);
                const isSelected = groupBy.includes(fieldKey);

                return (
                  <button
                    key={fieldKey}
                    onClick={() => toggleGroupBy(fieldKey)}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
                      transform hover:scale-105 shadow-md hover:shadow-lg
                      ${isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-purple-50 border-2 border-gray-300'
                      }
                    `}
                  >
                    <span className="mr-2">{isSelected ? '✓' : '○'}</span>
                    {field.source}.{field.field}
                  </button>
                );
              })}
            </div>
          )}

          {groupBy.length > 0 && (
            <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-3 rounded-r-lg">
              <div className="flex items-center">
                <span className="text-xl mr-2">✅</span>
                <p className="text-green-800 text-sm font-medium">
                  Grouping by {groupBy.length} field{groupBy.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-gray-50 text-gray-500 text-sm font-medium">
            Aggregation Functions
          </span>
        </div>
      </div>

      {/* Add Aggregation Button */}
      <button
        onClick={addAggregation}
        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <span className="text-xl">➕</span>
        <span className="font-semibold">Add Aggregation</span>
      </button>

      {/* Aggregations List */}
      {aggregations.length === 0 ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
          <div className="flex items-center">
            <span className="text-2xl mr-3">ℹ️</span>
            <p className="text-blue-700 font-medium">
              No aggregations added. Click "Add Aggregation" to create one.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {aggregations.map((agg, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📊</span>
                  <span className="text-sm font-semibold text-purple-700">
                    Aggregation #{index + 1}
                  </span>
                </div>
                <button
                  onClick={() => removeAggregation(index)}
                  className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors duration-300"
                >
                  <span className="text-lg">🗑️</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Function Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Function
                  </label>
                  <select
                    value={agg.function}
                    onChange={(e) => updateAggregation(index, { function: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  >
                    {AGGREGATION_FUNCTIONS.map((func) => (
                      <option key={func.value} value={func.value}>
                        {func.icon} {func.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field
                  </label>
                  <select
                    value={agg.field}
                    onChange={(e) => updateAggregation(index, { field: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  >
                    <option value="">Select field...</option>
                    {fields.map((field) => {
                      const fieldKey = getFieldKey(field);
                      return (
                        <option key={fieldKey} value={fieldKey}>
                          {fieldKey}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Alias Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alias
                  </label>
                  <input
                    type="text"
                    placeholder={`${agg.function.toLowerCase()}_result`}
                    value={agg.alias}
                    onChange={(e) => updateAggregation(index, { alias: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Name for this aggregation result</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {aggregations.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-md">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-green-800 font-medium">
              {aggregations.length} aggregation{aggregations.length > 1 ? 's' : ''} configured
            </p>
          </div>
        </div>
      )}

      {/* Usage Examples */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border-2 border-gray-200 shadow-md">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-2xl">💡</span>
          <h4 className="font-semibold text-gray-800">Examples:</h4>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span>•</span>
            <p>COUNT(Client.id) grouped by Appointment.status to count clients per appointment status</p>
          </div>
          <div className="flex items-start space-x-2">
            <span>•</span>
            <p>SUM(Charge.chargeAmount) grouped by ServiceCode.code to sum revenue per service</p>
          </div>
          <div className="flex items-start space-x-2">
            <span>•</span>
            <p>AVG(Appointment.duration) grouped by User.id to calculate average appointment time per clinician</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AggregationBuilder;
