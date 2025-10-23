# Phase 1.3: Required Field Validation Engine
## Implementation Progress Report

**Started**: October 22, 2025, 4:45 PM EST
**Status**: 🚧 **40% COMPLETE** - Database Ready, Backend & Frontend Pending

---

## ✅ Completed Components

### 1. Database Schema (100% Complete)

**Model Created**: `NoteValidationRule`

```prisma
model NoteValidationRule {
  id String @id @default(uuid())

  noteType String // Which note type this rule applies to
  fieldName String // Name of the field being validated
  isRequired Boolean @default(false) // Whether field is required
  minLength Int? // Minimum length for text fields
  maxLength Int? // Maximum length for text fields
  validationPattern String? // Regex pattern for validation
  errorMessage String? // Custom error message

  // Conditional requirements
  conditionalOn String? // Field name that this depends on
  conditionalValue String? // Value that conditionalOn must have

  // Metadata
  displayLabel String? // User-friendly label for UI
  helpText String? // Help text for users
  validationOrder Int @default(0) // Order in which to validate

  // Status
  isActive Boolean @default(true)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?
  lastModifiedBy String?

  @@unique([noteType, fieldName])
  @@map("note_validation_rules")
}
```

### 2. Migration (100% Complete)

**File**: `20251022203000_add_note_validation_rules/migration.sql`

**Applied To**:
- ✅ Local database
- ⏳ **NOT YET** applied to production

**Seeded Validation Rules**:

**Progress Notes** (5 rules):
1. `subjective` - Required, min 20 chars
2. `objective` - Required, min 20 chars
3. `assessment` - Required, min 30 chars
4. `plan` - Required, min 20 chars
5. `diagnosisCodes` - Required, at least one

**Intake Assessments** (4 rules):
1. `subjective` - Required, min 50 chars
2. `assessment` - Required, min 100 chars
3. `plan` - Required, min 50 chars
4. `diagnosisCodes` - Required, at least one

**Treatment Plans** (3 rules):
1. `assessment` - Required, min 50 chars
2. `plan` - Required, min 100 chars
3. `diagnosisCodes` - Required, at least one

---

## ⏳ Pending Components

### 3. Backend Validation Service (0% Complete)

**File to Create**: `packages/backend/src/services/note-validation.service.ts`

**Purpose**: Server-side validation engine that enforces rules

**Required Functions**:

