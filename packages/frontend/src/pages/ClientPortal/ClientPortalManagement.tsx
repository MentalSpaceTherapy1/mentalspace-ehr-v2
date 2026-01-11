import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Users, FileText, MessageSquare, Settings, Activity, Shield, Eye } from 'lucide-react';

const ClientPortalManagement: React.FC = () => {
  const navigate = useNavigate();

  const recentActivity = [
    { id: '1', clientName: 'John Smith', action: 'Completed intake forms', time: '10 min ago' },
    { id: '2', clientName: 'Sarah Johnson', action: 'Sent a message', time: '25 min ago' },
    { id: '3', clientName: 'Michael Davis', action: 'Updated profile', time: '1 hour ago' },
    { id: '4', clientName: 'Emily Brown', action: 'Viewed appointment', time: '2 hours ago' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Client Portal</h1>
            <p className="text-gray-600">Manage client portal access and settings</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Portal Users</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">234</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending Invites</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">18</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <MessageSquare className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Forms Submitted</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">56</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Today</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">42</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Recent Portal Activity
            </h2>
          </div>

          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {activity.clientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.clientName}</p>
                  <p className="text-sm text-gray-500">{activity.action}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/clients')}
                className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:shadow-md transition-all text-left"
              >
                <Users className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-xs text-gray-500">View portal users</p>
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all text-left"
              >
                <Settings className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium text-gray-900">Portal Settings</p>
                <p className="text-xs text-gray-500">Configure portal</p>
              </button>

              <button
                onClick={() => navigate('/documents')}
                className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition-all text-left"
              >
                <FileText className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">Shared Documents</p>
                <p className="text-xs text-gray-500">Manage documents</p>
              </button>

              <button
                onClick={() => navigate('/messages')}
                className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition-all text-left"
              >
                <MessageSquare className="w-6 h-6 text-amber-600 mb-2" />
                <p className="font-medium text-gray-900">Messages</p>
                <p className="text-xs text-gray-500">Client messages</p>
              </button>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold">Portal Security</h2>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              HIPAA-compliant client portal with end-to-end encryption
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm text-slate-300">SSL Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm text-slate-300">2FA Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortalManagement;


