import React, { useEffect, useState, useRef } from 'react';
import { Clock, Video, Mic, Volume2 } from 'lucide-react';
import axios from 'axios';

interface WaitingRoomProps {
  appointmentId: string;
  onSessionStart: () => void;
}

export default function WaitingRoom({ appointmentId, onSessionStart }: WaitingRoomProps) {
  const [waitingTime, setWaitingTime] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [deviceTestComplete, setDeviceTestComplete] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Poll session status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `/telehealth/sessions/${appointmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // If clinician joined, session starts
        if (response.data.data.status === 'IN_PROGRESS') {
          onSessionStart();
        }

        setWaitingTime((prev) => prev + 1);
      } catch (error) {
        console.error('Failed to check session status:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [appointmentId, onSessionStart]);

  // Test camera and microphone
  const testDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraEnabled(true);
      setMicEnabled(true);
      setDeviceTestComplete(true);
    } catch (error) {
      console.error('Failed to access devices:', error);
      alert('Please allow camera and microphone access to join the session');
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 20); // Divide by 20 since we increment every 3 seconds
    const secs = (seconds % 20) * 3;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Virtual Waiting Room</h1>
            <p className="text-blue-100">Your therapist will join shortly</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Waiting Time */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-blue-50 rounded-2xl px-8 py-4 flex items-center space-x-4">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Waiting time</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatTime(waitingTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Device Test */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Test Your Camera & Microphone
              </h3>

              {/* Video Preview */}
              <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
                {!deviceTestComplete ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={testDevices}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center space-x-3"
                    >
                      <Video className="w-6 h-6" />
                      <span>Test Camera & Microphone</span>
                    </button>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Device Status Indicators */}
                {deviceTestComplete && (
                  <div className="absolute bottom-4 left-4 flex space-x-2">
                    <div
                      className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
                        cameraEnabled ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      <Video className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        {cameraEnabled ? 'Camera OK' : 'Camera Off'}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
                        micEnabled ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      <Mic className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        {micEnabled ? 'Mic OK' : 'Mic Off'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {deviceTestComplete && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">
                        You're all set!
                      </h4>
                      <p className="text-green-700 text-sm">
                        Your camera and microphone are working properly. The session will start automatically when your therapist joins.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Tips for a better session:
                </h4>
                <ul className="space-y-2 text-blue-700 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Find a quiet, private location</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Ensure good lighting (face a window if possible)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Use headphones for better audio quality</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Close other applications to save bandwidth</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="mt-8 flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
