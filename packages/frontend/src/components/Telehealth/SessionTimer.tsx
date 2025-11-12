import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SessionTimerProps {
  startTime: Date;
  className?: string;
}

export default function SessionTimer({ startTime, className = '' }: SessionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const has45MinWarning = useRef(false);
  const has50MinWarning = useRef(false);

  useEffect(() => {
    // Update timer every second
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);

      // Show warning at 45 minutes
      if (elapsed >= 45 * 60 && !has45MinWarning.current) {
        has45MinWarning.current = true;
        toast(
          (t) => (
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Session Time Notice</p>
                <p className="text-sm text-gray-600">
                  This session has been running for 45 minutes. Consider wrapping up or scheduling a follow-up.
                </p>
              </div>
            </div>
          ),
          {
            duration: 8000,
            icon: '⏰',
            style: {
              maxWidth: '500px',
            },
          }
        );
      }

      // Show warning at 50 minutes
      if (elapsed >= 50 * 60 && !has50MinWarning.current) {
        has50MinWarning.current = true;
        toast(
          (t) => (
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Session Time Alert</p>
                <p className="text-sm text-gray-600">
                  This session has been running for 50 minutes. It's recommended to conclude the session soon.
                </p>
              </div>
            </div>
          ),
          {
            duration: 10000,
            icon: '⚠️',
            style: {
              maxWidth: '500px',
            },
          }
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Format time as HH:MM:SS or MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine color based on elapsed time
  const getTimeColor = () => {
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes >= 50) return 'text-red-400';
    if (minutes >= 45) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Clock className="w-4 h-4 text-gray-400" />
      <span className="text-xs text-gray-400">Session Duration:</span>
      <span className={`text-sm font-mono font-semibold ${getTimeColor()}`}>
        {formatTime(elapsedSeconds)}
      </span>
    </div>
  );
}
