import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Video, { Room, LocalVideoTrack, LocalAudioTrack, RemoteParticipant, RemoteTrack, RemoteTrackPublication } from 'twilio-video';

interface TelehealthSession {
  id: string;
  appointmentId: string;
  chimeMeetingId: string; // Actually stores Twilio Room SID
  clinicianJoinUrl: string;
  clientJoinUrl: string;
  meetingDataJson: any;
  status: string;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
  appointment?: {
    client?: {
      firstName: string;
      lastName: string;
    };
    clinician?: {
      firstName: string;
      lastName: string;
      title: string;
    };
  };
}

export default function VideoSession() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const userRole = searchParams.get('role') || 'clinician'; // clinician or client
  const navigate = useNavigate();

  // Check if appointmentId is valid UUID
  const isValidAppointmentId = appointmentId && appointmentId !== '{appointmentId}' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId);

  const [room, setRoom] = useState<Room | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'waiting' | 'connecting' | 'connected' | 'reconnecting' | 'ended'>('loading');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [devicePermissionsGranted, setDevicePermissionsGranted] = useState(false);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const screenShareTrackRef = useRef<any>(null);

  // Fetch session details
  const { data: sessionData, isLoading, refetch } = useQuery({
    queryKey: ['telehealth-session', appointmentId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(`/telehealth/sessions/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.data as TelehealthSession;
      } catch (error: any) {
        // If session doesn't exist (404), create it automatically
        if (error.response?.status === 404) {
          console.log('Session not found, creating new session...');
          const createResponse = await axios.post(
            '/telehealth/sessions',
            { appointmentId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return createResponse.data.data as TelehealthSession;
        }
        throw error;
      }
    },
    enabled: !!isValidAppointmentId,
    refetchInterval: 10000, // Refetch every 10 seconds to check session status
  });

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/telehealth/sessions/join',
        {
          appointmentId,
          userRole,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    onSuccess: async (data) => {
      toast.success('Joining session...');
      await initializeTwilioSession(data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to join session');
      setSessionStatus('ended');
    },
  });

  // End session mutation
  const endMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      if (sessionData?.id) {
        await axios.post(
          '/telehealth/sessions/end',
          {
            sessionId: sessionData.id,
            endReason: 'Normal',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    },
    onSuccess: () => {
      toast.success('Session ended');
      cleanupTwilioSession();
      navigate('/appointments');
    },
  });

  // Request device permissions
  const requestDevicePermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting permission
      setDevicePermissionsGranted(true);
      return true;
    } catch (error) {
      console.error('Failed to get device permissions:', error);
      toast.error('Please allow camera and microphone access to join the session');
      return false;
    }
  };

  // Initialize Twilio Video session
  const initializeTwilioSession = async (joinData: any) => {
    try {
      setSessionStatus('connecting');

      // Request permissions first
      const permissionsGranted = await requestDevicePermissions();
      if (!permissionsGranted) {
        setSessionStatus('ended');
        return;
      }

      // Get Twilio token and room name from backend response
      const { twilioToken, twilioRoomName } = joinData;

      console.log('Connecting to Twilio room:', twilioRoomName);

      // Check if this is a mock session (offline mode)
      const isMockMode = twilioToken?.startsWith('MOCK_TOKEN_');

      if (isMockMode) {
        console.warn('⚠️ MOCK MODE: Twilio unavailable - using simulated video session');
        toast('Demo Mode: Twilio service unavailable', { icon: '⚠️' });

        // Create local tracks for preview
        try {
          const localVideoTrack = await Video.createLocalVideoTrack({
            width: 1280,
            height: 720,
            frameRate: 24,
          });
          const localAudioTrack = await Video.createLocalAudioTrack();

          localVideoTrackRef.current = localVideoTrack;
          localAudioTrackRef.current = localAudioTrack;

          // Attach local video to video element
          if (localVideoRef.current) {
            localVideoTrack.attach(localVideoRef.current);
          }
        } catch (error) {
          console.error('Failed to create local tracks:', error);
        }

        // Simulate connection success
        setSessionStatus('connected');
        toast.success('Connected to demo session');

        // Start session timer
        sessionStartTimeRef.current = Date.now();
        durationIntervalRef.current = setInterval(() => {
          if (sessionStartTimeRef.current) {
            setSessionDuration(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
          }
        }, 1000);

        setRemoteParticipantCount(0);
        setNetworkQuality('good');

        console.log('✅ Mock session initialized - video UI will work without remote connection');
        return;
      }

      // Create local tracks
      const localVideoTrack = await Video.createLocalVideoTrack({
        width: 1280,
        height: 720,
        frameRate: 24,
      });
      const localAudioTrack = await Video.createLocalAudioTrack();

      localVideoTrackRef.current = localVideoTrack;
      localAudioTrackRef.current = localAudioTrack;

      // Attach local video to video element
      if (localVideoRef.current) {
        localVideoTrack.attach(localVideoRef.current);
      }

      // Connect to Twilio room
      const twilioRoom = await Video.connect(twilioToken, {
        name: twilioRoomName,
        tracks: [localVideoTrack, localAudioTrack],
        networkQuality: {
          local: 1, // LocalNetworkQualityVerbosity
          remote: 1,
        },
        bandwidthProfile: {
          video: {
            mode: 'collaboration',
            maxSubscriptionBitrate: 2500000,
          },
        },
        maxAudioBitrate: 16000,
        preferredVideoCodecs: ['VP8'],
      });

      setRoom(twilioRoom);
      setSessionStatus('connected');
      toast.success('Connected to session');

      // Start session timer
      sessionStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (sessionStartTimeRef.current) {
          setSessionDuration(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
        }
      }, 1000);

      // Handle existing remote participants
      twilioRoom.participants.forEach(handleParticipantConnected);
      setRemoteParticipantCount(twilioRoom.participants.size);

      // Set up event listeners
      twilioRoom.on('participantConnected', (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        handleParticipantConnected(participant);
        setRemoteParticipantCount(twilioRoom.participants.size);
        toast.success(`${participant.identity} joined the session`);
      });

      twilioRoom.on('participantDisconnected', (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        handleParticipantDisconnected(participant);
        setRemoteParticipantCount(twilioRoom.participants.size);
        toast(`${participant.identity} left the session`, { icon: 'ℹ️' });
      });

      twilioRoom.on('reconnecting', (error: any) => {
        console.log('Reconnecting to room...', error);
        setSessionStatus('reconnecting');
        toast('Connection lost. Trying to reconnect...', { icon: '⚠️' });
      });

      twilioRoom.on('reconnected', () => {
        console.log('Reconnected to room');
        setSessionStatus('connected');
        toast.success('Reconnected to session');
      });

      twilioRoom.on('disconnected', (room: Room, error: any) => {
        console.log('Disconnected from room', error);
        setSessionStatus('ended');
        if (error) {
          toast.error('Disconnected from session');
        } else {
          toast('Session has ended', { icon: 'ℹ️' });
        }
        cleanupTwilioSession();
      });

      // Monitor network quality
      twilioRoom.localParticipant.on('networkQualityLevelChanged', (networkQualityLevel: number) => {
        console.log('Network quality:', networkQualityLevel);
        if (networkQualityLevel >= 4) {
          setNetworkQuality('good');
        } else if (networkQualityLevel >= 2) {
          setNetworkQuality('fair');
        } else {
          setNetworkQuality('poor');
        }
      });

      console.log('Successfully connected to Twilio room');
    } catch (error: any) {
      console.error('Failed to initialize Twilio session:', error);
      toast.error(error.message || 'Failed to connect to session');
      setSessionStatus('ended');
    }
  };

  // Handle remote participant connected
  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('Setting up tracks for participant:', participant.identity);

    // Handle existing tracks
    participant.tracks.forEach((publication: RemoteTrackPublication) => {
      if (publication.track) {
        handleTrackSubscribed(publication.track);
      }
    });

    // Handle new tracks
    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
  };

  // Handle remote participant disconnected
  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Cleaning up tracks for participant:', participant.identity);
    participant.removeAllListeners();
  };

  // Handle track subscribed
  const handleTrackSubscribed = (track: RemoteTrack) => {
    console.log('Track subscribed:', track.kind, track.name);

    if (track.kind === 'video') {
      // Check if this is a screen share track
      if (track.name.includes('screen')) {
        if (screenShareRef.current) {
          track.attach(screenShareRef.current);
          setIsScreenSharing(true);
        }
      } else {
        // Regular video track
        if (remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
      }
    } else if (track.kind === 'audio') {
      // Attach audio track (will play automatically)
      track.attach();
    }
  };

  // Handle track unsubscribed
  const handleTrackUnsubscribed = (track: RemoteTrack) => {
    console.log('Track unsubscribed:', track.kind);
    track.detach();

    if (track.kind === 'video' && track.name.includes('screen')) {
      setIsScreenSharing(false);
    }
  };

  // Cleanup Twilio session
  const cleanupTwilioSession = useCallback(() => {
    console.log('Cleaning up Twilio session');

    // Stop screen sharing if active
    if (screenShareTrackRef.current) {
      screenShareTrackRef.current.stop();
      screenShareTrackRef.current = null;
    }

    // Stop local tracks
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }

    // Disconnect from room
    if (room) {
      room.disconnect();
      setRoom(null);
    }

    // Clear session timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Reset session state
    setSessionStatus('ended');
    setSessionDuration(0);
    sessionStartTimeRef.current = null;
    setRemoteParticipantCount(0);
  }, [room]);

  // Toggle audio mute
  const toggleAudio = () => {
    if (localAudioTrackRef.current) {
      if (isAudioMuted) {
        localAudioTrackRef.current.enable();
        toast.success('Microphone unmuted');
      } else {
        localAudioTrackRef.current.disable();
        toast.success('Microphone muted');
      }
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localVideoTrackRef.current) {
      if (isVideoOff) {
        localVideoTrackRef.current.enable();
        toast.success('Camera turned on');
      } else {
        localVideoTrackRef.current.disable();
        toast.success('Camera turned off');
      }
      setIsVideoOff(!isVideoOff);
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    if (room && !isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        });

        const screenTrack = stream.getVideoTracks()[0];

        // Create a Twilio LocalVideoTrack from the screen track
        const twilioScreenTrack = new Video.LocalVideoTrack(screenTrack);
        screenShareTrackRef.current = twilioScreenTrack;

        // Publish the screen share track
        await room.localParticipant.publishTrack(twilioScreenTrack);

        // Attach to local screen share element
        if (screenShareRef.current) {
          twilioScreenTrack.attach(screenShareRef.current);
        }

        setIsScreenSharing(true);
        toast.success('Screen sharing started');

        // Handle when user stops sharing via browser UI
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (error) {
        console.error('Failed to start screen share:', error);
        toast.error('Failed to share screen');
      }
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    if (room && screenShareTrackRef.current) {
      // Unpublish the screen share track
      room.localParticipant.unpublishTrack(screenShareTrackRef.current);

      // Stop the track
      screenShareTrackRef.current.stop();
      screenShareTrackRef.current = null;

      setIsScreenSharing(false);
      toast.success('Screen sharing stopped');
    }
  };

  // End session handler
  const handleEndSession = () => {
    if (confirm('Are you sure you want to end this session?')) {
      endMutation.mutate();
    }
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-join when component mounts
  useEffect(() => {
    if (appointmentId && !isLoading && sessionData && !room) {
      // Check if we're in waiting room
      if (sessionData.status === 'WAITING_ROOM' && userRole === 'client') {
        setSessionStatus('waiting');
        toast('Please wait for the clinician to start the session...', { icon: '⏳' });
      } else {
        joinMutation.mutate();
      }
    }
  }, [appointmentId, sessionData, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTwilioSession();
    };
  }, [cleanupTwilioSession]);

  // Invalid appointment ID
  if (!isValidAppointmentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Invalid Appointment ID</h2>
          <p className="text-gray-600 mb-4">
            The appointment ID in the URL is not valid. You cannot access telehealth sessions directly by typing the URL.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-bold text-gray-800 mb-3">How to start a telehealth session:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Go to the <strong>Appointments</strong> page</li>
              <li>Find an appointment with status <strong>Confirmed</strong>, <strong>Checked In</strong>, or <strong>In Session</strong></li>
              <li>Click the <strong>"Start Video Session"</strong> button</li>
            </ol>
          </div>
          <button
            onClick={() => navigate('/appointments')}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
          >
            Go to Appointments
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading session...</p>
        </div>
      </div>
    );
  }

  // Waiting room UI for client
  if (sessionStatus === 'waiting' as const) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md text-center">
          <div className="text-6xl mb-6">⏳</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Waiting Room</h2>
          <p className="text-gray-600 mb-6">
            Please wait while the clinician prepares for your session. You'll be admitted shortly.
          </p>
          <div className="animate-pulse flex justify-center space-x-2">
            <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animation-delay-200"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animation-delay-400"></div>
          </div>
          <button
            onClick={() => navigate('/appointments')}
            className="mt-8 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
          >
            Cancel & Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-xl font-bold">Telehealth Session</h1>
            <p className="text-sm opacity-90">
              {sessionData?.appointment?.client?.firstName} {sessionData?.appointment?.client?.lastName}
            </p>
          </div>
          {/* Session Timer - Always show when session has started */}
          {(sessionStatus === 'connected' || sessionStatus === 'reconnecting') && (
            <div className="flex items-center space-x-2 text-sm bg-white bg-opacity-20 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="font-mono font-bold text-lg">{formatDuration(sessionDuration)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-6">
          {/* Network Quality Indicator */}
          {(sessionStatus === 'connected' || sessionStatus === 'reconnecting') && (
            <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className={`w-2 h-4 ${networkQuality === 'poor' ? 'bg-red-400' : 'bg-green-400'} rounded`}></div>
                <div className={`w-2 h-5 ${networkQuality === 'good' || networkQuality === 'fair' ? 'bg-green-400' : 'bg-gray-400'} rounded`}></div>
                <div className={`w-2 h-6 ${networkQuality === 'good' ? 'bg-green-400' : 'bg-gray-400'} rounded`}></div>
              </div>
              <span className="text-sm font-semibold capitalize">{networkQuality}</span>
            </div>
          )}

          {/* Status Badge - Always show */}
          <span className={`px-5 py-2 rounded-full text-base font-bold shadow-lg ${
            sessionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            sessionStatus === 'connecting' ? 'bg-yellow-500' :
            sessionStatus === 'reconnecting' ? 'bg-orange-500 animate-pulse' :
            'bg-gray-500'
          }`}>
            {sessionStatus === 'connected' ? '● Live' :
             sessionStatus === 'connecting' ? '○ Connecting...' :
             sessionStatus === 'reconnecting' ? '○ Reconnecting...' :
             sessionStatus === 'waiting' ? '⏳ Waiting...' :
             '○ Loading...'}
          </span>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-gray-900">
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          {sessionStatus === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                <p className="text-xl">Connecting...</p>
              </div>
            </div>
          )}
          {sessionStatus === 'connected' && remoteParticipantCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
              <div className="text-center text-white">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <p className="text-xl">Waiting for other participant to join...</p>
              </div>
            </div>
          )}
        </div>

        {/* Self View (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-900 rounded-lg shadow-2xl overflow-hidden border-4 border-white">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover mirror"
            autoPlay
            playsInline
            muted
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Screen Share (if active) */}
        {isScreenSharing && (
          <div className="absolute bottom-24 left-4 right-4 h-64 bg-gray-900 rounded-lg shadow-2xl overflow-hidden border-2 border-purple-500">
            <video
              ref={screenShareRef}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
            />
            <div className="absolute top-2 left-2 px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded">
              Screen Sharing
            </div>
          </div>
        )}

        {/* Participant Count */}
        {sessionStatus === 'connected' && (
          <div className="absolute bottom-24 left-4 px-4 py-2 bg-gray-800 bg-opacity-90 text-white rounded-lg flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="font-semibold">{remoteParticipantCount + 1} participant{remoteParticipantCount !== 0 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-3">
            {/* Microphone Toggle */}
            <button
              onClick={toggleAudio}
              disabled={sessionStatus !== 'connected'}
              className={`p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAudioMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                {isAudioMuted ? (
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                )}
              </svg>
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              disabled={sessionStatus !== 'connected'}
              className={`p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                isVideoOff
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                {isVideoOff ? (
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                ) : (
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                )}
              </svg>
            </button>

            {/* Screen Share Toggle */}
            {userRole === 'clinician' && (
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                disabled={sessionStatus !== 'connected'}
                className={`p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isScreenSharing
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4h14v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Center - End Call Button */}
          <button
            onClick={handleEndSession}
            disabled={sessionStatus === 'ended'}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title="End session"
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="text-white font-bold text-lg">End Session</span>
          </button>

          {/* Right Controls (Placeholder for future features) */}
          <div className="w-32"></div>
        </div>
      </div>
    </div>
  );
}
