import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignatureSettings } from '../components/Settings/SignatureSettings';
import { UserCircleIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

interface MFAStatus {
  enabled: boolean;
  lastEnabled?: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>({ enabled: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await api.get('/mfa/status');
      setMfaStatus(response.data.data);
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <UserCircleIcon className="h-10 w-10 text-indigo-600" />
          <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage your personal account settings and preferences
        </p>
      </div>

      {/* Security Settings Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
        </div>

        {/* MFA Status Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  mfaStatus.enabled
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}
              >
                {mfaStatus.enabled ? (
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-gray-600">
                  {mfaStatus.enabled ? (
                    <>
                      <span className="text-green-600 font-medium">Enabled</span>
                      {mfaStatus.lastEnabled && (
                        <> since {new Date(mfaStatus.lastEnabled).toLocaleDateString()}</>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-600">Not enabled - Recommended for security</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile/mfa-settings')}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md disabled:opacity-50"
            >
              {mfaStatus.enabled ? 'Manage MFA' : 'Enable MFA'}
            </button>
          </div>

          {!mfaStatus.enabled && (
            <div className="mt-4 pt-4 border-t border-indigo-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Recommended:</span> Enable two-factor authentication to add an extra layer of security to your account and meet HIPAA compliance requirements.
              </p>
            </div>
          )}
        </div>

        {/* Session Management Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600">
                <ComputerDesktopIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Active Sessions
                </p>
                <p className="text-sm text-gray-600">
                  Manage your active sessions across all devices
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile/sessions')}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-700 transform hover:scale-105 transition-all duration-200 shadow-md disabled:opacity-50"
            >
              Manage Sessions
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Security:</span> Review and terminate sessions from other devices. If you see a session you don't recognize, terminate it immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Signature Settings Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <SignatureSettings />
      </div>

      {/* Future: Add more user-specific settings here */}
      {/* - Profile information */}
      {/* - Password change */}
      {/* - Notification preferences */}
      {/* - etc. */}
    </div>
  );
}
