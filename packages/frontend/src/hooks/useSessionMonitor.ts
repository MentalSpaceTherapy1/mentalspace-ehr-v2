import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface UseSessionMonitorOptions {
  warningTime?: number; // Milliseconds before timeout to show warning (default: 2 minutes)
  sessionTimeout?: number; // Total session timeout in milliseconds (default: 20 minutes)
  enabled?: boolean; // Enable/disable monitoring (default: true)
}

interface SessionMonitorState {
  showWarning: boolean;
  secondsRemaining: number;
  isActive: boolean;
}

const DEFAULT_WARNING_TIME = 2 * 60 * 1000; // 2 minutes
const DEFAULT_SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    warningTime = DEFAULT_WARNING_TIME,
    sessionTimeout = DEFAULT_SESSION_TIMEOUT,
    enabled = true
  } = options;

  const navigate = useNavigate();
  const [state, setState] = useState<SessionMonitorState>({
    showWarning: false,
    secondsRemaining: 0,
    isActive: false
  });

  const lastActivityRef = useRef<number>(Date.now());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateActivity = useCallback(async () => {
    lastActivityRef.current = Date.now();

    // Send activity ping to backend to update session
    try {
      await api.post('/auth/session/activity');
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }

    // Reset timers
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    // Hide warning if shown
    setState(prev => ({
      ...prev,
      showWarning: false,
      secondsRemaining: 0
    }));

    // Set new warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      const secondsUntilLogout = Math.floor(warningTime / 1000);
      setState({
        showWarning: true,
        secondsRemaining: secondsUntilLogout,
        isActive: true
      });

      // Set logout timeout
      logoutTimeoutRef.current = setTimeout(() => {
        handleLogout();
      }, warningTime);
    }, sessionTimeout - warningTime);
  }, [warningTime, sessionTimeout]);

  // Extend session
  const extendSession = useCallback(async () => {
    try {
      await api.post('/auth/session/extend');
      updateActivity();
    } catch (error) {
      console.error('Failed to extend session:', error);
      handleLogout();
    }
  }, [updateActivity]);

  // Handle logout
  const handleLogout = useCallback(() => {
    // Clear all timers
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Redirect to login
    navigate('/login', {
      state: {
        message: 'Your session has expired due to inactivity. Please log in again.'
      }
    });
  }, [navigate]);

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleUserActivity = () => {
      // Throttle activity updates to avoid excessive API calls
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity > 60000) { // Update at most once per minute
        updateActivity();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Initialize monitoring
    updateActivity();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, [enabled, updateActivity]);

  // Check for existing session validity on mount
  useEffect(() => {
    if (!enabled) return;

    const checkSession = async () => {
      try {
        await api.get('/auth/session/validate');
        setState(prev => ({ ...prev, isActive: true }));
      } catch (error) {
        // Session invalid, redirect to login
        handleLogout();
      }
    };

    checkSession();
  }, [enabled, handleLogout]);

  return {
    showWarning: state.showWarning,
    secondsRemaining: state.secondsRemaining,
    isActive: state.isActive,
    extendSession,
    logout: handleLogout
  };
}
