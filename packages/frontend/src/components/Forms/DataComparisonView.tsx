import React, { useState, useMemo } from 'react';
import { FieldMapping, FormTransferConfig } from '../../config/formFieldMappings';

interface DataComparisonViewProps {
  /** Form submission data (left side - source) */
  submissionData: Record<string, any>;
  /** Current database data (right side - target) */
  currentData: Record<string, any>;
  /** Transfer configuration with field mappings */
  config: FormTransferConfig;
  /** Callback when field selection changes */
  onFieldSelectionChange: (selectedFields: string[]) => void;
  /** Initially selected fields (default: all) */
  initialSelection?: string[];
}

interface FieldComparisonStatus {
  /** Field has value in submission */
  hasSubmissionValue: boolean;
  /** Field has value in current data */
  hasCurrentValue: boolean;
  /** Values are different (conflict) */
  hasConflict: boolean;
  /** Submission value */
  submissionValue: any;
  /** Current value */
  currentValue: any;
}

/**
 * DataComparisonView Component
 *
 * Displays side-by-side comparison of form submission data and current database data.
 * Allows staff to select which fields to transfer and shows conflicts.
 *
 * Features:
 * - Side-by-side comparison layout
 * - Visual indicators for conflicts, new data, matching data
 * - Field-by-field selection with checkboxes
 * - Bulk select/deselect all
 * - Conflict warnings
 * - Empty field indicators
 */
