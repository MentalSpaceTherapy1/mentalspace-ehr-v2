import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  FileText,
} from 'lucide-react';
import { useComplianceStats, useCredentials } from '../../hooks/useCredentialing';
import { Cell, Pie, PieChart as RechartsPie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const STATUS_COLORS = {
  ACTIVE: '#10b981',
  PENDING: '#f59e0b',
  EXPIRED: '#ef4444',
  REVOKED: '#6b7280',
};

const TYPE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ComplianceReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: stats, isLoading: statsLoading } = useComplianceStats();
  const { data: credentials, isLoading: credsLoading } = useCredentials();

  // Prepare chart data
  const statusData = stats?.credentialsByStatus
    ? Object.entries(stats.credentialsByStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const typeData = stats?.credentialsByType
    ? Object.entries(stats.credentialsByType).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const handleExport = (format: 'PDF' | 'EXCEL') => {
    alert(`Exporting report as ${format}...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <TrendingUp className="w-12 h-12 text-green-600 mr-4" />
          Compliance Report
        </h1>
        <p className="text-gray-600 text-lg">
          Comprehensive credential compliance analytics and insights
        </p>
      </div>

      {/* Date Range & Export */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                placeholder="Start Date"
              />
            </div>
            <span className="text-gray-500 font-bold">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                placeholder="End Date"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleExport('PDF')}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold"
            >
              <Download className="w-5 h-5" />
              PDF
            </button>
            <button
              onClick={() => handleExport('EXCEL')}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold"
            >
              <Download className="w-5 h-5" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Score */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <CheckCircle className="w-7 h-7 text-green-600 mr-3" />
          Overall Compliance Score
        </h2>

        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Outer Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="#e5e7eb"
                strokeWidth="20"
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="url(#complianceGradient)"
                strokeWidth="20"
                fill="none"
                strokeDasharray={`${((stats?.complianceRate || 0) / 100) * 691} 691`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="complianceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-6xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                {statsLoading ? '...' : Math.round(stats?.complianceRate || 0)}%
              </p>
              <p className="text-sm text-gray-600 mt-2 font-bold">Compliance Rate</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <StatCard
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            label="Active"
            value={stats?.activeCredentials || 0}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-yellow-600" />}
            label="Expiring Soon"
            value={stats?.expiringCredentials || 0}
            color="yellow"
          />
          <StatCard
            icon={<XCircle className="w-6 h-6 text-red-600" />}
            label="Expired"
            value={stats?.expiredCredentials || 0}
            color="red"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            label="Pending"
            value={stats?.pendingVerification || 0}
            color="blue"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <PieChart className="w-7 h-7 text-purple-600 mr-3" />
            Status Distribution
          </h2>

          {statsLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <RechartsPie>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 justify-center">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#6b7280',
                  }}
                />
                <span className="text-sm font-bold text-gray-700">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Type Distribution Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="w-7 h-7 text-blue-600 mr-3" />
            Credentials by Type
          </h2>

          {statsLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="w-7 h-7 text-indigo-600 mr-3" />
          Compliance Summary
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-100 to-blue-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase">
                  Metric
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase">
                  Count
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-green-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-gray-900">Active Credentials</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  {stats?.activeCredentials || 0}
                </td>
                <td className="px-6 py-4 text-right font-bold text-green-600">
                  {stats?.totalCredentials
                    ? ((stats.activeCredentials / stats.totalCredentials) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
              <tr className="hover:bg-yellow-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-gray-900">Expiring Soon</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  {stats?.expiringCredentials || 0}
                </td>
                <td className="px-6 py-4 text-right font-bold text-yellow-600">
                  {stats?.totalCredentials
                    ? ((stats.expiringCredentials / stats.totalCredentials) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
              <tr className="hover:bg-red-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-gray-900">Expired</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  {stats?.expiredCredentials || 0}
                </td>
                <td className="px-6 py-4 text-right font-bold text-red-600">
                  {stats?.totalCredentials
                    ? ((stats.expiredCredentials / stats.totalCredentials) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
              <tr className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-gray-900">Pending Verification</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  {stats?.pendingVerification || 0}
                </td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">
                  {stats?.totalCredentials
                    ? ((stats.pendingVerification / stats.totalCredentials) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'red' | 'blue';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
