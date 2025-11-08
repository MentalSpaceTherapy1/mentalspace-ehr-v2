import React, { useState, useEffect } from 'react';
import Video, { Room, LocalVideoTrack, LocalAudioTrack } from 'twilio-video';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MonitorX,
  Circle,
  PhoneOff,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import EmergencyModal from './EmergencyModal';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface VideoControlsProps {
  room: Room | null;
  localAudioTrack: LocalAudioTrack | null;
  localVideoTrack: LocalVideoTrack | null;
  sessionId?: string;
  clientName?: string;
  emergencyContact?: EmergencyContact;
  onEndCall: () => void;
  onStartRecording?: (consent: boolean) => Promise<void>;
  onStopRecording?: () => void;
  isRecording?: boolean;
  userRole: 'clinician' | 'client';
  onToggleMute?: (isMuted: boolean) => void;
  onToggleVideo?: (isVideoOff: boolean) => void;
  onToggleScreenShare?: (isSharing: boolean) => void;
  onEmergencyActivated?: (data: {
    emergencyNotes: string;
    emergencyResolution: 'CONTINUED' | 'ENDED_IMMEDIATELY' | 'FALSE_ALARM';
    emergencyContactNotified: boolean;
  }) => Promise<void>;
}

export default function VideoControls({
  room,
  localAudioTrack,
  localVideoTrack,
  sessionId,
  clientName,
  emergencyContact,
  onEndCall,
  onStartRecording,
  onStopRecording,
  isRecording = false,
  userRole,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEmergencyActivated,
}: VideoControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null);

  // Keyboard shortcut for emergency button (Ctrl+E or Cmd+E)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && userRole === 'clinician') {
        e.preventDefault();
        setShowEmergencyModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [userRole]);

  // Toggle audio mute/unmute
  const toggleMute = () => {
    if (localAudioTrack) {
      if (isMuted) {
        localAudioTrack.enable();
        setIsMuted(false);
        onToggleMute?.(false);
      } else {
        localAudioTrack.disable();
        setIsMuted(true);
        onToggleMute?.(true);
      }
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (localVideoTrack) {
      if (isVideoOff) {
        localVideoTrack.enable();
        setIsVideoOff(false);
        onToggleVideo?.(false);
      } else {
        localVideoTrack.disable();
        setIsVideoOff(true);
        onToggleVideo?.(true);
      }
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (!room) {
      console.warn('Cannot share screen: No active room');
      return;
    }

    if (isScreenSharing && screenTrack) {
      // Stop screen sharing
      try {
        room.localParticipant.unpublishTrack(screenTrack);
        screenTrack.stop();
        setScreenTrack(null);
        setIsScreenSharing(false);
        onToggleScreenShare?.(false);
      } catch (error) {
        console.error('Failed to stop screen share:', error);
      }
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        });

        const screenVideoTrack = stream.getVideoTracks()[0];
        const newScreenTrack = new Video.LocalVideoTrack(screenVideoTrack);

        await room.localParticipant.publishTrack(newScreenTrack);

        setScreenTrack(newScreenTrack);
        setIsScreenSharing(true);
        onToggleScreenShare?.(true);

        // Handle when user stops sharing via browser UI
        screenVideoTrack.onended = () => {
          if (room) {
            room.localParticipant.unpublishTrack(newScreenTrack);
          }
          newScreenTrack.stop();
          setScreenTrack(null);
          setIsScreenSharing(false);
          onToggleScreenShare?.(false);
        };
      } catch (error) {
        console.error('Failed to start screen share:', error);
      }
    }
  };

  const handleStartRecording = async () => {
    setShowRecordingConsent(true);
  };

  const handleRecordingConsent = async (consent: boolean) => {
    if (consent && onStartRecording) {
      try {
        await onStartRecording(true);
        setShowRecordingConsent(false);
      } catch (error) {
        alert('Failed to start recording');
      }
    } else {
      setShowRecordingConsent(false);
    }
  };

  const handleEmergencyResolved = async (data: {
    emergencyNotes: string;
    emergencyResolution: 'CONTINUED' | 'ENDED_IMMEDIATELY' | 'FALSE_ALARM';
    emergencyContactNotified: boolean;
  }) => {
    if (onEmergencyActivated) {
      await onEmergencyActivated(data);
    }

    // If ending immediately, trigger end call
    if (data.emergencyResolution === 'ENDED_IMMEDIATELY') {
      setTimeout(() => {
        onEndCall();
      }, 500);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 bg-opacity-95 backdrop-blur-sm border-t border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center space-x-3">
              {/* Microphone */}
              <button
                onClick={toggleMute}
                disabled={!localAudioTrack}
                className={`p-4 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMuted
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Video */}
              <button
                onClick={toggleVideo}
                disabled={!localVideoTrack}
                className={`p-4 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isVideoOff
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? (
                  <VideoOff className="w-6 h-6 text-white" />
                ) : (
                  <VideoIcon className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                disabled={!room}
                className={`p-4 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isScreenSharing
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                {isScreenSharing ? (
                  <MonitorX className="w-6 h-6 text-white" />
                ) : (
                  <MonitorUp className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

            {/* Center - Recording indicator */}
            <div className="flex items-center space-x-4">
              {isRecording && (
                <div className="flex items-center space-x-2 bg-red-600 px-4 py-2 rounded-full">
                  <Circle className="w-3 h-3 text-white fill-current animate-pulse" />
                  <span className="text-white text-sm font-semibold">Recording</span>
                </div>
              )}

              {/* Recording controls (clinician only) */}
              {userRole === 'clinician' && (
                <>
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center space-x-2 transition-all"
                    >
                      <Circle className="w-4 h-4" />
                      <span className="text-sm font-medium">Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={onStopRecording}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-all"
                    >
                      <Circle className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">Stop Recording</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center space-x-3">
              {/* Emergency Button (Clinician only) */}
              {userRole === 'clinician' && (
                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all animate-pulse hover:animate-none border-2 border-red-400"
                  title="Emergency (Ctrl+E or Cmd+E)"
                  style={{
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </button>
              )}

              {/* Settings */}
              <button
                className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
                title="Settings"
              >
                <Settings className="w-6 h-6 text-white" />
              </button>

              {/* End Call */}
              <button
                onClick={onEndCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
                title="End call"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Consent Modal */}
      {showRecordingConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Session Recording</h3>
            <p className="text-gray-700 mb-6">
              Do you have the client's consent to record this session?
              Recording without consent violates HIPAA and Georgia regulations.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleRecordingConsent(true)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
              >
                Yes, I have consent
              </button>
              <button
                onClick={() => handleRecordingConsent(false)}
                className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && userRole === 'clinician' && (
        <EmergencyModal
          open={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          clientName={clientName || 'Unknown Client'}
          sessionId={sessionId || ''}
          emergencyContact={emergencyContact}
          onEmergencyResolved={handleEmergencyResolved}
        />
      )}
    </>
  );
}
