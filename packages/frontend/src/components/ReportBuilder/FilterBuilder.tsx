import React from 'react';

interface QueryFilter {
  field: string;
  operator: string;
  values?: any[];
}

interface FilterBuilderProps {
  dataSources: string[];
  filters: QueryFilter[];
  onChange: (filters: QueryFilter[]) => void;
}

const OPERATORS = [
  { value: 'EQUALS', label: 'Equals', icon: '=' },
  { value: 'NOT_EQUALS', label: 'Not Equals', icon: '≠' },
  { value: 'IN', label: 'In', icon: '∈' },
  { value: 'NOT_IN', label: 'Not In', icon: '∉' },
  { value: 'CONTAINS', label: 'Contains', icon: '⊃' },
  { value: 'STARTS_WITH', label: 'Starts With', icon: '⊲' },
  { value: 'ENDS_WITH', label: 'Ends With', icon: '⊳' },
  { value: 'GT', label: 'Greater Than', icon: '>' },
  { value: 'GTE', label: 'Greater Than or Equal', icon: '≥' },
  { value: 'LT', label: 'Less Than', icon: '<' },
  { value: 'LTE', label: 'Less Than or Equal', icon: '≤' },
  { value: 'BETWEEN', label: 'Between', icon: '↔' },
  { value: 'IS_NULL', label: 'Is Null', icon: '∅' },
  { value: 'IS_NOT_NULL', label: 'Is Not Null', icon: '∃' }
];

const COMMON_FIELDS: Record<string, string[]> = {
  Client: ['firstName', 'lastName', 'email', 'status', 'dateOfBirth'],
  Appointment: ['status', 'appointmentDate', 'appointmentType', 'duration'],
  ClinicalNote: ['status', 'noteDate', 'serviceDate', 'isSigned'],
  Charge: ['billingStatus', 'serviceDate', 'chargeAmount', 'paidAmount'],
  ServiceCode: ['code', 'serviceType', 'isActive'],
  User: ['firstName', 'lastName', 'email', 'role', 'isActive'],
  Insurance: ['isPrimary', 'isActive', 'effectiveDate'],
  Payer: ['name', 'type', 'isActive']
};

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  dataSources,
  filters,
  onChange
}) => {
  const addFilter = () => {
    const newFilter: QueryFilter = {
      field: '',
      operator: 'EQUALS',
      values: []
    };
    onChange([...filters, newFilter]);
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onChange(newFilters);
  };

  const updateFilter = (index: number, updates: Partial<QueryFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onChange(newFilters);
  };

  const getAvailableFields = () => {
    const fields: string[] = [];
    dataSources.forEach((source) => {
      const sourceFields = COMMON_FIELDS[source] || [];
      sourceFields.forEach((field) => {
        fields.push(`${source}.${field}`);
      });
    });
    return fields;
  };

  const needsValue = (operator: string) => {
    return !['IS_NULL', 'IS_NOT_NULL'].includes(operator);
  };

  const needsTwoValues = (operator: string) => {
    return operator === 'BETWEEN';
  };

  if (dataSources.length === 0) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="flex items-center">
          <span className="text-2xl mr-3">⚠️</span>
          <p className="text-amber-700 font-medium">Please select at least one data source first</p>
        </div>
      </div>
    );
  }

  const availableFields = getAvailableFields();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-4xl">🔍</span>
          <h2 className="text-2xl font-bold text-white">Add Filters</h2>
        </div>
        <p className="text-purple-100 text-sm">
          Filter your data by adding conditions. All filters are combined with AND logic.
        </p>
      </div>

      {/* Add Filter Button */}
      <button
        onClick={addFilter}
        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <span className="text-xl">➕</span>
        <span className="font-semibold">Add Filter</span>
      </button>

      {/* Filters List */}
      {filters.length === 0 ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
          <div className="flex items-center">
            <span className="text-2xl mr-3">ℹ️</span>
            <p className="text-blue-700 font-medium">
              No filters added. Click "Add Filter" to create your first filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filters.map((filter, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔎</span>
                  <span className="text-sm font-semibold text-purple-700">Filter #{index + 1}</span>
                </div>
                <button
                  onClick={() => removeFilter(index)}
                  className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors duration-300"
                >
                  <span className="text-lg">🗑️</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Field Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field
                  </label>
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  >
                    <option value="">Select field...</option>
                    {availableFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operator
                  </label>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.icon} {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Inputs */}
                {needsValue(filter.operator) && (
                  <div className={needsTwoValues(filter.operator) ? 'md:col-span-1' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Value
                    </label>
                    <input
                      type="text"
                      value={filter.values?.[0] || ''}
                      onChange={(e) =>
                        updateFilter(index, {
                          values: [e.target.value, ...(filter.values?.slice(1) || [])]
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                      placeholder="Enter value..."
                    />
                  </div>
                )}
              </div>

              {/* Second Value for BETWEEN */}
              {needsTwoValues(filter.operator) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Value
                  </label>
                  <input
                    type="text"
                    value={filter.values?.[1] || ''}
                    onChange={(e) =>
                      updateFilter(index, {
                        values: [filter.values?.[0] || '', e.target.value]
                      })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                    placeholder="Enter end value..."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filters.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-md">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-green-800 font-medium">
              {filters.length} filter{filters.length > 1 ? 's' : ''} applied. All filters are combined with AND logic.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBuilder;
