import { useEffect, useState } from 'react';
import { LockClosedIcon, ClockIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface AccountLockedScreenProps {
  lockedUntil?: Date | string;
  email: string;
  onBackToLogin: () => void;
  remainingAttempts?: number;
}

export default function AccountLockedScreen({
  lockedUntil,
  email,
  onBackToLogin,
  remainingAttempts = 0
}: AccountLockedScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!lockedUntil) return;

    const updateTimer = () => {
      const lockDate = typeof lockedUntil === 'string' ? new Date(lockedUntil) : lockedUntil;
      const now = new Date();
      const diff = lockDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('0 minutes');
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (minutes > 0) {
        setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else {
        setTimeRemaining(`${seconds} second${seconds !== 1 ? 's' : ''}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <LockClosedIcon className="h-14 w-14 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Account Temporarily Locked
          </h2>
          <p className="text-gray-600 text-lg">
            Too many failed login attempts
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Lock Info */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <ClockIcon className="h-8 w-8 text-red-600" />
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">
                  Account unlocks in:
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {timeRemaining}
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-700">
                Your account has been temporarily locked due to multiple failed login attempts.
                This is a security measure to protect your account.
              </p>
            </div>
          </div>

          {/* Security Info */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Wait for automatic unlock</p>
                <p className="text-xs text-gray-600 mt-1">
                  Your account will automatically unlock after the timer expires
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Reset your password</p>
                <p className="text-xs text-gray-600 mt-1">
                  If you've forgotten your password, use the password reset option
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Contact administrator</p>
                <p className="text-xs text-gray-600 mt-1">
                  For immediate assistance, contact your system administrator
                </p>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm font-semibold text-gray-900 mb-3 text-center">
              Need immediate access?
            </p>
            <div className="space-y-2">
              <a
                href="mailto:support@mentalspace-ehr.com"
                className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors"
              >
                <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  support@mentalspace-ehr.com
                </span>
              </a>
              <a
                href="tel:+1-800-555-0100"
                className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-colors"
              >
                <PhoneIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  1-800-555-0100
                </span>
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={onBackToLogin}
              className="w-full py-3 px-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-md"
            >
              Back to Login
            </button>

            <a
              href="/forgot-password"
              className="block w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-md text-center"
            >
              Reset Password
            </a>
          </div>

          {/* Account Info */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Locked Account: <span className="font-semibold text-gray-700">{email}</span>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Security Notice:</span> Account lockouts occur after{' '}
                {remainingAttempts > 0 ? `${5 - remainingAttempts}` : '5'} failed login attempts.
                Always verify you're using the correct password.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            MentalSpace EHR - Secure Account Protection
          </p>
        </div>
      </div>
    </div>
  );
}
