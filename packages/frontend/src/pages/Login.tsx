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

      // Store token in localStorage (session-based auth)
      localStorage.setItem('token', response.data.data.session.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

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

  const handleMFASuccess = (token: string) => {
    // Store the token after successful MFA
    localStorage.setItem('token', token);

    // Fetch and store user data
    api.get('/auth/me').then(response => {
      localStorage.setItem('user', JSON.stringify(response.data.data));
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
    setPassword('');
    setError('');
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
