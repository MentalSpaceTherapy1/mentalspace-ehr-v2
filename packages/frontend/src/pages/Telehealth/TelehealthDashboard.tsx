import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Users, Clock, PlayCircle, Settings, Loader2, AlertCircle, Star, MessageSquare } from 'lucide-react';
import api from '../../lib/api';

interface TelehealthAppointment {
  id: string;
  clientName: string;
  time: string;
  duration: string;
  status: string;
  appointmentDate: string;
}

interface DashboardStats {
  todaySessions: number;
  totalClients: number;
  hoursThisWeek: number;
  completedSessions: number;
}

interface SessionRating {
  id: string;
  rating: number;
  comments: string | null;
  submittedAt: string;
  shareWithTherapist: boolean;
  shareWithAdmin: boolean;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  session: {
    appointment: {
      appointmentDate: string;
    };
  };
}

const TelehealthDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [upcomingSessions, setUpcomingSessions] = useState<TelehealthAppointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todaySessions: 0,
    totalClients: 0,
    hoursThisWeek: 0,
    completedSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentRatings, setRecentRatings] = useState<SessionRating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    fetchTelehealthData();
    fetchRecentRatings();
  }, []);

  const fetchTelehealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch today's appointments (filter by telehealth in frontend since backend doesn't support serviceLocation filter)
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/appointments', {
        params: {
          startDate: today,
          endDate: today,
        },
      });

      // Get all appointments and filter for telehealth + active statuses (case-insensitive)
      const allAppointments = response.data?.data || response.data?.appointments || [];
      const appointments = allAppointments.filter((apt: any) => {
        const location = apt.serviceLocation?.toLowerCase();
        const status = apt.status?.toUpperCase();
        return location === 'telehealth' && ['SCHEDULED', 'CONFIRMED'].includes(status);
      });

      // Transform appointments to display format
      const sessions: TelehealthAppointment[] = appointments.map((apt: any) => ({
        id: apt.id,
        clientName: apt.client ? `${apt.client.firstName} ${apt.client.lastName}` : 'Unknown Client',
        time: formatTime(apt.startTime),
        duration: `${apt.duration || 50} min`,
        status: apt.status,
        appointmentDate: apt.appointmentDate,
      }));

      setUpcomingSessions(sessions);

      // Calculate stats
      setStats({
        todaySessions: sessions.length,
        totalClients: new Set(appointments.map((apt: any) => apt.clientId)).size,
        hoursThisWeek: calculateWeeklyHours(appointments),
        completedSessions: appointments.filter((apt: any) => apt.status === 'completed').length,
      });
    } catch (err: any) {
      console.error('Error fetching telehealth data:', err);
      setError('Failed to load telehealth sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return '';
    try {
      // Handle time string (HH:MM:SS or HH:MM)
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const calculateWeeklyHours = (appointments: any[]): number => {
    const totalMinutes = appointments.reduce((sum, apt) => sum + (apt.duration || 50), 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  };

  const fetchRecentRatings = async () => {
    try {
      setRatingsLoading(true);
      const response = await api.get('/telehealth/admin/session-ratings', {
        params: {
          page: 1,
          limit: 5,
        },
      });

      const ratings = response.data?.data?.ratings || [];
      setRecentRatings(ratings);
    } catch (err: any) {
      console.error('Error fetching session ratings:', err);
      // Don't set error state - ratings are optional
    } finally {
      setRatingsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Telehealth</h1>
            <p className="text-gray-600">Manage your video sessions and virtual appointments</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Today's Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.todaySessions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalClients}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Hours This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.hoursThisWeek}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completedSessions}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <PlayCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Today's Telehealth Sessions</h2>
          <button
            onClick={() => navigate('/appointments')}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading sessions...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            {error}
          </div>
        ) : upcomingSessions.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No telehealth sessions scheduled for today</p>
            <button
              onClick={() => navigate('/appointments/new')}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Schedule a Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                    {session.clientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{session.clientName}</p>
                    <p className="text-sm text-gray-500">{session.time} • {session.duration}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/telehealth/session/${session.id}?role=clinician`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                >
                  <PlayCircle className="w-4 h-4" />
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/appointments/new')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-green-100 rounded-xl inline-block mb-4">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Schedule Session</h3>
          <p className="text-sm text-gray-500">Create a new telehealth appointment</p>
        </button>

        <button
          onClick={() => navigate('/settings/availability')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-purple-100 rounded-xl inline-block mb-4">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Availability</h3>
          <p className="text-sm text-gray-500">Manage your telehealth availability</p>
        </button>

        <button
          onClick={() => navigate('/clients')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-blue-100 rounded-xl inline-block mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Client List</h3>
          <p className="text-sm text-gray-500">View and manage your telehealth clients</p>
        </button>
      </div>

      {/* Recent Session Ratings */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Recent Session Ratings
          </h2>
        </div>

        {ratingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading ratings...</span>
          </div>
        ) : recentRatings.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No session ratings yet</p>
            <p className="text-sm text-gray-400 mt-1">Ratings will appear here when clients share feedback</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRatings.map((ratingItem) => (
              <div
                key={ratingItem.id}
                className="flex items-start justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {ratingItem.client.firstName[0]}{ratingItem.client.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {ratingItem.client.firstName} {ratingItem.client.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(ratingItem.rating)}
                      <span className="text-sm text-gray-500">
                        {new Date(ratingItem.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {ratingItem.comments && (
                      <div className="flex items-start gap-2 mt-2 text-sm text-gray-600">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-2">{ratingItem.comments}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TelehealthDashboard;
