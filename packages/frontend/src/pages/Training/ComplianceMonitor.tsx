import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Shield,
  AlertTriangle,
  Users,
  CheckCircle2,
  Send,
  TrendingUp,
  Calendar,
  Building2,
} from 'lucide-react';
import { useComplianceStatus, useSendComplianceReminders } from '../../hooks/useTraining';
import BarChart from '../../components/charts/BarChart';

export default function ComplianceMonitor() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: complianceData } = useComplianceStatus(
    selectedDepartment !== 'all' ? selectedDepartment : undefined
  );
  const sendRemindersMutation = useSendComplianceReminders();

  const departments = ['Mental Health', 'Administration', 'Support Services', 'Leadership'];

  // Calculate org-wide compliance
  const totalUsers = complianceData?.length || 0;
  const compliantUsers =
    complianceData?.filter((user: any) => user.complianceRate >= 100).length || 0;
  const orgWideCompliance = totalUsers > 0 ? ((compliantUsers / totalUsers) * 100).toFixed(1) : 0;

  // Mock department breakdown data for chart
  const departmentBreakdown = [
    { department: 'Mental Health', compliance: 92 },
    { department: 'Administration', compliance: 88 },
    { department: 'Support Services', compliance: 76 },
    { department: 'Leadership', compliance: 95 },
  ];

  const handleSendReminders = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      await sendRemindersMutation.mutateAsync(selectedUsers);
      toast.success(`Sent reminders to ${selectedUsers.length} users`);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">🛡️</span>
          Compliance Monitor
        </h1>
        <p className="text-gray-600 text-lg">
          Track organization-wide training compliance and send reminders
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">✅</span>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">
              Overall Compliance
            </h3>
            <p className="text-4xl font-bold text-green-600">{orgWideCompliance}%</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">👥</span>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Total Staff</h3>
            <p className="text-4xl font-bold text-blue-600">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">⚠️</span>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Non-Compliant</h3>
            <p className="text-4xl font-bold text-orange-600">{totalUsers - compliantUsers}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-pink-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">⏰</span>
              <Calendar className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">
              Expiring Soon
            </h3>
            <p className="text-4xl font-bold text-red-600">
              {complianceData?.reduce((sum: number, u: any) => sum + u.expiringTrainings, 0) || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Department Filter */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-100 p-6 mb-8">
        <div className="flex items-center gap-4">
          <Building2 className="w-6 h-6 text-orange-600" />
          <span className="text-lg font-bold text-gray-700">Filter by Department:</span>
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
              selectedDepartment === 'all'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                selectedDepartment === dept
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Department Breakdown Chart */}
      <div className="mb-8">
        <BarChart
          data={departmentBreakdown}
          xKey="department"
          yKeys={[{ key: 'compliance', name: 'Compliance %', color: '#f97316' }]}
          title="Compliance by Department"
          height={300}
        />
      </div>

      {/* Non-Compliant Staff List */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-red-100 p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-red-600" />
            Non-Compliant Staff
          </h2>
          <button
            onClick={handleSendReminders}
            disabled={selectedUsers.length === 0 || sendRemindersMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            Send Reminders ({selectedUsers.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-red-50 to-orange-50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked && complianceData) {
                        setSelectedUsers(
                          complianceData
                            .filter((u: any) => u.complianceRate < 100)
                            .map((u: any) => u.userId)
                        );
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Staff Member
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Required Courses
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Completed
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Compliance
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Expiring
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Overdue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {complianceData && complianceData.length > 0 ? (
                complianceData
                  .filter((user: any) => user.complianceRate < 100)
                  .map((user: any) => (
                    <tr key={user.userId} className="hover:bg-red-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.userId)}
                          onChange={() => handleUserToggle(user.userId)}
                          className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {user.userName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.requiredCourses}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.completedCourses}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                user.complianceRate >= 80
                                  ? 'bg-green-500'
                                  : user.complianceRate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${user.complianceRate}%` }}
                            ></div>
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              user.complianceRate >= 80
                                ? 'text-green-600'
                                : user.complianceRate >= 50
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {user.complianceRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.expiringTrainings > 0 ? (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                            {user.expiringTrainings}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.overdueTrainings > 0 ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            {user.overdueTrainings}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-lg font-bold text-gray-700">All Staff Compliant!</p>
                    <p className="text-gray-600">Everyone has completed their required trainings</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Trainings Alert */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-xl border-2 border-yellow-200 p-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expiring Training Alerts</h2>
            <p className="text-gray-600">Trainings expiring in the next 30 days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Expiring in 7 days</p>
            <p className="text-3xl font-bold text-red-600">8</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Expiring in 14 days</p>
            <p className="text-3xl font-bold text-orange-600">12</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Expiring in 30 days</p>
            <p className="text-3xl font-bold text-yellow-600">6</p>
          </div>
        </div>
      </div>
    </div>
  );
}
