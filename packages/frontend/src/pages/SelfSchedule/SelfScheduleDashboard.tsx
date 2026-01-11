import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Settings, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

const SelfScheduleDashboard: React.FC = () => {
  const navigate = useNavigate();

  const pendingRequests = [
    { id: '1', clientName: 'Emma Wilson', requestedTime: 'Mon, Dec 16 at 2:00 PM', type: 'Initial Consultation' },
    { id: '2', clientName: 'James Brown', requestedTime: 'Tue, Dec 17 at 10:00 AM', type: 'Follow-up' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Self-Scheduling</h1>
            <p className="text-gray-600">Manage client self-scheduling settings and requests</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending Requests</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">8</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Approved Today</p>
              <p className="text-3xl font-bold text-green-600 mt-1">12</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Slots</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">45</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Eligible Clients</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">156</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pending Scheduling Requests
          </h2>
        </div>

        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {request.clientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{request.clientName}</p>
                  <p className="text-sm text-gray-500">{request.requestedTime}</p>
                  <p className="text-xs text-amber-600 font-medium">{request.type}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm">
                  Approve
                </button>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm">
                  Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/settings/availability')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-violet-100 rounded-xl inline-block mb-4">
            <Settings className="w-6 h-6 text-violet-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Manage Availability</h3>
          <p className="text-sm text-gray-500">Configure which time slots are available for self-scheduling</p>
        </button>

        <button
          onClick={() => navigate('/admin/scheduling-rules')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-purple-100 rounded-xl inline-block mb-4">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Scheduling Rules</h3>
          <p className="text-sm text-gray-500">Set up rules for client self-scheduling</p>
        </button>

        <button
          onClick={() => navigate('/clients')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-fuchsia-100 rounded-xl inline-block mb-4">
            <Users className="w-6 h-6 text-fuchsia-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Eligible Clients</h3>
          <p className="text-sm text-gray-500">View clients eligible for self-scheduling</p>
        </button>
      </div>
    </div>
  );
};

export default SelfScheduleDashboard;