```typescript
// Get validation rules for a specific note type
export async function getValidationRules(noteType: string): Promise<ValidationRule[]> {
  return await prisma.noteValidationRule.findMany({
    where: {
      noteType,
      isActive: true,
    },
    orderBy: {
      validationOrder: 'asc',
    },
  });
}

// Validate a note against its type's rules
export async function validateNote(noteType: string, noteData: any): Promise<ValidationResult> {
  const rules = await getValidationRules(noteType);
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = noteData[rule.fieldName];

    // Required field check
    if (rule.isRequired) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel} is required`,
        });
        continue;
      }
    }

    // Skip further validation if field is empty and not required
    if (!value) continue;

    // Min length check
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push({
        field: rule.fieldName,
        message: rule.errorMessage || `${rule.displayLabel} must be at least ${rule.minLength} characters`,
      });
    }

    // Max length check
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push({
        field: rule.fieldName,
        message: `${rule.displayLabel} must not exceed ${rule.maxLength} characters`,
      });
    }

    // Pattern validation
    if (rule.validationPattern && typeof value === 'string') {
      const regex = new RegExp(rule.validationPattern);
      if (!regex.test(value)) {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel} format is invalid`,
        });
      }
    }

    // Conditional validation
    if (rule.conditionalOn) {
      const conditionValue = noteData[rule.conditionalOn];
      if (conditionValue === rule.conditionalValue && !value) {
        errors.push({
          field: rule.fieldName,
          message: rule.errorMessage || `${rule.displayLabel} is required when ${rule.conditionalOn} is ${rule.conditionalValue}`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Get validation summary for UI
export async function getValidationSummary(noteType: string): Promise<ValidationSummary> {
  const rules = await getValidationRules(noteType);

  return {
    requiredFields: rules.filter(r => r.isRequired).map(r => ({
      field: r.fieldName,
      label: r.displayLabel || r.fieldName,
      minLength: r.minLength,
      helpText: r.helpText,
    })),
    optionalFields: rules.filter(r => !r.isRequired).map(r => ({
      field: r.fieldName,
      label: r.displayLabel || r.fieldName,
      helpText: r.helpText,
    })),
  };
}
```

### 4. Backend API Endpoints (0% Complete)

**File to Modify**: `packages/backend/src/controllers/clinicalNote.controller.ts`

**Endpoints to Add**:

```typescript
// GET /api/v1/clinical-notes/validation-rules/:noteType
export const getValidationRulesForNoteType = async (req: Request, res: Response) => {
  try {
    const { noteType } = req.params;
    const rules = await NoteValidationService.getValidationRules(noteType);
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch validation rules' });
  }
};

// POST /api/v1/clinical-notes/validate
export const validateNoteData = async (req: Request, res: Response) => {
  try {
    const { noteType, noteData } = req.body;
    const result = await NoteValidationService.validateNote(noteType, noteData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Validation failed' });
  }
};

// GET /api/v1/clinical-notes/validation-summary/:noteType
export const getValidationSummaryForNoteType = async (req: Request, res: Response) => {
  try {
    const { noteType } = req.params;
    const summary = await NoteValidationService.getValidationSummary(noteType);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch validation summary' });
  }
};
```

**File to Modify**: `packages/backend/src/routes/clinicalNote.routes.ts`

```typescript
// Add routes
router.get('/validation-rules/:noteType', getValidationRulesForNoteType);
router.post('/validate', validateNoteData);
router.get('/validation-summary/:noteType', getValidationSummaryForNoteType);
```

**Integration**: Modify `signClinicalNote` to validate before signing:

```typescript
export const signClinicalNote = async (req: Request, res: Response) => {
  // ... existing code ...

  // VALIDATE BEFORE SIGNING
  const validationResult = await NoteValidationService.validateNote(note.noteType, note);

  if (!validationResult.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Note validation failed',
      errors: validationResult.errors,
    });
  }

  // ... continue with signing ...
};
```

### 5. Frontend Validation Hook (0% Complete)

**File to Create**: `packages/frontend/src/hooks/useNoteValidation.ts`

```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ValidationRule {
  fieldName: string;
  isRequired: boolean;
  minLength?: number;
  maxLength?: number;
  displayLabel?: string;
  errorMessage?: string;
  helpText?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function useNoteValidation(noteType: string, noteData: any) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Fetch validation rules
  const { data: rulesData } = useQuery({
    queryKey: ['validation-rules', noteType],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/validation-rules/${noteType}`);
      return response.data.data;
    },
    enabled: !!noteType,
  });

  const rules: ValidationRule[] = rulesData || [];

  // Real-time client-side validation
  useEffect(() => {
    if (!rules.length) return;

    const newErrors: ValidationError[] = [];

    rules.forEach((rule) => {
      const value = noteData[rule.fieldName];

      // Required check
      if (rule.isRequired) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors.push({
            field: rule.fieldName,
            message: rule.errorMessage || `${rule.displayLabel} is required`,
          });
          return;
        }
      }

      // Min length check
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        newErrors.push({
          field: rule.fieldName,
          message: `${rule.displayLabel} must be at least ${rule.minLength} characters`,
        });
      }

      // Max length check
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        newErrors.push({
          field: rule.fieldName,
          message: `${rule.displayLabel} must not exceed ${rule.maxLength} characters`,
        });
      }
    });

    setErrors(newErrors);
    setIsValid(newErrors.length === 0);
  }, [noteData, rules]);

  return {
    rules,
    errors,
    isValid,
    getFieldError: (fieldName: string) => errors.find((e) => e.field === fieldName),
    isFieldRequired: (fieldName: string) => rules.find((r) => r.fieldName === fieldName)?.isRequired || false,
  };
}
```

### 6. Frontend Validation UI Components (0% Complete)

**Component to Create**: `packages/frontend/src/components/ClinicalNotes/ValidatedField.tsx`

```tsx
interface ValidatedFieldProps {
  fieldName: string;
  isRequired: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}

export function ValidatedField({ fieldName, isRequired, error, helpText, children }: ValidatedFieldProps) {
  return (
    <div className="relative">
      {/* Required asterisk */}
      {isRequired && (
        <span className="absolute -left-3 top-2 text-red-500 font-bold text-lg">*</span>
      )}

      {/* Field content */}
      <div className={error ? 'border-2 border-red-500 rounded-lg' : ''}>
        {children}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      {/* Help text */}
      {helpText && !error && (
        <div className="mt-1 text-xs text-gray-500">
          {helpText}
        </div>
      )}
    </div>
  );
}
```

**Component to Create**: `packages/frontend/src/components/ClinicalNotes/ValidationSummary.tsx`

```tsx
interface ValidationSummaryProps {
  errors: ValidationError[];
  requiredFieldCount: number;
  completedFieldCount: number;
}

