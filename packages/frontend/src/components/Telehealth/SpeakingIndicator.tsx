import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';

interface SpeakingIndicatorProps {
  participant: any; // Twilio participant
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export default function SpeakingIndicator({
  participant,
  children,
  className = '',
  label,
}: SpeakingIndicatorProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!participant) return;

    let animationFrameId: number;
    let lastAudioLevel = 0;
    const SPEAKING_THRESHOLD = 0.02; // Twilio audio level threshold for "speaking"
    const DEBOUNCE_TIME = 300; // ms to keep indicator visible after speaking stops

    let speakingTimeout: NodeJS.Timeout | null = null;

    const checkAudioLevel = () => {
      // For Twilio participants
      if (participant.audioTracks) {
        participant.audioTracks.forEach((publication: any) => {
          if (publication.track && publication.track.kind === 'audio') {
            const track = publication.track;

            // Listen to audio level changes if available
            if (track.mediaStreamTrack) {
              const audioContext = new AudioContext();
              const analyser = audioContext.createAnalyser();
              const microphone = audioContext.createMediaStreamSource(
                new MediaStream([track.mediaStreamTrack])
              );
              const dataArray = new Uint8Array(analyser.frequencyBinCount);

              microphone.connect(analyser);
              analyser.fftSize = 256;

              const detectAudio = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const normalizedLevel = average / 255;

                setAudioLevel(normalizedLevel);

                if (normalizedLevel > SPEAKING_THRESHOLD) {
                  setIsSpeaking(true);
                  lastAudioLevel = normalizedLevel;

                  // Clear existing timeout
                  if (speakingTimeout) {
                    clearTimeout(speakingTimeout);
                  }

                  // Set new timeout to turn off indicator after silence
                  speakingTimeout = setTimeout(() => {
                    setIsSpeaking(false);
                  }, DEBOUNCE_TIME);
                }

                animationFrameId = requestAnimationFrame(detectAudio);
              };

              detectAudio();

              return () => {
                if (animationFrameId) {
                  cancelAnimationFrame(animationFrameId);
                }
                if (speakingTimeout) {
                  clearTimeout(speakingTimeout);
                }
                audioContext.close();
              };
            }
          }
        });
      }
    };

    checkAudioLevel();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
      }
    };
  }, [participant]);

  return (
    <div className={`relative ${className}`}>
      {/* Video content */}
      <div
        className={`relative overflow-hidden transition-all duration-200 ${
          isSpeaking
            ? 'ring-4 ring-green-400 shadow-lg shadow-green-400/50 rounded-lg'
            : 'rounded-lg'
        }`}
      >
        {children}
      </div>

      {/* Speaking indicator badge */}
      {isSpeaking && (
        <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full flex items-center space-x-1 shadow-lg animate-pulse">
          <Mic className="w-3 h-3" />
          <span className="text-xs font-semibold">
            {label || 'Speaking'}
          </span>
        </div>
      )}

      {/* Audio level indicator (visual debugging - optional) */}
      {isSpeaking && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 rounded-full p-1">
          <div className="flex items-end space-x-0.5 h-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-sm transition-all ${
                  audioLevel * 5 > i ? 'bg-green-400' : 'bg-gray-600'
                }`}
                style={{
                  height: `${Math.max(20, Math.min(100, (i + 1) * 20))}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
