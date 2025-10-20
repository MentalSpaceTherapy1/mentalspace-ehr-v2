import React, { useState } from 'react';
import {
  useToggleLocalMute,
  useLocalVideo,
  useContentShareState,
  useContentShareControls,
} from 'amazon-chime-sdk-component-library-react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  Circle,
  PhoneOff,
  Settings,
} from 'lucide-react';

interface VideoControlsProps {
  onEndCall: () => void;
  onStartRecording?: (consent: boolean) => Promise<void>;
  onStopRecording?: () => void;
  isRecording?: boolean;
  userRole: 'clinician' | 'client';
}

export default function VideoControls({
  onEndCall,
  onStartRecording,
  onStopRecording,
  isRecording = false,
  userRole,
}: VideoControlsProps) {
  const { muted, toggleMute } = useToggleLocalMute();
  const { isVideoEnabled, toggleVideo } = useLocalVideo();
  const { isLocalUserSharing } = useContentShareState();
  const { toggleContentShare } = useContentShareControls();
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);

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
                className={`p-4 rounded-full transition-all ${
                  muted
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Video */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${
                  !isVideoEnabled
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? (
                  <Video className="w-6 h-6 text-white" />
                ) : (
                  <VideoOff className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Screen Share */}
              <button
                onClick={() => toggleContentShare()}
                className={`p-4 rounded-full transition-all ${
                  isLocalUserSharing
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isLocalUserSharing ? 'Stop sharing' : 'Share screen'}
              >
                {isLocalUserSharing ? (
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
    </>
  );
}
