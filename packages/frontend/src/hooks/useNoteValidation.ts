import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ValidationRule {
  id: string;
  noteType: string;
  fieldName: string;
  isRequired: boolean;
  minLength?: number;
  maxLength?: number;
  validationPattern?: string;
  errorMessage?: string;
  conditionalOn?: string;
  conditionalValue?: string;
  displayLabel?: string;
  helpText?: string;
  validationOrder: number;
  isActive: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationSummary {
  noteType: string;
  totalRules: number;
  requiredFields: string[];
  optionalFields: string[];
}

export function useNoteValidation(noteType: string) {
  // Fetch validation rules for this note type
  const {
    data: rules,
    isLoading: rulesLoading,
    error: rulesError,
  } = useQuery<ValidationRule[]>({
    queryKey: ['validationRules', noteType],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/validation-rules/${noteType}`);
      return response.data.data;
    },
    enabled: !!noteType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch validation summary
  const {
    data: summary,
    isLoading: summaryLoading,
  } = useQuery<ValidationSummary>({
    queryKey: ['validationSummary', noteType],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/validation-summary/${noteType}`);
      return response.data.data;
    },
    enabled: !!noteType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Validate note data against the rules
   */
  const validateNote = (noteData: any): ValidationResult => {
    if (!rules || rules.length === 0) {
      return { isValid: true, errors: [] };
    }

    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = noteData[rule.fieldName];

      // Required field check
      if (rule.isRequired) {
        // Check if field is empty, null, or undefined
        if (value === null || value === undefined || value === '') {
          errors.push({
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
          });
          continue;
        }
      }

      // Skip validation if field is empty and not required
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Min length check for strings
      if (rule.minLength && typeof value === 'string') {
        if (value.trim().length < rule.minLength) {
          errors.push({
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} must be at least ${rule.minLength} characters`,
          });
        }
      }

      // Max length check for strings
      if (rule.maxLength && typeof value === 'string') {
        if (value.trim().length > rule.maxLength) {
          errors.push({
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} must be at most ${rule.maxLength} characters`,
          });
        }
      }

      // Pattern validation
      if (rule.validationPattern && typeof value === 'string') {
        const pattern = new RegExp(rule.validationPattern);
        if (!pattern.test(value)) {
          errors.push({
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} format is invalid`,
          });
        }
      }

      // Conditional validation
      if (rule.conditionalOn && rule.conditionalValue) {
        const conditionalFieldValue = noteData[rule.conditionalOn];
        if (conditionalFieldValue === rule.conditionalValue) {
          // This field becomes required when the condition is met
          if (value === null || value === undefined || value === '') {
            errors.push({
              field: rule.fieldName,
              message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * Validate a single field
   */
  const validateField = (fieldName: string, value: any, noteData?: any): ValidationError | null => {
    if (!rules || rules.length === 0) {
      return null;
    }

    const rule = rules.find((r) => r.fieldName === fieldName);
    if (!rule) {
      return null;
    }

    // Required field check
    if (rule.isRequired) {
      if (value === null || value === undefined || value === '') {
        return {
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
        };
      }
    }

    // Skip validation if field is empty and not required
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Min length check for strings
    if (rule.minLength && typeof value === 'string') {
      if (value.trim().length < rule.minLength) {
        return {
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} must be at least ${rule.minLength} characters`,
        };
      }
    }

    // Max length check for strings
    if (rule.maxLength && typeof value === 'string') {
      if (value.trim().length > rule.maxLength) {
        return {
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} must be at most ${rule.maxLength} characters`,
        };
      }
    }

    // Pattern validation
    if (rule.validationPattern && typeof value === 'string') {
      const pattern = new RegExp(rule.validationPattern);
      if (!pattern.test(value)) {
        return {
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} format is invalid`,
        };
      }
    }

    // Conditional validation
    if (rule.conditionalOn && rule.conditionalValue && noteData) {
      const conditionalFieldValue = noteData[rule.conditionalOn];
      if (conditionalFieldValue === rule.conditionalValue) {
        if (value === null || value === undefined || value === '') {
          return {
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
          };
        }
      }
    }

    return null;
  };

  /**
   * Get validation rule for a specific field
   */
  const getFieldRule = (fieldName: string): ValidationRule | undefined => {
    return rules?.find((r) => r.fieldName === fieldName);
  };

  /**
   * Check if a field is required
   */
  const isFieldRequired = (fieldName: string): boolean => {
    const rule = getFieldRule(fieldName);
    return rule?.isRequired || false;
  };

  /**
   * Get help text for a field
   */
  const getFieldHelpText = (fieldName: string): string | undefined => {
    const rule = getFieldRule(fieldName);
    return rule?.helpText;
  };

  return {
    rules: rules || [],
    summary,
    isLoading: rulesLoading || summaryLoading,
    error: rulesError,
    validateNote,
    validateField,
    getFieldRule,
    isFieldRequired,
    getFieldHelpText,
  };
}
