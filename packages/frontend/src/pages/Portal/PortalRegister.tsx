import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

export default function PortalRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if this is an activation flow (has token from invitation email)
  const invitationToken = searchParams.get('token');
  const invitationEmail = searchParams.get('email');
  const isActivationFlow = !!invitationToken;

  const [formData, setFormData] = useState({
    email: invitationEmail || '',
    password: '',
    confirmPassword: '',
    clientId: '', // MRN - always required for identity verification
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update email from URL params if present
  useEffect(() => {
    if (invitationEmail) {
      setFormData(prev => ({ ...prev, email: invitationEmail }));
    }
  }, [invitationEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (isActivationFlow) {
        // Activation flow - account was created by staff, client is setting password
        const response = await api.post('/portal-auth/activate', {
          token: invitationToken,
          email: formData.email,
          password: formData.password,
          mrn: formData.clientId,
        });

        if (response.data.success) {
          toast.success('Account activated successfully! You can now log in.');
          navigate('/portal/login');
        }
      } else {
        // Self-registration flow - client is creating a new account
        const response = await api.post('/portal-auth/register', {
          email: formData.email,
          password: formData.password,
          clientId: formData.clientId,
        });

        if (response.data.success) {
          toast.success('Account created! Please check your email to verify your account.');
          navigate('/portal/login');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-4">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MentalSpace</h1>
          <p className="text-gray-600">Client Portal Registration</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isActivationFlow ? 'Activate Your Account' : 'Create Account'}
          </h2>
          {isActivationFlow && (
            <p className="text-sm text-gray-600 mb-6">
              Welcome! Please enter your MRN and create a password to activate your portal account.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                MRN (Medical Record Number) <span className="text-red-500">*</span>
              </label>
              <input
                id="clientId"
                type="text"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Enter your MRN (e.g., MRN-123456)"
              />
              <p className="mt-1 text-xs text-gray-500">
                {isActivationFlow
                  ? 'Enter the MRN provided in your invitation email'
                  : 'Your therapist will provide you with your MRN'}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                readOnly={isActivationFlow && !!invitationEmail}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  isActivationFlow && invitationEmail ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="you@example.com"
              />
              {isActivationFlow && invitationEmail && (
                <p className="mt-1 text-xs text-gray-500">
                  Email is pre-filled from your invitation
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="At least 8 characters"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? (isActivationFlow ? 'Activating Account...' : 'Creating Account...')
                : (isActivationFlow ? 'Activate Account' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/portal/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Sign In
              </Link>
            </p>
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
