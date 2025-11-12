import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function TrainingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<'all' | 'due' | 'expiring'>('all');

  const types = [
    { value: 'all', label: 'All Events', color: 'indigo' },
    { value: 'due', label: 'Due Dates', color: 'red' },
    { value: 'expiring', label: 'Expiring', color: 'amber' },
  ];

  // Get calendar info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);

  // Get first day of month and days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Mock training events
  const trainingEvents = [
    { date: 5, title: 'Ethics Training', type: 'due', color: 'red' },
    { date: 12, title: 'HIPAA Compliance', type: 'expiring', color: 'amber' },
    { date: 18, title: 'Crisis Intervention', type: 'due', color: 'red' },
    { date: 22, title: 'Cultural Competency', type: 'expiring', color: 'amber' },
    { date: 28, title: 'Documentation Standards', type: 'due', color: 'red' },
  ];

  // Filter events
  const filteredEvents = trainingEvents.filter((event) => {
    if (selectedType === 'all') return true;
    return event.type === selectedType;
  });

  // Generate calendar days
  const calendarDays = [];

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
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Training Due</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-sm font-semibold text-gray-700">Expiring Soon</span>
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
                      key={eventIndex}
                      className={`p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 hover:shadow-md ${
                        event.color === 'red'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : event.color === 'amber'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {event.color === 'red' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : event.color === 'amber' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
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
                    className={`px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:shadow-lg ${
                      event.color === 'red'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-amber-600 hover:bg-amber-700'
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
    </div>
  );
}
