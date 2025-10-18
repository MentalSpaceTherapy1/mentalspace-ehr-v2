import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

export default function PortalForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/portal-auth/forgot-password', {
        email,
      });

      if (response.data.success) {
        setEmailSent(true);
        toast.success('Password reset instructions sent to your email');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
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

        {/* Reset Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!emailSent ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you instructions to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent password reset instructions to <strong>{email}</strong>. Please check your inbox and follow the link to reset your password.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setEmailSent(false)}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/portal/login" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
              ← Back to Sign In
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
