import { useState } from 'react';
import { ShieldCheckIcon, KeyIcon, ArrowPathIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';

interface MFAVerificationScreenProps {
  onSuccess: (token: string) => void;
  onCancel?: () => void;
  email: string;
  userId: string;
  mfaMethod?: 'TOTP' | 'SMS' | 'BOTH';
}

export default function MFAVerificationScreen({
  onSuccess,
  onCancel,
  email,
  userId,
  mfaMethod = 'TOTP'
}: MFAVerificationScreenProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [useSMS, setUseSMS] = useState(mfaMethod === 'SMS');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (useBackupCode) {
      // Backup codes can have letters, numbers, and hyphens
      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9);
      setCode(value);
    } else {
      // TOTP/SMS codes are 6 digits only
      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
      setCode(value);
    }
    setError('');
  };

  const handleSendSMS = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/mfa/send-sms', { userId });
      setSmsSent(true);
      setTimeout(() => setSmsSent(false), 60000); // Reset after 1 minute
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send SMS code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (useBackupCode && code.length < 8) {
      setError('Backup code must be at least 8 characters');
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/mfa/verify', {
        userId,
        code
      });

      if (response.data.success) {
        // The verification was successful
        // The auth service should handle completing the MFA login
        onSuccess(response.data.data?.token || 'verified');
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      if (useBackupCode) {
        setError(
          err.response?.data?.error ||
          'Invalid backup code. Please check and try again.'
        );
      } else {
        setError(
          err.response?.data?.error ||
          'Invalid verification code. Please check and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setUseSMS(false);
    setCode('');
    setError('');
  };

  const handleToggleSMS = () => {
    setUseSMS(!useSMS);
    setUseBackupCode(false);
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
              {useBackupCode ? (
                <KeyIcon className="h-12 w-12 text-white" />
              ) : useSMS ? (
                <DevicePhoneMobileIcon className="h-12 w-12 text-white" />
              ) : (
                <ShieldCheckIcon className="h-12 w-12 text-white" />
              )}
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Factor Authentication
          </h2>
          <p className="text-gray-600">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : useSMS
              ? 'Enter the code sent to your phone'
              : 'Enter the code from your authenticator app'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                {useBackupCode ? 'Backup Code' : 'Verification Code'}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeInput}
                placeholder={useBackupCode ? 'ABCD-1234' : '000000'}
                className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:border-cyan-500 transition-all"
                autoFocus
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 text-center mt-2">
                {useBackupCode
                  ? '8-character alphanumeric code with hyphen'
                  : useSMS
                  ? '6-digit code sent via SMS'
                  : '6-digit code from your authenticator app'}
              </p>
            </div>

            {/* SMS Send Button */}
            {useSMS && (
              <div>
                <button
                  type="button"
                  onClick={handleSendSMS}
                  disabled={loading || smsSent}
                  className="w-full py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {smsSent ? (
                    <>
                      <CheckCircleIcon className="inline h-4 w-4 mr-2 text-green-500" />
                      SMS Sent! Check your phone
                    </>
                  ) : (
                    <>
                      <DevicePhoneMobileIcon className="inline h-4 w-4 mr-2" />
                      {loading ? 'Sending...' : 'Send SMS Code'}
                    </>
                  )}
                </button>
                {smsSent && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Didn't receive it? You can resend in 60 seconds
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <svg
                  className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (useBackupCode ? code.length < 8 : code.length !== 6)}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </button>

            {/* Alternative Methods */}
            <div className="space-y-2">
              {/* Toggle Backup Code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleToggleBackupCode}
                  className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold transition-colors"
                >
                  {useBackupCode ? (
                    <>
                      <ShieldCheckIcon className="inline h-4 w-4 mr-1" />
                      Use verification code instead
                    </>
                  ) : (
                    <>
                      <KeyIcon className="inline h-4 w-4 mr-1" />
                      Use backup code instead
                    </>
                  )}
                </button>
              </div>

              {/* Toggle SMS (if BOTH method is enabled) */}
              {mfaMethod === 'BOTH' && !useBackupCode && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleToggleSMS}
                    className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold transition-colors"
                  >
                    {useSMS ? (
                      <>
                        <ShieldCheckIcon className="inline h-4 w-4 mr-1" />
                        Use authenticator app instead
                      </>
                    ) : (
                      <>
                        <DevicePhoneMobileIcon className="inline h-4 w-4 mr-1" />
                        Use SMS code instead
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Cancel Button */}
            {onCancel && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Back to login
                </button>
              </div>
            )}
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold text-gray-900">Need help?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Make sure your device's time is synchronized (for TOTP)</li>
                <li>Each backup code can only be used once</li>
                <li>SMS codes expire after 5 minutes</li>
                <li>Contact your administrator if you've lost access</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            MentalSpace EHR - Secure Authentication
          </p>
        </div>
      </div>
    </div>
  );
}

// Add missing import
function CheckCircleIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
