import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import VideoControls from '../../components/Telehealth/VideoControls';
import WaitingRoom from '../../components/Telehealth/WaitingRoom';
import EmergencyModal from '../../components/Telehealth/EmergencyModal';
import SessionSummaryModal from '../../components/Telehealth/SessionSummaryModal';
import SessionTimer from '../../components/Telehealth/SessionTimer';
import SpeakingIndicator from '../../components/Telehealth/SpeakingIndicator';
import ReactionSystem from '../../components/Telehealth/ReactionSystem';
import ChatPanel from '../../components/Telehealth/ChatPanel';
import QuickNotesPanel from '../../components/Telehealth/QuickNotesPanel';
import SessionActivityFeed from '../../components/Telehealth/SessionActivityFeed';
import FloatingControlBar from '../../components/Telehealth/FloatingControlBar';
import PictureInPictureController, { PiPMode } from '../../components/Telehealth/PictureInPictureController';
import FloatingPiPWindow from '../../components/Telehealth/FloatingPiPWindow';
import WhiteboardTool from '../../components/Telehealth/WhiteboardTool';
import BackgroundEffectsPanel from '../../components/Telehealth/BackgroundEffectsPanel';
import { TranscriptionPanel } from '../../components/Telehealth/TranscriptionPanel';
import RecordingConsentDialog from '../../components/Telehealth/RecordingConsentDialog';
import RecordingPlayback from '../../components/Telehealth/RecordingPlayback';
import { io, Socket } from 'socket.io-client';

// Import Twilio Video SDK - ensure it's available globally
// Using a more resilient loading approach that doesn't break other components
let Video: any = null;
let twilioLoadError: Error | null = null;

const loadTwilioSDK = async () => {
  if (typeof window === 'undefined') return;

  // Try to load from window first (if loaded via script tag)
  Video = (window as any).Twilio?.Video;
  if (Video) {
    console.log('✅ Twilio Video SDK already available on window');
    return;
  }

  // If not available, try dynamic import
  try {
    const module = await import('twilio-video');
    Video = module;
    // Also expose on window for compatibility
    if (!(window as any).Twilio) {
      (window as any).Twilio = {};
    }
    (window as any).Twilio.Video = module;
    console.log('✅ Twilio Video SDK loaded via import');
  } catch (error) {
    twilioLoadError = error as Error;
    // Log but don't throw - this shouldn't break other parts of the app
    console.warn('Twilio Video SDK could not be loaded. Video calls will be unavailable:', error);
  }
};

// Start loading in the background - don't block the app
loadTwilioSDK();

interface VideoSessionProps {
  // Props if needed
}

