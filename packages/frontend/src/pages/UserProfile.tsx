import React from 'react';
import { SignatureSettings } from '../components/Settings/SignatureSettings';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function UserProfile() {
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
