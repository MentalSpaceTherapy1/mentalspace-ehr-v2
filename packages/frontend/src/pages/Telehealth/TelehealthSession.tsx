import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  MeetingProvider,
  useMeetingManager,
  VideoTileGrid,
  useLocalVideo,
  useRemoteVideoTileState,
  useAudioVideo,
  ContentShare,
  useContentShareState,
} from 'amazon-chime-sdk-component-library-react';
import { MeetingSessionConfiguration } from 'amazon-chime-sdk-js';
import { useTelehealthSession } from '../../hooks/telehealth/useTelehealthSession';
import VideoControls from '../../components/Telehealth/VideoControls';
import WaitingRoom from '../../components/Telehealth/WaitingRoom';
import { Video, VideoOff, User } from 'lucide-react';

export default function TelehealthSession() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const userRole = (searchParams.get('role') as 'clinician' | 'client') || 'client';
  const navigate = useNavigate();

  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const {
    session,
    meeting,
    attendee,
    loading,
    error,
    endSession,
    startRecording,
    stopRecording,
  } = useTelehealthSession(appointmentId!, userRole);

  // Show waiting room for clients if session is in WAITING_ROOM status
  useEffect(() => {
    if (session && userRole === 'client') {
      if (session.status === 'WAITING_ROOM' || session.status === 'SCHEDULED') {
        setShowWaitingRoom(true);
      } else if (session.status === 'IN_PROGRESS') {
        setShowWaitingRoom(false);
        setSessionActive(true);
      }
    } else if (session && userRole === 'clinician') {
      // Clinician enters directly
      setShowWaitingRoom(false);
      setSessionActive(true);
    }
  }, [session, userRole]);

  const handleEndCall = async () => {
    await endSession();
    navigate(`/appointments/${appointmentId}`);
  };

  const handleSessionStart = () => {
    setShowWaitingRoom(false);
    setSessionActive(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-600 text-white p-8 rounded-2xl max-w-md">
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => navigate('/appointments')}
            className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100"
          >
            Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  if (showWaitingRoom) {
    return (
      <WaitingRoom
        appointmentId={appointmentId!}
        onSessionStart={handleSessionStart}
      />
    );
  }

  if (!meeting || !attendee || !sessionActive) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-lg">Initializing video session...</p>
      </div>
    );
  }

  return (
    <MeetingProvider>
      <VideoSessionView
        meeting={meeting}
        attendee={attendee}
        onEndCall={handleEndCall}
        startRecording={startRecording}
        stopRecording={stopRecording}
        isRecording={session?.recordingEnabled || false}
        userRole={userRole}
      />
    </MeetingProvider>
  );
}

interface VideoSessionViewProps {
  meeting: any;
  attendee: any;
  onEndCall: () => void;
  startRecording: (consent: boolean) => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  userRole: 'clinician' | 'client';
}

function VideoSessionView({
  meeting,
  attendee,
  onEndCall,
  startRecording,
  stopRecording,
  isRecording,
  userRole,
}: VideoSessionViewProps) {
  const meetingManager = useMeetingManager();
  const { isVideoEnabled } = useLocalVideo();
  const { tiles } = useRemoteVideoTileState();
  const audioVideo = useAudioVideo();
  const { isLocalUserSharing, sharingAttendeeId } = useContentShareState();
  const [joined, setJoined] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Join Chime meeting
  useEffect(() => {
    async function joinMeeting() {
      try {
        const meetingSessionConfiguration = new MeetingSessionConfiguration(
          meeting,
          attendee
        );

        await meetingManager.join(meetingSessionConfiguration);
        await meetingManager.start();
        setJoined(true);

        console.log('Successfully joined Chime meeting');
      } catch (error) {
        console.error('Failed to join meeting:', error);
      }
    }

    joinMeeting();

    return () => {
      meetingManager.leave();
    };
  }, [meeting, attendee, meetingManager]);

  // Bind local video
  useEffect(() => {
    if (audioVideo && localVideoRef.current && isVideoEnabled) {
      audioVideo.startLocalVideoTile();
    }
  }, [audioVideo, isVideoEnabled]);

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Main Video Grid */}
      <div className="absolute inset-0 pb-24">
        {sharingAttendeeId && !isLocalUserSharing ? (
          // Someone else is sharing their screen
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <ContentShare className="w-full h-full object-contain bg-black" />
            </div>
            {/* Participant videos in a row */}
            <div className="h-48 bg-gray-800 p-4 flex space-x-4 overflow-x-auto">
              {/* Local video */}
              <div className="flex-shrink-0 w-64 h-full bg-gray-700 rounded-lg overflow-hidden relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
                  <span className="text-white text-sm font-medium">You</span>
                </div>
              </div>

              {/* Remote videos */}
              {tiles.map((tileId) => (
                <div
                  key={tileId}
                  className="flex-shrink-0 w-64 h-full bg-gray-700 rounded-lg overflow-hidden relative"
                >
                  <VideoTileGrid />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Normal video grid view
          <div className="h-full p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                {isVideoEnabled ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-gray-400">Camera is off</p>
                    </div>
                  </div>
                )}

                {/* Local video label */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 px-4 py-2 rounded-lg">
                  <span className="text-white font-semibold">You</span>
                </div>

                {/* Camera off indicator */}
                {!isVideoEnabled && (
                  <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-lg flex items-center space-x-2">
                    <VideoOff className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">Camera Off</span>
                  </div>
                )}
              </div>

              {/* Remote Video(s) */}
              {tiles.length > 0 ? (
                tiles.map((tileId) => (
                  <div
                    key={tileId}
                    className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    <VideoTileGrid />
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 px-4 py-2 rounded-lg">
                      <span className="text-white font-semibold">
                        {userRole === 'clinician' ? 'Client' : 'Therapist'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-lg">
                      Waiting for {userRole === 'clinician' ? 'client' : 'therapist'}...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screen sharing indicator */}
        {isLocalUserSharing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 px-6 py-3 rounded-full shadow-lg">
            <span className="text-white font-semibold">You are sharing your screen</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <VideoControls
        onEndCall={onEndCall}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        userRole={userRole}
      />
    </div>
  );
}
