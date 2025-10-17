import React from 'react';
import { useClinicianDashboard, useMetricsHistory } from '../../hooks/productivity/useProductivityMetrics';
import { useRealtimeKVR } from '../../hooks/productivity/useRealtimeKVR';
import MetricCard from '../../components/Productivity/MetricCard';
import { AlertCircle, CheckCircle, Clock, FileText, User, TrendingUp } from 'lucide-react';

export default function ClinicianDashboard() {
  const userId = localStorage.getItem('userId') || '';
  const { data: dashboardData, isLoading, error } = useClinicianDashboard(userId);
  const { kvr: realtimeKVR, metadata, connected } = useRealtimeKVR(userId);

  // Use real-time KVR if available, otherwise fall back to dashboard data
  const displayKVR = realtimeKVR !== null ? realtimeKVR : dashboardData?.weeklyMetrics.KVR?.value || 0;
  const displayMetadata = metadata || dashboardData?.weeklyMetrics.KVR?.metadata;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2 text-center">Error Loading Dashboard</h2>
          <p className="text-red-700 text-center">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.weeklyMetrics || {};
  const unsignedNotes = dashboardData?.unsignedNotes || [];
  const alerts = dashboardData?.alerts || [];
  const clientsNeedingRebook = dashboardData?.clientsNeedingRebook || [];

  // Calculate status for metrics
  const getKVRStatus = (kvr: number): 'success' | 'warning' | 'danger' => {
    if (kvr >= 85) return 'success';
    if (kvr >= 70) return 'warning';
    return 'danger';
  };

  const getNoShowStatus = (rate: number): 'success' | 'warning' | 'danger' => {
    if (rate <= 5) return 'success';
    if (rate <= 10) return 'warning';
    return 'danger';
  };

  const getCancellationStatus = (rate: number): 'success' | 'warning' | 'danger' => {
    if (rate <= 10) return 'success';
    if (rate <= 15) return 'warning';
    return 'danger';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Practice Dashboard</h1>
        <p className="text-gray-600 text-lg">Track your productivity and performance metrics</p>
        {connected && (
          <div className="mt-2 flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">Real-time updates active</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="KVR (Keep Visit Rate)"
          value={`${displayKVR.toFixed(1)}%`}
          subtitle={displayMetadata ? `${displayMetadata.numerator} kept / ${displayMetadata.denominator} scheduled` : undefined}
          benchmark={85}
          status={getKVRStatus(displayKVR)}
          realtime={realtimeKVR !== null}
          trend={metrics.KVR?.trend}
        />

        <MetricCard
          title="No-Show Rate"
          value={`${(metrics.NO_SHOW_RATE?.value || 0).toFixed(1)}%`}
          subtitle="Lower is better"
          benchmark={5}
          status={getNoShowStatus(metrics.NO_SHOW_RATE?.value || 0)}
          inverted
        />

        <MetricCard
          title="Cancellation Rate"
          value={`${(metrics.CANCELLATION_RATE?.value || 0).toFixed(1)}%`}
          subtitle="Lower is better"
          benchmark={10}
          status={getCancellationStatus(metrics.CANCELLATION_RATE?.value || 0)}
          inverted
        />

        <MetricCard
          title="Unsigned Notes"
          value={unsignedNotes.length}
          subtitle={unsignedNotes.length === 0 ? 'All caught up!' : `${unsignedNotes.filter((n: any) => {
            const daysOld = Math.floor((Date.now() - new Date(n.appointmentDate).getTime()) / (1000 * 60 * 60 * 24));
            return daysOld > 7;
          }).length} overdue (>7 days)`}
          status={unsignedNotes.length === 0 ? 'success' : unsignedNotes.some((n: any) => {
            const daysOld = Math.floor((Date.now() - new Date(n.appointmentDate).getTime()) / (1000 * 60 * 60 * 24));
            return daysOld > 7;
          }) ? 'danger' : 'warning'}
        />
      </div>

      {/* Documentation Status */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-7 h-7 mr-3 text-indigo-600" />
            Documentation Status
          </h2>
          <span className="text-sm text-gray-600">Georgia Compliance: 7-day signature rule</span>
        </div>

        {unsignedNotes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Notes Signed!</h3>
            <p className="text-gray-600">You're up to date with all documentation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unsignedNotes.slice(0, 10).map((note: any) => {
              const daysOld = Math.floor((Date.now() - new Date(note.appointmentDate).getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysOld > 7;

              return (
                <div
                  key={note.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                    isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                  } hover:shadow-md transition-all`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isOverdue ? 'bg-red-200' : 'bg-yellow-200'
                    }`}>
                      <Clock className={`w-6 h-6 ${isOverdue ? 'text-red-700' : 'text-yellow-700'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{note.client?.firstName} {note.client?.lastName}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(note.appointmentDate).toLocaleDateString()} - {daysOld} days old
                        {isOverdue && <span className="text-red-700 font-semibold ml-2">OVERDUE</span>}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                    Sign Note
                  </button>
                </div>
              );
            })}
            {unsignedNotes.length > 10 && (
              <p className="text-center text-gray-600 pt-4">
                And {unsignedNotes.length - 10} more unsigned notes...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertCircle className="w-7 h-7 mr-3 text-orange-600" />
              Alerts & Notifications
            </h2>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              {alerts.length} active
            </span>
          </div>

          <div className="space-y-3">
            {alerts.map((alert: any) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                  alert.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'MEDIUM' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                } hover:shadow-md transition-all`}
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  className="ml-4 px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    // TODO: Implement acknowledge alert
                  }}
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clients Needing Rebook */}
      {clientsNeedingRebook.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <User className="w-7 h-7 mr-3 text-blue-600" />
              Clients Needing Rebook
            </h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {clientsNeedingRebook.length} clients
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientsNeedingRebook.map((client: any) => {
              const daysSinceLastAppt = Math.floor(
                (Date.now() - new Date(client.lastAppointmentDate).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={client.id}
                  className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {client.firstName} {client.lastName}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Last seen: {new Date(client.lastAppointmentDate).toLocaleDateString()}
                    <br />
                    <span className="font-semibold">{daysSinceLastAppt} days ago</span>
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Schedule Appointment
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
