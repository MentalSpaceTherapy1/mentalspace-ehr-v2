import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Users, TrendingUp, Clock, FileText, Calendar, Target, BarChart2 } from 'lucide-react';

const ClinicianToolsDashboard: React.FC = () => {
  const navigate = useNavigate();

  const clientSnapshot = [
    { id: '1', name: 'John Smith', nextAppt: 'Today at 2:00 PM', status: 'On Track' },
    { id: '2', name: 'Sarah Johnson', nextAppt: 'Tomorrow at 10:00 AM', status: 'Needs Attention' },
    { id: '3', name: 'Michael Davis', nextAppt: 'Dec 18 at 3:00 PM', status: 'On Track' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Clinician Tools</h1>
            <p className="text-gray-600">Your clinical workspace and tools</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">My Caseload</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">24</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-xl">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Today's Sessions</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">6</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Notes Due</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">3</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Waitlist</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">8</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Client Snapshot */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Client Snapshot
            </h2>
            <button
              onClick={() => navigate('/clients')}
              className="text-teal-600 hover:text-teal-700 font-medium text-sm"
            >
              View All →
            </button>
          </div>

          <div className="space-y-4">
            {clientSnapshot.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.nextAppt}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  client.status === 'On Track' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/clinician/client-progress')}
              className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100 hover:shadow-md transition-all text-left"
            >
              <TrendingUp className="w-6 h-6 text-teal-600 mb-2" />
              <p className="font-medium text-gray-900">Client Progress</p>
              <p className="text-xs text-gray-500">Track outcomes</p>
            </button>

            <button
              onClick={() => navigate('/clinician/my-waitlist')}
              className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition-all text-left"
            >
              <Clock className="w-6 h-6 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">My Waitlist</p>
              <p className="text-xs text-gray-500">Manage queue</p>
            </button>

            <button
              onClick={() => navigate('/notes/my-notes')}
              className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition-all text-left"
            >
              <FileText className="w-6 h-6 text-amber-600 mb-2" />
              <p className="font-medium text-gray-900">My Notes</p>
              <p className="text-xs text-gray-500">View & sign</p>
            </button>

            <button
              onClick={() => navigate('/appointments')}
              className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all text-left"
            >
              <Calendar className="w-6 h-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">Schedule</p>
              <p className="text-xs text-gray-500">My appointments</p>
            </button>

            <button
              onClick={() => navigate('/productivity')}
              className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all text-left"
            >
              <BarChart2 className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">Productivity</p>
              <p className="text-xs text-gray-500">My metrics</p>
            </button>

            <button
              onClick={() => navigate('/supervision')}
              className="p-4 bg-gradient-to-br from-rose-50 to-red-50 rounded-xl border border-rose-100 hover:shadow-md transition-all text-left"
            >
              <Target className="w-6 h-6 text-rose-600 mb-2" />
              <p className="font-medium text-gray-900">Supervision</p>
              <p className="text-xs text-gray-500">Track hours</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicianToolsDashboard;

