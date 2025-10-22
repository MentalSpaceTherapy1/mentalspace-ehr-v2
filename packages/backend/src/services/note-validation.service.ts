import prisma from '../lib/prisma';

export interface ValidationRule {
  id: string;
  noteType: string;
  fieldName: string;
  isRequired: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  validationPattern?: string | null;
  errorMessage?: string | null;
  conditionalOn?: string | null;
  conditionalValue?: string | null;
  displayLabel?: string | null;
  helpText?: string | null;
  validationOrder: number;
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
  requiredFields: Array<{
    field: string;
    label: string;
    minLength?: number | null;
    helpText?: string | null;
  }>;
  optionalFields: Array<{
    field: string;
    label: string;
    helpText?: string | null;
  }>;
}

/**
 * Get validation rules for a specific note type
 */
export async function getValidationRules(noteType: string): Promise<ValidationRule[]> {
  const rules = await prisma.noteValidationRule.findMany({
    where: {
      noteType,
      isActive: true,
    },
    orderBy: {
      validationOrder: 'asc',
    },
  });

  return rules;
}

/**
 * Validate a note against its type's rules
 */
export async function validateNote(noteType: string, noteData: any): Promise<ValidationResult> {
  const rules = await getValidationRules(noteType);
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = noteData[rule.fieldName];

    // Required field check
    if (rule.isRequired) {
      // Check for empty values
      if (value === null || value === undefined || value === '') {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
        });
        continue;
      }

      // Check for empty arrays
      if (Array.isArray(value) && value.length === 0) {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
        });
        continue;
      }
    }

    // Skip further validation if field is empty and not required
    if (!value || value === '') continue;

    // Min length check (for strings)
    if (rule.minLength && typeof value === 'string') {
      if (value.trim().length < rule.minLength) {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} must be at least ${rule.minLength} characters`,
        });
      }
    }

    // Max length check (for strings)
    if (rule.maxLength && typeof value === 'string') {
      if (value.length > rule.maxLength) {
        errors.push({
          field: rule.fieldName,
          message: `${rule.displayLabel || rule.fieldName} must not exceed ${rule.maxLength} characters`,
        });
      }
    }

    // Pattern validation
    if (rule.validationPattern && typeof value === 'string') {
      try {
        const regex = new RegExp(rule.validationPattern);
        if (!regex.test(value)) {
          errors.push({
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} format is invalid`,
          });
        }
      } catch (e) {
        // Invalid regex pattern - skip
        console.error(`Invalid regex pattern for field ${rule.fieldName}: ${rule.validationPattern}`);
      }
    }

    // Conditional validation
    if (rule.conditionalOn && rule.conditionalValue) {
      const conditionValue = noteData[rule.conditionalOn];
      if (conditionValue === rule.conditionalValue && !value) {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required when ${rule.conditionalOn} is ${rule.conditionalValue}`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get validation summary for UI
 */
export async function getValidationSummary(noteType: string): Promise<ValidationSummary> {
  const rules = await getValidationRules(noteType);

  return {
    requiredFields: rules
      .filter((r) => r.isRequired)
      .map((r) => ({
        field: r.fieldName,
        label: r.displayLabel || r.fieldName,
        minLength: r.minLength,
        helpText: r.helpText,
      })),
    optionalFields: rules
      .filter((r) => !r.isRequired)
      .map((r) => ({
        field: r.fieldName,
        label: r.displayLabel || r.fieldName,
        helpText: r.helpText,
      })),
  };
}

/**
 * Check if a specific field is valid
 */
export function validateField(rule: ValidationRule, value: any): ValidationError | null {
  // Required check
  if (rule.isRequired) {
    if (value === null || value === undefined || value === '') {
      return {
        field: rule.fieldName,
        message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
      };
    }

    if (Array.isArray(value) && value.length === 0) {
      return {
        field: rule.fieldName,
        message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} is required`,
      };
    }
  }

  // Skip further validation if empty
  if (!value || value === '') return null;

  // Min length
  if (rule.minLength && typeof value === 'string') {
    if (value.trim().length < rule.minLength) {
      return {
        field: rule.fieldName,
        message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} must be at least ${rule.minLength} characters`,
      };
    }
  }

  // Max length
  if (rule.maxLength && typeof value === 'string') {
    if (value.length > rule.maxLength) {
      return {
        field: rule.fieldName,
        message: `${rule.displayLabel || rule.fieldName} must not exceed ${rule.maxLength} characters`,
      };
    }
  }

  // Pattern
  if (rule.validationPattern && typeof value === 'string') {
    try {
      const regex = new RegExp(rule.validationPattern);
      if (!regex.test(value)) {
        return {
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel || rule.fieldName} format is invalid`,
        };
      }
    } catch (e) {
      // Invalid regex - skip
    }
  }

  return null;
}
