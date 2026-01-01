import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Users, Clock, PlayCircle, Settings } from 'lucide-react';

const TelehealthDashboard: React.FC = () => {
  const navigate = useNavigate();

  const upcomingSessions = [
    { id: '1', clientName: 'John Smith', time: '10:00 AM', duration: '50 min', status: 'scheduled' },
    { id: '2', clientName: 'Sarah Johnson', time: '11:00 AM', duration: '50 min', status: 'scheduled' },
    { id: '3', clientName: 'Michael Davis', time: '2:00 PM', duration: '50 min', status: 'scheduled' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Telehealth</h1>
            <p className="text-gray-600">Manage your video sessions and virtual appointments</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Today's Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Hours This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">18.5</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">142</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <PlayCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Upcoming Sessions</h2>
          <button
            onClick={() => navigate('/appointments')}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All →
          </button>
        </div>

        <div className="space-y-4">
          {upcomingSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                  {session.clientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{session.clientName}</p>
                  <p className="text-sm text-gray-500">{session.time} • {session.duration}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/telehealth/session/${session.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                <PlayCircle className="w-4 h-4" />
                Join
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/appointments/new')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-green-100 rounded-xl inline-block mb-4">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Schedule Session</h3>
          <p className="text-sm text-gray-500">Create a new telehealth appointment</p>
        </button>

        <button
          onClick={() => navigate('/settings/availability')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-purple-100 rounded-xl inline-block mb-4">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Availability</h3>
          <p className="text-sm text-gray-500">Manage your telehealth availability</p>
        </button>

        <button
          onClick={() => navigate('/clients')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-blue-100 rounded-xl inline-block mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Client List</h3>
          <p className="text-sm text-gray-500">View and manage your telehealth clients</p>
        </button>
      </div>
    </div>
  );
};

export default TelehealthDashboard;

