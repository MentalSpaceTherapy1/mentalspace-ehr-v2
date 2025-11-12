import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';
import VideoControls from '../../components/Telehealth/VideoControls';
import WaitingRoom from '../../components/Telehealth/WaitingRoom';
import { EmergencyModal } from '../../components/Telehealth/EmergencyModal';
import { TranscriptionPanel } from '../../components/Telehealth/TranscriptionPanel';
import RecordingConsentDialog from '../../components/Telehealth/RecordingConsentDialog';
import { RecordingPlayback } from '../../components/Telehealth/RecordingPlayback';
import { useAuth } from '../../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

// Import Twilio Video SDK - ensure it's available globally
let Video: any;
if (typeof window !== 'undefined') {
  // Try to load from window first (if loaded via script tag)
  Video = (window as any).Twilio?.Video;

  // If not available, try dynamic import
  if (!Video) {
    import('twilio-video').then((module) => {
      Video = module;
      // Also expose on window for compatibility
      if (!(window as any).Twilio) {
        (window as any).Twilio = {};
      }
      (window as any).Twilio.Video = module;
      console.log('✅ Twilio Video SDK loaded via import');
    }).catch((error) => {
      console.error('Failed to load Twilio Video SDK:', error);
    });
  } else {
    console.log('✅ Twilio Video SDK already available on window');
  }
}

interface VideoSessionProps {
  // Props if needed
}

