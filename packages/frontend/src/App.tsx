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
import AppointmentsCalendar from './pages/Appointments/AppointmentsCalendar';
import NewAppointment from './pages/Appointments/NewAppointment';
import Waitlist from './pages/Appointments/Waitlist';
import ClinicianSchedule from './pages/Appointments/ClinicianSchedule';
import ProviderComparisonView from './pages/Appointments/ProviderComparisonView';
import RoomView from './pages/Appointments/RoomView';
import TimeOffRequests from './pages/TimeOff/TimeOffRequestsPage';
import ReminderSettings from './pages/Settings/ReminderSettings';
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
          path="/analytics"
          element={
            <PrivateRoute>
              <AnalyticsDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
