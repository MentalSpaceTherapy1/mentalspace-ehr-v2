/**
 * PriorAuthorization/index.tsx
 * PRD Section 6.1 - Route entry, lazy loading
 *
 * Main entry point for the Prior Authorization module
 */

export { default as PriorAuthorizationDetail } from './PriorAuthorizationDetail';
export { default as PriorAuthorizationForm } from './PriorAuthorizationForm';

// Re-export form components for direct access if needed
export { default as SeverityDropdown } from './PriorAuthorizationForm/SeverityDropdown';
export { default as ClinicalGridSection } from './PriorAuthorizationForm/ClinicalGridSection';
export { default as NarrativeSectionsContainer } from './PriorAuthorizationForm/NarrativeSectionsContainer';
export { default as PAFormHeader } from './PriorAuthorizationForm/PAFormHeader';
export { default as GenerateWithLisaButton } from './PriorAuthorizationForm/GenerateWithLisaButton';
