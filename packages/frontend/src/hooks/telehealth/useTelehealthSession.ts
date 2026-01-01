import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

interface TelehealthSession {
  id: string;
  appointmentId: string;
  chimeMeetingId: string;
  status: 'SCHEDULED' | 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  clientInWaitingRoom: boolean;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  recordingEnabled: boolean;
  recordingConsent: boolean;
  screenSharingActive: boolean;
}

interface JoinSessionResponse {
  session: TelehealthSession;
  meeting: any;
  attendee: any;
}

export function useTelehealthSession(appointmentId: string, userRole: 'clinician' | 'client') {
  const [session, setSession] = useState<TelehealthSession | null>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [attendee, setAttendee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const joinSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{ success: boolean; data: JoinSessionResponse }>(
        `/telehealth/sessions/${appointmentId}/join`,
        { userRole }
      );

      if (response.data.success) {
        setSession(response.data.data.session);
        setMeeting(response.data.data.meeting);
        setAttendee(response.data.data.attendee);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join session');
      console.error('Failed to join telehealth session:', err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, userRole]);

  const endSession = useCallback(async () => {
    try {
      await api.post(`/telehealth/sessions/${session?.id}/end`, { endReason: 'Normal' });
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  }, [session?.id]);

  const startRecording = useCallback(async (consent: boolean) => {
    try {
      const response = await api.post(
        `/telehealth/sessions/${session?.id}/recording/start`,
        { consent }
      );

      if (response.data.success) {
        setSession((prev) => (prev ? { ...prev, recordingEnabled: true, recordingConsent: consent } : null));
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      throw err;
    }
  }, [session?.id]);

  const stopRecording = useCallback(async () => {
    try {
      await api.post(`/telehealth/sessions/${session?.id}/recording/stop`, {});

      setSession((prev) => (prev ? { ...prev, recordingEnabled: false } : null));
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }, [session?.id]);

  useEffect(() => {
    joinSession();
  }, [joinSession]);

  return {
    session,
    meeting,
    attendee,
    loading,
    error,
    endSession,
    startRecording,
    stopRecording,
  };
}
