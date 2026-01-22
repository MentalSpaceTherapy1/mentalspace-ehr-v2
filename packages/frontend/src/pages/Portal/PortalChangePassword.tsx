import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

export default function PortalChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    // Check if we have a temp token
    const tempToken = localStorage.getItem('portalTempToken');
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      navigate('/portal/login');
      return;
    }

    // Get client name for greeting
    const clientData = localStorage.getItem('portalClient');
    if (clientData) {
      try {
        const client = JSON.parse(clientData);
        setClientName(client.firstName || '');
      } catch {
        // Ignore parse errors
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const tempToken = localStorage.getItem('portalTempToken');

      const response = await api.post(
        '/portal-auth/change-temp-password',
        { newPassword },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      if (response.data.success) {
        // Clear temp token
        localStorage.removeItem('portalTempToken');

        // Store the new full access token
        localStorage.setItem('portalToken', response.data.data.token);

        toast.success('Password set successfully!');
        navigate('/portal/dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to set password';
      const code = error.response?.data?.code;

      if (code === 'TOKEN_EXPIRED') {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('portalTempToken');
        navigate('/portal/login');
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-4">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MentalSpace</h1>
          <p className="text-gray-600">Client Portal</p>
        </div>

        {/* Password Change Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Set Your Password</h2>
            {clientName && (
              <p className="text-gray-600 mt-2">Welcome, {clientName}!</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Please create a new password to secure your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Enter new password"
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Confirm new password"
              />
            </div>

            {/* Password requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                  <svg className={`w-4 h-4 mr-2 ${newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                    {newPassword.length >= 8 ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    )}
                  </svg>
                  At least 8 characters
                </li>
                <li className={`flex items-center ${newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-green-600' : ''}`}>
                  <svg className={`w-4 h-4 mr-2 ${newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                    {newPassword === confirmPassword && confirmPassword.length > 0 ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    )}
                  </svg>
                  Passwords match
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting Password...' : 'Set Password & Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/portal/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Secure HIPAA-compliant portal</p>
          <p className="mt-2">© 2025 MentalSpace EHR. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
