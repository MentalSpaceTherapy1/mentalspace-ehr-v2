import { useState } from 'react';
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';

interface MFASetupWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

type WizardStep = 'intro' | 'qr-code' | 'manual-entry' | 'verify' | 'backup-codes';

interface MFASetupData {
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
}

export default function MFASetupWizard({
  isOpen,
  onComplete,
  onSkip,
  onClose
}: MFASetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro');
  const [setupData, setSetupData] = useState<MFASetupData>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/mfa/setup');
      setSetupData({
        qrCode: response.data.data.qrCode,
        secret: response.data.data.secret
      });
      setCurrentStep('qr-code');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
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
      setCurrentStep('backup-codes');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
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

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                <ShieldCheckIcon className="h-14 w-14 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Enable Two-Factor Authentication
            </h2>

            <p className="text-gray-600 mb-6 text-lg">
              Add an extra layer of security to your account
            </p>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-left">
                Benefits of Two-Factor Authentication:
              </h3>
              <ul className="space-y-3 text-left text-gray-700">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                  <span>Protects against unauthorized access even if your password is compromised</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                  <span>Required for HIPAA compliance and protecting patient data</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                  <span>Quick and easy authentication using your mobile device</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                  <span>Backup codes provided for emergency access</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onSkip}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Skip for Now
              </button>
              <button
                onClick={handleStartSetup}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-md disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Get Started'}
              </button>
            </div>
          </div>
        );

      case 'qr-code':
        return (
          <div>
            <div className="flex justify-center mb-6">
              <QrCodeIcon className="h-16 w-16 text-indigo-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Scan QR Code
            </h2>

            <p className="text-gray-600 mb-6 text-center">
              Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
            </p>

            <div className="bg-white border-4 border-indigo-200 rounded-xl p-6 mb-6 flex justify-center">
              {setupData.qrCode ? (
                <img
                  src={setupData.qrCode}
                  alt="MFA QR Code"
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-lg"></div>
              )}
            </div>

            <p className="text-sm text-gray-600 text-center mb-6">
              Can't scan the code?{' '}
              <button
                onClick={() => setCurrentStep('manual-entry')}
                className="text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Enter it manually
              </button>
            </p>

            <div className="flex gap-4">
              <button
                onClick={onSkip}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Skip for Now
              </button>
              <button
                onClick={() => setCurrentStep('verify')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                I've Scanned It
              </button>
            </div>
          </div>
        );

      case 'manual-entry':
        return (
          <div>
            <div className="flex justify-center mb-6">
              <KeyIcon className="h-16 w-16 text-indigo-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Manual Entry
            </h2>

            <p className="text-gray-600 mb-6 text-center">
              Enter this code in your authenticator app
            </p>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2 text-center">Your Secret Key:</p>
              <div className="bg-white rounded-lg p-4 border-2 border-indigo-200">
                <code className="text-xl font-mono font-bold text-indigo-600 break-all block text-center">
                  {setupData.secret}
                </code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(setupData.secret || '');
                }}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-semibold w-full"
              >
                Click to Copy
              </button>
            </div>

            <p className="text-sm text-gray-600 text-center mb-6">
              <button
                onClick={() => setCurrentStep('qr-code')}
                className="text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Back to QR code
              </button>
            </p>

            <div className="flex gap-4">
              <button
                onClick={onSkip}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Skip for Now
              </button>
              <button
                onClick={() => setCurrentStep('verify')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                I've Added It
              </button>
            </div>
          </div>
        );

      case 'verify':
        return (
          <div>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircleIcon className="h-12 w-12 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Verify Setup
            </h2>

            <p className="text-gray-600 mb-6 text-center">
              Enter the 6-digit code from your authenticator app
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={verificationCode}
                onChange={handleCodeInput}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-4xl font-mono font-bold tracking-widest px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400"
              />
              <p className="text-sm text-gray-500 text-center mt-2">
                Enter the 6-digit code
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onSkip}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Skip for Now
              </button>
              <button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-md disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        );

      case 'backup-codes':
        return (
          <div>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-xl">
                <DocumentArrowDownIcon className="h-12 w-12 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Save Your Backup Codes
            </h2>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
              <p className="text-sm text-amber-800 font-semibold">
                Important: Save these codes in a secure location. You'll need them if you lose access to your authenticator app.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border-2 border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                {setupData.backupCodes?.map((code, idx) => (
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
            </div>

            <button
              onClick={handleDownloadBackupCodes}
              className="w-full mb-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-md flex items-center justify-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Download Backup Codes
            </button>

            <div className="flex gap-4">
              <button
                onClick={onSkip}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Skip for Now
              </button>
              <button
                onClick={onComplete}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-md"
              >
                Complete Setup
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all">
        {/* Close Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Progress Indicator */}
        <div className="mt-8 flex justify-center space-x-2">
          {['intro', 'qr-code', 'verify', 'backup-codes'].map((step, idx) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all ${
                currentStep === step
                  ? 'w-8 bg-indigo-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
