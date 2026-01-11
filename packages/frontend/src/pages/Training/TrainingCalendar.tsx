import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  BookOpen,
  Users,
} from 'lucide-react';
import { useUpcomingTrainings, useCourses, useEnrollments, useEnrollUser, Enrollment } from '../../hooks/useTraining';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  date: number;
  fullDate: Date;
  title: string;
  type: 'due' | 'expiring' | 'completed' | 'scheduled';
  color: 'red' | 'amber' | 'green' | 'blue';
  courseId?: string;
  enrollmentId?: string;
}

export default function TrainingCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<'all' | 'due' | 'expiring' | 'scheduled'>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch data from backend
  const { data: upcomingTrainings = [], isLoading: loadingUpcoming } = useUpcomingTrainings();
  const { data: courses = [], isLoading: loadingCourses } = useCourses();
  const { data: enrollments = [], isLoading: loadingEnrollments } = useEnrollments();
  const enrollMutation = useEnrollUser();

  const types = [
    { value: 'all', label: 'All Events', color: 'indigo' },
    { value: 'due', label: 'Due Dates', color: 'red' },
    { value: 'expiring', label: 'Expiring', color: 'amber' },
    { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  ];

  const isLoading = loadingUpcoming || loadingCourses || loadingEnrollments;

  // Get calendar info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);

  // Get first day of month and days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Transform backend data into calendar events
  const trainingEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add upcoming trainings (required courses that are due)
    if (Array.isArray(upcomingTrainings)) {
      upcomingTrainings.forEach((training: any) => {
        if (training.dueDate) {
          const dueDate = new Date(training.dueDate);
          if (dueDate.getMonth() === month && dueDate.getFullYear() === year) {
            const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            events.push({
              id: training.id || `upcoming-${training.courseId}`,
              date: dueDate.getDate(),
              fullDate: dueDate,
              title: training.title || training.courseName || 'Training Due',
              type: daysUntilDue <= 7 ? 'due' : 'expiring',
              color: daysUntilDue <= 7 ? 'red' : 'amber',
              courseId: training.courseId,
            });
          }
        }
      });
    }

    // Add enrollments with scheduled dates
    if (Array.isArray(enrollments)) {
      enrollments.forEach((enrollment: Enrollment) => {
        if (enrollment.enrolledAt) {
          const enrollDate = new Date(enrollment.enrolledAt);
          if (enrollDate.getMonth() === month && enrollDate.getFullYear() === year) {
            events.push({
              id: enrollment.id,
              date: enrollDate.getDate(),
              fullDate: enrollDate,
              title: enrollment.courseName || 'Training Enrolled',
              type: enrollment.status === 'COMPLETED' ? 'completed' : 'scheduled',
              color: enrollment.status === 'COMPLETED' ? 'green' : 'blue',
              courseId: enrollment.courseId,
              enrollmentId: enrollment.id,
            });
          }
        }
        // Add completion date events
        if (enrollment.completedAt) {
          const completedDate = new Date(enrollment.completedAt);
          if (completedDate.getMonth() === month && completedDate.getFullYear() === year) {
            events.push({
              id: `completed-${enrollment.id}`,
              date: completedDate.getDate(),
              fullDate: completedDate,
              title: `${enrollment.courseName || 'Training'} Completed`,
              type: 'completed',
              color: 'green',
              courseId: enrollment.courseId,
              enrollmentId: enrollment.id,
            });
          }
        }
      });
    }

    // Add required courses that are expiring (mock CEU expiration)
    if (Array.isArray(courses)) {
      courses.filter((course: any) => course.required).forEach((course: any) => {
        // Add a mock expiration check (30 days from enrollment if not completed)
        const mockExpirationDate = new Date();
        mockExpirationDate.setDate(mockExpirationDate.getDate() + 14); // 2 weeks from now
        if (mockExpirationDate.getMonth() === month && mockExpirationDate.getFullYear() === year) {
          const isEnrolled = enrollments.some((e: Enrollment) => e.courseId === course.id);
          if (!isEnrolled) {
            events.push({
              id: `required-${course.id}`,
              date: mockExpirationDate.getDate(),
              fullDate: mockExpirationDate,
              title: `${course.title} - Required`,
              type: 'due',
              color: 'red',
              courseId: course.id,
            });
          }
        }
      });
    }

    return events;
  }, [upcomingTrainings, enrollments, courses, month, year]);

  // Filter events
  const filteredEvents = trainingEvents.filter((event) => {
    if (selectedType === 'all') return true;
    if (selectedType === 'scheduled') return event.type === 'scheduled' || event.type === 'completed';
    return event.type === selectedType;
  });

  // Handle enrollment
  const handleEnroll = async (courseId: string) => {
    try {
      // Get current user ID from localStorage or context
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;

      if (!userId) {
        toast.error('Please log in to enroll in courses');
        return;
      }

      await enrollMutation.mutateAsync({ userId, courseId });
      toast.success('Successfully enrolled in course!');
      setSelectedEvent(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll in course');
    }
  };

  // Handle navigation to course details
  const handleViewCourse = (courseId: string) => {
    navigate(`/training/courses/${courseId}`);
  };

  // Generate calendar days
  const calendarDays: Array<{
    day: number;
    isCurrentMonth: boolean;
    events: CalendarEvent[];
    isToday?: boolean;
  }> = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      events: [],
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = filteredEvents.filter((e) => e.date === day);
    calendarDays.push({
      day,
      isCurrentMonth: true,
      events: dayEvents,
      isToday:
        day === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear(),
    });
  }

  // Next month days to fill grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      events: [],
    });
  }

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">📅</span>
          Training Calendar
        </h1>
        <p className="text-gray-600 text-lg">
          View upcoming training deadlines and expiration dates
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          {/* Month Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-3 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-gray-900 min-w-[250px] text-center">
              {monthName} {year}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-3 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              onClick={goToToday}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors font-bold"
            >
              Today
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-600" />
            {types.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  selectedType === type.value
                    ? `bg-${type.color}-100 text-${type.color}-700 border-2 border-${type.color}-300`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-6 mb-8">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Training Due</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Expiring Soon</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Today</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
          <div className="bg-white rounded-xl p-8 shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-700 font-semibold">Loading training events...</p>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gradient-to-r from-indigo-600 to-purple-600">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-4 text-center text-sm font-bold text-white border-r border-indigo-500 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayData, index) => (
            <div
              key={index}
              className={`min-h-[120px] border border-gray-200 p-3 transition-all duration-200 hover:bg-indigo-50 ${
                !dayData.isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'
              } ${dayData.isToday ? 'bg-indigo-100 border-2 border-indigo-500' : ''}`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-lg font-bold ${
                    dayData.isToday
                      ? 'text-indigo-700'
                      : dayData.isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {dayData.day}
                </span>
                {dayData.isToday && (
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                    Today
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayData.events && dayData.events.length > 0 ? (
                  dayData.events.map((event, eventIndex) => (
                    <div
                      key={event.id || eventIndex}
                      onClick={() => handleEventClick(event)}
                      className={`p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 hover:shadow-md ${
                        event.color === 'red'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : event.color === 'amber'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : event.color === 'green'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {event.color === 'red' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : event.color === 'amber' ? (
                          <Clock className="w-3 h-3" />
                        ) : event.color === 'green' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <BookOpen className="w-3 h-3" />
                        )}
                        <span className="font-bold truncate">{event.title}</span>
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CalendarIcon className="w-7 h-7 text-indigo-600" />
          Upcoming Events This Month
        </h2>
        <div className="space-y-3">
          {filteredEvents.length > 0 ? (
            filteredEvents
              .sort((a, b) => a.date - b.date)
              .map((event, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all duration-200 hover:shadow-md ${
                    event.color === 'red'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
                        event.color === 'red'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <span className="text-2xl font-bold">{event.date}</span>
                      <span className="text-xs uppercase">{monthName.slice(0, 3)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {event.type === 'due' ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-700 font-semibold">
                              Training Due
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-sm text-amber-700 font-semibold">
                              Expiring Soon
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEventClick(event)}
                    className={`px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:shadow-lg ${
                      event.color === 'red'
                        ? 'bg-red-600 hover:bg-red-700'
                        : event.color === 'amber'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : event.color === 'green'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    View Details
                  </button>
                </div>
              ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No events scheduled for this month</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    selectedEvent.color === 'red'
                      ? 'bg-red-100'
                      : selectedEvent.color === 'amber'
                      ? 'bg-amber-100'
                      : selectedEvent.color === 'green'
                      ? 'bg-green-100'
                      : 'bg-blue-100'
                  }`}
                >
                  {selectedEvent.color === 'red' ? (
                    <AlertTriangle className="w-7 h-7 text-red-600" />
                  ) : selectedEvent.color === 'amber' ? (
                    <Clock className="w-7 h-7 text-amber-600" />
                  ) : selectedEvent.color === 'green' ? (
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  ) : (
                    <BookOpen className="w-7 h-7 text-blue-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEvent.type === 'due'
                      ? 'Training Due'
                      : selectedEvent.type === 'expiring'
                      ? 'Expiring Soon'
                      : selectedEvent.type === 'completed'
                      ? 'Completed'
                      : 'Scheduled'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CalendarIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900">
                    {selectedEvent.fullDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {selectedEvent.type !== 'completed' && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p
                      className={`font-semibold ${
                        selectedEvent.type === 'due'
                          ? 'text-red-600'
                          : selectedEvent.type === 'expiring'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {selectedEvent.type === 'due'
                        ? 'Action Required'
                        : selectedEvent.type === 'expiring'
                        ? 'Expires Soon'
                        : 'In Progress'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {selectedEvent.courseId && (
                <button
                  onClick={() => {
                    handleViewCourse(selectedEvent.courseId!);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold"
                >
                  <BookOpen className="w-5 h-5" />
                  View Course
                </button>
              )}

              {selectedEvent.courseId &&
                selectedEvent.type !== 'completed' &&
                !selectedEvent.enrollmentId && (
                  <button
                    onClick={() => handleEnroll(selectedEvent.courseId!)}
                    disabled={enrollMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50"
                  >
                    <Users className="w-5 h-5" />
                    {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
