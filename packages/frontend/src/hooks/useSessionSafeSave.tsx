/**
 * useSessionSafeSave Hook
 *
 * Provides session-aware saving functionality for clinical notes that:
 * 1. Backs up data to localStorage before saving
 * 2. Detects session timeout (401 errors)
 * 3. Shows error messages for session expiration
 * 4. Allows recovery of unsaved data
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOCAL_STORAGE_PREFIX = 'mentalspace_draft_';

interface UseSessionSafeSaveOptions {
  noteType: string;
  clientId: string;
  noteId?: string;
}

interface SaveResult {
  success: boolean;
  error?: string;
  isSessionExpired?: boolean;
}

export function useSessionSafeSave({ noteType, clientId, noteId }: UseSessionSafeSaveOptions) {
  const navigate = useNavigate();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);

  // Generate unique storage key for this note
  const storageKey = `${LOCAL_STORAGE_PREFIX}${noteType}_${clientId}${noteId ? `_${noteId}` : '_new'}`;

  // Save draft to localStorage
  const backupToLocalStorage = useCallback((data: Record<string, any>) => {
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        noteType,
        clientId,
        noteId,
      };
      localStorage.setItem(storageKey, JSON.stringify(backup));
      console.log('[SessionSafeSave] Draft backed up to localStorage');
    } catch (error) {
      console.error('[SessionSafeSave] Failed to backup to localStorage:', error);
    }
  }, [storageKey, noteType, clientId, noteId]);

  // Check for recovered draft on mount
  const checkForRecoveredDraft = useCallback((): Record<string, any> | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only recover if less than 24 hours old
        const savedTime = new Date(parsed.timestamp).getTime();
        const now = Date.now();
        const hoursSince = (now - savedTime) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          return parsed.data;
        } else {
          // Clean up old drafts
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('[SessionSafeSave] Failed to check for recovered draft:', error);
    }
    return null;
  }, [storageKey]);

  // Clear localStorage backup after successful save
  const clearBackup = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log('[SessionSafeSave] Backup cleared after successful save');
    } catch (error) {
      console.error('[SessionSafeSave] Failed to clear backup:', error);
    }
  }, [storageKey]);

  // Handle API errors, especially 401 session timeout
  const handleSaveError = useCallback((error: any, formData: Record<string, any>): SaveResult => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Failed to save note';

    // Session expired - 401 Unauthorized
    if (status === 401) {
      // Backup current data before redirecting
      backupToLocalStorage(formData);

      const errorMessage = 'Your session has expired. Your draft has been saved locally. Please log in again to continue.';
      setSessionError(errorMessage);

      // Don't immediately redirect - let user see the message
      setTimeout(() => {
        navigate('/login', {
          state: {
            returnUrl: window.location.pathname,
            message: 'Session expired. Please log in to continue.',
          }
        });
      }, 3000);

      return {
        success: false,
        error: errorMessage,
        isSessionExpired: true,
      };
    }

    // Other errors
    return {
      success: false,
      error: message,
      isSessionExpired: false,
    };
  }, [backupToLocalStorage, navigate]);

  // Clear session error
  const clearSessionError = useCallback(() => {
    setSessionError(null);
  }, []);

  // Check for recovered draft on initial load
  useEffect(() => {
    const recovered = checkForRecoveredDraft();
    if (recovered) {
      setHasRecoveredDraft(true);
    }
  }, [checkForRecoveredDraft]);

  // Dismiss recovered draft notification
  const dismissRecoveredDraft = useCallback(() => {
    setHasRecoveredDraft(false);
  }, []);

  // Apply recovered draft and clear notification
  const applyRecoveredDraft = useCallback(() => {
    const recovered = checkForRecoveredDraft();
    setHasRecoveredDraft(false);
    return recovered;
  }, [checkForRecoveredDraft]);

  // Discard recovered draft
  const discardRecoveredDraft = useCallback(() => {
    clearBackup();
    setHasRecoveredDraft(false);
  }, [clearBackup]);

  return {
    // Error state
    sessionError,
    clearSessionError,

    // Backup functions
    backupToLocalStorage,
    clearBackup,
    handleSaveError,

    // Recovery functions
    hasRecoveredDraft,
    checkForRecoveredDraft,
    applyRecoveredDraft,
    discardRecoveredDraft,
    dismissRecoveredDraft,
  };
}

/**
 * SessionExpiredAlert Component
 * Displays a prominent warning when session has expired
 */
export function SessionExpiredAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6">
          <div className="flex items-center text-white">
            <svg className="w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold">Session Expired</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-4">{message}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Redirecting to login...
            </div>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RecoveredDraftAlert Component
 * Displays notification when a recovered draft is available
 */
export function RecoveredDraftAlert({
  onRecover,
  onDiscard
}: {
  onRecover: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-4 rounded-lg shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-800">Recovered Draft Found</h3>
            <p className="text-sm text-blue-700 mt-1">
              A previous unsaved draft was found. Would you like to recover it?
            </p>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={onRecover}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
          >
            Recover
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default useSessionSafeSave;
