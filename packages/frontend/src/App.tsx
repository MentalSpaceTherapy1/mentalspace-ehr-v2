import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserList from './pages/Users/UserList';
import UserForm from './pages/Users/UserForm';
import UserDetail from './pages/Users/UserDetail';
import PracticeSettings from './pages/Settings/PracticeSettingsFinal';
import MFASettings from './pages/Settings/MFASettings';
import SessionManagement from './pages/Settings/SessionManagement';
import UserProfile from './pages/UserProfile';
import ClientList from './pages/Clients/ClientList';
import ClientForm from './pages/Clients/ClientForm';
import ClientDetail from './pages/Clients/ClientDetail';
import ClientDiagnosesPage from './pages/Clients/ClientDiagnosesPage';
import DuplicateDetectionPage from './pages/Clients/DuplicateDetectionPage';
import ClinicalNoteDetail from './pages/ClinicalNotes/ClinicalNoteDetail';
import ClinicalNotesPage from './pages/ClinicalNotes/ClinicalNotesPage';
import ComplianceDashboard from './pages/ClinicalNotes/ComplianceDashboard';
import MyNotes from './pages/ClinicalNotes/MyNotes';
// Old components kept for backward compatibility with direct form routes
import IntakeAssessmentForm from './pages/ClinicalNotes/Forms/IntakeAssessmentForm';
import ProgressNoteForm from './pages/ClinicalNotes/Forms/ProgressNoteForm';
import TreatmentPlanForm from './pages/ClinicalNotes/Forms/TreatmentPlanForm';
import CancellationNoteForm from './pages/ClinicalNotes/Forms/CancellationNoteForm';
import ConsultationNoteForm from './pages/ClinicalNotes/Forms/ConsultationNoteForm';
import ContactNoteForm from './pages/ClinicalNotes/Forms/ContactNoteForm';
import TerminationNoteForm from './pages/ClinicalNotes/Forms/TerminationNoteForm';
import MiscellaneousNoteForm from './pages/ClinicalNotes/Forms/MiscellaneousNoteForm';
import GroupTherapyNoteForm from './pages/ClinicalNotes/Forms/GroupTherapyNoteForm';
import AppointmentsCalendar from './pages/Appointments/AppointmentsCalendar';
import NewAppointment from './pages/Appointments/NewAppointment';
import Waitlist from './pages/Appointments/Waitlist';
import ClinicianSchedule from './pages/Appointments/ClinicianSchedule';
import ProviderComparisonView from './pages/Appointments/ProviderComparisonView';
import RoomView from './pages/Appointments/RoomView';
import TimeOffRequests from './pages/TimeOff/TimeOffRequestsPage';
import ReminderSettings from './pages/Settings/ReminderSettings';
import ClinicalNoteReminderSettings from './pages/Settings/ClinicalNoteReminderSettings';
import AppointmentTypes from './pages/Settings/AppointmentTypes';
import ProviderAvailability from './pages/Settings/ProviderAvailability';
import VideoSession from './pages/Telehealth/VideoSession';
import BillingDashboard from './pages/Billing/BillingDashboard';
import ChargesPage from './pages/Billing/ChargesPage';
import PaymentsPage from './pages/Billing/PaymentsPage';
import PayerList from './pages/Billing/PayerList';
import PayerForm from './pages/Billing/PayerForm';
import PayerRuleList from './pages/Billing/PayerRuleList';
import PayerRuleForm from './pages/Billing/PayerRuleForm';
import BillingHoldsList from './pages/Billing/BillingHoldsList';
import BillingReadinessChecker from './pages/Billing/BillingReadinessChecker';
import PayerRuleImporter from './pages/Billing/PayerRuleImporter';
import PayerDashboard from './pages/Billing/PayerDashboard';
import ClinicianDashboard from './pages/Productivity/ClinicianDashboard';
import SupervisorDashboard from './pages/Productivity/SupervisorDashboard';
import AdministratorDashboard from './pages/Productivity/AdministratorDashboard';
import ReportsDashboard from './pages/Reports/ReportsDashboard';
import CustomReportsList from './pages/Reports/CustomReportsList';
import CustomReportBuilder from './pages/Reports/CustomReportBuilder';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';
import PortalLayout from './components/PortalLayout';
import PortalLogin from './pages/Portal/PortalLogin';
import PortalRegister from './pages/Portal/PortalRegister';
import PortalForgotPassword from './pages/Portal/PortalForgotPassword';
import PortalDashboard from './pages/Portal/PortalDashboard';
import PortalAppointments from './pages/Portal/PortalAppointments';
import PortalMessages from './pages/Portal/PortalMessages';
import PortalMoodTracking from './pages/Portal/PortalMoodTracking';
import PortalBilling from './pages/Portal/PortalBilling';
import PortalProfile from './pages/Portal/PortalProfile';
import PortalDocuments from './pages/Portal/PortalDocuments';
import PortalFormViewer from './pages/Portal/PortalFormViewer';
import PortalAssessments from './pages/Portal/PortalAssessments';
import PortalAppointmentRequest from './pages/Portal/PortalAppointmentRequest';
import PortalReferrals from './pages/Portal/PortalReferrals';
import PortalTherapistChange from './pages/Portal/PortalTherapistChange';
import PortalTherapistProfile from './pages/Portal/PortalTherapistProfile';
import SupervisionSessionsList from './pages/Supervision/SupervisionSessionsList';
import SupervisionSessionForm from './pages/Supervision/SupervisionSessionForm';
import SupervisionHoursDashboard from './pages/Supervision/SupervisionHoursDashboard';
import UnlockRequestManagement from './pages/UnlockRequests/UnlockRequestManagement';
import EditNoteRouter from './pages/ClinicalNotes/EditNoteRouter';
import SmartNoteCreator from './pages/ClinicalNotes/SmartNoteCreator';
import LandingPage from './pages/Landing/LandingPage';
import GroupSessionsPage from './pages/Groups/GroupSessionsPage';
import GroupDetailsPage from './pages/Groups/GroupDetailsPage';
import AISchedulingAssistant from './pages/AISchedulingAssistant';
import OutcomeMeasuresPage from './pages/OutcomeMeasures/OutcomeMeasuresPage';
import SessionRatings from './pages/Admin/SessionRatings';
import CrisisDetections from './pages/Admin/CrisisDetections';
import SymptomDiary from './pages/Client/SymptomDiary';
import SleepDiary from './pages/Client/SleepDiary';
import ExerciseLog from './pages/Client/ExerciseLog';
import PortalSelfScheduling from './pages/Portal/PortalSelfScheduling';
import GuardianPortal from './pages/Guardian/GuardianPortal';
import RequestAccess from './pages/Guardian/RequestAccess';
import GuardianVerification from './pages/Admin/GuardianVerification';
import GuardianConsent from './pages/Guardian/GuardianConsent';
import SchedulingRules from './pages/Admin/SchedulingRules';
import WaitlistManagement from './pages/Admin/WaitlistManagement';
import ClientProgress from './pages/Clinician/ClientProgress';
import MyWaitlist from './pages/Clinician/MyWaitlist';
import DashboardList from './pages/Dashboards/DashboardList';
import DashboardBuilder from './pages/Dashboards/DashboardBuilder';

