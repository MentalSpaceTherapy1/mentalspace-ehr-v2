import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, FileCheck, Bell, UserPlus, Eye, CheckCircle, Clock } from 'lucide-react';

const GuardianPortalDashboard: React.FC = () => {
  const navigate = useNavigate();

  const pendingVerifications = [
    { id: '1', guardianName: 'Mary Smith', minorName: 'Tommy Smith', submittedDate: '2024-12-12', status: 'pending' },
    { id: '2', guardianName: 'Robert Johnson', minorName: 'Emily Johnson', submittedDate: '2024-12-11', status: 'pending' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Guardian Portal</h1>
            <p className="text-gray-600">Manage guardian access and minor client permissions</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Guardians</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">45</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pending Verification</p>
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
              <p className="text-gray-500 text-sm font-medium">Minor Clients</p>
              <p className="text-3xl font-bold text-green-600 mt-1">67</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Consent Forms</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">124</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FileCheck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Verifications */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Pending Verifications
            </h2>
            <button
              onClick={() => navigate('/admin/guardian-verification')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              View All →
            </button>
          </div>

          <div className="space-y-4">
            {pendingVerifications.map((verification) => (
              <div
                key={verification.id}
                className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{verification.guardianName}</p>
                    <p className="text-sm text-gray-600">Guardian for: {verification.minorName}</p>
                    <p className="text-xs text-gray-400 mt-1">Submitted: {verification.submittedDate}</p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/guardian-verification')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Review
                  </button>
                </div>
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
                onClick={() => navigate('/guardian/portal')}
                className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all text-left"
              >
                <Eye className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium text-gray-900">My Dependents</p>
                <p className="text-xs text-gray-500">View linked minors</p>
              </button>

              <button
                onClick={() => navigate('/guardian/request-access')}
                className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all text-left"
              >
                <UserPlus className="w-6 h-6 text-green-600 mb-2" />
                <p className="font-medium text-gray-900">Request Access</p>
                <p className="text-xs text-gray-500">Link a new minor</p>
              </button>

              <button
                onClick={() => navigate('/admin/guardian-verification')}
                className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition-all text-left"
              >
                <CheckCircle className="w-6 h-6 text-amber-600 mb-2" />
                <p className="font-medium text-gray-900">Verify Guardians</p>
                <p className="text-xs text-gray-500">Review requests</p>
              </button>

              <button
                onClick={() => navigate('/client/guardian-consent')}
                className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:shadow-md transition-all text-left"
              >
                <FileCheck className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900">Consent Forms</p>
                <p className="text-xs text-gray-500">Manage consents</p>
              </button>
            </div>
          </div>

          {/* HIPAA Notice */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold">HIPAA Compliance</h2>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Guardian access is managed in compliance with HIPAA regulations for minor patients. All access is logged and auditable.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-slate-300">Audit Trail</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-slate-300">Consent Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianPortalDashboard;


