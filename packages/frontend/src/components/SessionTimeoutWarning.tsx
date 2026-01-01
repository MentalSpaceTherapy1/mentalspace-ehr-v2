import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// Session timeout settings (should match backend)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before timeout
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

interface SessionTimeoutWarningProps {
  onLogout?: () => void;
}

export default function SessionTimeoutWarning({ onLogout }: SessionTimeoutWarningProps) {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_BEFORE_MS);
  const [extending, setExtending] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity on user interaction
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // If warning is showing and user interacts, hide it
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Handle session extension
  const handleExtendSession = async () => {
    setExtending(true);
    try {
      // Call refresh endpoint to get new tokens
      await api.post('/auth/refresh');
      lastActivityRef.current = Date.now();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
      handleLogout();
    } finally {
      setExtending(false);
    }
  };

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with local cleanup even if backend call fails
    }
    localStorage.removeItem('user');
    localStorage.removeItem('passwordExpiryWarning');
    setShowWarning(false);

    if (onLogout) {
      onLogout();
    } else {
      navigate('/login', {
        state: { message: 'Your session has expired due to inactivity. Please log in again.' }
      });
    }
  }, [navigate, onLogout]);

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeUntilTimeout = SESSION_TIMEOUT_MS - timeSinceActivity;

    // If session already expired
    if (timeUntilTimeout <= 0) {
      handleLogout();
      return;
    }

    // If within warning period and not already showing warning
    if (timeUntilTimeout <= WARNING_BEFORE_MS && !showWarning) {
      setShowWarning(true);
      setRemainingTime(timeUntilTimeout);

      // Start countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = setInterval(() => {
        const remaining = SESSION_TIMEOUT_MS - (Date.now() - lastActivityRef.current);
        if (remaining <= 0) {
          handleLogout();
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    }
  }, [showWarning, handleLogout]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Set up API interceptor to track activity
  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => {
        lastActivityRef.current = Date.now();
        return response;
      },
      (error) => {
        // Don't update activity on error to avoid keeping session alive on failed requests
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  // Set up periodic session check
  useEffect(() => {
    // Initial check
    checkSessionTimeout();

    // Set up interval
    const intervalId = setInterval(checkSessionTimeout, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [checkSessionTimeout]);

  // Clean up countdown when warning is hidden
  useEffect(() => {
    if (!showWarning && countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [showWarning]);

  // Format remaining time as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">&#9888;</span>
            <div>
              <h2 className="text-xl font-bold">Session Expiring Soon</h2>
              <p className="text-sm text-amber-100">Your session will expire due to inactivity</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {formatTime(remainingTime)}
            </div>
            <p className="text-gray-600">
              Time remaining before automatic logout
            </p>
          </div>

          <p className="text-gray-700 mb-6 text-center">
            For your security, you will be automatically logged out when the timer reaches zero.
            Click <strong>Stay Signed In</strong> to continue your session.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExtendSession}
              disabled={extending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {extending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extending...
                </span>
              ) : (
                'Stay Signed In'
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-bold"
            >
              Log Out Now
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            HIPAA requires automatic session timeout after 15 minutes of inactivity to protect patient information.
          </p>
        </div>
      </div>
    </div>
  );
}
