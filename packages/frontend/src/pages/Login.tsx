import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import MFAVerificationScreen from '../components/Auth/MFAVerificationScreen';
import AccountLockedScreen from '../components/Auth/AccountLockedScreen';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | undefined>();
  const [sessionMessage, setSessionMessage] = useState(
    location.state?.message || ''
  );

  // Password change state for temporary passwords
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      // Check if MFA is required
      if (response.data.data.requiresMfa) {
        setShowMFAVerification(true);
        setLoading(false);
        return;
      }

      // Check if password change is required (temporary password)
      if (response.data.data.requiresPasswordChange) {
        setCurrentPassword(password); // Store the temp password for change-password call
        setShowPasswordChange(true);
        setLoading(false);

        // Store user data temporarily
        const userData = {
          ...response.data.data.user,
          role: response.data.data.user.roles?.[0] || response.data.data.user.role,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        return;
      }

      // HIPAA Security: Auth token is now in httpOnly cookie (set by backend)
      // We no longer store tokens in localStorage to prevent XSS token theft

      // Store user data in localStorage (non-sensitive display data only)
      // Add backward compatibility: set both 'role' (singular) and 'roles' (array)
      const userData = {
        ...response.data.data.user,
        role: response.data.data.user.roles?.[0] || response.data.data.user.role,
      };
      localStorage.setItem('user', JSON.stringify(userData));

      // Check for password expiration warning
      if (response.data.data.passwordExpiresIn !== undefined) {
        const daysUntilExpiry = response.data.data.passwordExpiresIn;
        if (daysUntilExpiry <= 7) {
          // Show warning banner in dashboard
          localStorage.setItem('passwordExpiryWarning', daysUntilExpiry.toString());
        }
      }

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      const errorData = err.response?.data;

      // Handle account locked error
      if (errorData?.code === 'ACCOUNT_LOCKED' || errorData?.message?.includes('locked')) {
        setIsAccountLocked(true);
        setLockedUntil(errorData?.lockedUntil);
        setLoading(false);
        return;
      }

      // Handle other errors
      setError(errorData?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters long');
      return;
    }

    // Check for complexity requirements
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setPasswordChangeError('Password must include uppercase, lowercase, number, and special character');
      return;
    }

    setPasswordChangeLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      // Password changed successfully - redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please try again.';
      setPasswordChangeError(errorMessage);
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleMFASuccess = () => {
    // HIPAA Security: Auth token is now in httpOnly cookie (set by backend after MFA)
    // We no longer receive or store tokens in localStorage

    // Fetch and store user data (non-sensitive display data only)
    api.get('/auth/me').then(response => {
      // Add backward compatibility: set both 'role' (singular) and 'roles' (array)
      const userData = {
        ...response.data.data,
        role: response.data.data.roles?.[0] || response.data.data.role,
      };
      localStorage.setItem('user', JSON.stringify(userData));
      navigate('/dashboard');
    }).catch(() => {
      setError('Failed to fetch user data');
      setShowMFAVerification(false);
    });
  };

  const handleMFACancel = () => {
    setShowMFAVerification(false);
    setPassword('');
  };

  const handleBackToLogin = () => {
    setIsAccountLocked(false);
    setShowPasswordChange(false);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setPasswordChangeError('');
  };

  // Show account locked screen
  if (isAccountLocked) {
    return (
      <AccountLockedScreen
        lockedUntil={lockedUntil}
        email={email}
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  // Show MFA verification screen
  if (showMFAVerification) {
    return (
      <MFAVerificationScreen
        email={email}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />
    );
  }

  // Show password change screen for temporary passwords
  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src="/logo.png"
              alt="MentalSpace Therapy"
              className="mx-auto h-24 w-auto object-contain mb-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.innerHTML = `
                  <h2 class="text-4xl font-extrabold text-gray-900">MentalSpace EHR</h2>
                  <p class="mt-2 text-sm text-gray-600">Electronic Health Records System</p>
                `;
                e.currentTarget.parentElement!.appendChild(fallback);
              }}
            />
            <p className="mt-2 text-sm text-gray-600">
              Electronic Health Records System
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 text-center">Password Change Required</h2>
              <p className="mt-2 text-sm text-gray-600 text-center">
                You must change your temporary password before continuing.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handlePasswordChange}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character (!@#$%^&*)</li>
                </ul>
              </div>

              {passwordChangeError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {passwordChangeError}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordChangeLoading ? 'Changing Password...' : 'Change Password'}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="MentalSpace Therapy"
            className="mx-auto h-24 w-auto object-contain mb-4"
            onError={(e) => {
              // Fallback to text if logo not found
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.innerHTML = `
                <h2 class="text-4xl font-extrabold text-gray-900">MentalSpace EHR</h2>
                <p class="mt-2 text-sm text-gray-600">Electronic Health Records System</p>
              `;
              e.currentTarget.parentElement!.appendChild(fallback);
            }}
          />
          <p className="mt-2 text-sm text-gray-600">
            Electronic Health Records System
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="••••••••"
              />
            </div>

            {sessionMessage && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                {sessionMessage}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
