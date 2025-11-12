import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Phone,
  Settings,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Users,
  MoreVertical,
  Camera,
  AlertTriangle,
} from 'lucide-react';

interface FloatingControlBarProps {
  // Video controls
  isVideoEnabled: boolean;
  onToggleVideo: () => void;

  // Audio controls
  isAudioEnabled: boolean;
  onToggleAudio: () => void;

  // Screen share
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;

  // Call controls
  onEndCall: () => void;

  // Settings
  onOpenSettings?: () => void;

  // Emergency
  onEmergency?: () => void;

  // Participants
  participantCount?: number;
  onShowParticipants?: () => void;

  // Speaker/Output volume
  isSpeakerMuted?: boolean;
  onToggleSpeaker?: () => void;

  // Fullscreen
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;

  // Camera switch (for devices with multiple cameras)
  onSwitchCamera?: () => void;
  hasMultipleCameras?: boolean;
}

export default function FloatingControlBar({
  isVideoEnabled,
  onToggleVideo,
  isAudioEnabled,
  onToggleAudio,
  isScreenSharing,
  onToggleScreenShare,
  onEndCall,
  onOpenSettings,
  onEmergency,
  participantCount = 1,
  onShowParticipants,
  isSpeakerMuted = false,
  onToggleSpeaker,
  isFullscreen = false,
  onToggleFullscreen,
  onSwitchCamera,
  hasMultipleCameras = false,
}: FloatingControlBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlBarRef = useRef<HTMLDivElement>(null);

  // Auto-hide logic
  useEffect(() => {
    const handleMouseMove = () => {
      setIsVisible(true);

      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      // Set new timeout to hide after 3 seconds of inactivity
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setShowMoreMenu(false);
      }, 3000);
    };

    // Add mouse move listener
    window.addEventListener('mousemove', handleMouseMove);

    // Initial timeout
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Keep controls visible when hovering
  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setShowMoreMenu(false);
    }, 2000);
  };

  return (
    <>
      {/* Control Bar */}
      <div
        ref={controlBarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700 transition-all duration-300 z-50 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-2 px-6 py-4">
          {/* Video Toggle */}
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-xl transition-all duration-200 ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-4 rounded-xl transition-all duration-200 ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={onToggleScreenShare}
            className={`p-4 rounded-xl transition-all duration-200 ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? (
              <MonitorX className="w-6 h-6" />
            ) : (
              <MonitorUp className="w-6 h-6" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700" />

          {/* Participants */}
          {onShowParticipants && (
            <button
              onClick={onShowParticipants}
              className="p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200 relative"
              title="Show participants"
            >
              <Users className="w-6 h-6" />
              {participantCount > 1 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {participantCount}
                </span>
              )}
            </button>
          )}

          {/* Speaker Toggle */}
          {onToggleSpeaker && (
            <button
              onClick={onToggleSpeaker}
              className={`p-4 rounded-xl transition-all duration-200 ${
                isSpeakerMuted
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
            >
              {isSpeakerMuted ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>
          )}

          {/* More Options */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
              title="More options"
            >
              <MoreVertical className="w-6 h-6" />
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <div className="absolute bottom-16 right-0 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 py-2 min-w-[200px] animate-in fade-in zoom-in duration-200">
                {/* Settings */}
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 text-white transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </button>
                )}

                {/* Switch Camera */}
                {hasMultipleCameras && onSwitchCamera && (
                  <button
                    onClick={() => {
                      onSwitchCamera();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 text-white transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Switch Camera</span>
                  </button>
                )}

                {/* Fullscreen */}
                {onToggleFullscreen && (
                  <button
                    onClick={() => {
                      onToggleFullscreen();
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 text-white transition-colors"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize className="w-5 h-5" />
                        <span>Exit Fullscreen</span>
                      </>
                    ) : (
                      <>
                        <Maximize className="w-5 h-5" />
                        <span>Enter Fullscreen</span>
                      </>
                    )}
                  </button>
                )}

                {/* Emergency */}
                {onEmergency && (
                  <>
                    <div className="my-2 border-t border-gray-700" />
                    <button
                      onClick={() => {
                        onEmergency();
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-red-600 text-red-400 hover:text-white transition-colors"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>Emergency</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700" />

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
            title="End call"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </button>
        </div>

        {/* Indicator - Shows when hidden */}
        {!isVisible && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">
            Move mouse to show controls
          </div>
        )}
      </div>

      {/* Hint on first load */}
      {isVisible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 text-center z-40">
          <p className="text-sm text-white bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg animate-pulse">
            Controls will auto-hide after 3 seconds
          </p>
        </div>
      )}
    </>
  );
}