const VideoSession: React.FC<VideoSessionProps> = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<Map<string, any>>(new Map());
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'waiting' | 'joining' | 'connected' | 'ended' | 'error'>('loading');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [hasJoinedOnce, setHasJoinedOnce] = useState(false);

  // Socket for real-time features
  const socketRef = useRef<Socket | null>(null);

  // Refs for video containers
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Determine user role
  const userRole = user?.roles?.includes('CLINICIAN') ? 'clinician' : 'client';

  // Validate appointment ID format
  const isValidAppointmentId = appointmentId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId);

  // Fetch session data - REDUCED POLLING INTERVAL
  const { data: sessionData, isLoading, refetch } = useQuery({
    queryKey: ['telehealth-session', appointmentId],
    queryFn: async () => {
      if (!isValidAppointmentId) {
        throw new Error('Invalid appointment ID format');
      }

      const response = await api.get(`/telehealth/sessions/${appointmentId}`);
      console.log('📡 Session data fetched:', response.data);
      return response.data;
    },
    enabled: !!isValidAppointmentId,
    refetchInterval: 30000, // Changed from 10s to 30s
    retry: 2,
  });

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Calling join endpoint...');
      const response = await api.post('/telehealth/sessions/join', {
        sessionId: appointmentId, // Use appointmentId as sessionId
        userRole: userRole,
      });
      console.log('✅ Join response:', response.data);
      return response.data;
    },
    onSuccess: async (data) => {
      console.log('✅ Join successful, connecting to Twilio...');
      setSessionStatus('joining');

      // Ensure Twilio Video is loaded
      if (!Video && (window as any).Twilio?.Video) {
        Video = (window as any).Twilio.Video;
      }

      if (!Video) {
        console.error('❌ Twilio Video SDK not loaded');
        toast.error('Video service not available. Please refresh the page.');
        setSessionStatus('error');
        return;
      }

      try {
        // Connect to Twilio room
        const twilioRoom = await Video.connect(data.token, {
          name: data.roomName,
          audio: true,
          video: true,
          dominantSpeaker: true,
          networkQuality: { local: 1, remote: 1 },
        });

        console.log('✅ Connected to Twilio room:', twilioRoom.name);
        setRoom(twilioRoom);
        setSessionStatus('connected');
        setHasJoinedOnce(true);

        // Set up room event handlers
        setupRoomHandlers(twilioRoom);

        // Update session status on backend
        await api.patch(`/telehealth/sessions/${sessionData?.id || appointmentId}/status`, {
          status: 'IN_SESSION',
        });

        toast.success('Connected to telehealth session');
      } catch (error) {
        console.error('❌ Failed to connect to Twilio:', error);
        toast.error('Failed to connect to video session. Please check your camera/microphone permissions.');
        setSessionStatus('error');
      }
    },
    onError: (error: any) => {
      console.error('❌ Join failed:', error);
      toast.error(error.response?.data?.message || 'Failed to join session');
      setSessionStatus('error');
    },
  });

  // Set up room event handlers
  const setupRoomHandlers = useCallback((twilioRoom: any) => {
    console.log('🎬 Setting up room handlers...');

    // Handle participant connected
    twilioRoom.on('participantConnected', (participant: any) => {
      console.log(`👤 Participant connected: ${participant.identity}`);
      setParticipants(prev => new Map(prev).set(participant.sid, participant));

      // Subscribe to participant's tracks
      participant.on('trackSubscribed', (track: any) => {
        console.log(`📹 Track subscribed: ${track.kind}`);
        attachTrack(track, remoteVideoRef.current);
      });

      participant.on('trackUnsubscribed', (track: any) => {
        console.log(`📹 Track unsubscribed: ${track.kind}`);
        detachTrack(track);
      });
    });

    // Handle participant disconnected
    twilioRoom.on('participantDisconnected', (participant: any) => {
      console.log(`👤 Participant disconnected: ${participant.identity}`);
      setParticipants(prev => {
        const updated = new Map(prev);
        updated.delete(participant.sid);
        return updated;
      });
    });

    // Handle room disconnected
    twilioRoom.on('disconnected', () => {
      console.log('🔌 Disconnected from room');
      setSessionStatus('ended');
      cleanupTwilioSession();
    });

    // Attach local tracks
    twilioRoom.localParticipant.tracks.forEach((publication: any) => {
      if (publication.track) {
        attachTrack(publication.track, localVideoRef.current);
        setLocalTracks(prev => [...prev, publication.track]);
      }
    });

    // Handle existing participants
    twilioRoom.participants.forEach((participant: any) => {
      setParticipants(prev => new Map(prev).set(participant.sid, participant));

      participant.tracks.forEach((publication: any) => {
        if (publication.track) {
          attachTrack(publication.track, remoteVideoRef.current);
        }
      });

      participant.on('trackSubscribed', (track: any) => {
        attachTrack(track, remoteVideoRef.current);
      });
    });
  }, []);

  // Attach track to container
  const attachTrack = (track: any, container: HTMLElement | null) => {
    if (!container) return;

    if (track.kind === 'video' || track.kind === 'audio') {
      const element = track.attach();
      container.appendChild(element);
    }
  };

  // Detach track
  const detachTrack = (track: any) => {
    track.detach().forEach((element: HTMLElement) => {
      element.remove();
    });
  };

  // Clean up Twilio session
  const cleanupTwilioSession = useCallback(() => {
    console.log('🧹 Cleaning up Twilio session...');

    // Clean up local tracks
    localTracks.forEach(track => {
      track.stop();
      track.detach();
    });

    // Disconnect from room
    if (room) {
      room.disconnect();
      setRoom(null);
    }

    // Clear participants
    setParticipants(new Map());
    setLocalTracks([]);

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [room, localTracks]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (!room) return;

    room.localParticipant.videoTracks.forEach((publication: any) => {
      if (publication.track) {
        if (isVideoEnabled) {
          publication.track.disable();
        } else {
          publication.track.enable();
        }
      }
    });

    setIsVideoEnabled(!isVideoEnabled);
  }, [room, isVideoEnabled]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (!room) return;

    room.localParticipant.audioTracks.forEach((publication: any) => {
      if (publication.track) {
        if (isAudioEnabled) {
          publication.track.disable();
        } else {
          publication.track.enable();
        }
      }
    });

    setIsAudioEnabled(!isAudioEnabled);
  }, [room, isAudioEnabled]);

  // End session
  const endSession = useCallback(async () => {
    console.log('🔚 Ending session...');

    try {
      // Update session status
      if (sessionData?.id) {
        await api.patch(`/telehealth/sessions/${sessionData.id}/status`, {
          status: 'COMPLETED',
        });
      }

      // Clean up
      cleanupTwilioSession();

      toast.success('Session ended');
      navigate('/appointments');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session properly');
    }
  }, [sessionData, cleanupTwilioSession, navigate]);

  // SIMPLIFIED AUTO-JOIN LOGIC
  useEffect(() => {
    // Auto-join when session data is loaded and we haven't joined yet
    if (sessionData && !hasJoinedOnce && !joinMutation.isPending && !room) {
      console.log('🎯 Auto-joining session...', {
        sessionData: !!sessionData,
        hasJoinedOnce,
        isPending: joinMutation.isPending,
        room: !!room
      });

      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        joinMutation.mutate();
      }, 500);
    }
  }, [sessionData, hasJoinedOnce, joinMutation, room]);

  // Connect to socket for real-time features
  useEffect(() => {
    if (!sessionData?.id || socketRef.current) return;

    console.log('🔌 Connecting to socket...');
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      query: {
        sessionId: sessionData.id,
        userId: user?.id,
        userRole: userRole,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    socket.on('transcription:update', (data: any) => {
      console.log('📝 Transcription update:', data);
    });

    socket.on('emergency:activated', (data: any) => {
      console.log('🚨 Emergency activated:', data);
      toast.error('Emergency protocol activated!', { duration: 10000 });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sessionData?.id, user?.id, userRole]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTwilioSession();
    };
  }, [cleanupTwilioSession]);

  // Invalid appointment ID
  if (!isValidAppointmentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center border-2 border-purple-200">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Invalid Appointment ID
          </h2>
          <p className="text-gray-600 mb-6">
            The appointment ID in the URL is not valid.
          </p>
          <button
            onClick={() => navigate('/appointments')}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg transform hover:scale-105"
          >
            Go to Appointments
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  // SIMPLIFIED JOIN BUTTON LOGIC - Show if not connected
  if (sessionData && !room && !joinMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center border-2 border-purple-200">
          <div className="text-6xl mb-6">🎥</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Ready to Join Telehealth Session
          </h2>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-bold text-gray-800 mb-3">Session Details:</h3>
            <p className="text-gray-700">
              <strong>Client:</strong> {sessionData?.appointment?.client?.firstName} {sessionData?.appointment?.client?.lastName}
            </p>
            <p className="text-gray-700">
              <strong>Clinician:</strong> {sessionData?.appointment?.clinician?.firstName} {sessionData?.appointment?.clinician?.lastName}
            </p>
            <p className="text-gray-700">
              <strong>Date:</strong> {new Date(sessionData?.appointment?.appointmentDate).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joinMutation.isPending ? 'Joining...' : 'Join Telehealth Session'}
            </button>

            <button
              onClick={() => navigate('/appointments')}
              className="w-full px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition-all"
            >
              Cancel & Return to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Joining state
  if (sessionStatus === 'joining') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Connecting to session...
          </p>
          <p className="text-gray-600 mt-2">Setting up your camera and microphone...</p>
        </div>
      </div>
    );
  }

  // Main video session UI
  if (sessionStatus === 'connected' && room) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Main video area */}
        <div className="relative h-screen">
          {/* Remote video (main view) */}
          <div ref={remoteVideoRef} className="w-full h-full bg-gray-800">
            {participants.size === 0 && (
              <div className="flex items-center justify-center h-full text-white text-xl">
                Waiting for other participant to join...
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          <div
            ref={localVideoRef}
            className="absolute top-4 right-4 w-64 h-48 bg-gray-700 rounded-lg shadow-2xl border-2 border-gray-600"
          />

          {/* Session info overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Telehealth Session</h3>
            <p>Client: {sessionData?.appointment?.client?.firstName} {sessionData?.appointment?.client?.lastName}</p>
            <p>Clinician: {sessionData?.appointment?.clinician?.firstName} {sessionData?.appointment?.clinician?.lastName}</p>
            {isRecording && (
              <p className="text-red-400 animate-pulse mt-2">
                🔴 Recording in progress
              </p>
            )}
          </div>

          {/* Controls */}
          <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onToggleScreenShare={() => {}}
            onEndCall={endSession}
            onEmergencyClick={() => setShowEmergencyModal(true)}
            onToggleTranscription={() => setShowTranscription(!showTranscription)}
            onToggleRecording={() => {}}
            hasRecordingConsent={false}
            isHost={userRole === 'clinician'}
          />

          {/* Transcription panel */}
          {showTranscription && (
            <TranscriptionPanel
              sessionId={sessionData?.id || ''}
              onClose={() => setShowTranscription(false)}
            />
          )}
        </div>

        {/* Emergency modal */}
        {showEmergencyModal && sessionData && (
          <EmergencyModal
            sessionId={sessionData.id}
            appointmentId={appointmentId || ''}
            onClose={() => setShowEmergencyModal(false)}
            onActivate={async (protocol) => {
              console.log('Emergency protocol activated:', protocol);
              // Emit emergency event via socket
              if (socketRef.current) {
                socketRef.current.emit('emergency:activate', {
                  sessionId: sessionData.id,
                  protocol,
                  timestamp: new Date().toISOString(),
                });
              }
            }}
          />
        )}
      </div>
    );
  }

  // Error state
  if (sessionStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center border-2 border-red-200">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-3xl font-bold text-red-600 mb-4">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't connect to the telehealth session. Please check your internet connection and try again.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
            >
              Retry Connection
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="w-full px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition-all"
            >
              Return to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
        <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Preparing session...
        </p>
      </div>
    </div>
  );
};

export default VideoSession;