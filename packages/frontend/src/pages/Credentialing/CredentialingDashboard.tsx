import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  Search,
  Bell,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  Calendar,
  Award,
  AlertCircle,
  FileText,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useComplianceStats, useExpirationAlerts } from '../../hooks/useCredentialing';

export default function CredentialingDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useComplianceStats();
  const { data: alerts, isLoading: alertsLoading } = useExpirationAlerts({ dismissed: false });

  // Calculate urgency counts
  const criticalAlerts = alerts?.filter(a => a.urgency === 'CRITICAL').length || 0;
  const highAlerts = alerts?.filter(a => a.urgency === 'HIGH').length || 0;
  const mediumAlerts = alerts?.filter(a => a.urgency === 'MEDIUM').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Shield className="w-12 h-12 text-purple-600 mr-4" />
          Credentialing & Licensing Dashboard
        </h1>
        <p className="text-gray-600 text-lg">
          Manage staff credentials, licenses, and compliance requirements
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Credentials */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-md">
              <FileCheck className="w-8 h-8 text-purple-600" />
            </div>
            <Award className="w-10 h-10 text-purple-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Total Credentials</h3>
          <p className="text-3xl font-bold text-purple-600">
            {statsLoading ? '...' : stats?.totalCredentials || 0}
          </p>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <Activity className="w-4 h-4 mr-1" />
            {statsLoading ? '...' : stats?.activeCredentials || 0} active
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-yellow-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center shadow-md">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <Calendar className="w-10 h-10 text-yellow-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Expiring Soon</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {statsLoading ? '...' : stats?.expiringCredentials || 0}
          </p>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 mr-1" />
            Within 30 days
          </div>
        </div>

        {/* Verification Pending */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-md">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <FileText className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Pending Verification</h3>
          <p className="text-3xl font-bold text-blue-600">
            {statsLoading ? '...' : stats?.pendingVerification || 0}
          </p>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <Eye className="w-4 h-4 mr-1" />
            Awaiting review
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center shadow-md">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <Bell className="w-10 h-10 text-red-300 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Critical Alerts</h3>
          <p className="text-3xl font-bold text-red-600">
            {alertsLoading ? '...' : criticalAlerts + highAlerts}
          </p>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 mr-1" />
            Requires attention
          </div>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Compliance Rate */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
            Compliance Rate
          </h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${((stats?.complianceRate || 0) / 100) * 439.6} 439.6`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900">
                    {statsLoading ? '...' : Math.round(stats?.complianceRate || 0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                Active
              </span>
              <span className="font-bold text-gray-900">
                {statsLoading ? '...' : stats?.activeCredentials || 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-gray-600">
                <XCircle className="w-4 h-4 text-red-600 mr-2" />
                Expired
              </span>
              <span className="font-bold text-gray-900">
                {statsLoading ? '...' : stats?.expiredCredentials || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="w-6 h-6 text-purple-600 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            <ActivityItem
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              title="License Verified"
              description="Dr. Sarah Johnson - Medical License"
              time="2 hours ago"
              color="green"
            />
            <ActivityItem
              icon={<Plus className="w-5 h-5 text-blue-600" />}
              title="New Credential Added"
              description="Dr. Michael Chen - DEA Registration"
              time="5 hours ago"
              color="blue"
            />
            <ActivityItem
              icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
              title="Expiration Alert"
              description="Dr. Emily Davis - NPI Number expires in 15 days"
              time="1 day ago"
              color="yellow"
            />
            <ActivityItem
              icon={<RefreshCw className="w-5 h-5 text-purple-600" />}
              title="Credential Renewed"
              description="Dr. James Wilson - State Certification"
              time="2 days ago"
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ActionCard
          icon={<Plus className="w-8 h-8 text-white" />}
          title="Add Credential"
          description="Register new license or certification"
          gradient="from-purple-500 to-purple-600"
          onClick={() => navigate('/credentialing/add')}
        />
        <ActionCard
          icon={<Search className="w-8 h-8 text-white" />}
          title="Run Screening"
          description="Check OIG/SAM exclusion lists"
          gradient="from-blue-500 to-blue-600"
          onClick={() => navigate('/credentialing/screening')}
        />
        <ActionCard
          icon={<Bell className="w-8 h-8 text-white" />}
          title="View Alerts"
          description="Review expiration notifications"
          gradient="from-red-500 to-red-600"
          onClick={() => navigate('/credentialing/alerts')}
        />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <NavigationCard
          icon={<FileCheck className="w-8 h-8 text-purple-600" />}
          title="All Credentials"
          count={stats?.totalCredentials || 0}
          gradient="from-purple-100 to-purple-200"
          onClick={() => navigate('/credentialing/list')}
        />
        <NavigationCard
          icon={<Clock className="w-8 h-8 text-yellow-600" />}
          title="Expiring Soon"
          count={stats?.expiringCredentials || 0}
          gradient="from-yellow-100 to-yellow-200"
          onClick={() => navigate('/credentialing/alerts')}
        />
        <NavigationCard
          icon={<Shield className="w-8 h-8 text-blue-600" />}
          title="Screening Status"
          count={0}
          gradient="from-blue-100 to-blue-200"
          onClick={() => navigate('/credentialing/screening')}
        />
        <NavigationCard
          icon={<TrendingUp className="w-8 h-8 text-green-600" />}
          title="Compliance Report"
          count={Math.round(stats?.complianceRate || 0)}
          gradient="from-green-100 to-green-200"
          suffix="%"
          onClick={() => navigate('/credentialing/compliance')}
        />
      </div>
    </div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  color: 'green' | 'blue' | 'yellow' | 'purple' | 'red';
}

function ActivityItem({ icon, title, description, time, color }: ActivityItemProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`flex items-start gap-4 p-3 rounded-xl border-2 ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-sm text-gray-600 truncate">{description}</p>
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{time}</span>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  onClick: () => void;
}

function ActionCard({ icon, title, description, gradient, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full"
    >
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

// Navigation Card Component
interface NavigationCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  gradient: string;
  suffix?: string;
  onClick: () => void;
}

function NavigationCard({ icon, title, count, gradient, suffix = '', onClick }: NavigationCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full"
    >
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md mb-4`}>
        {icon}
      </div>
      <p className="text-sm font-bold text-gray-600 uppercase mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">
        {count}
        {suffix}
      </p>
    </button>
  );
}
