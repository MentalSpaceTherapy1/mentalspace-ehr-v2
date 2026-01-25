/**
 * Lazy Route Configuration
 * Phase 4.1: Implement Route Lazy Loading
 *
 * Provides lazy-loaded route components for better code splitting.
 * Critical components (Login, Layout, ErrorBoundary) remain eagerly loaded.
 */

import { lazy, Suspense, ComponentType } from 'react';
import LoadingFallback from '../components/common/LoadingFallback';

/**
 * Higher-order component for lazy loading with consistent fallback
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackMessage = 'Loading page...'
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================================================
// Core Pages (Dashboard, Profile)
// ============================================================================
export const Dashboard = lazyLoad(() => import('../pages/Dashboard'));
export const UserProfile = lazyLoad(() => import('../pages/UserProfile'));

// ============================================================================
// User Management
// ============================================================================
export const UserList = lazyLoad(() => import('../pages/Users/UserList'));
export const UserForm = lazyLoad(() => import('../pages/Users/UserForm'));
export const UserDetail = lazyLoad(() => import('../pages/Users/UserDetail'));

// ============================================================================
// Settings
// ============================================================================
export const PracticeSettings = lazyLoad(() => import('../pages/Settings/PracticeSettingsFinal'));
export const MFASettings = lazyLoad(() => import('../pages/Settings/MFASettings'));
export const SessionManagement = lazyLoad(() => import('../pages/Settings/SessionManagement'));
export const ReminderSettings = lazyLoad(() => import('../pages/Settings/ReminderSettings'));
export const ClinicalNoteReminderSettings = lazyLoad(() => import('../pages/Settings/ClinicalNoteReminderSettings'));
export const AppointmentTypes = lazyLoad(() => import('../pages/Settings/AppointmentTypes'));
export const ProviderAvailability = lazyLoad(() => import('../pages/Settings/ProviderAvailability'));

// ============================================================================
// Clients
// ============================================================================
export const ClientList = lazyLoad(() => import('../pages/Clients/ClientList'));
export const ClientForm = lazyLoad(() => import('../pages/Clients/ClientForm'));
export const ClientDetail = lazyLoad(() => import('../pages/Clients/ClientDetail'));
export const ClientDiagnosesPage = lazyLoad(() => import('../pages/Clients/ClientDiagnosesPage'));
export const DuplicateDetectionPage = lazyLoad(() => import('../pages/Clients/DuplicateDetectionPage'));

// ============================================================================
// Clinical Notes
// ============================================================================
export const ClinicalNoteDetail = lazyLoad(() => import('../pages/ClinicalNotes/ClinicalNoteDetail'));
export const ClinicalNotesPage = lazyLoad(() => import('../pages/ClinicalNotes/ClinicalNotesPage'));
export const ComplianceDashboard = lazyLoad(() => import('../pages/ClinicalNotes/ComplianceDashboard'));
export const MyNotes = lazyLoad(() => import('../pages/ClinicalNotes/MyNotes'));
export const CosignQueue = lazyLoad(() => import('../pages/ClinicalNotes/CosignQueue'));
export const EditNoteRouter = lazyLoad(() => import('../pages/ClinicalNotes/EditNoteRouter'));
export const SmartNoteCreator = lazyLoad(() => import('../pages/ClinicalNotes/SmartNoteCreator'));

// Clinical Note Forms
export const IntakeAssessmentForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/IntakeAssessmentForm'));
export const ProgressNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/ProgressNoteForm'));
export const TreatmentPlanForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/TreatmentPlanForm'));
export const CancellationNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/CancellationNoteForm'));
export const ConsultationNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/ConsultationNoteForm'));
export const ContactNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/ContactNoteForm'));
export const TerminationNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/TerminationNoteForm'));
export const MiscellaneousNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/MiscellaneousNoteForm'));
export const GroupTherapyNoteForm = lazyLoad(() => import('../pages/ClinicalNotes/Forms/GroupTherapyNoteForm'));

// ============================================================================
// Appointments
// ============================================================================
export const AppointmentsCalendar = lazyLoad(() => import('../pages/Appointments/AppointmentsCalendar'));
export const NewAppointment = lazyLoad(() => import('../pages/Appointments/NewAppointment'));
export const Waitlist = lazyLoad(() => import('../pages/Appointments/Waitlist'));
export const ClinicianSchedule = lazyLoad(() => import('../pages/Appointments/ClinicianSchedule'));
export const ProviderComparisonView = lazyLoad(() => import('../pages/Appointments/ProviderComparisonView'));
export const RoomView = lazyLoad(() => import('../pages/Appointments/RoomView'));
export const AISchedulingAssistant = lazyLoad(() => import('../pages/AISchedulingAssistant'));

// ============================================================================
// Time Off
// ============================================================================
export const TimeOffRequests = lazyLoad(() => import('../pages/TimeOff/TimeOffRequestsPage'));

// ============================================================================
// Telehealth
// ============================================================================
export const VideoSession = lazyLoad(() => import('../pages/Telehealth/VideoSession'));
export const TelehealthDashboard = lazyLoad(() => import('../pages/Telehealth/TelehealthDashboard'));

// ============================================================================
// Self Schedule & Client Portal
// ============================================================================
export const SelfScheduleDashboard = lazyLoad(() => import('../pages/SelfSchedule/SelfScheduleDashboard'));
export const ClientPortalManagement = lazyLoad(() => import('../pages/ClientPortal/ClientPortalManagement'));

// ============================================================================
// Progress Tracking
// ============================================================================
export const ProgressTrackingDashboard = lazyLoad(() => import('../pages/ProgressTracking/ProgressTrackingDashboard'));
export const AssignMeasures = lazyLoad(() => import('../pages/ProgressTracking/AssignMeasures'));
export const ProgressReports = lazyLoad(() => import('../pages/ProgressTracking/ProgressReports'));

// ============================================================================
// Guardian Portal
// ============================================================================
export const GuardianPortalDashboard = lazyLoad(() => import('../pages/Guardian/GuardianPortalDashboard'));
export const GuardianPortal = lazyLoad(() => import('../pages/Guardian/GuardianPortal'));
export const RequestAccess = lazyLoad(() => import('../pages/Guardian/RequestAccess'));
export const GuardianConsent = lazyLoad(() => import('../pages/Guardian/GuardianConsent'));

// ============================================================================
// Admin
// ============================================================================
export const AdminDashboard = lazyLoad(() => import('../pages/Admin/AdminDashboard'));
export const SessionRatings = lazyLoad(() => import('../pages/Admin/SessionRatings'));
export const CrisisDetections = lazyLoad(() => import('../pages/Admin/CrisisDetections'));
export const GuardianVerification = lazyLoad(() => import('../pages/Admin/GuardianVerification'));
export const SchedulingRules = lazyLoad(() => import('../pages/Admin/SchedulingRules'));
export const WaitlistManagement = lazyLoad(() => import('../pages/Admin/WaitlistManagement'));
export const AdvancedMDSync = lazyLoad(() => import('../pages/Admin/AdvancedMDSync'));
export const AdvancedMDSettings = lazyLoad(() => import('../pages/Admin/AdvancedMDSettings'));

// ============================================================================
// Clinician Tools
// ============================================================================
export const ClinicianToolsDashboard = lazyLoad(() => import('../pages/Clinician/ClinicianToolsDashboard'));
export const ClientProgress = lazyLoad(() => import('../pages/Clinician/ClientProgress'));
export const MyWaitlist = lazyLoad(() => import('../pages/Clinician/MyWaitlist'));

// ============================================================================
// Billing
// ============================================================================
export const BillingDashboard = lazyLoad(() => import('../pages/Billing/BillingDashboard'));
export const ChargesPage = lazyLoad(() => import('../pages/Billing/ChargesPage'));
export const PaymentsPage = lazyLoad(() => import('../pages/Billing/PaymentsPage'));
export const PayerList = lazyLoad(() => import('../pages/Billing/PayerList'));
export const PayerForm = lazyLoad(() => import('../pages/Billing/PayerForm'));
export const PayerRuleList = lazyLoad(() => import('../pages/Billing/PayerRuleList'));
export const PayerRuleForm = lazyLoad(() => import('../pages/Billing/PayerRuleForm'));
export const BillingHoldsList = lazyLoad(() => import('../pages/Billing/BillingHoldsList'));
export const BillingReadinessChecker = lazyLoad(() => import('../pages/Billing/BillingReadinessChecker'));
export const PayerRuleImporter = lazyLoad(() => import('../pages/Billing/PayerRuleImporter'));
export const PayerDashboard = lazyLoad(() => import('../pages/Billing/PayerDashboard'));

// ============================================================================
// Productivity
// ============================================================================
export const ClinicianProductivityDashboard = lazyLoad(() => import('../pages/Productivity/ClinicianDashboard'));
export const SupervisorDashboard = lazyLoad(() => import('../pages/Productivity/SupervisorDashboard'));
export const AdministratorDashboard = lazyLoad(() => import('../pages/Productivity/AdministratorDashboard'));

// ============================================================================
// Reports
// ============================================================================
export const ReportsDashboard = lazyLoad(() => import('../pages/Reports/ReportsDashboard'));
export const CustomReportsList = lazyLoad(() => import('../pages/Reports/CustomReportsList'));
export const CustomReportBuilder = lazyLoad(() => import('../pages/Reports/CustomReportBuilder'));
// Note: ReportSubscriptions is a named export, needs special handling
export const ReportSubscriptions = lazyLoad(() =>
  import('../pages/Reports/ReportSubscriptions').then(m => ({ default: m.ReportSubscriptions }))
);

// ============================================================================
// Analytics & Predictions
// ============================================================================
export const AnalyticsDashboard = lazyLoad(() => import('../pages/Analytics/AnalyticsDashboard'));
export const PredictionsDashboard = lazyLoad(() => import('../pages/Predictions/PredictionsDashboard'));

// ============================================================================
// Dashboards
// ============================================================================
export const DashboardList = lazyLoad(() => import('../pages/Dashboards/DashboardList'));
export const DashboardBuilder = lazyLoad(() => import('../pages/Dashboards/DashboardBuilder'));

// ============================================================================
// Groups
// ============================================================================
export const GroupSessionsPage = lazyLoad(() => import('../pages/Groups/GroupSessionsPage'));
export const GroupDetailsPage = lazyLoad(() => import('../pages/Groups/GroupDetailsPage'));

// ============================================================================
// Outcome Measures
// ============================================================================
export const OutcomeMeasuresPage = lazyLoad(() => import('../pages/OutcomeMeasures/OutcomeMeasuresPage'));

// ============================================================================
// Supervision
// ============================================================================
export const SupervisionSessionsList = lazyLoad(() => import('../pages/Supervision/SupervisionSessionsList'));
export const SupervisionSessionForm = lazyLoad(() => import('../pages/Supervision/SupervisionSessionForm'));
export const SupervisionHoursDashboard = lazyLoad(() => import('../pages/Supervision/SupervisionHoursDashboard'));

// ============================================================================
// Unlock Requests
// ============================================================================
export const UnlockRequestManagement = lazyLoad(() => import('../pages/UnlockRequests/UnlockRequestManagement'));

// ============================================================================
// Portal Pages (Client Portal)
// ============================================================================
export const PortalDashboard = lazyLoad(() => import('../pages/Portal/PortalDashboard'));
export const PortalAppointments = lazyLoad(() => import('../pages/Portal/PortalAppointments'));
export const PortalMessages = lazyLoad(() => import('../pages/Portal/PortalMessages'));
export const PortalMoodTracking = lazyLoad(() => import('../pages/Portal/PortalMoodTracking'));
export const PortalSymptomDiary = lazyLoad(() => import('../pages/Portal/PortalSymptomDiary'));
export const PortalSleepDiary = lazyLoad(() => import('../pages/Portal/PortalSleepDiary'));
export const PortalExerciseLog = lazyLoad(() => import('../pages/Portal/PortalExerciseLog'));
export const PortalBilling = lazyLoad(() => import('../pages/Portal/PortalBilling'));
export const PortalProfile = lazyLoad(() => import('../pages/Portal/PortalProfile'));
export const PortalDocuments = lazyLoad(() => import('../pages/Portal/PortalDocuments'));
export const PortalFormViewer = lazyLoad(() => import('../pages/Portal/PortalFormViewer'));
export const PortalAssessments = lazyLoad(() => import('../pages/Portal/PortalAssessments'));
export const PortalAssessmentTake = lazyLoad(() => import('../pages/Portal/PortalAssessmentTake'));
export const PortalAssessmentResults = lazyLoad(() => import('../pages/Portal/PortalAssessmentResults'));
export const PortalAppointmentRequest = lazyLoad(() => import('../pages/Portal/PortalAppointmentRequest'));
export const PortalReferrals = lazyLoad(() => import('../pages/Portal/PortalReferrals'));
export const PortalTherapistChange = lazyLoad(() => import('../pages/Portal/PortalTherapistChange'));
export const PortalTherapistProfile = lazyLoad(() => import('../pages/Portal/PortalTherapistProfile'));
export const PortalSelfScheduling = lazyLoad(() => import('../pages/Portal/PortalSelfScheduling'));

// ============================================================================
// Landing Page
// ============================================================================
export const LandingPage = lazyLoad(() => import('../pages/Landing/LandingPage'));

// ============================================================================
// Module 9: Credentialing (already lazy in App.tsx, re-exporting for consistency)
// ============================================================================
export const CredentialingDashboard = lazyLoad(() => import('../pages/Credentialing/CredentialingDashboard'));
export const CredentialList = lazyLoad(() => import('../pages/Credentialing/CredentialList'));
export const CredentialForm = lazyLoad(() => import('../pages/Credentialing/CredentialForm'));
export const CredentialVerification = lazyLoad(() => import('../pages/Credentialing/CredentialVerification'));
export const ExpirationAlerts = lazyLoad(() => import('../pages/Credentialing/ExpirationAlerts'));
export const ComplianceReport = lazyLoad(() => import('../pages/Credentialing/ComplianceReport'));
export const ScreeningStatus = lazyLoad(() => import('../pages/Credentialing/ScreeningStatus'));
export const DocumentUpload = lazyLoad(() => import('../pages/Credentialing/DocumentUpload'));
export const CredentialTimeline = lazyLoad(() => import('../pages/Credentialing/CredentialTimeline'));

// ============================================================================
// Module 9: Training
// ============================================================================
export const TrainingDashboard = lazyLoad(() => import('../pages/Training/TrainingDashboard'));
export const CourseCatalog = lazyLoad(() => import('../pages/Training/CourseCatalog'));
export const CourseDetails = lazyLoad(() => import('../pages/Training/CourseDetails'));
export const CourseForm = lazyLoad(() => import('../pages/Training/CourseForm'));
export const EnrollmentManager = lazyLoad(() => import('../pages/Training/EnrollmentManager'));
export const TrainingProgress = lazyLoad(() => import('../pages/Training/TrainingProgress'));
export const CEUTracker = lazyLoad(() => import('../pages/Training/CEUTracker'));
export const ComplianceMonitor = lazyLoad(() => import('../pages/Training/ComplianceMonitor'));
export const TrainingCalendar = lazyLoad(() => import('../pages/Training/TrainingCalendar'));
export const CertificateViewer = lazyLoad(() => import('../pages/Training/CertificateViewer'));

// ============================================================================
// Module 9: Compliance
// ============================================================================
export const PolicyLibrary = lazyLoad(() => import('../pages/Compliance/PolicyLibrary'));
export const PolicyViewer = lazyLoad(() => import('../pages/Compliance/PolicyViewer'));
export const PolicyForm = lazyLoad(() => import('../pages/Compliance/PolicyForm'));
export const PolicyDistribution = lazyLoad(() => import('../pages/Compliance/PolicyDistribution'));
export const AcknowledgmentForm = lazyLoad(() => import('../pages/Compliance/AcknowledgmentForm'));
export const IncidentReportingForm = lazyLoad(() => import('../pages/Compliance/IncidentReportingForm'));
export const IncidentList = lazyLoad(() => import('../pages/Compliance/IncidentList'));
export const IncidentDetails = lazyLoad(() => import('../pages/Compliance/IncidentDetails'));
export const InvestigationWorkflow = lazyLoad(() => import('../pages/Compliance/InvestigationWorkflow'));
export const ComplianceDashboardPage = lazyLoad(() => import('../pages/Compliance/ComplianceDashboard'));
export const IncidentTrends = lazyLoad(() => import('../pages/Compliance/IncidentTrends'));

// ============================================================================
// Module 9: HR Functions
// ============================================================================
export const PerformanceReviewForm = lazyLoad(() => import('../pages/HR/PerformanceReviewForm'));
export const ReviewList = lazyLoad(() => import('../pages/HR/ReviewList'));
export const ReviewViewer = lazyLoad(() => import('../pages/HR/ReviewViewer'));
export const TimeClockInterface = lazyLoad(() => import('../pages/HR/TimeClockInterface'));
export const AttendanceCalendar = lazyLoad(() => import('../pages/HR/AttendanceCalendar'));
export const AttendanceReport = lazyLoad(() => import('../pages/HR/AttendanceReport'));
export const PTORequestForm = lazyLoad(() => import('../pages/HR/PTORequestForm'));
export const PTOCalendar = lazyLoad(() => import('../pages/HR/PTOCalendar'));
export const PTOApproval = lazyLoad(() => import('../pages/HR/PTOApproval'));

// ============================================================================
// Module 9: Staff Management
// ============================================================================
export const StaffDirectory = lazyLoad(() => import('../pages/Staff/StaffDirectory'));
export const StaffProfile = lazyLoad(() => import('../pages/Staff/StaffProfile'));
export const EmploymentForm = lazyLoad(() => import('../pages/Staff/EmploymentForm'));
export const OrganizationalChart = lazyLoad(() => import('../pages/Staff/OrganizationalChart'));
export const OnboardingDashboard = lazyLoad(() => import('../pages/Staff/OnboardingDashboard'));
export const OnboardingChecklist = lazyLoad(() => import('../pages/Staff/OnboardingChecklist'));
export const MilestoneTracker = lazyLoad(() => import('../pages/Staff/MilestoneTracker'));

// ============================================================================
// Module 9: Communication
// ============================================================================
export const MessagingHub = lazyLoad(() => import('../pages/Communication/MessagingHub'));
export const MessageComposer = lazyLoad(() => import('../pages/Communication/MessageComposer'));
export const MessageThread = lazyLoad(() => import('../pages/Communication/MessageThread'));
export const ChannelList = lazyLoad(() => import('../pages/Communication/ChannelList'));
export const ChannelView = lazyLoad(() => import('../pages/Communication/ChannelView'));
export const DocumentLibrary = lazyLoad(() => import('../pages/Communication/DocumentLibrary'));
export const DocumentUploader = lazyLoad(() => import('../pages/Communication/DocumentUploader'));
export const DocumentViewer = lazyLoad(() => import('../pages/Communication/DocumentViewer'));
export const FolderTree = lazyLoad(() => import('../pages/Communication/FolderTree'));

// ============================================================================
// Module 9: Vendor & Financial
// ============================================================================
export const VendorList = lazyLoad(() => import('../pages/Vendor/VendorList'));
export const VendorForm = lazyLoad(() => import('../pages/Vendor/VendorForm'));
export const VendorProfile = lazyLoad(() => import('../pages/Vendor/VendorProfile'));
export const BudgetDashboard = lazyLoad(() => import('../pages/Finance/BudgetDashboard'));
export const BudgetAllocation = lazyLoad(() => import('../pages/Finance/BudgetAllocation'));
export const ExpenseForm = lazyLoad(() => import('../pages/Finance/ExpenseForm'));
export const ExpenseList = lazyLoad(() => import('../pages/Finance/ExpenseList'));
export const ExpenseApproval = lazyLoad(() => import('../pages/Finance/ExpenseApproval'));
export const PurchaseOrderForm = lazyLoad(() => import('../pages/Finance/PurchaseOrderForm'));
export const POList = lazyLoad(() => import('../pages/Finance/POList'));
export const POApproval = lazyLoad(() => import('../pages/Finance/POApproval'));

// ============================================================================
// Module 9: Reports
// ============================================================================
export const Module9ReportsDashboard = lazyLoad(() => import('../pages/Module9Reports/Module9ReportsDashboard'));
export const ReportViewer = lazyLoad(() => import('../pages/Module9Reports/ReportViewer'));
export const ReportBuilder = lazyLoad(() => import('../pages/Module9Reports/ReportBuilder'));
export const ExportDialog = lazyLoad(() => import('../pages/Module9Reports/ExportDialog'));
export const DashboardWidgets = lazyLoad(() => import('../pages/Module9Reports/DashboardWidgets'));
export const AnalyticsCharts = lazyLoad(() => import('../pages/Module9Reports/AnalyticsCharts'));
export const AuditLogViewer = lazyLoad(() => import('../pages/Module9Reports/AuditLogViewer'));
