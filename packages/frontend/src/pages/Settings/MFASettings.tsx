import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';

interface MFAStatus {
  enabled: boolean;
  lastEnabled?: string;
  backupCodesRemaining?: number;
}

interface SetupData {
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
}

export default function MFASettings() {
  const [status, setStatus] = useState<MFAStatus>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [setupData, setSetupData] = useState<SetupData>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await api.get('/mfa/status');
      setStatus(response.data.data);
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/mfa/setup');
      setSetupData({
        qrCode: response.data.data.qrCode,
        secret: response.data.data.secret
      });
      setShowSetup(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/mfa/verify-setup', {
        code: verificationCode
      });
      setSetupData(prev => ({
        ...prev,
        backupCodes: response.data.data.backupCodes
      }));
      setSuccess('Two-factor authentication has been enabled successfully!');
      setShowSetup(false);
      setVerificationCode('');
      await fetchMFAStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code to disable MFA');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/mfa/disable', {
        code: verificationCode
      });
      setSuccess('Two-factor authentication has been disabled');
      setShowDisable(false);
      setVerificationCode('');
      await fetchMFAStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code to regenerate backup codes');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/mfa/regenerate-backup-codes', {
        code: verificationCode
      });
      setSetupData({
        backupCodes: response.data.data.backupCodes
      });
      setSuccess('New backup codes have been generated');
      setVerificationCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData.backupCodes) return;

    const content = `MentalSpace EHR - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes securely. Each code can only be used once.

${setupData.backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join('\n')}

If you lose access to your authenticator app, you can use these codes to log in.
After using a code, it will no longer be valid.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentalspace-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    setError('');
  };

  if (loading && !showSetup && !showDisable && !showRegenerate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MFA settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheckIcon className="h-10 w-10 text-indigo-600" />
          <h1 className="text-4xl font-bold text-gray-900">Two-Factor Authentication</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Secure your account with an additional layer of protection
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-start">
          <CheckCircleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
          <span>{success}</span>
          <button
            onClick={() => setSuccess('')}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Current Status Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Status</h2>

        <div className="flex items-center justify-between p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
          <div className="flex items-center space-x-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                status.enabled
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}
            >
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Two-Factor Authentication is{' '}
                <span className={status.enabled ? 'text-green-600' : 'text-gray-600'}>
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              {status.enabled && status.lastEnabled && (
                <p className="text-sm text-gray-600">
                  Enabled since {new Date(status.lastEnabled).toLocaleDateString()}
                </p>
              )}
              {status.enabled && status.backupCodesRemaining !== undefined && (
                <p className="text-sm text-gray-600">
                  {status.backupCodesRemaining} backup codes remaining
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Setup/Manage Section */}
      {!status.enabled ? (
        // Enable MFA Section
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Enable Two-Factor Authentication</h2>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Add an extra layer of security to your account by requiring a verification code in
              addition to your password.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-blue-900 mb-2">Benefits:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Protects against unauthorized access</li>
                <li>Required for HIPAA compliance</li>
                <li>Uses authenticator apps like Google Authenticator or Authy</li>
                <li>Includes backup codes for emergency access</li>
              </ul>
            </div>
          </div>

          {!showSetup ? (
            <button
              onClick={handleEnableMFA}
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </button>
          ) : (
            <div className="space-y-6">
              {/* QR Code */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <QrCodeIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Step 1: Scan QR Code
                </h3>
                <div className="bg-white border-4 border-indigo-200 rounded-xl p-6 mb-4 flex justify-center">
                  {setupData.qrCode && (
                    <img src={setupData.qrCode} alt="MFA QR Code" className="w-64 h-64" />
                  )}
                </div>
                <p className="text-sm text-gray-600 text-center mb-2">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {/* Manual Entry */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <KeyIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Or enter manually:
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <code className="text-sm font-mono font-semibold text-gray-800 break-all">
                    {setupData.secret}
                  </code>
                </div>
              </div>

              {/* Verification */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircleIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Step 2: Verify Setup
                </h3>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={handleCodeInput}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-center text-2xl font-mono font-bold px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 mb-4"
                />
                <button
                  onClick={handleVerifyAndEnable}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-md disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Manage MFA Section
        <div className="space-y-6">
          {/* Disable MFA */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Disable Two-Factor Authentication</h2>
            <p className="text-gray-600 mb-6">
              Disabling two-factor authentication will make your account less secure.
            </p>

            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="w-full py-3 px-6 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Disable Two-Factor Authentication
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                  <p className="text-sm text-amber-800 font-semibold">
                    Enter your current verification code to disable MFA
                  </p>
                </div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={handleCodeInput}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-center text-2xl font-mono font-bold px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-300 focus:border-red-400"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowDisable(false);
                      setVerificationCode('');
                      setError('');
                    }}
                    className="flex-1 py-3 px-6 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisableMFA}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-pink-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Disabling...' : 'Confirm Disable'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Regenerate Backup Codes */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Backup Codes</h2>
            <p className="text-gray-600 mb-6">
              Generate new backup codes if you've used your existing ones or want to refresh them.
            </p>

            {setupData.backupCodes ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {setupData.backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg px-4 py-3 border border-gray-300"
                      >
                        <code className="text-sm font-mono font-semibold text-gray-800">
                          {code}
                        </code>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleDownloadBackupCodes}
                    className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-md flex items-center justify-center"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Download Backup Codes
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!showRegenerate ? (
                  <button
                    onClick={() => setShowRegenerate(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-md"
                  >
                    Regenerate Backup Codes
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                      <p className="text-sm text-amber-800 font-semibold">
                        Enter your current verification code to regenerate backup codes
                      </p>
                    </div>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={handleCodeInput}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full text-center text-2xl font-mono font-bold px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-400"
                    />
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setShowRegenerate(false);
                          setVerificationCode('');
                          setError('');
                        }}
                        className="flex-1 py-3 px-6 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRegenerateBackupCodes}
                        disabled={loading || verificationCode.length !== 6}
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Generating...' : 'Regenerate Codes'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