// Module 9: Credentialing
import CredentialingDashboard from './pages/Credentialing/CredentialingDashboard';
import CredentialList from './pages/Credentialing/CredentialList';
import CredentialForm from './pages/Credentialing/CredentialForm';
import CredentialVerification from './pages/Credentialing/CredentialVerification';
import ExpirationAlerts from './pages/Credentialing/ExpirationAlerts';
import ComplianceReport from './pages/Credentialing/ComplianceReport';
import ScreeningStatus from './pages/Credentialing/ScreeningStatus';
import DocumentUpload from './pages/Credentialing/DocumentUpload';
import CredentialTimeline from './pages/Credentialing/CredentialTimeline';

// Module 9: Training
import TrainingDashboard from './pages/Training/TrainingDashboard';
import CourseCatalog from './pages/Training/CourseCatalog';
import CourseDetails from './pages/Training/CourseDetails';
import CourseForm from './pages/Training/CourseForm';
import EnrollmentManager from './pages/Training/EnrollmentManager';
import TrainingProgress from './pages/Training/TrainingProgress';
import CEUTracker from './pages/Training/CEUTracker';
import ComplianceMonitor from './pages/Training/ComplianceMonitor';
import TrainingCalendar from './pages/Training/TrainingCalendar';
import CertificateViewer from './pages/Training/CertificateViewer';

