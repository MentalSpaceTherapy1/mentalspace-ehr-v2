import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ValidationError } from '../../hooks/useNoteValidation';

interface ValidationSummaryProps {
  errors: ValidationError[];
  requiredFields?: string[];
  noteType: string;
  showOnlyWhenInvalid?: boolean;
}

export default function ValidationSummary({
  errors,
  requiredFields = [],
  noteType,
  showOnlyWhenInvalid = false,
}: ValidationSummaryProps) {
  const isValid = errors.length === 0;

  // Don't show if valid and showOnlyWhenInvalid is true
  if (isValid && showOnlyWhenInvalid) {
    return null;
  }

  return (
    <div
      className={`border-2 rounded-lg p-4 ${
        isValid
          ? 'bg-green-50 border-green-300'
          : 'bg-red-50 border-red-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-center mb-3">
        {isValid ? (
          <>
            <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-green-800">
              All Required Fields Complete
            </h3>
          </>
        ) : (
          <>
            <XCircle className="w-6 h-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">
              {errors.length} Validation {errors.length === 1 ? 'Error' : 'Errors'}
            </h3>
          </>
        )}
      </div>

      {/* Valid State Message */}
      {isValid && (
        <p className="text-sm text-green-700">
          This {noteType} is ready to be signed. All required fields have been completed.
        </p>
      )}

      {/* Error List */}
      {!isValid && (
        <div className="space-y-2">
          <p className="text-sm text-red-700 mb-3">
            Please complete the following fields before signing:
          </p>
          <ul className="space-y-2">
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`} className="flex items-start text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-red-700">
                  <span className="font-semibold">{error.field}:</span> {error.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Fields Info (only show when there are no errors) */}
      {isValid && requiredFields.length > 0 && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-600">
            <span className="font-semibold">{requiredFields.length}</span> required field
            {requiredFields.length === 1 ? '' : 's'} completed
          </p>
        </div>
      )}
    </div>
  );
}
