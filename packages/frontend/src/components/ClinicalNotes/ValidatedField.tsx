import { ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { ValidationError } from '../../hooks/useNoteValidation';

interface ValidatedFieldProps {
  label: string;
  fieldName: string;
  isRequired?: boolean;
  helpText?: string;
  error?: ValidationError | null;
  showValidation?: boolean;
  children: ReactNode;
}

export default function ValidatedField({
  label,
  fieldName,
  isRequired = false,
  helpText,
  error,
  showValidation = false,
  children,
}: ValidatedFieldProps) {
  const hasError = showValidation && error;

  return (
    <div className="space-y-2">
      {/* Label */}
      <label htmlFor={fieldName} className="block text-sm font-semibold text-gray-700">
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Help Text */}
      {helpText && (
        <div className="flex items-start text-xs text-gray-500 mb-2">
          <Info className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
          <span>{helpText}</span>
        </div>
      )}

      {/* Input Field (wrapped in error styling if applicable) */}
      <div className={hasError ? 'relative' : ''}>
        {children}
        {hasError && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-start text-sm text-red-600 mt-1">
          <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}