const VideoSession: React.FC<VideoSessionProps> = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get user from localStorage similar to other components
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // State
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<Map<string, any>>(new Map());
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'waiting_room' | 'ready' | 'joining' | 'connected' | 'ended' | 'error'>('loading');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [hasJoinedOnce, setHasJoinedOnce] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(true); // NEW: Control waiting room display
  const [hasRecordingConsent, setHasRecordingConsent] = useState(false); // NEW: Track recording consent
  const [networkQuality, setNetworkQuality] = useState<number | null>(null); // NEW: Network quality (1-5, 5 is best)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null); // NEW: Track session start time
  const [showSessionSummary, setShowSessionSummary] = useState(false); // NEW: Show session summary modal
  const [isFullscreen, setIsFullscreen] = useState(false); // NEW: Fullscreen state
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false); // NEW: Speaker mute state
  const [pipMode, setPipMode] = useState<PiPMode>('full'); // NEW: Picture-in-Picture mode
  const [showWhiteboard, setShowWhiteboard] = useState(false); // NEW: Whiteboard visibility
  const [showBackgroundEffects, setShowBackgroundEffects] = useState(false); // NEW: Background effects panel
  const [backgroundBlurIntensity, setBackgroundBlurIntensity] = useState(0); // NEW: Background blur intensity

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
  const { data: sessionDataResponse, isLoading, refetch } = useQuery({
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

  // Extract session data from response
  const sessionData = sessionDataResponse?.data || sessionDataResponse;

  // Auto-show waiting room when session data loads (React Query v4+ pattern - onSuccess is deprecated)
  useEffect(() => {
    console.log('🔍 Session status check:', {
      hasSessionData: !!sessionDataResponse,
      currentStatus: sessionStatus,
      hasRoom: !!room,
      hasJoinedOnce,
      showWaitingRoom,
    });

    // Auto-show waiting room when session data loads (if not already joined)
    if (sessionDataResponse && !room && !hasJoinedOnce && showWaitingRoom && sessionStatus === 'loading') {
      console.log('✅ Transitioning to waiting room');
      setSessionStatus('waiting_room');
    }
  }, [sessionDataResponse, room, hasJoinedOnce, showWaitingRoom, sessionStatus]);

  // Create local tracks - NEW FUNCTION
  const createLocalTracks = useCallback(async () => {
    try {
      console.log('📹 Creating local video and audio tracks...');

      // Ensure Twilio Video is loaded
      if (!Video && (window as any).Twilio?.Video) {
        Video = (window as any).Twilio.Video;
      }

      if (!Video) {
        throw new Error('Twilio Video SDK not loaded');
      }

      const tracks = await Video.createLocalTracks({
        audio: true,
        video: { width: 1280, height: 720 }
      });

      console.log('✅ Local tracks created:', tracks.map((t: any) => t.kind));

      // Attach video track to preview container
      tracks.forEach((track: any) => {
        if (track.kind === 'video' && localVideoRef.current) {
          const element = track.attach();
          localVideoRef.current.appendChild(element);
          console.log('✅ Video track attached to preview');
        }
      });

      setLocalTracks(tracks);
      return tracks;
    } catch (error) {
      console.error('❌ Failed to create local tracks:', error);

      // Check for permission errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        toast.error('Camera/microphone access denied. Please allow permissions and try again.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('DevicesNotFoundError')) {
        toast.error('No camera or microphone found. Please connect a device and try again.');
      } else {
        toast.error('Failed to access camera/microphone. Please check your device settings.');
      }

      throw error;
    }
  }, []);

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Calling join endpoint...');
      const response = await api.post('/telehealth/sessions/join', {
        appointmentId: appointmentId, // Backend expects appointmentId
        userRole: userRole,
      });
      console.log('✅ Join response:', response.data);
      return response.data;
    },
    onSuccess: async (responseData) => {
      console.log('✅ Join successful, checking token type...', responseData);
      setHasJoinedOnce(true); // Set immediately to prevent re-triggering

      // Extract data from response (backend wraps in { success: true, data: {...} })
      const joinData = responseData?.data || responseData;
      const token = joinData?.twilioToken || joinData?.token;
      const roomName = joinData?.twilioRoomName || joinData?.roomName;

      if (!token || typeof token !== 'string') {
        console.error('❌ Invalid token received:', { token, joinData });
        toast.error('Invalid session token. Please try again.');
        setSessionStatus('error');
        return;
      }

      // DETECT MOCK TOKEN - Skip Twilio connection in development mode
      if (token.startsWith('MOCK_TOKEN_')) {
        console.warn('⚠️ Mock token detected - development mode active');
        toast.success('Development Mode: Telehealth session connected (video features disabled)', {
          duration: 5000,
        });
        setSessionStatus('connected'); // Show connected UI for testing other features
        setSessionStartTime(new Date()); // Track session start time
        // Create a mock room object for UI state
        setRoom({ name: roomName, isMock: true } as any);
        return;
      }

      // Real token - proceed with Twilio connection
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
        // STEP 1: Create local tracks first so user can see themselves
        let tracks = localTracks;
        if (tracks.length === 0) {
          console.log('📹 No local tracks exist, creating them now...');
          tracks = await createLocalTracks();
        } else {
          console.log('✅ Using existing local tracks');
        }

        console.log('🔌 Connecting to Twilio room:', roomName);

        // STEP 2: Connect to Twilio room with pre-created tracks
        const twilioRoom = await Video.connect(token, {
          name: roomName,
          tracks: tracks, // Pass the pre-created tracks
          dominantSpeaker: true,
          networkQuality: { local: 1, remote: 1 },
        });

        console.log('✅ Connected to Twilio room:', twilioRoom.name);
        setRoom(twilioRoom);
        setSessionStatus('connected');
        setSessionStartTime(new Date()); // Track session start time

        // NOTE: setupRoomHandlers will be called by useEffect once refs are ready
        // Don't call it here - refs are not yet available in DOM!

        toast.success('Connected to telehealth session');
      } catch (error) {
        console.error('❌ Failed to connect to Twilio:', error);

        // Check if it's a mock token error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Invalid Access Token')) {
          toast.error('Development mode: Twilio connection not available. Video features disabled.');
          console.warn('⚠️ Invalid token - likely development mode');
        } else if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          toast.error('Camera/microphone access denied. Please allow permissions and try again.');
        } else {
          toast.error('Failed to connect to video session. Please check your camera/microphone permissions.');
        }

        setSessionStatus('error');
        // DO NOT reset hasJoinedOnce - prevents infinite loop!
        // User must manually retry via button if needed
      }
    },
    onError: (error: any) => {
      console.error('❌ Join failed:', error);
      toast.error(error.response?.data?.message || 'Failed to join session');
      setSessionStatus('error');
      // DO NOT reset hasJoinedOnce - prevents infinite loop!
      // User must manually retry via button if needed
    },
  });

  // Extract stable mutate function and isPending state
  const joinSession = joinMutation.mutate;
  const isJoining = joinMutation.isPending;

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

    // Monitor network quality
    twilioRoom.localParticipant.on('networkQualityLevelChanged', (level: number) => {
      console.log('📡 Network quality changed:', level);
      setNetworkQuality(level);

      // Show warning if quality is poor
      if (level <= 2 && level > 0) {
        toast.error('Poor network connection. Consider switching to audio-only mode.', {
          duration: 5000,
        });
      }
    });

    // Set initial network quality
    setNetworkQuality(twilioRoom.localParticipant.networkQualityLevel || null);

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

  // Clean up Twilio session - FIXED: Use refs to avoid dependency issues
  const cleanupTwilioSession = useCallback(() => {
    console.log('🧹 Cleaning up Twilio session...');

    // Clean up local tracks (use current state)
    setLocalTracks(currentTracks => {
      currentTracks.forEach(track => {
        try {
          track.stop();
          track.detach();
        } catch (e) {
          console.warn('Error cleaning up track:', e);
        }
      });
      return [];
    });

    // Disconnect from room (use current state)
    setRoom((currentRoom: any) => {
      if (currentRoom) {
        try {
          currentRoom.disconnect();
        } catch (e) {
          console.warn('Error disconnecting room:', e);
        }
      }
      return null;
    });

    // Clear participants
    setParticipants(new Map());

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []); // Empty deps - use functional state updates instead

  // Handle waiting room completion
  const handleWaitingRoomComplete = useCallback(() => {
    console.log('✅ Waiting room complete, ready to join session');
    setShowWaitingRoom(false);
    setSessionStatus('ready');
    // User will click "Join Session" button from the ready screen
  }, []);

  // Handle recording consent
  const handleRecordingConsent = useCallback(async (consentData: any) => {
    setShowRecordingConsent(false);

    if (!consentData.consentGiven) {
      toast('Recording cancelled');
      return;
    }

    if (!sessionData?.id) {
      toast.error('Session not found');
      return;
    }

    try {
      console.log('🔴 Starting recording...');

      // Call backend to start recording
      const response = await api.post(`/telehealth/sessions/${sessionData.id}/recording/start`, {
        recordingType: 'video',
        consentObtained: true,
        consentData: consentData,
      });

      console.log('✅ Recording started:', response.data);
      setIsRecording(true);
      setHasRecordingConsent(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  }, [sessionData]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (!sessionData?.id) {
      toast.error('Session not found');
      return;
    }

    try {
      if (isRecording) {
        // Stop recording
        console.log('⏹️ Stopping recording...');

        const response = await api.post(`/telehealth/sessions/${sessionData.id}/recording/stop`);

        console.log('✅ Recording stopped:', response.data);
        setIsRecording(false);
        toast.success('Recording stopped');
      } else {
        // Show consent dialog before starting
        setShowRecordingConsent(true);
      }
    } catch (error) {
      console.error('❌ Failed to toggle recording:', error);
      toast.error('Failed to toggle recording');
    }
  }, [sessionData, isRecording]);

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

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!room || !Video) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        const screenTrack = Array.from(room.localParticipant.videoTracks.values()).find(
          (publication: any) => publication.trackName.includes('screen')
        ) as any;

        if (screenTrack && screenTrack.track) {
          await room.localParticipant.unpublishTrack(screenTrack.track);
          screenTrack.track.stop();
          toast.success('Screen sharing stopped');
        }

        // Re-enable camera
        const cameraPublication = Array.from(room.localParticipant.videoTracks.values()).find(
          (publication: any) => !publication.trackName.includes('screen')
        ) as any;
        if (cameraPublication && cameraPublication.track) {
          cameraPublication.track.enable();
        }

        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        console.log('📺 Starting screen share...');

        const screenTrack = await Video.createLocalVideoTrack({
          // @ts-ignore - Twilio accepts mediaStreamTrack
          //@ts-ignore
          ...await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            }
          }).then(stream => {
            const track = stream.getVideoTracks()[0];
            return { mediaStreamTrack: track };
          })
        });

        // Disable camera while screen sharing
        room.localParticipant.videoTracks.forEach((publication: any) => {
          if (publication.track && !publication.trackName.includes('screen')) {
            publication.track.disable();
          }
        });

        // Publish screen track
        await room.localParticipant.publishTrack(screenTrack, {
          name: 'screen-share',
          priority: 'high'
        });

        // Handle screen share ended (user clicks "Stop sharing" in browser)
        screenTrack.mediaStreamTrack.onended = () => {
          console.log('📺 Screen share ended by user');
          room.localParticipant.unpublishTrack(screenTrack);
          screenTrack.stop();
          setIsScreenSharing(false);

          // Re-enable camera
          room.localParticipant.videoTracks.forEach((publication: any) => {
            if (publication.track && !publication.trackName.includes('screen')) {
              publication.track.enable();
            }
          });

          toast('Screen sharing ended');
        };

        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('❌ Screen share error:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        toast.error('Screen sharing permission denied');
      } else if (errorMessage.includes('NotSupportedError')) {
        toast.error('Screen sharing not supported in this browser');
      } else {
        toast.error('Failed to start screen sharing');
      }
    }
  }, [room, isScreenSharing, Video]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast.success('Entered fullscreen mode');
      }).catch((err) => {
        console.error('Failed to enter fullscreen:', err);
        toast.error('Failed to enter fullscreen');
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        toast.success('Exited fullscreen mode');
      }).catch((err) => {
        console.error('Failed to exit fullscreen:', err);
        toast.error('Failed to exit fullscreen');
      });
    }
  }, []);

  // Toggle speaker mute
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerMuted(!isSpeakerMuted);

    // Mute/unmute all remote audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.muted = !isSpeakerMuted;
    });

    toast.success(isSpeakerMuted ? 'Speaker unmuted' : 'Speaker muted');
  }, [isSpeakerMuted]);

  // Handle emergency activation
  const handleEmergencyActivated = useCallback(async (data: {
    emergencyNotes: string;
    emergencyResolution: 'CONTINUED' | 'ENDED_IMMEDIATELY' | 'FALSE_ALARM';
    emergencyContactNotified: boolean;
  }) => {
    try {
      console.log('🚨 Emergency activated:', data);

      // Call backend to document emergency
      await api.post('/telehealth/sessions/emergency', {
        sessionId: sessionData?.id,
        emergencyNotes: data.emergencyNotes,
        emergencyResolution: data.emergencyResolution,
        emergencyContactNotified: data.emergencyContactNotified,
      });

      // Emit socket event for real-time notification
      if (socketRef.current) {
        socketRef.current.emit('emergency:activate', {
          sessionId: sessionData?.id,
          ...data,
          timestamp: new Date().toISOString(),
        });
      }

      toast.success('Emergency documented successfully');
    } catch (error) {
      console.error('❌ Failed to document emergency:', error);
      toast.error('Failed to document emergency');
      throw error; // Re-throw so modal can handle it
    }
  }, [sessionData]);

  // End session
  const endSession = useCallback(async () => {
    console.log('🔚 Ending session...');

    try {
      // Call the correct backend endpoint to end the session
      if (sessionData?.id) {
        await api.post('/telehealth/sessions/end', {
          sessionId: sessionData.id,
          endReason: 'User ended session',
        });
        console.log('✅ Session ended on backend');
      } else {
        console.warn('⚠️ Session ID not available, skipping backend call');
      }
    } catch (error) {
      // Log error but don't block cleanup
      console.error('❌ Failed to end session on backend:', error);
    }

    // Show session summary modal BEFORE cleaning up (so modal can render)
    setShowSessionSummary(true);

    // Clean up Twilio session AFTER showing modal
    // Note: cleanup will set status to 'ended', but modal should already be showing
    cleanupTwilioSession();
  }, [sessionData, cleanupTwilioSession]);

  // NO AUTO-JOIN - User must complete waiting room first
  // The waiting room will call handleWaitingRoomComplete when ready

  // Set up room handlers after room is connected AND refs are ready
  useEffect(() => {
    if (!room || !localVideoRef.current || !remoteVideoRef.current) {
      return;
    }

    console.log('🎥 Setting up room handlers (refs are ready)...');
    setupRoomHandlers(room);

    // Note: No cleanup needed - setupRoomHandlers only attaches event listeners
    // The room cleanup happens in cleanupTwilioSession
  }, [room]); // Run when room changes and refs are available

  // Re-attach local video tracks when PiP mode changes
  // This fixes the issue where video disappears when switching between modes
  useEffect(() => {
    if (!room || !localVideoRef.current) {
      return;
    }

    console.log('🔄 Re-attaching local video tracks for PiP mode:', pipMode);

    // Clear existing video elements from the container
    const container = localVideoRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Re-attach all local video tracks to the new container
    room.localParticipant.videoTracks.forEach((publication: any) => {
      if (publication.track) {
        const element = publication.track.attach();
        container.appendChild(element);
        console.log('✅ Re-attached local video track to new container');
      }
    });
  }, [pipMode, room]); // Run when PiP mode changes

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

  // Cleanup on unmount - FIXED: Only run on unmount, not every render
  useEffect(() => {
    return () => {
      cleanupTwilioSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = only run on mount/unmount

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

  // WAITING ROOM - Show before joining session
  if (sessionStatus === 'waiting_room' && showWaitingRoom && appointmentId) {
    return (
      <WaitingRoom
        appointmentId={appointmentId}
        onSessionStart={handleWaitingRoomComplete}
      />
    );
  }

  // READY TO JOIN - After waiting room completion
  if (sessionStatus === 'ready' && sessionData && !room && !isJoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center border-2 border-green-200">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Tech Check Complete!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Your camera and microphone are ready. Click below to join the session.
          </p>

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
              onClick={() => joinSession()}
              disabled={isJoining}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 'Join Telehealth Session'}
            </button>

            <button
              onClick={() => {
                setShowWaitingRoom(true);
                setSessionStatus('waiting_room');
              }}
              className="w-full px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition-all"
            >
              Back to Waiting Room
            </button>

            <button
              onClick={() => navigate('/appointments')}
              className="w-full px-8 py-3 text-gray-600 hover:text-gray-800 font-semibold transition-all"
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
          {/* Full Screen Mode */}
          {pipMode === 'full' && (
            <>
              {/* Remote video (main view) with speaking indicator */}
              <SpeakingIndicator
                participant={Array.from(participants.values())[0]}
                label={`${sessionData?.appointment?.client?.firstName || 'Participant'} Speaking`}
                className="w-full h-full"
              >
                <div ref={remoteVideoRef} className="w-full h-full bg-gray-800">
                  {participants.size === 0 && (
                    <div className="flex items-center justify-center h-full text-white text-xl">
                      Waiting for other participant to join...
                    </div>
                  )}
                </div>
              </SpeakingIndicator>

              {/* Local video (picture-in-picture) with speaking indicator */}
              <SpeakingIndicator
                participant={room?.localParticipant}
                label="You're Speaking"
                className="absolute top-4 right-4 w-64 h-48 z-30"
              >
                <div
                  ref={localVideoRef}
                  className="w-64 h-48 bg-gray-700 rounded-lg shadow-2xl border-2 border-gray-600"
                  style={{ filter: `blur(${backgroundBlurIntensity}px)` }}
                />
              </SpeakingIndicator>
            </>
          )}

          {/* Side-by-Side Mode */}
          {pipMode === 'side-by-side' && (
            <div className="flex h-full gap-4 p-4 pt-20 pb-32">
              {/* Remote video */}
              <div className="flex-1">
                <SpeakingIndicator
                  participant={Array.from(participants.values())[0]}
                  label={`${sessionData?.appointment?.client?.firstName || 'Participant'} Speaking`}
                  className="w-full h-full"
                >
                  <div ref={remoteVideoRef} className="w-full h-full bg-gray-800 rounded-lg">
                    {participants.size === 0 && (
                      <div className="flex items-center justify-center h-full text-white text-xl">
                        Waiting for other participant...
                      </div>
                    )}
                  </div>
                </SpeakingIndicator>
              </div>

              {/* Local video */}
              <div className="flex-1">
                <SpeakingIndicator
                  participant={room?.localParticipant}
                  label="You're Speaking"
                  className="w-full h-full"
                >
                  <div
                    ref={localVideoRef}
                    className="w-full h-full bg-gray-700 rounded-lg"
                    style={{ filter: `blur(${backgroundBlurIntensity}px)` }}
                  />
                </SpeakingIndicator>
              </div>
            </div>
          )}

          {/* Grid Mode */}
          {pipMode === 'grid' && (
            <div className="grid grid-cols-2 gap-4 p-4 pt-20 pb-32 h-full">
              {/* Remote video */}
              <div className="w-full h-full">
                <SpeakingIndicator
                  participant={Array.from(participants.values())[0]}
                  label={`${sessionData?.appointment?.client?.firstName || 'Participant'} Speaking`}
                  className="w-full h-full"
                >
                  <div ref={remoteVideoRef} className="w-full h-full bg-gray-800 rounded-lg">
                    {participants.size === 0 && (
                      <div className="flex items-center justify-center h-full text-white text-xl">
                        Waiting for other participant...
                      </div>
                    )}
                  </div>
                </SpeakingIndicator>
              </div>

              {/* Local video */}
              <div className="w-full h-full">
                <SpeakingIndicator
                  participant={room?.localParticipant}
                  label="You're Speaking"
                  className="w-full h-full"
                >
                  <div
                    ref={localVideoRef}
                    className="w-full h-full bg-gray-700 rounded-lg"
                    style={{ filter: `blur(${backgroundBlurIntensity}px)` }}
                  />
                </SpeakingIndicator>
              </div>
            </div>
          )}

          {/* Floating PiP Mode */}
          {pipMode === 'floating' && (
            <>
              {/* Remote video (main view) */}
              <SpeakingIndicator
                participant={Array.from(participants.values())[0]}
                label={`${sessionData?.appointment?.client?.firstName || 'Participant'} Speaking`}
                className="w-full h-full"
              >
                <div ref={remoteVideoRef} className="w-full h-full bg-gray-800">
                  {participants.size === 0 && (
                    <div className="flex items-center justify-center h-full text-white text-xl">
                      Waiting for other participant to join...
                    </div>
                  )}
                </div>
              </SpeakingIndicator>

              {/* Local video in draggable floating window */}
              <FloatingPiPWindow
                title="You"
                onClose={() => setPipMode('full')}
              >
                <div
                  ref={localVideoRef}
                  className="w-full h-full bg-gray-700"
                  style={{ filter: `blur(${backgroundBlurIntensity}px)` }}
                />
              </FloatingPiPWindow>
            </>
          )}

          {/* PiP Mode Controller */}
          <div className="fixed bottom-24 right-24 z-50">
            <PictureInPictureController
              currentMode={pipMode}
              onModeChange={setPipMode}
            />
          </div>

          {/* Whiteboard Button */}
          <button
            onClick={() => setShowWhiteboard(true)}
            className="fixed bottom-24 left-24 p-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-200 z-40 group"
            title="Open Whiteboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Whiteboard
            </span>
          </button>

          {/* Live Captions/Transcription Button */}
          <button
            onClick={() => setShowTranscription(!showTranscription)}
            className={`fixed bottom-24 left-40 p-3 rounded-full shadow-lg transition-all duration-200 z-40 group ${
              showTranscription
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Toggle Live Captions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Live Captions
            </span>
          </button>

          {/* Background Effects Button */}
          <button
            onClick={() => setShowBackgroundEffects(true)}
            className={`fixed bottom-24 left-56 p-3 rounded-full shadow-lg transition-all duration-200 z-40 group ${
              backgroundBlurIntensity > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Background Effects"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Background Effects
            </span>
          </button>

          {/* Session info overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg space-y-2 z-40">
            <h3 className="text-lg font-semibold">Telehealth Session</h3>
            <p className="text-sm">Client: {sessionData?.appointment?.client?.firstName} {sessionData?.appointment?.client?.lastName}</p>
            <p className="text-sm">Clinician: {sessionData?.appointment?.clinician?.firstName} {sessionData?.appointment?.clinician?.lastName}</p>

            {/* Session Timer */}
            {sessionStartTime && (
              <div className="pt-2 border-t border-gray-600">
                <SessionTimer startTime={sessionStartTime} />
              </div>
            )}

            {/* Network Quality Indicator */}
            {networkQuality !== null && (
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-600">
                <span className="text-xs">Connection:</span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-1.5 h-3 rounded-sm ${
                        level <= networkQuality
                          ? networkQuality >= 4
                            ? 'bg-green-400'
                            : networkQuality >= 3
                            ? 'bg-yellow-400'
                            : 'bg-red-400'
                          : 'bg-gray-600'
                      }`}
                      style={{ height: `${level * 4}px` }}
                    />
                  ))}
                  <span className={`text-xs ml-2 ${
                    networkQuality >= 4 ? 'text-green-400' :
                    networkQuality >= 3 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {networkQuality >= 4 ? 'Excellent' :
                     networkQuality >= 3 ? 'Good' :
                     networkQuality >= 2 ? 'Fair' : 'Poor'}
                  </span>
                </div>
              </div>
            )}

            {isRecording && (
              <p className="text-red-400 animate-pulse mt-2 pt-2 border-t border-gray-600">
                🔴 Recording in progress
              </p>
            )}
          </div>

          {/* Modern Floating Control Bar */}
          <FloatingControlBar
            isVideoEnabled={isVideoEnabled}
            onToggleVideo={toggleVideo}
            isAudioEnabled={isAudioEnabled}
            onToggleAudio={toggleAudio}
            isScreenSharing={isScreenSharing}
            onToggleScreenShare={toggleScreenShare}
            onEndCall={endSession}
            onEmergency={() => setShowEmergencyModal(true)}
            participantCount={participants.size + 1}
            isSpeakerMuted={isSpeakerMuted}
            onToggleSpeaker={toggleSpeaker}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />

          {/* Transcription panel */}
          {showTranscription && (
            <TranscriptionPanel
              sessionId={sessionData?.id || ''}
              onTranscriptionToggle={(enabled) => setShowTranscription(enabled)}
            />
          )}

          {/* Reaction System */}
          <ReactionSystem
            socket={socketRef.current}
            sessionId={sessionData?.id || ''}
            userName={user?.firstName || 'You'}
          />

          {/* Chat Panel */}
          <ChatPanel
            socket={socketRef.current}
            sessionId={sessionData?.id || ''}
            userName={user?.firstName || user?.email || 'You'}
          />

          {/* Quick Notes Panel (Clinician only) */}
          {userRole === 'clinician' && (
            <QuickNotesPanel
              sessionId={sessionData?.id || ''}
              clientName={`${sessionData?.appointment?.client?.firstName || ''} ${sessionData?.appointment?.client?.lastName || ''}`.trim() || 'Client'}
            />
          )}

          {/* Session Activity Feed */}
          <SessionActivityFeed
            socket={socketRef.current}
            sessionId={sessionData?.id || ''}
          />

          {/* Whiteboard Tool */}
          {showWhiteboard && (
            <WhiteboardTool
              socket={socketRef.current}
              sessionId={sessionData?.id || ''}
              onClose={() => setShowWhiteboard(false)}
            />
          )}

          {/* Background Effects Panel */}
          {showBackgroundEffects && (
            <BackgroundEffectsPanel
              onClose={() => setShowBackgroundEffects(false)}
              onApplyBlur={setBackgroundBlurIntensity}
              currentBlurIntensity={backgroundBlurIntensity}
            />
          )}
        </div>

        {/* Recording consent dialog */}
        {showRecordingConsent && sessionData && (
          <RecordingConsentDialog
            open={showRecordingConsent}
            onConsent={handleRecordingConsent}
            onClose={() => setShowRecordingConsent(false)}
            clientName={`${sessionData.appointment?.client?.firstName || ''} ${sessionData.appointment?.client?.lastName || ''}`.trim() || 'Client'}
            sessionDate={new Date()}
          />
        )}

        {/* Emergency modal */}
        {showEmergencyModal && sessionData && (
          <EmergencyModal
            open={showEmergencyModal}
            sessionId={sessionData.id}
            clientName={`${sessionData.appointment?.client?.firstName || ''} ${sessionData.appointment?.client?.lastName || ''}`.trim() || 'Client'}
            onClose={() => setShowEmergencyModal(false)}
            onEmergencyResolved={async (data) => {
              console.log('Emergency protocol resolved:', data);
              // Emit emergency event via socket
              if (socketRef.current) {
                socketRef.current.emit('emergency:activate', {
                  sessionId: sessionData.id,
                  ...data,
                  timestamp: new Date().toISOString(),
                });
              }
              setShowEmergencyModal(false);
            }}
          />
        )}

      </div>
    );
  }

  // Session Summary Modal - Render outside conditional blocks so it can show even when session ends
  if (showSessionSummary && sessionData && sessionStartTime) {
    return (
      <SessionSummaryModal
        open={showSessionSummary}
        onClose={() => {
          setShowSessionSummary(false);
          navigate('/appointments');
        }}
        sessionData={{
          id: sessionData.id,
          clientName: `${sessionData.appointment?.client?.firstName || ''} ${sessionData.appointment?.client?.lastName || ''}`.trim() || 'Client',
          startTime: sessionStartTime,
          endTime: new Date(),
          duration: Math.round((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60), // Duration in minutes
        }}
        userRole={userRole as 'clinician' | 'client'}
      />
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