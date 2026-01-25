/**
 * App.tsx
 * Phase 4.1: Refactored with Route Lazy Loading
 * Phase 4.2: Auth now uses httpOnly cookies only (no localStorage for auth state)
 *
 * All page components are now lazy-loaded for better code splitting.
 * Critical components (Layout, ErrorBoundary, Login) remain eagerly loaded.
 */

import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Critical components - kept eager for immediate availability
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import Login from './pages/Login';
import PortalLayout from './components/PortalLayout';
import PortalLogin from './pages/Portal/PortalLogin';
import PortalRegister from './pages/Portal/PortalRegister';
import PortalForgotPassword from './pages/Portal/PortalForgotPassword';
import PortalChangePassword from './pages/Portal/PortalChangePassword';
import { AdvancedMDProvider } from './components/AdvancedMD';

// Auth hook for checking authentication state
import { useAuth } from './hooks/useAuth';

// All page components - lazy loaded for code splitting
import * as LazyRoutes from './routes/lazy';

/**
 * PrivateRoute - Protects EHR routes requiring authentication
 *
 * Phase 4.2: Now uses useAuth hook which validates session via API (httpOnly cookies)
 * - Shows loading spinner while verifying authentication
 * - Redirects to login if not authenticated
 * - No localStorage dependency for auth state (more secure)
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading while checking auth status
  if (isLoading) {
    return <LoadingFallback message="Verifying session..." />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<LoadingFallback message="Loading page..." />}>
        {children}
      </Suspense>
    </Layout>
  );
}

function PortalRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('portalToken');

  if (!token) {
    return <Navigate to="/portal/login" />;
  }

  return (
    <ErrorBoundary>
      <PortalLayout>
        <Suspense fallback={<LoadingFallback message="Loading page..." />}>
          {children}
        </Suspense>
      </PortalLayout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AdvancedMDProvider>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LazyRoutes.LandingPage />} />

        <Route path="/login" element={<Login />} />

        {/* Client Portal Routes - Auth pages eager, content pages lazy */}
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal/register" element={<PortalRegister />} />
        <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
        <Route path="/portal/change-password" element={<PortalChangePassword />} />
        <Route
          path="/portal/dashboard"
          element={
            <PortalRoute>
              <LazyRoutes.PortalDashboard />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/appointments"
          element={
            <PortalRoute>
              <LazyRoutes.PortalAppointments />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/messages"
          element={
            <PortalRoute>
              <LazyRoutes.PortalMessages />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/mood"
          element={
            <PortalRoute>
              <LazyRoutes.PortalMoodTracking />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/symptoms"
          element={
            <PortalRoute>
              <LazyRoutes.PortalSymptomDiary />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/sleep"
          element={
            <PortalRoute>
              <LazyRoutes.PortalSleepDiary />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/exercise"
          element={
            <PortalRoute>
              <LazyRoutes.PortalExerciseLog />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/billing"
          element={
            <PortalRoute>
              <LazyRoutes.PortalBilling />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/profile"
          element={
            <PortalRoute>
              <LazyRoutes.PortalProfile />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/documents"
          element={
            <PortalRoute>
              <LazyRoutes.PortalDocuments />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/forms/:formId"
          element={
            <PortalRoute>
              <LazyRoutes.PortalFormViewer />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/assessments"
          element={
            <PortalRoute>
              <LazyRoutes.PortalAssessments />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/assessments/:assessmentId/take"
          element={
            <PortalRoute>
              <LazyRoutes.PortalAssessmentTake />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/assessments/:assessmentId/results"
          element={
            <PortalRoute>
              <LazyRoutes.PortalAssessmentResults />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/appointments/request"
          element={
            <PortalRoute>
              <LazyRoutes.PortalAppointmentRequest />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/referrals"
          element={
            <PortalRoute>
              <LazyRoutes.PortalReferrals />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/therapist/change"
          element={
            <PortalRoute>
              <LazyRoutes.PortalTherapistChange />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/therapist/profile"
          element={
            <PortalRoute>
              <LazyRoutes.PortalTherapistProfile />
            </PortalRoute>
          }
        />
        <Route
          path="/portal/telehealth/:appointmentId"
          element={
            <PortalRoute>
              <LazyRoutes.VideoSession />
            </PortalRoute>
          }
        />
        {/* Alternative route with /session/ for consistency with staff routes */}
        <Route
          path="/portal/telehealth/session/:appointmentId"
          element={
            <PortalRoute>
              <LazyRoutes.VideoSession />
            </PortalRoute>
          }
        />

        {/* Staff Dashboard - requires authentication */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <LazyRoutes.Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientList />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/diagnoses"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientDiagnosesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/outcome-measures"
          element={
            <PrivateRoute>
              <LazyRoutes.OutcomeMeasuresPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/prior-authorizations"
          element={
            <PrivateRoute>
              <LazyRoutes.PriorAuthorizationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/duplicates"
          element={
            <PrivateRoute>
              <LazyRoutes.DuplicateDetectionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <PrivateRoute>
              <LazyRoutes.AppointmentsCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/new"
          element={
            <PrivateRoute>
              <LazyRoutes.NewAppointment />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.NewAppointment />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.NewAppointment />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/:id/reschedule"
          element={
            <PrivateRoute>
              <LazyRoutes.NewAppointment />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/waitlist"
          element={
            <PrivateRoute>
              <LazyRoutes.Waitlist />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/schedules"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicianSchedule />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/time-off"
          element={
            <PrivateRoute>
              <LazyRoutes.TimeOffRequests />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/provider-comparison"
          element={
            <PrivateRoute>
              <LazyRoutes.ProviderComparisonView />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/room-view"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicianSchedule />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments/ai-assistant"
          element={
            <PrivateRoute>
              <LazyRoutes.AISchedulingAssistant />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/reminders"
          element={
            <PrivateRoute>
              <LazyRoutes.ReminderSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/clinical-note-reminders"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicalNoteReminderSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/appointment-types"
          element={
            <PrivateRoute>
              <LazyRoutes.AppointmentTypes />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/availability"
          element={
            <PrivateRoute>
              <LazyRoutes.ProviderAvailability />
            </PrivateRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <PrivateRoute>
              <LazyRoutes.GroupSessionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/groups/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.GroupDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/group-sessions"
          element={
            <PrivateRoute>
              <LazyRoutes.GroupSessionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/group-sessions/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.GroupDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/telehealth"
          element={
            <PrivateRoute>
              <LazyRoutes.TelehealthDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/telehealth/session/:appointmentId"
          element={
            <PrivateRoute>
              <LazyRoutes.VideoSession />
            </PrivateRoute>
          }
        />
        <Route
          path="/self-schedule"
          element={
            <PrivateRoute>
              <LazyRoutes.SelfScheduleDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/client-portal"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientPortalManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/progress-tracking"
          element={
            <PrivateRoute>
              <LazyRoutes.ProgressTrackingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/progress-tracking/assign-measures"
          element={
            <PrivateRoute>
              <LazyRoutes.AssignMeasures />
            </PrivateRoute>
          }
        />
        <Route
          path="/progress-tracking/reports"
          element={
            <PrivateRoute>
              <LazyRoutes.ProgressReports />
            </PrivateRoute>
          }
        />
        <Route
          path="/guardian-portal"
          element={
            <PrivateRoute>
              <LazyRoutes.GuardianPortalDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <LazyRoutes.AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinician"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicianToolsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <PrivateRoute>
              <LazyRoutes.ComplianceDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/notes/my-notes"
          element={
            <PrivateRoute>
              <LazyRoutes.MyNotes />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicalNotesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/create"
          element={
            <PrivateRoute>
              <LazyRoutes.SmartNoteCreator />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/intake-assessment"
          element={
            <PrivateRoute>
              <LazyRoutes.IntakeAssessmentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/progress-note"
          element={
            <PrivateRoute>
              <LazyRoutes.ProgressNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/treatment-plan"
          element={
            <PrivateRoute>
              <LazyRoutes.TreatmentPlanForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/cancellation-note"
          element={
            <PrivateRoute>
              <LazyRoutes.CancellationNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/consultation-note"
          element={
            <PrivateRoute>
              <LazyRoutes.ConsultationNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/contact-note"
          element={
            <PrivateRoute>
              <LazyRoutes.ContactNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/termination-note"
          element={
            <PrivateRoute>
              <LazyRoutes.TerminationNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/new/miscellaneous-note"
          element={
            <PrivateRoute>
              <LazyRoutes.MiscellaneousNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinical-notes/new"
          element={
            <PrivateRoute>
              <LazyRoutes.SmartNoteCreator />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinical-notes/new/group-therapy/:appointmentId"
          element={
            <PrivateRoute>
              <LazyRoutes.GroupTherapyNoteForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/:noteId"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicalNoteDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId/notes/:noteId/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.EditNoteRouter />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision"
          element={
            <PrivateRoute>
              <LazyRoutes.SupervisionSessionsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/sessions"
          element={
            <PrivateRoute>
              <LazyRoutes.SupervisionSessionsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/sessions/new"
          element={
            <PrivateRoute>
              <LazyRoutes.SupervisionSessionForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/sessions/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.SupervisionSessionForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/hours/:superviseeId"
          element={
            <PrivateRoute>
              <LazyRoutes.SupervisionHoursDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision/cosign-queue"
          element={
            <PrivateRoute>
              <LazyRoutes.CosignQueue />
            </PrivateRoute>
          }
        />
        <Route
          path="/unlock-requests"
          element={
            <PrivateRoute>
              <LazyRoutes.UnlockRequestManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <PrivateRoute>
              <LazyRoutes.BillingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/charges"
          element={
            <PrivateRoute>
              <LazyRoutes.ChargesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/charges/new"
          element={
            <PrivateRoute>
              <LazyRoutes.ChargesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payments"
          element={
            <PrivateRoute>
              <LazyRoutes.PaymentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payments/new"
          element={
            <PrivateRoute>
              <LazyRoutes.PaymentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerList />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/new"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerRuleList />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules/new"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerRuleForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerRuleForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payers/:payerId/rules/import"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerRuleImporter />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/holds"
          element={
            <PrivateRoute>
              <LazyRoutes.BillingHoldsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/readiness"
          element={
            <PrivateRoute>
              <LazyRoutes.BillingReadinessChecker />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing/payer-dashboard"
          element={
            <PrivateRoute>
              <LazyRoutes.PayerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <LazyRoutes.UserList />
            </PrivateRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <PrivateRoute>
              <LazyRoutes.UserForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.UserDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.UserForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <LazyRoutes.PracticeSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <LazyRoutes.UserProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/mfa-settings"
          element={
            <PrivateRoute>
              <LazyRoutes.MFASettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/sessions"
          element={
            <PrivateRoute>
              <LazyRoutes.SessionManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicianProductivityDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity/clinician"
          element={
            <PrivateRoute>
              <LazyRoutes.ClinicianProductivityDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity/supervisor"
          element={
            <PrivateRoute>
              <LazyRoutes.SupervisorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/productivity/administrator"
          element={
            <PrivateRoute>
              <LazyRoutes.AdministratorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <LazyRoutes.ReportsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/custom"
          element={
            <PrivateRoute>
              <LazyRoutes.CustomReportsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/custom/new"
          element={
            <PrivateRoute>
              <LazyRoutes.CustomReportBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/custom/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.CustomReportBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/subscriptions"
          element={
            <PrivateRoute>
              <LazyRoutes.ReportSubscriptions />
            </PrivateRoute>
          }
        />

        {/* Module 8: Customizable Dashboards */}
        <Route
          path="/dashboards"
          element={
            <PrivateRoute>
              <LazyRoutes.DashboardList />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.DashboardBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <LazyRoutes.AnalyticsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/predictions"
          element={
            <PrivateRoute>
              <LazyRoutes.PredictionsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/session-ratings"
          element={
            <PrivateRoute>
              <LazyRoutes.SessionRatings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/crisis-detections"
          element={
            <PrivateRoute>
              <LazyRoutes.CrisisDetections />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/advancedmd-sync"
          element={
            <PrivateRoute>
              <LazyRoutes.AdvancedMDSync />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/advancedmd-settings"
          element={
            <PrivateRoute>
              <LazyRoutes.AdvancedMDSettings />
            </PrivateRoute>
          }
        />
        {/* Redirect old /client/* routes to new /portal/* routes */}
        <Route path="/client/symptoms" element={<Navigate to="/portal/symptoms" replace />} />
        <Route path="/client/sleep" element={<Navigate to="/portal/sleep" replace />} />
        <Route path="/client/exercise" element={<Navigate to="/portal/exercise" replace />} />
        <Route
          path="/portal/schedule"
          element={
            <PortalRoute>
              <LazyRoutes.PortalSelfScheduling />
            </PortalRoute>
          }
        />
        <Route
          path="/guardian/portal"
          element={
            <PrivateRoute>
              <LazyRoutes.GuardianPortal />
            </PrivateRoute>
          }
        />
        <Route
          path="/guardian/request-access"
          element={
            <PrivateRoute>
              <LazyRoutes.RequestAccess />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/guardian-verification"
          element={
            <PrivateRoute>
              <LazyRoutes.GuardianVerification />
            </PrivateRoute>
          }
        />
        <Route
          path="/client/guardian-consent"
          element={
            <PrivateRoute>
              <LazyRoutes.GuardianConsent />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/scheduling-rules"
          element={
            <PrivateRoute>
              <LazyRoutes.SchedulingRules />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/waitlist-management"
          element={
            <PrivateRoute>
              <LazyRoutes.WaitlistManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinician/client-progress"
          element={
            <PrivateRoute>
              <LazyRoutes.ClientProgress />
            </PrivateRoute>
          }
        />
        <Route
          path="/clinician/my-waitlist"
          element={
            <PrivateRoute>
              <LazyRoutes.MyWaitlist />
            </PrivateRoute>
          }
        />
        {/* Redirect /clinician/waitlist to /clinician/my-waitlist */}
        <Route
          path="/clinician/waitlist"
          element={<Navigate to="/clinician/my-waitlist" replace />}
        />

        {/* MODULE 9: CREDENTIALING & LICENSING */}
        <Route
          path="/credentialing"
          element={
            <PrivateRoute>
              <LazyRoutes.CredentialingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/list"
          element={
            <PrivateRoute>
              <LazyRoutes.CredentialList />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/new"
          element={
            <PrivateRoute>
              <LazyRoutes.CredentialForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.CredentialForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/verification"
          element={
            <PrivateRoute>
              <LazyRoutes.CredentialVerification />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/alerts"
          element={
            <PrivateRoute>
              <LazyRoutes.ExpirationAlerts />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/compliance"
          element={
            <PrivateRoute>
              <LazyRoutes.ComplianceReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/screening"
          element={
            <PrivateRoute>
              <LazyRoutes.ScreeningStatus />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/documents"
          element={
            <PrivateRoute>
              <LazyRoutes.DocumentUpload />
            </PrivateRoute>
          }
        />
        <Route
          path="/credentialing/timeline/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.CredentialTimeline />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: TRAINING & DEVELOPMENT */}
        <Route
          path="/training"
          element={
            <PrivateRoute>
              <LazyRoutes.TrainingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/catalog"
          element={
            <PrivateRoute>
              <LazyRoutes.CourseCatalog />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/courses/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.CourseDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/courses/new"
          element={
            <PrivateRoute>
              <LazyRoutes.CourseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/courses/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.CourseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/enrollments"
          element={
            <PrivateRoute>
              <LazyRoutes.EnrollmentManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/progress"
          element={
            <PrivateRoute>
              <LazyRoutes.TrainingProgress />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/ceu"
          element={
            <PrivateRoute>
              <LazyRoutes.CEUTracker />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/compliance"
          element={
            <PrivateRoute>
              <LazyRoutes.ComplianceMonitor />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/calendar"
          element={
            <PrivateRoute>
              <LazyRoutes.TrainingCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/training/certificates/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.CertificateViewer />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: COMPLIANCE MANAGEMENT */}
        <Route
          path="/compliance"
          element={
            <PrivateRoute>
              <LazyRoutes.ComplianceDashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies"
          element={
            <PrivateRoute>
              <LazyRoutes.PolicyLibrary />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.PolicyViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/new"
          element={
            <PrivateRoute>
              <LazyRoutes.PolicyForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.PolicyForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id/distribute"
          element={
            <PrivateRoute>
              <LazyRoutes.PolicyDistribution />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/policies/:id/acknowledge"
          element={
            <PrivateRoute>
              <LazyRoutes.AcknowledgmentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents"
          element={
            <PrivateRoute>
              <LazyRoutes.IncidentList />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents/new"
          element={
            <PrivateRoute>
              <LazyRoutes.IncidentReportingForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.IncidentDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/incidents/:id/investigate"
          element={
            <PrivateRoute>
              <LazyRoutes.InvestigationWorkflow />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/trends"
          element={
            <PrivateRoute>
              <LazyRoutes.IncidentTrends />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: HR FUNCTIONS */}
        <Route
          path="/hr"
          element={<Navigate to="/hr/performance" replace />}
        />
        <Route
          path="/hr/performance"
          element={
            <PrivateRoute>
              <LazyRoutes.ReviewList />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/performance/new"
          element={
            <PrivateRoute>
              <LazyRoutes.PerformanceReviewForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/performance/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.ReviewViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/performance/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.PerformanceReviewForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/timeclock"
          element={
            <PrivateRoute>
              <LazyRoutes.TimeClockInterface />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/attendance"
          element={
            <PrivateRoute>
              <LazyRoutes.AttendanceCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/attendance/report"
          element={
            <PrivateRoute>
              <LazyRoutes.AttendanceReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/pto/request"
          element={
            <PrivateRoute>
              <LazyRoutes.PTORequestForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/pto/calendar"
          element={
            <PrivateRoute>
              <LazyRoutes.PTOCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr/pto/approval"
          element={
            <PrivateRoute>
              <LazyRoutes.PTOApproval />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: STAFF MANAGEMENT */}
        <Route
          path="/staff"
          element={
            <PrivateRoute>
              <LazyRoutes.StaffDirectory />
            </PrivateRoute>
          }
        />
        {/* Static routes must come before dynamic :id routes */}
        <Route
          path="/staff/new"
          element={
            <PrivateRoute>
              <LazyRoutes.EmploymentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/org-chart"
          element={
            <PrivateRoute>
              <LazyRoutes.OrganizationalChart />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.StaffProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.EmploymentForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <PrivateRoute>
              <LazyRoutes.OnboardingDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/onboarding/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.OnboardingChecklist />
            </PrivateRoute>
          }
        />
        <Route
          path="/onboarding/:id/milestones"
          element={
            <PrivateRoute>
              <LazyRoutes.MilestoneTracker />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: COMMUNICATION & DOCUMENTS */}
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <LazyRoutes.MessagingHub />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages/compose"
          element={
            <PrivateRoute>
              <LazyRoutes.MessageComposer />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.MessageThread />
            </PrivateRoute>
          }
        />
        <Route
          path="/channels"
          element={
            <PrivateRoute>
              <LazyRoutes.ChannelList />
            </PrivateRoute>
          }
        />
        <Route
          path="/channels/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.ChannelView />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <PrivateRoute>
              <LazyRoutes.DocumentLibrary />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents/upload"
          element={
            <PrivateRoute>
              <LazyRoutes.DocumentUploader />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.DocumentViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents/folders"
          element={
            <PrivateRoute>
              <LazyRoutes.FolderTree />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: VENDOR & FINANCIAL */}
        <Route
          path="/vendors"
          element={
            <PrivateRoute>
              <LazyRoutes.VendorList />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/new"
          element={
            <PrivateRoute>
              <LazyRoutes.VendorForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/:id"
          element={
            <PrivateRoute>
              <LazyRoutes.VendorProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/:id/edit"
          element={
            <PrivateRoute>
              <LazyRoutes.VendorForm />
            </PrivateRoute>
          }
        />
        {/* MODULE 9: FINANCE */}
        <Route
          path="/finance"
          element={<Navigate to="/finance/budget" replace />}
        />
        <Route
          path="/finance/budget"
          element={
            <PrivateRoute>
              <LazyRoutes.BudgetDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/budget/allocate"
          element={
            <PrivateRoute>
              <LazyRoutes.BudgetAllocation />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/expenses"
          element={
            <PrivateRoute>
              <LazyRoutes.ExpenseList />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/expenses/new"
          element={
            <PrivateRoute>
              <LazyRoutes.ExpenseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/expenses/approval"
          element={
            <PrivateRoute>
              <LazyRoutes.ExpenseApproval />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/purchase-orders"
          element={
            <PrivateRoute>
              <LazyRoutes.POList />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/purchase-orders/new"
          element={
            <PrivateRoute>
              <LazyRoutes.PurchaseOrderForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/finance/purchase-orders/approval"
          element={
            <PrivateRoute>
              <LazyRoutes.POApproval />
            </PrivateRoute>
          }
        />

        {/* MODULE 9: REPORTS & ANALYTICS */}
        <Route
          path="/module9/reports"
          element={
            <PrivateRoute>
              <LazyRoutes.Module9ReportsDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/reports/viewer"
          element={
            <PrivateRoute>
              <LazyRoutes.ReportViewer />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/reports/builder"
          element={
            <PrivateRoute>
              <LazyRoutes.ReportBuilder />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/reports/export"
          element={
            <PrivateRoute>
              <LazyRoutes.ExportDialog />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/dashboards"
          element={
            <PrivateRoute>
              <LazyRoutes.DashboardWidgets />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/analytics"
          element={
            <PrivateRoute>
              <LazyRoutes.AnalyticsCharts />
            </PrivateRoute>
          }
        />
        <Route
          path="/module9/audit-log"
          element={
            <PrivateRoute>
              <LazyRoutes.AuditLogViewer />
            </PrivateRoute>
          }
        />
      </Routes>
      </div>
    </AdvancedMDProvider>
  );
}

export default App;
