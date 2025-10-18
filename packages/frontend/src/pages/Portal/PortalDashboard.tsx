import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface DashboardData {
  upcomingAppointments: any[];
  unreadMessages: number;
  balance: {
    currentBalance: number;
    totalCharges: number;
    totalPayments: number;
  };
  recentMoods: Array<{
    id: string;
    moodScore: number;
    entryDate: string;
    timeOfDay: string;
  }>;
  engagementStreak: {
    currentStreak: number;
    longestStreak: number;
    totalCheckIns: number;
    lastCheckInDate: string | null;
  };
  pendingTasks: {
    homework: number;
    activeGoals: number;
  };
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    // Get client info from storage
    const clientData = localStorage.getItem('portalClient');
    if (clientData) {
      setClient(JSON.parse(clientData));
    }

    // Fetch dashboard data
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('portalToken');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString; // Assuming it's already in HH:MM format
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😕';
    return '😢';
  };

  const getMoodColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    if (score >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {client?.firstName}!
        </h1>
        <p className="text-gray-600">Here's an overview of your mental health journey</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Upcoming Appointments */}
        <div
          onClick={() => navigate('/portal/appointments')}
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {dashboardData?.upcomingAppointments?.length || 0}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Upcoming Appointments</h3>
        </div>

        {/* Unread Messages */}
        <div
          onClick={() => navigate('/portal/messages')}
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {dashboardData?.unreadMessages || 0}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Unread Messages</h3>
        </div>

        {/* Balance */}
        <div
          onClick={() => navigate('/portal/billing')}
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">
              ${dashboardData?.balance?.currentBalance?.toFixed(2) || '0.00'}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Current Balance</h3>
        </div>

        {/* Engagement Streak */}
        <div
          onClick={() => navigate('/portal/mood')}
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {dashboardData?.engagementStreak?.currentStreak || 0}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Day Streak</h3>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Appointments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointments */}
          {dashboardData?.upcomingAppointments && dashboardData.upcomingAppointments.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Next Appointments</h3>
                <button
                  onClick={() => navigate('/portal/appointments')}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-4">
                {dashboardData.upcomingAppointments.slice(0, 3).map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {appointment.clinician?.firstName} {appointment.clinician?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(appointment.appointmentDate)} at {formatTime(appointment.startTime)}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/portal/appointments')}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 mb-4">No upcoming appointments</p>
                <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                  Schedule an appointment
                </button>
              </div>
            </div>
          )}

          {/* Recent Mood Tracking */}
          {dashboardData?.recentMoods && dashboardData.recentMoods.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Mood Entries</h3>
                <button
                  onClick={() => navigate('/portal/mood')}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View All →
                </button>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {dashboardData.recentMoods.slice().reverse().map((mood) => (
                  <div
                    key={mood.id}
                    className="flex-shrink-0 flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className={`text-3xl mb-1 ${getMoodColor(mood.moodScore)}`}>
                      {getMoodEmoji(mood.moodScore)}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {new Date(mood.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-gray-500">{mood.timeOfDay}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/portal/mood')}
                className="mt-4 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Log Today's Mood
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="space-y-6">
          {/* Engagement Stats */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm opacity-90">Current Streak</span>
                  <span className="text-2xl font-bold">{dashboardData?.engagementStreak?.currentStreak || 0} days</span>
                </div>
              </div>
              <div className="border-t border-white border-opacity-20 pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm opacity-90">Longest Streak</span>
                  <span className="font-semibold">{dashboardData?.engagementStreak?.longestStreak || 0} days</span>
                </div>
              </div>
              <div className="border-t border-white border-opacity-20 pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm opacity-90">Total Check-ins</span>
                  <span className="font-semibold">{dashboardData?.engagementStreak?.totalCheckIns || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Tasks */}
          {(dashboardData?.pendingTasks?.homework > 0 || dashboardData?.pendingTasks?.activeGoals > 0) && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Tasks</h3>
              <div className="space-y-3">
                {dashboardData.pendingTasks.homework > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Homework</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-600">{dashboardData.pendingTasks.homework}</span>
                  </div>
                )}
                {dashboardData.pendingTasks.activeGoals > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Active Goals</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{dashboardData.pendingTasks.activeGoals}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/portal/messages')}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Send Message</span>
              </button>
              <button
                onClick={() => navigate('/portal/mood')}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Log Mood</span>
              </button>
              <button
                onClick={() => navigate('/portal/billing')}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Make Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