export const DataComparisonView: React.FC<DataComparisonViewProps> = ({
  submissionData,
  currentData,
  config,
  onFieldSelectionChange,
  initialSelection,
}) => {
  // Initialize selected fields (default: all fields with submission data)
  const defaultSelection = useMemo(() => {
    return config.fieldMappings
      .filter(mapping => {
        const value = submissionData[mapping.sourceField];
        return value !== undefined && value !== null && value !== '';
      })
      .map(mapping => mapping.sourceField);
  }, [submissionData, config]);

  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(initialSelection || defaultSelection)
  );

  // Analyze each field for comparison status
  const fieldStatuses = useMemo(() => {
    const statuses: Map<string, FieldComparisonStatus> = new Map();

    config.fieldMappings.forEach(mapping => {
      const submissionValue = submissionData[mapping.sourceField];
      const currentValue = currentData[mapping.targetField];

      const hasSubmissionValue = submissionValue !== undefined && submissionValue !== null && submissionValue !== '';
      const hasCurrentValue = currentValue !== undefined && currentValue !== null && currentValue !== '';

      const hasConflict = hasSubmissionValue && hasCurrentValue &&
                         JSON.stringify(submissionValue) !== JSON.stringify(currentValue);

      statuses.set(mapping.sourceField, {
        hasSubmissionValue,
        hasCurrentValue,
        hasConflict,
        submissionValue,
        currentValue,
      });
    });

    return statuses;
  }, [submissionData, currentData, config]);

  // Count statistics
  const stats = useMemo(() => {
    let conflicts = 0;
    let newData = 0;
    let matches = 0;
    let empty = 0;

    fieldStatuses.forEach(status => {
      if (status.hasConflict) conflicts++;
      else if (!status.hasCurrentValue && status.hasSubmissionValue) newData++;
      else if (status.hasSubmissionValue && status.hasCurrentValue) matches++;
      else empty++;
    });

    return { conflicts, newData, matches, empty, total: fieldStatuses.size };
  }, [fieldStatuses]);

  // Handle field selection toggle
  const toggleField = (sourceField: string) => {
    const newSelection = new Set(selectedFields);
    if (newSelection.has(sourceField)) {
      newSelection.delete(sourceField);
    } else {
      newSelection.add(sourceField);
    }
    setSelectedFields(newSelection);
    onFieldSelectionChange(Array.from(newSelection));
  };

  // Handle select all
  const selectAll = () => {
    const allFields = config.fieldMappings
      .filter(mapping => fieldStatuses.get(mapping.sourceField)?.hasSubmissionValue)
      .map(mapping => mapping.sourceField);
    setSelectedFields(new Set(allFields));
    onFieldSelectionChange(allFields);
  };

  // Handle deselect all
  const deselectAll = () => {
    setSelectedFields(new Set());
    onFieldSelectionChange([]);
  };

  // Handle select only conflicts
  const selectConflicts = () => {
    const conflictFields = config.fieldMappings
      .filter(mapping => fieldStatuses.get(mapping.sourceField)?.hasConflict)
      .map(mapping => mapping.sourceField);
    setSelectedFields(new Set(conflictFields));
    onFieldSelectionChange(conflictFields);
  };

  // Handle select only new data
  const selectNewData = () => {
    const newFields = config.fieldMappings
      .filter(mapping => {
        const status = fieldStatuses.get(mapping.sourceField);
        return status?.hasSubmissionValue && !status?.hasCurrentValue;
      })
      .map(mapping => mapping.sourceField);
    setSelectedFields(new Set(newFields));
    onFieldSelectionChange(newFields);
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get status color class
  const getStatusColorClass = (status: FieldComparisonStatus): string => {
    if (!status.hasSubmissionValue) return 'bg-gray-50 border-gray-200';
    if (status.hasConflict) return 'bg-yellow-50 border-yellow-300';
    if (!status.hasCurrentValue) return 'bg-blue-50 border-blue-300';
    return 'bg-green-50 border-green-300';
  };

  // Get status icon
  const getStatusIcon = (status: FieldComparisonStatus) => {
    if (!status.hasSubmissionValue) {
      return (
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    if (status.hasConflict) {
      return (
        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    if (!status.hasCurrentValue) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Data Comparison Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-xs text-gray-600">Total Fields</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-2xl font-bold text-yellow-700">{stats.conflicts}</div>
            <div className="text-xs text-yellow-700">Conflicts</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-700">{stats.newData}</div>
            <div className="text-xs text-blue-700">New Data</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-700">{stats.matches}</div>
            <div className="text-xs text-green-700">Matches</div>
          </div>
          <div className="text-center p-2 bg-indigo-50 rounded">
            <div className="text-2xl font-bold text-indigo-700">{selectedFields.size}</div>
            <div className="text-xs text-indigo-700">Selected</div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-300 rounded mr-1"></div>
            <span>Conflict (different values)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-300 rounded mr-1"></div>
            <span>New data (no current value)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-300 rounded mr-1"></div>
            <span>Match (same value)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded mr-1"></div>
            <span>Empty (no submission value)</span>
          </div>
        </div>
      </div>

      {/* Bulk Selection Controls */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1 bg-gray-600 text-white text-sm font-semibold rounded hover:bg-gray-700 transition-colors"
          >
            Deselect All
          </button>
          <button
            onClick={selectConflicts}
            disabled={stats.conflicts === 0}
            className="px-3 py-1 bg-yellow-600 text-white text-sm font-semibold rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Conflicts ({stats.conflicts})
          </button>
          <button
            onClick={selectNewData}
            disabled={stats.newData === 0}
            className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select New Data ({stats.newData})
          </button>
        </div>
      </div>

      {/* Field Comparison Table */}
      <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold w-12">
                  <input
                    type="checkbox"
                    checked={selectedFields.size === defaultSelection.length && defaultSelection.length > 0}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left text-sm font-semibold w-8">Status</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Field</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Client Submitted Data</th>
                <th className="px-3 py-2 text-left text-sm font-semibold">Current {config.targetModel} Data</th>
              </tr>
            </thead>
            <tbody>
              {config.fieldMappings.map((mapping, index) => {
                const status = fieldStatuses.get(mapping.sourceField)!;
                const isSelected = selectedFields.has(mapping.sourceField);
                const canSelect = status.hasSubmissionValue;

                return (
                  <tr
                    key={mapping.sourceField}
                    className={`border-b border-gray-200 ${getStatusColorClass(status)} ${
                      isSelected ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={() => toggleField(mapping.sourceField)}
                        className="rounded disabled:opacity-30"
                      />
                    </td>

                    {/* Status Icon */}
                    <td className="px-3 py-2">
                      {getStatusIcon(status)}
                    </td>

                    {/* Field Label */}
                    <td className="px-3 py-2">
                      <div className="font-semibold text-sm text-gray-900">{mapping.label}</div>
                      {mapping.required && (
                        <span className="text-xs text-red-600">*Required</span>
                      )}
                    </td>

                    {/* Submission Value */}
                    <td className="px-3 py-2">
                      <div className={`text-sm ${status.hasSubmissionValue ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}`}>
                        {formatValue(status.submissionValue)}
                      </div>
                    </td>

                    {/* Current Value */}
                    <td className="px-3 py-2">
                      <div className={`text-sm ${status.hasCurrentValue ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {formatValue(status.currentValue)}
                      </div>
                      {status.hasConflict && (
                        <div className="mt-1 text-xs text-yellow-700 font-semibold">
                          ⚠️ Conflict: Values differ
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict Warning */}
      {stats.conflicts > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-bold text-yellow-900 mb-1">Data Conflicts Detected</h4>
              <p className="text-sm text-yellow-800">
                {stats.conflicts} field{stats.conflicts > 1 ? 's have' : ' has'} different values between the client's submission and the current {config.targetModel.toLowerCase()} data.
                If you transfer these fields, the current values will be overwritten with the client's submitted data.
                Please review carefully before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataComparisonView;
