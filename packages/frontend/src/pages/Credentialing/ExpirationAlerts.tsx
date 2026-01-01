import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Bell,
  BellOff,
  CheckCircle,
  User,
  Calendar,
  Award,
  Eye,
  Mail,
  Filter,
} from 'lucide-react';
import { useExpirationAlerts, useDismissAlert } from '../../hooks/useCredentialing';

export default function ExpirationAlerts() {
  const navigate = useNavigate();
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [emailReminders, setEmailReminders] = useState(true);

  const { data: alerts, isLoading } = useExpirationAlerts({
    urgency: urgencyFilter || undefined,
    dismissed: false,
  });

  const dismissAlert = useDismissAlert();

  // Group alerts by urgency
  const criticalAlerts = alerts?.filter((a) => a.urgency === 'CRITICAL') || [];
  const highAlerts = alerts?.filter((a) => a.urgency === 'HIGH') || [];
  const mediumAlerts = alerts?.filter((a) => a.urgency === 'MEDIUM') || [];
  const lowAlerts = alerts?.filter((a) => a.urgency === 'LOW') || [];

  const handleDismiss = async (id: string) => {
    try {
      await dismissAlert.mutateAsync(id);
    } catch (error) {
      toast.error('Failed to dismiss alert');
    }
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-700',
          gradient: 'from-red-600 to-red-700',
          icon: <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />,
          badge: 'bg-red-600 text-white',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-700',
          gradient: 'from-orange-600 to-orange-700',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
          badge: 'bg-orange-600 text-white',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-700',
          gradient: 'from-yellow-600 to-yellow-700',
          icon: <Clock className="w-5 h-5 text-yellow-600" />,
          badge: 'bg-yellow-600 text-white',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-700',
          gradient: 'from-blue-600 to-blue-700',
          icon: <Clock className="w-5 h-5 text-blue-600" />,
          badge: 'bg-blue-600 text-white',
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Bell className="w-12 h-12 text-red-600 mr-4 animate-pulse" />
          Expiration Alerts
        </h1>
        <p className="text-gray-600 text-lg">
          Monitor and manage upcoming credential expirations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Critical"
          count={criticalAlerts.length}
          description="0-30 days"
          gradient="from-red-600 to-red-700"
          icon={<AlertTriangle className="w-8 h-8 text-white" />}
        />
        <SummaryCard
          title="High"
          count={highAlerts.length}
          description="31-60 days"
          gradient="from-orange-600 to-orange-700"
          icon={<AlertTriangle className="w-8 h-8 text-white" />}
        />
        <SummaryCard
          title="Medium"
          count={mediumAlerts.length}
          description="61-90 days"
          gradient="from-yellow-600 to-yellow-700"
          icon={<Clock className="w-8 h-8 text-white" />}
        />
        <SummaryCard
          title="Low"
          count={lowAlerts.length}
          description="90+ days"
          gradient="from-blue-600 to-blue-700"
          icon={<Clock className="w-8 h-8 text-white" />}
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="pl-10 pr-8 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all appearance-none bg-white"
              >
                <option value="">All Urgencies</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailReminders}
                onChange={(e) => setEmailReminders(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <Mail className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-900">Email Reminders</span>
            </label>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Loading alerts...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <AlertSection
              title="Critical Alerts"
              subtitle="Expires within 30 days"
              alerts={criticalAlerts}
              urgency="CRITICAL"
              onDismiss={handleDismiss}
              onView={(id) => navigate(`/credentialing/${id}`)}
            />
          )}

          {/* High Priority Alerts */}
          {highAlerts.length > 0 && (
            <AlertSection
              title="High Priority"
              subtitle="Expires within 31-60 days"
              alerts={highAlerts}
              urgency="HIGH"
              onDismiss={handleDismiss}
              onView={(id) => navigate(`/credentialing/${id}`)}
            />
          )}

          {/* Medium Priority Alerts */}
          {mediumAlerts.length > 0 && (
            <AlertSection
              title="Medium Priority"
              subtitle="Expires within 61-90 days"
              alerts={mediumAlerts}
              urgency="MEDIUM"
              onDismiss={handleDismiss}
              onView={(id) => navigate(`/credentialing/${id}`)}
            />
          )}

          {/* Low Priority Alerts */}
          {lowAlerts.length > 0 && (
            <AlertSection
              title="Low Priority"
              subtitle="Expires in 90+ days"
              alerts={lowAlerts}
              urgency="LOW"
              onDismiss={handleDismiss}
              onView={(id) => navigate(`/credentialing/${id}`)}
            />
          )}

          {/* No Alerts */}
          {alerts && alerts.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-2xl font-bold text-gray-900 mb-2">All Clear!</p>
              <p className="text-gray-600">No expiration alerts at this time</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  count: number;
  description: string;
  gradient: string;
  icon: React.ReactNode;
}

function SummaryCard({ title, count, description, gradient, icon }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
        {icon}
      </div>
      <p className="text-sm font-bold text-gray-600 uppercase mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mb-1">{count}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

// Alert Section Component
interface AlertSectionProps {
  title: string;
  subtitle: string;
  alerts: any[];
  urgency: string;
  onDismiss: (id: string) => void;
  onView: (credentialId: string) => void;
}

function AlertSection({ title, subtitle, alerts, urgency, onDismiss, onView }: AlertSectionProps) {
  const config = {
    CRITICAL: { bg: 'bg-red-50', border: 'border-red-300', title: 'from-red-600 to-red-700' },
    HIGH: { bg: 'bg-orange-50', border: 'border-orange-300', title: 'from-orange-600 to-orange-700' },
    MEDIUM: { bg: 'bg-yellow-50', border: 'border-yellow-300', title: 'from-yellow-600 to-yellow-700' },
    LOW: { bg: 'bg-blue-50', border: 'border-blue-300', title: 'from-blue-600 to-blue-700' },
  }[urgency] || { bg: 'bg-gray-50', border: 'border-gray-300', title: 'from-gray-600 to-gray-700' };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
      <div className={`bg-gradient-to-r ${config.title} p-6`}>
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Bell className="w-7 h-7 mr-3" />
          {title}
        </h2>
        <p className="text-white text-sm mt-1 opacity-90">{subtitle}</p>
      </div>

      <div className="p-6 space-y-4">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            urgency={urgency}
            onDismiss={onDismiss}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
}

// Alert Card Component
interface AlertCardProps {
  alert: any;
  urgency: string;
  onDismiss: (id: string) => void;
  onView: (credentialId: string) => void;
}

function AlertCard({ alert, urgency, onDismiss, onView }: AlertCardProps) {
  const config = {
    CRITICAL: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-600',
    },
    HIGH: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      badge: 'bg-orange-600',
    },
    MEDIUM: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      badge: 'bg-yellow-600',
    },
    LOW: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-600',
    },
  }[urgency] || {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    badge: 'bg-gray-600',
  };

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-xl p-4 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-purple-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{alert.staffName}</h3>
              <span className={`${config.badge} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                {alert.daysUntilExpiration} days
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                <span>{alert.credentialType}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Expires: {new Date(alert.expirationDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button
            onClick={() => onView(alert.credentialId)}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all group"
            title="View Credential"
          >
            <Eye className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all group"
            title="Dismiss"
          >
            <BellOff className="w-5 h-5 text-gray-600 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
