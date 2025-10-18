import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      // Store token in localStorage
      localStorage.setItem('token', response.data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      // Redirect to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('SecurePass123!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Quick Login (Demo)</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => quickLogin('admin@mentalspace.com')}
                className="text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Admin
              </button>
              <button
                onClick={() => quickLogin('supervisor@mentalspace.com')}
                className="text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Supervisor
              </button>
              <button
                onClick={() => quickLogin('clinician1@mentalspace.com')}
                className="text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clinician 1
              </button>
              <button
                onClick={() => quickLogin('billing@mentalspace.com')}
                className="text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Billing
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-gray-500">
              Password: SecurePass123!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
