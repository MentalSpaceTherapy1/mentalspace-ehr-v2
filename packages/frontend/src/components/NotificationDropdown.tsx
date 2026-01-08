/**
 * NotificationDropdown Component
 *
 * Displays a dropdown panel with user notifications from the backend.
 * Shows unread count badge and allows marking notifications as read.
 *
 * Features:
 * - Real-time notification fetching from /api/v1/notifications
 * - Unread notification badge
 * - Mark individual or all notifications as read
 * - Navigation to notification link when clicked
 * - Proper error handling without fake data
 *
 * @component
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

/**
 * Notification data structure from the API
 */
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

/**
 * NotificationDropdown - Displays user notifications in a dropdown panel
 * @returns {JSX.Element} The notification dropdown component
 */
export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  /**
   * Fetch notifications from the backend API
   * Sets error state if the fetch fails - never shows fake/demo data
   */
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data || []);
      } else {
        // API returned success: false
        setError(response.data.message || 'Failed to load notifications');
        setNotifications([]);
      }
    } catch (err: any) {
      // Handle different error scenarios appropriately
      if (err.response?.status === 401) {
        // User not authenticated - don't show error, just show empty
        setNotifications([]);
      } else if (err.response?.status === 404) {
        // Endpoint not available - show empty state, not fake data
        setNotifications([]);
        console.warn('Notifications endpoint not available');
      } else {
        // Other errors - show error message
        setError(err.response?.data?.message || 'Unable to load notifications');
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  /**
   * Handle notification click - marks as read and navigates to link
   * @param {Notification} notification - The clicked notification
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read in local state immediately for responsive UI
    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
    );

    // Call API to mark as read (fire and forget - don't block navigation)
    try {
      await api.patch(`/notifications/${notification.id}/read`);
    } catch (err) {
      // Silently fail - UI already updated, will sync on next fetch
      console.warn('Failed to mark notification as read:', err);
    }

    // Navigate if link provided
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  /**
   * Mark all notifications as read
   * Updates UI immediately and syncs with backend
   */
  const markAllRead = async () => {
    // Update UI immediately for responsiveness
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    // Call API to mark all as read
    try {
      await api.patch('/notifications/mark-all-read');
    } catch (err) {
      // Silently fail - UI already updated, will sync on next fetch
      console.warn('Failed to mark all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'note': return '📝';
      case 'message': return '💬';
      case 'insurance': return '🏥';
      case 'alert': return '⚠️';
      case 'checkin': return '✅';
      default: return '🔔';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200"
        aria-label="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs hover:underline opacity-80 hover:opacity-100"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl">⚠️</span>
                <p className="mt-2 text-sm text-red-500">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl">🔔</span>
                <p className="mt-2">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold text-gray-900 truncate ${
                          !notification.read ? 'text-indigo-600' : ''
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 ml-2"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
