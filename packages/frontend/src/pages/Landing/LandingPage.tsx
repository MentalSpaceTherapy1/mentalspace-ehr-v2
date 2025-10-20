import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Calendar,
  TrendingUp,
  Shield,
  LogIn,
  ArrowRight
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: 'Telehealth Sessions',
      description: 'Secure, HIPAA-compliant video sessions from anywhere',
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      icon: Calendar,
      title: 'Easy Scheduling',
      description: 'Book and manage appointments with your therapist',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Complete assessments and monitor your mental health journey',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Your data is encrypted and secure at all times',
      gradient: 'from-emerald-600 to-green-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="MentalSpace Therapy"
                className="h-12 w-auto"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/portal/login')}
                className="px-4 py-2 border-2 border-cyan-500 text-cyan-600 rounded-lg font-semibold hover:bg-cyan-50 transition-colors duration-200 flex items-center space-x-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Client Portal</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-green-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Staff Login</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 bg-clip-text text-transparent">
              Your Mental Health Journey,
            </span>
            <br />
            <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Simplified
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto font-light">
            A modern, secure platform for mental health care.
            <br className="hidden md:block" />
            Connect with your therapist, manage appointments, and track your progress—all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <button
              onClick={() => navigate('/portal/login')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-green-500 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Access Client Portal</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 border-2 border-gray-300 bg-white text-gray-700 rounded-xl font-bold text-lg hover:border-cyan-500 hover:text-cyan-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <span>Staff Login</span>
              <LogIn className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            Why Choose MentalSpace?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-gray-800">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 my-16">
          <div className="bg-gradient-to-r from-cyan-500 to-green-500 rounded-3xl p-12 text-center shadow-2xl">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-xl text-cyan-50 mb-8">
              Access your secure portal today
            </p>
            <button
              onClick={() => navigate('/portal/login')}
              className="px-8 py-4 bg-white text-cyan-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center space-x-2 mx-auto"
            >
              <span>Client Portal Login</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-600">
            © {new Date().getFullYear()} MentalSpace Therapy. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            HIPAA Compliant • Secure • Confidential
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
