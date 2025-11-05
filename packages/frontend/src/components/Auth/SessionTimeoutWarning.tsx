import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  onExtend: () => void;
  onLogout: () => void;
  secondsRemaining: number;
}

export default function SessionTimeoutWarning({
  isOpen,
  onExtend,
  onLogout,
  secondsRemaining
}: SessionTimeoutWarningProps) {
  const [seconds, setSeconds] = useState(secondsRemaining);

  useEffect(() => {
    setSeconds(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (!isOpen || seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, seconds, onLogout]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-300">
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <ExclamationTriangleIcon className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Session Timeout Warning
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          Your session is about to expire due to inactivity. You will be automatically logged out in:
        </p>

        {/* Countdown Timer */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center space-x-3">
            <ClockIcon className="h-8 w-8 text-orange-600" />
            <div className="text-5xl font-bold text-orange-600 font-mono">
              {formatTime(seconds)}
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            minutes:seconds
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onLogout}
            className="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Logout Now
          </button>
          <button
            onClick={onExtend}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Stay Logged In
          </button>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Click "Stay Logged In" to extend your session for another 20 minutes
        </p>
      </div>
    </div>
  );
}
