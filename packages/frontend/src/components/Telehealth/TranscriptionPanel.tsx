/**
 * MentalSpace EHR - Transcription Panel Component (Module 6 Phase 2)
 *
 * Real-time AI transcription display for telehealth sessions
 * Features:
 * - Live transcript display with speaker labels
 * - Auto-scroll as new text arrives
 * - Confidence indicators
 * - Toggle visibility
 * - Export transcript
 * - Audio capture for AI transcription (STAFF ONLY)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../../lib/socket';
import api from '../../lib/api';
import {
  SessionTranscript,
  TranscriptionStatus,
  TranscriptionUpdate,
} from '../../types';
import { AudioCaptureService } from '../../services/AudioCaptureService';

interface TranscriptionPanelProps {
  sessionId: string;
  onTranscriptionToggle?: (enabled: boolean) => void;
  audioStream?: MediaStream; // Audio stream from Twilio for capture (STAFF ONLY)
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  sessionId,
  onTranscriptionToggle,
  audioStream,
}) => {
  const [transcripts, setTranscripts] = useState<SessionTranscript[]>([]);
  const [status, setStatus] = useState<TranscriptionStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCapturingAudio, setIsCapturingAudio] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCaptureRef = useRef<AudioCaptureService | null>(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, autoScroll]);

  // Load initial transcript history - only when sessionId is valid
  useEffect(() => {
    if (!sessionId || sessionId.trim() === '') {
      return; // Don't attempt API calls with empty sessionId
    }
    loadTranscriptHistory();
    loadTranscriptionStatus();
  }, [sessionId]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!sessionId || !socket) return;

    // Join transcription room
    socket.emit('transcription:join-session', { sessionId });

    // Listen for real-time transcript updates
    socket.on('transcript-update', handleTranscriptUpdate);
    socket.on('transcription:status-change', handleStatusChange);
    socket.on('transcription:error', handleTranscriptionError);

    return () => {
      if (socket) {
        socket.emit('transcription:leave-session', { sessionId });
        socket.off('transcript-update', handleTranscriptUpdate);
        socket.off('transcription:status-change', handleStatusChange);
        socket.off('transcription:error', handleTranscriptionError);
      }
    };
  }, [sessionId]);

  // Cleanup audio capture on unmount
  useEffect(() => {
    return () => {
      if (audioCaptureRef.current) {
        console.log('[TranscriptionPanel] Cleaning up audio capture on unmount');
        audioCaptureRef.current.destroy();
        audioCaptureRef.current = null;
      }
    };
  }, []);

  const handleTranscriptUpdate = (data: TranscriptionUpdate) => {
    if (data.sessionId === sessionId) {
      setTranscripts((prev) => {
        // If it's a partial result, replace the last partial
        if (data.isPartial && prev.length > 0 && prev[prev.length - 1].isPartial) {
          return [...prev.slice(0, -1), data.transcript];
        }
        // Otherwise, add new transcript
        return [...prev, data.transcript];
      });
    }
  };

  const handleStatusChange = (data: any) => {
    if (data.sessionId === sessionId) {
      setStatus(data.status);
    }
  };

  const handleTranscriptionError = (data: any) => {
    if (data.sessionId === sessionId || !data.sessionId) {
      setError(data.error || data.message);
    }
  };

  const loadTranscriptHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/telehealth/sessions/${sessionId}/transcription`, {
        params: {
          includePartial: false,
          limit: 1000,
        },
      });
      setTranscripts(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load transcript history:', err);
      setError('Failed to load transcript history');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTranscriptionStatus = async () => {
    try {
      const response = await api.get(`/telehealth/sessions/${sessionId}/transcription/status`);
      setStatus(response.data.data);
    } catch (err: any) {
      console.error('Failed to load transcription status:', err);
    }
  };

  const handleStartTranscription = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Start backend transcription service
      await api.post(`/telehealth/sessions/${sessionId}/transcription/start`);
      await loadTranscriptionStatus();

      // STAFF ONLY: Initialize and start audio capture if audioStream is available
      if (audioStream && socket) {
        console.log('[TranscriptionPanel] Initializing audio capture for AI transcription...');

        // Create new AudioCaptureService instance
        audioCaptureRef.current = new AudioCaptureService();

        // Initialize with the audio stream
        const initialized = await audioCaptureRef.current.initialize(
          audioStream,
          socket,
          sessionId
        );

        if (initialized) {
          audioCaptureRef.current.start();
          setIsCapturingAudio(true);
          console.log('[TranscriptionPanel] Audio capture started successfully');
        } else {
          console.error('[TranscriptionPanel] Failed to initialize audio capture');
          setError('Audio capture initialization failed');
        }
      } else {
        console.log('[TranscriptionPanel] No audio stream available - transcription will rely on server-side capture');
      }

      onTranscriptionToggle?.(true);
    } catch (err: any) {
      console.error('Failed to start transcription:', err);
      setError(err.response?.data?.message || 'Failed to start transcription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTranscription = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop audio capture first (STAFF ONLY)
      if (audioCaptureRef.current && isCapturingAudio) {
        console.log('[TranscriptionPanel] Stopping audio capture...');
        audioCaptureRef.current.stop();
        setIsCapturingAudio(false);
      }

      // Stop backend transcription service
      await api.post(`/telehealth/sessions/${sessionId}/transcription/stop`);
      await loadTranscriptionStatus();
      onTranscriptionToggle?.(false);
    } catch (err: any) {
      console.error('Failed to stop transcription:', err);
      setError(err.response?.data?.message || 'Failed to stop transcription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTranscript = async () => {
    try {
      const response = await api.get(`/telehealth/sessions/${sessionId}/transcription/export`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript-${sessionId}-${Date.now()}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Failed to export transcript:', err);
      setError('Failed to export transcript');
    }
  };

  const getSpeakerColor = (speaker: string): string => {
    switch (speaker) {
      case 'CLINICIAN':
        return 'text-blue-700 dark:text-blue-400';
      case 'CLIENT':
        return 'text-green-700 dark:text-green-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <span className="text-xs text-green-600">High</span>;
    } else if (confidence >= 0.7) {
      return <span className="text-xs text-yellow-600">Medium</span>;
    } else {
      return <span className="text-xs text-red-600">Low</span>;
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Show Transcript
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Transcript
          </h3>
          {status?.isActive && (
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Recording</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!status?.isActive ? (
            <button
              onClick={handleStartTranscription}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
            >
              Start
            </button>
          ) : (
            <button
              onClick={handleStopTranscription}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={handleExportTranscript}
            disabled={transcripts.length === 0}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
            title="Export transcript"
          >
            Export
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              autoScroll
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
            }`}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            {autoScroll ? 'Auto' : 'Manual'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}


      {/* Transcript Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
        style={{ maxHeight: '500px' }}
      >
        {isLoading && transcripts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading transcripts...</p>
            </div>
          </div>
        ) : transcripts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No transcript available yet</p>
          </div>
        ) : (
          <>
            {transcripts.map((transcript, index) => (
              <div
                key={transcript.id || index}
                className={`p-3 rounded-lg ${
                  transcript.isPartial
                    ? 'bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`font-semibold ${getSpeakerColor(transcript.speakerLabel)}`}>
                    {transcript.speakerLabel}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    {getConfidenceBadge(transcript.confidence)}
                    <span>{transcript.startTime.toFixed(1)}s</span>
                  </div>
                </div>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {transcript.text}
                  {transcript.isPartial && <span className="animate-pulse">...</span>}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </>
        )}
      </div>

      {/* Footer Stats */}
      {status && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Total segments: {status.transcriptCount || 0}</span>
            {status.transcriptionStatus && (
              <span className="capitalize">Status: {status.transcriptionStatus.toLowerCase()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;
