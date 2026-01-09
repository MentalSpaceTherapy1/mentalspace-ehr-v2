import React from 'react';

interface FormSectionProps {
  title: string;
  number: number;
  children: React.ReactNode;
}

export function FormSection({ title, number, children }: FormSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  type?: 'text' | 'date' | 'time' | 'email' | 'tel';
}

export function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  disabled,
  type = 'text',
}: TextFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function TextAreaField({
  label,
  value,
  onChange,
  required,
  placeholder,
  rows = 4,
  disabled,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
}

export function SelectField({ label, value, onChange, options, required, disabled }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function CheckboxField({ label, checked, onChange, disabled }: CheckboxFieldProps) {
  return (
    <label className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl cursor-pointer hover:border-purple-400 transition-all">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
      />
      <span className="ml-3 font-semibold text-gray-700">{label}</span>
    </label>
  );
}

interface FormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  // New props for Sign & Submit
  onSignAndSubmit?: () => void;
  isSigningAndSubmitting?: boolean;
  canSign?: boolean;
  signAndSubmitLabel?: string;
}

export function FormActions({
  onCancel,
  onSubmit,
  submitLabel = 'Create Note',
  isSubmitting,
  onSaveDraft,
  isSavingDraft,
  onSignAndSubmit,
  isSigningAndSubmitting,
  canSign = true,
  signAndSubmitLabel = 'Sign & Submit'
}: FormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-4 mt-8">
      <button
        type="button"
        onClick={onCancel}
        className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-300 transform hover:scale-105 transition-all duration-200 font-semibold"
      >
        Cancel
      </button>
      {onSaveDraft && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSavingDraft}
          className="px-8 py-4 bg-gradient-to-r from-gray-400 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
        </button>
      )}
      <button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
      {onSignAndSubmit && (
        <button
          type="button"
          onClick={onSignAndSubmit}
          disabled={isSigningAndSubmitting || !canSign}
          title={!canSign ? 'Cannot sign: validation requirements not met' : ''}
          className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {isSigningAndSubmitting ? 'Signing...' : signAndSubmitLabel}
        </button>
      )}
    </div>
  );
}
