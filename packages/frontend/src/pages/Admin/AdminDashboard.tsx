import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Calendar, Shield, AlertTriangle, Database, Activity, CheckCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const adminTasks = [
    { id: '1', title: 'Review session ratings', count: 5, path: '/admin/session-ratings', urgent: false },
    { id: '2', title: 'Crisis detections to review', count: 2, path: '/admin/crisis-detections', urgent: true },
    { id: '3', title: 'Guardian verifications pending', count: 8, path: '/admin/guardian-verification', urgent: false },
    { id: '4', title: 'Waitlist entries to manage', count: 15, path: '/admin/waitlist-management', urgent: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">System administration and configuration tools</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">156</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">System Health</p>
              <p className="text-3xl font-bold text-green-600 mt-1">98%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending Tasks</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">30</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Alerts</p>
              <p className="text-3xl font-bold text-red-600 mt-1">2</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tasks */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Administrative Tasks</h2>
        <div className="space-y-4">
          {adminTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => navigate(task.path)}
              className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                task.urgent 
                  ? 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200' 
                  : 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {task.urgent && <AlertTriangle className="w-5 h-5 text-red-500" />}
                <span className="font-medium text-gray-900">{task.title}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                task.urgent 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {task.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => navigate('/admin/session-ratings')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-blue-100 rounded-xl inline-block mb-4">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Session Ratings</h3>
          <p className="text-sm text-gray-500">Review client session feedback</p>
        </button>

        <button
          onClick={() => navigate('/admin/crisis-detections')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-red-100 rounded-xl inline-block mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Crisis Detection</h3>
          <p className="text-sm text-gray-500">Monitor AI-detected crisis alerts</p>
        </button>

        <button
          onClick={() => navigate('/admin/scheduling-rules')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-green-100 rounded-xl inline-block mb-4">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Scheduling Rules</h3>
          <p className="text-sm text-gray-500">Configure scheduling policies</p>
        </button>

        <button
          onClick={() => navigate('/admin/waitlist-management')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-amber-100 rounded-xl inline-block mb-4">
            <Users className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Waitlist</h3>
          <p className="text-sm text-gray-500">Manage client waitlist</p>
        </button>

        <button
          onClick={() => navigate('/admin/guardian-verification')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-purple-100 rounded-xl inline-block mb-4">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Guardian Verification</h3>
          <p className="text-sm text-gray-500">Verify guardian requests</p>
        </button>

        <button
          onClick={() => navigate('/admin/advancedmd-sync')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-cyan-100 rounded-xl inline-block mb-4">
            <Database className="w-6 h-6 text-cyan-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">AdvancedMD Sync</h3>
          <p className="text-sm text-gray-500">Manage EHR integration</p>
        </button>

        <button
          onClick={() => navigate('/admin/advancedmd-settings')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-indigo-100 rounded-xl inline-block mb-4">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">AdvancedMD Settings</h3>
          <p className="text-sm text-gray-500">Configure integration</p>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-slate-100 rounded-xl inline-block mb-4">
            <Settings className="w-6 h-6 text-slate-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Practice Settings</h3>
          <p className="text-sm text-gray-500">General configuration</p>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;