// Module 9: Compliance
import PolicyLibrary from './pages/Compliance/PolicyLibrary';
import PolicyViewer from './pages/Compliance/PolicyViewer';
import PolicyForm from './pages/Compliance/PolicyForm';
import PolicyDistribution from './pages/Compliance/PolicyDistribution';
import AcknowledgmentForm from './pages/Compliance/AcknowledgmentForm';
import IncidentReportingForm from './pages/Compliance/IncidentReportingForm';
import IncidentList from './pages/Compliance/IncidentList';
import IncidentDetails from './pages/Compliance/IncidentDetails';
import InvestigationWorkflow from './pages/Compliance/InvestigationWorkflow';
import ComplianceDashboardPage from './pages/Compliance/ComplianceDashboard';
import IncidentTrends from './pages/Compliance/IncidentTrends';

// Module 9: HR Functions
import PerformanceReviewForm from './pages/HR/PerformanceReviewForm';
import ReviewList from './pages/HR/ReviewList';
import ReviewViewer from './pages/HR/ReviewViewer';
import TimeClockInterface from './pages/HR/TimeClockInterface';
import AttendanceCalendar from './pages/HR/AttendanceCalendar';
import AttendanceReport from './pages/HR/AttendanceReport';
import PTORequestForm from './pages/HR/PTORequestForm';
import PTOCalendar from './pages/HR/PTOCalendar';
import PTOApproval from './pages/HR/PTOApproval';

// Module 9: Staff Management
import StaffDirectory from './pages/Staff/StaffDirectory';
import StaffProfile from './pages/Staff/StaffProfile';
import EmploymentForm from './pages/Staff/EmploymentForm';
import OrganizationalChart from './pages/Staff/OrganizationalChart';
import OnboardingDashboard from './pages/Staff/OnboardingDashboard';
import OnboardingChecklist from './pages/Staff/OnboardingChecklist';
import MilestoneTracker from './pages/Staff/MilestoneTracker';

// Module 9: Communication
import MessagingHub from './pages/Communication/MessagingHub';
import MessageComposer from './pages/Communication/MessageComposer';
import MessageThread from './pages/Communication/MessageThread';
import ChannelList from './pages/Communication/ChannelList';
import ChannelView from './pages/Communication/ChannelView';
import DocumentLibrary from './pages/Communication/DocumentLibrary';
import DocumentUploader from './pages/Communication/DocumentUploader';
import DocumentViewer from './pages/Communication/DocumentViewer';
import FolderTree from './pages/Communication/FolderTree';

// Module 9: Vendor & Financial
import VendorList from './pages/Vendor/VendorList';
import VendorForm from './pages/Vendor/VendorForm';
import VendorProfile from './pages/Vendor/VendorProfile';
import BudgetDashboard from './pages/Finance/BudgetDashboard';
import BudgetAllocation from './pages/Finance/BudgetAllocation';
import ExpenseForm from './pages/Finance/ExpenseForm';
import ExpenseList from './pages/Finance/ExpenseList';
import ExpenseApproval from './pages/Finance/ExpenseApproval';
import PurchaseOrderForm from './pages/Finance/PurchaseOrderForm';
import POList from './pages/Finance/POList';
import POApproval from './pages/Finance/POApproval';

