import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Placeholder components - will be implemented later
const LoginPage = () => <div className="p-8">Login Page</div>;
const DashboardPage = () => <div className="p-8">Dashboard</div>;
const ClientsPage = () => <div className="p-8">Clients</div>;
const AppointmentsPage = () => <div className="p-8">Appointments</div>;
const NotesPage = () => <div className="p-8">Clinical Notes</div>;
const SupervisionPage = () => <div className="p-8">Supervision</div>;
const BillingPage = () => <div className="p-8">Billing</div>;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <ClientsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <PrivateRoute>
              <AppointmentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <PrivateRoute>
              <NotesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/supervision"
          element={
            <PrivateRoute>
              <SupervisionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <PrivateRoute>
              <BillingPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
