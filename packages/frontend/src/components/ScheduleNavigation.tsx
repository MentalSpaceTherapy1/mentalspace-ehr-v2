import { useNavigate, useLocation } from 'react-router-dom';

export default function ScheduleNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/appointments', label: '📅 Calendar', activeColors: 'from-purple-600 to-blue-600', inactiveColors: 'from-purple-100 to-blue-100 text-purple-700 border-purple-200' },
    { path: '/appointments/waitlist', label: '⏳ Waitlist', activeColors: 'from-amber-500 to-orange-500', inactiveColors: 'from-amber-100 to-orange-100 text-amber-700 border-amber-200' },
    { path: '/appointments/schedules', label: '🗓️ Clinician Schedules', activeColors: 'from-green-500 to-emerald-500', inactiveColors: 'from-green-100 to-emerald-100 text-green-700 border-green-200' },
    { path: '/appointments/time-off', label: '🌴 Time Off', activeColors: 'from-rose-500 to-pink-500', inactiveColors: 'from-rose-100 to-pink-100 text-rose-700 border-rose-200' },
    { path: '/settings/reminders', label: '🔔 Reminders', activeColors: 'from-indigo-500 to-purple-500', inactiveColors: 'from-indigo-100 to-purple-100 text-indigo-700 border-indigo-200' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
      <div className="flex flex-wrap gap-3 justify-center">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-6 py-2 bg-gradient-to-r ${
              isActive(item.path)
                ? `${item.activeColors} text-white`
                : item.inactiveColors + ' border-2'
            } rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