export function ValidationSummary({ errors, requiredFieldCount, completedFieldCount }: ValidationSummaryProps) {
  const progress = (completedFieldCount / requiredFieldCount) * 100;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Validation Status</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          errors.length === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {errors.length === 0 ? '✓ Ready to Sign' : `${errors.length} Issue${errors.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Required Fields</span>
          <span>{completedFieldCount} / {requiredFieldCount}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="text-sm text-red-600 flex items-start">
              <span className="mr-2">•</span>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 7. Form Integration (0% Complete)

**Files to Modify**: All note form files

**Example for ProgressNoteForm.tsx**:

```tsx
import { useNoteValidation } from '../../hooks/useNoteValidation';
import { ValidatedField } from '../../components/ClinicalNotes/ValidatedField';
import { ValidationSummary } from '../../components/ClinicalNotes/ValidationSummary';

export default function ProgressNoteForm() {
  const [formData, setFormData] = useState({...});

  // Add validation
  const { rules, errors, isValid, getFieldError, isFieldRequired } = useNoteValidation(
    'Progress Note',
    formData
  );

  const requiredFields = rules.filter(r => r.isRequired);
  const completedFields = requiredFields.filter(r => {
    const value = formData[r.fieldName];
    return value && (Array.isArray(value) ? value.length > 0 : value.length >= (r.minLength || 0));
  });

  return (
    <div>
      {/* Validation Summary */}
      <ValidationSummary
        errors={errors}
        requiredFieldCount={requiredFields.length}
        completedFieldCount={completedFields.length}
      />

      {/* Validated Fields */}
      <ValidatedField
        fieldName="subjective"
        isRequired={isFieldRequired('subjective')}
        error={getFieldError('subjective')?.message}
      >
        <TextAreaField
          label="Subjective"
          value={formData.subjective}
          onChange={(e) => setFormData({...formData, subjective: e.target.value})}
        />
      </ValidatedField>

      {/* Sign button - disabled if not valid */}
      <button
        onClick={handleSign}
        disabled={!isValid}
        className={`px-6 py-3 rounded-xl ${
          isValid
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isValid ? 'Sign Note' : 'Complete Required Fields to Sign'}
      </button>
    </div>
  );
}
```

---

## Implementation Plan

### Remaining Work

| Task | Estimate | Priority |
|------|----------|----------|
| Backend validation service | 1 hour | HIGH |
| Backend API endpoints | 45 min | HIGH |
| Frontend validation hook | 45 min | HIGH |
| Frontend validation components | 1 hour | HIGH |
| Integrate into all 8 note forms | 2 hours | HIGH |
| Testing | 1 hour | MEDIUM |
| Production deployment | 15 min | HIGH |
| **Total Remaining** | **~6.5 hours** | |

### Files to Create
1. `packages/backend/src/services/note-validation.service.ts`
2. `packages/frontend/src/hooks/useNoteValidation.ts`
3. `packages/frontend/src/components/ClinicalNotes/ValidatedField.tsx`
4. `packages/frontend/src/components/ClinicalNotes/ValidationSummary.tsx`

### Files to Modify
1. `packages/backend/src/controllers/clinicalNote.controller.ts` (+150 lines)
2. `packages/backend/src/routes/clinicalNote.routes.ts` (+3 lines)
3. All 8 note forms in `packages/frontend/src/pages/ClinicalNotes/Forms/` (~20 lines each = 160 lines total)

---

## Benefits of Phase 1.3

1. **Prevents Incomplete Notes**: Required fields enforced before signing
2. **Real-Time Feedback**: Clinicians see validation errors immediately
3. **Configurable Rules**: Validation rules stored in database, easy to modify
4. **Consistent Quality**: All notes meet minimum standards
5. **Better UX**: Clear visual indicators of required fields and errors
6. **Audit Compliance**: Ensures all notes have required documentation

---

## Next Steps

1. Complete backend validation service
2. Add backend API endpoints
3. Create frontend validation hook
4. Build validation UI components
5. Integrate into all note forms
6. Test thoroughly
7. Deploy to production

---

**Current Status**: Database ready, backend and frontend implementation pending
**Estimated Completion**: 6.5 hours more work
**Deployment Target**: Phase 1.3 complete within 1 day

---

**Document Created**: October 22, 2025, 5:00 PM EST
**Last Updated**: October 22, 2025, 5:00 PM EST
**Version**: 1.0.0