// Module 9: Reports
import Module9ReportsDashboard from './pages/Module9Reports/Module9ReportsDashboard';
import ReportViewer from './pages/Module9Reports/ReportViewer';
import ReportBuilder from './pages/Module9Reports/ReportBuilder';
import ExportDialog from './pages/Module9Reports/ExportDialog';
import DashboardWidgets from './pages/Module9Reports/DashboardWidgets';
import AnalyticsCharts from './pages/Module9Reports/AnalyticsCharts';
import AuditLogViewer from './pages/Module9Reports/AuditLogViewer';


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function PortalRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('portalToken');
  console.log('🟢 PortalRoute guard checking token:', token ? 'exists' : 'missing');

  if (!token) {
    console.log('🔴 PortalRoute: No token, redirecting to login');
    return <Navigate to="/portal/login" />;
  }

  console.log('🟢 PortalRoute: Token valid, rendering children');
  return <PortalLayout>{children}</PortalLayout>;
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<Login />} />

        {/* Client Portal Routes */}
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal/register" element={<PortalRegister />} />
        <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
        <Route
          path="/portal/dashboard"
          element={
            <PortalRoute>
              <PortalDashboard />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/appointments"
          element={
            <PortalRoute>
              <PortalAppointments />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/messages"
          element={
            <PortalRoute>
              <PortalMessages />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/mood"
          element={
            <PortalRoute>
              <PortalMoodTracking />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/billing"
          element={
            <PortalRoute>
              <PortalBilling />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/profile"
          element={
            <PortalRoute>
              <PortalProfile />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/documents"
          element={
            <PortalRoute>
              <PortalDocuments />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/forms/:formId"
          element={
            <PortalRoute>
              <PortalFormViewer />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/assessments"
          element={
            <PortalRoute>
              <PortalAssessments />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/appointments/request"
          element={
            <PortalRoute>
              <PortalAppointmentRequest />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/referrals"
          element={
            <PortalRoute>
              <PortalReferrals />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/therapist/change"
          element={
            <PortalRoute>
              <PortalTherapistChange />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/therapist/profile"
          element={
            <PortalRoute>
              <PortalTherapistProfile />
            </PortalRoute>
          }
        />

        {/* Staff Dashboard - requires authentication */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <ClientList />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <PrivateRoute>
              <ClientForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <PrivateRoute>
              <ClientDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:id/edit"
          element={
            <PrivateRoute>
              <ClientForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/diagnoses"
          element={
            <PrivateRoute>
              <ClientDiagnosesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/outcome-measures"
          element={
            <PrivateRoute>
              <OutcomeMeasuresPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/duplicates"
          element={
            <PrivateRoute>
              <DuplicateDetectionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <PrivateRoute>
              <AppointmentsCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/new"
          element={
            <PrivateRoute>
              <NewAppointment />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/:id/edit"
          element={
            <PrivateRoute>
              <NewAppointment />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/waitlist"
          element={
            <PrivateRoute>
              <Waitlist />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/schedules"
          element={
            <PrivateRoute>
              <ClinicianSchedule />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/time-off"
          element={
            <PrivateRoute>
              <TimeOffRequests />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/provider-comparison"
          element={
            <PrivateRoute>
              <ProviderComparisonView />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/room-view"
          element={
            <PrivateRoute>
              <RoomView />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/ai-assistant"
          element={
            <PrivateRoute>
              <AISchedulingAssistant />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/reminders"
          element={
            <PrivateRoute>
              <ReminderSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/clinical-note-reminders"
          element={
            <PrivateRoute>
              <ClinicalNoteReminderSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/appointment-types"
          element={
            <PrivateRoute>
              <AppointmentTypes />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/availability"
          element={
            <PrivateRoute>
              <ProviderAvailability />
            </PrivateRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <PrivateRoute>
              <GroupSessionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/groups/:id"
          element={
            <PrivateRoute>
              <GroupDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/telehealth/session/:appointmentId"
          element={
            <PrivateRoute>
              <VideoSession />
            </PrivateRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <PrivateRoute>
              <ComplianceDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/notes/my-notes"
          element={
            <PrivateRoute>
              <MyNotes />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes"
          element={
            <PrivateRoute>
              <ClinicalNotesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/create"
          element={
            <PrivateRoute>
              <SmartNoteCreator />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/intake-assessment"
          element={
            <PrivateRoute>
              <IntakeAssessmentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/progress-note"
          element={
            <PrivateRoute>
              <ProgressNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/treatment-plan"
          element={
            <PrivateRoute>
              <TreatmentPlanForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/cancellation-note"
          element={
            <PrivateRoute>
              <CancellationNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/consultation-note"
          element={
            <PrivateRoute>
              <ConsultationNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/contact-note"
          element={
            <PrivateRoute>
              <ContactNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/termination-note"
          element={
            <PrivateRoute>
              <TerminationNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/miscellaneous-note"
          element={
            <PrivateRoute>
              <MiscellaneousNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinical-notes/new"
          element={
            <PrivateRoute>
              <SmartNoteCreator />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinical-notes/new/group-therapy/:appointmentId"
          element={
            <PrivateRoute>
              <GroupTherapyNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/:noteId"
          element={
            <PrivateRoute>
              <ClinicalNoteDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/:noteId/edit"
          element={
            <PrivateRoute>
              <EditNoteRouter />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision"
          element={
            <PrivateRoute>
              <SupervisionSessionsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/sessions"
          element={
            <PrivateRoute>
              <SupervisionSessionsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/sessions/new"
          element={
            <PrivateRoute>
              <SupervisionSessionForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/sessions/:id"
          element={
            <PrivateRoute>
              <SupervisionSessionForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/hours/:superviseeId"
          element={
            <PrivateRoute>
              <SupervisionHoursDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/unlock-requests"
          element={
            <PrivateRoute>
              <UnlockRequestManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <PrivateRoute>
              <BillingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/charges"
          element={
            <PrivateRoute>
              <ChargesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/charges/new"
          element={
            <PrivateRoute>
              <ChargesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payments"
          element={
            <PrivateRoute>
              <PaymentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payments/new"
          element={
            <PrivateRoute>
              <PaymentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers"
          element={
            <PrivateRoute>
              <PayerList />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/new"
          element={
            <PrivateRoute>
              <PayerForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:id/edit"
          element={
            <PrivateRoute>
              <PayerForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules"
          element={
            <PrivateRoute>
              <PayerRuleList />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules/new"
          element={
            <PrivateRoute>
              <PayerRuleForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules/:id/edit"
          element={
            <PrivateRoute>
              <PayerRuleForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules/import"
          element={
            <PrivateRoute>
              <PayerRuleImporter />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/holds"
          element={
            <PrivateRoute>
              <BillingHoldsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/readiness"
          element={
            <PrivateRoute>
              <BillingReadinessChecker />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payer-dashboard"
          element={
            <PrivateRoute>
              <PayerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <UserList />
            </PrivateRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <PrivateRoute>
              <UserForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <PrivateRoute>
              <UserDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <PrivateRoute>
              <UserForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <PracticeSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <UserProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/mfa-settings"
          element={
            <PrivateRoute>
              <MFASettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/sessions"
          element={
            <PrivateRoute>
              <SessionManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity"
          element={
            <PrivateRoute>
              <ClinicianDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity/clinician"
          element={
            <PrivateRoute>
              <ClinicianDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity/supervisor"
          element={
            <PrivateRoute>
              <SupervisorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity/administrator"
          element={
            <PrivateRoute>
              <AdministratorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ReportsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/custom"
          element={
            <PrivateRoute>
              <CustomReportsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/custom/new"
          element={
            <PrivateRoute>
              <CustomReportBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/custom/:id/edit"
          element={
            <PrivateRoute>
              <CustomReportBuilder />
            </PrivateRoute>
          }
        />

        {/* Module 8: Customizable Dashboards */}
        <Route
          path="/dashboards"
          element={
            <PrivateRoute>
              <DashboardList />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <PrivateRoute>
              <DashboardBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <AnalyticsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/session-ratings"
          element={
            <PrivateRoute>
              <SessionRatings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/crisis-detections"
          element={
            <PrivateRoute>
              <CrisisDetections />
            </PrivateRoute>
          }
        />
        <Route
          path="/client/symptoms"
          element={
            <PortalRoute>
              <SymptomDiary />
            </PortalRoute>
          }
        />
        <Route
          path="/client/sleep"
          element={
            <PortalRoute>
              <SleepDiary />
            </PortalRoute>
          }
        />
        <Route
          path="/client/exercise"
          element={
            <PortalRoute>
              <ExerciseLog />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/schedule"
          element={
            <PortalRoute>
              <PortalSelfScheduling />
            </PortalRoute>
          }
        />
        <Route
          path="/guardian/portal"
          element={
            <PrivateRoute>
              <GuardianPortal />
            </PrivateRoute>
          }
        />
        <Route
          path="/guardian/request-access"
          element={
            <PrivateRoute>
              <RequestAccess />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/guardian-verification"
          element={
            <PrivateRoute>
              <GuardianVerification />
            </PrivateRoute>
          }
        />
        <Route
          path="/client/guardian-consent"
          element={
            <PrivateRoute>
              <GuardianConsent />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/scheduling-rules"
          element={
            <PrivateRoute>
              <SchedulingRules />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/waitlist-management"
          element={
            <PrivateRoute>
              <WaitlistManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinician/client-progress"
          element={
            <PrivateRoute>
              <ClientProgress />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinician/my-waitlist"
          element={
            <PrivateRoute>
              <MyWaitlist />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: CREDENTIALING & LICENSING */}
        <Route
          path="/credentialing"
          element={
            <PrivateRoute>
              <CredentialingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/list"
          element={
            <PrivateRoute>
              <CredentialList />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/new"
          element={
            <PrivateRoute>
              <CredentialForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/:id/edit"
          element={
            <PrivateRoute>
              <CredentialForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/verification"
          element={
            <PrivateRoute>
              <CredentialVerification />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/alerts"
          element={
            <PrivateRoute>
              <ExpirationAlerts />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/compliance"
          element={
            <PrivateRoute>
              <ComplianceReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/screening"
          element={
            <PrivateRoute>
              <ScreeningStatus />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/documents"
          element={
            <PrivateRoute>
              <DocumentUpload />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/timeline/:id"
          element={
            <PrivateRoute>
              <CredentialTimeline />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: TRAINING & DEVELOPMENT */}
        <Route
          path="/training"
          element={
            <PrivateRoute>
              <TrainingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/catalog"
          element={
            <PrivateRoute>
              <CourseCatalog />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/courses/:id"
          element={
            <PrivateRoute>
              <CourseDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/courses/new"
          element={
            <PrivateRoute>
              <CourseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/courses/:id/edit"
          element={
            <PrivateRoute>
              <CourseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/enrollments"
          element={
            <PrivateRoute>
              <EnrollmentManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/progress"
          element={
            <PrivateRoute>
              <TrainingProgress />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/ceu"
          element={
            <PrivateRoute>
              <CEUTracker />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/compliance"
          element={
            <PrivateRoute>
              <ComplianceMonitor />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/calendar"
          element={
            <PrivateRoute>
              <TrainingCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/certificates/:id"
          element={
            <PrivateRoute>
              <CertificateViewer />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: COMPLIANCE MANAGEMENT */}
        <Route
          path="/compliance"
          element={
            <PrivateRoute>
              <ComplianceDashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies"
          element={
            <PrivateRoute>
              <PolicyLibrary />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id"
          element={
            <PrivateRoute>
              <PolicyViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/new"
          element={
            <PrivateRoute>
              <PolicyForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id/edit"
          element={
            <PrivateRoute>
              <PolicyForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id/distribute"
          element={
            <PrivateRoute>
              <PolicyDistribution />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id/acknowledge"
          element={
            <PrivateRoute>
              <AcknowledgmentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents"
          element={
            <PrivateRoute>
              <IncidentList />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents/new"
          element={
            <PrivateRoute>
              <IncidentReportingForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents/:id"
          element={
            <PrivateRoute>
              <IncidentDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents/:id/investigate"
          element={
            <PrivateRoute>
              <InvestigationWorkflow />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/trends"
          element={
            <PrivateRoute>
              <IncidentTrends />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: HR FUNCTIONS */}
        <Route
          path="/hr/performance"
          element={
            <PrivateRoute>
              <ReviewList />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/performance/new"
          element={
            <PrivateRoute>
              <PerformanceReviewForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/performance/:id"
          element={
            <PrivateRoute>
              <ReviewViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/performance/:id/edit"
          element={
            <PrivateRoute>
              <PerformanceReviewForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/timeclock"
          element={
            <PrivateRoute>
              <TimeClockInterface />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/attendance"
          element={
            <PrivateRoute>
              <AttendanceCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/attendance/report"
          element={
            <PrivateRoute>
              <AttendanceReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/pto/request"
          element={
            <PrivateRoute>
              <PTORequestForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/pto/calendar"
          element={
            <PrivateRoute>
              <PTOCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/pto/approval"
          element={
            <PrivateRoute>
              <PTOApproval />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: STAFF MANAGEMENT */}
        <Route
          path="/staff"
          element={
            <PrivateRoute>
              <StaffDirectory />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/:id"
          element={
            <PrivateRoute>
              <StaffProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/new"
          element={
            <PrivateRoute>
              <EmploymentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/:id/edit"
          element={
            <PrivateRoute>
              <EmploymentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/org-chart"
          element={
            <PrivateRoute>
              <OrganizationalChart />
            </PrivateRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <PrivateRoute>
              <OnboardingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/onboarding/:id"
          element={
            <PrivateRoute>
              <OnboardingChecklist />
            </PrivateRoute>
          }
        />
        <Route
          path="/onboarding/:id/milestones"
          element={
            <PrivateRoute>
              <MilestoneTracker />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: COMMUNICATION & DOCUMENTS */}
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <MessagingHub />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages/compose"
          element={
            <PrivateRoute>
              <MessageComposer />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages/:id"
          element={
            <PrivateRoute>
              <MessageThread />
            </PrivateRoute>
          }
        />
        <Route
          path="/channels"
          element={
            <PrivateRoute>
              <ChannelList />
            </PrivateRoute>
          }
        />
        <Route
          path="/channels/:id"
          element={
            <PrivateRoute>
              <ChannelView />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <PrivateRoute>
              <DocumentLibrary />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents/upload"
          element={
            <PrivateRoute>
              <DocumentUploader />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <PrivateRoute>
              <DocumentViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents/folders"
          element={
            <PrivateRoute>
              <FolderTree />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: VENDOR & FINANCIAL */}
        <Route
          path="/vendors"
          element={
            <PrivateRoute>
              <VendorList />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/new"
          element={
            <PrivateRoute>
              <VendorForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/:id"
          element={
            <PrivateRoute>
              <VendorProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/:id/edit"
          element={
            <PrivateRoute>
              <VendorForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/budget"
          element={
            <PrivateRoute>
              <BudgetDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/budget/allocate"
          element={
            <PrivateRoute>
              <BudgetAllocation />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/expenses"
          element={
            <PrivateRoute>
              <ExpenseList />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/expenses/new"
          element={
            <PrivateRoute>
              <ExpenseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/expenses/approval"
          element={
            <PrivateRoute>
              <ExpenseApproval />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/purchase-orders"
          element={
            <PrivateRoute>
              <POList />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/purchase-orders/new"
          element={
            <PrivateRoute>
              <PurchaseOrderForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/purchase-orders/approval"
          element={
            <PrivateRoute>
              <POApproval />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: REPORTS & ANALYTICS */}
        <Route
          path="/module9/reports"
          element={
            <PrivateRoute>
              <Module9ReportsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/reports/viewer"
          element={
            <PrivateRoute>
              <ReportViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/reports/builder"
          element={
            <PrivateRoute>
              <ReportBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/reports/export"
          element={
            <PrivateRoute>
              <ExportDialog />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/dashboards"
          element={
            <PrivateRoute>
              <DashboardWidgets />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/analytics"
          element={
            <PrivateRoute>
              <AnalyticsCharts />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/audit-log"
          element={
            <PrivateRoute>
              <AuditLogViewer />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
