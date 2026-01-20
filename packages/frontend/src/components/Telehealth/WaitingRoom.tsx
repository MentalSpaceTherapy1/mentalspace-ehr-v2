import React, { useEffect, useState, useRef } from 'react';
import { Clock, Video, Mic, Volume2, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../lib/api';
import ConsentSigningModal from './ConsentSigningModal';
import toast from 'react-hot-toast';

interface WaitingRoomProps {
  appointmentId: string;
  onSessionStart: () => void;
}

interface ConsentStatus {
  isValid: boolean;
  expirationDate: Date | null;
  daysTillExpiration: number | null;
  requiresRenewal: boolean;
  consentType: string;
  consentGiven: boolean;
}

export default function WaitingRoom({ appointmentId, onSessionStart }: WaitingRoomProps) {
  const [waitingTime, setWaitingTime] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [deviceTestComplete, setDeviceTestComplete] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Consent state
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Fetch consent status on mount
  useEffect(() => {
    const fetchConsentStatus = async () => {
      try {
        setConsentLoading(true);

        // First, get appointment to find client ID
        const appointmentResponse = await api.get(`/appointments/${appointmentId}`);
        const appointment = appointmentResponse.data.data;
        const clientIdFromAppointment = appointment.clientId;

        setClientId(clientIdFromAppointment);

        // Check consent status
        const consentResponse = await api.get(
          `/telehealth-consent/validate?clientId=${clientIdFromAppointment}`
        );

        const hasValidConsent = consentResponse.data.data.hasValidConsent;

        // Get detailed consent info
        const consentsResponse = await api.get(
          `/telehealth-consent/client/${clientIdFromAppointment}`
        );

        const consents = consentsResponse.data.data;
        const georgiaConsent = consents.find(
          (c: any) => c.consentType === 'Georgia_Telehealth' && c.isActive
        );

        if (georgiaConsent && georgiaConsent.consentGiven) {
          const expirationDate = new Date(georgiaConsent.expirationDate);
          const today = new Date();
          const daysTillExpiration = Math.ceil(
            (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          setConsentStatus({
            isValid: hasValidConsent,
            expirationDate,
            daysTillExpiration,
            requiresRenewal: daysTillExpiration <= 30,
            consentType: georgiaConsent.consentType,
            consentGiven: georgiaConsent.consentGiven,
          });
        } else {
          // No consent found or not signed
          setConsentStatus({
            isValid: false,
            expirationDate: null,
            daysTillExpiration: null,
            requiresRenewal: false,
            consentType: 'Georgia_Telehealth',
            consentGiven: false,
          });
        }

        // NOTE: Consent is optional - we just display the status, not enforce it
        // User can click the badge to sign consent if needed
      } catch (error) {
        console.error('Failed to fetch consent status:', error);
        // On error, set to invalid but don't block - consent is optional
        setConsentStatus({
          isValid: false,
          expirationDate: null,
          daysTillExpiration: null,
          requiresRenewal: false,
          consentType: 'Georgia_Telehealth',
          consentGiven: false,
        });
      } finally {
        setConsentLoading(false);
      }
    };

    fetchConsentStatus();
  }, [appointmentId]);

  // Update waiting time
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingTime((prev) => prev + 1);
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Test camera and microphone
  const testDevices = async () => {
    try {
      console.log('📹 Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log('✅ Camera and microphone access granted');
      streamRef.current = stream;

      // Don't attach here - will be attached by useEffect after video element renders
      setCameraEnabled(true);
      setMicEnabled(true);
      setDeviceTestComplete(true);
    } catch (error) {
      console.error('❌ Failed to access devices:', error);
      toast.error('Please allow camera and microphone access to join the session');
    }
  };

  // Attach stream to video element after it renders
  useEffect(() => {
    if (deviceTestComplete && streamRef.current && videoRef.current) {
      console.log('✅ Attaching stream to video element...');
      videoRef.current.srcObject = streamRef.current;
      console.log('✅ Video preview attached');
    }
  }, [deviceTestComplete]); // Run when deviceTestComplete changes

  // Handle consent signed
  const handleConsentSigned = () => {
    setShowConsentModal(false);
    // Refresh consent status
    window.location.reload();
  };

  // Handle consent decline
  const handleConsentDecline = () => {
    toast.error('Telehealth consent is required to join the session. Returning to dashboard.');
    window.location.href = '/dashboard';
  };

  // Get consent status badge
  const getConsentBadge = () => {
    if (consentLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span className="text-sm">Checking consent...</span>
        </div>
      );
    }

    if (!consentStatus) return null;

    if (consentStatus.isValid && !consentStatus.requiresRenewal) {
      return (
        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <div>
            <div className="font-medium">Consent Valid</div>
            <div className="text-xs">
              Expires {consentStatus.expirationDate?.toLocaleDateString()}
            </div>
          </div>
        </div>
      );
    }

    if (consentStatus.requiresRenewal) {
      return (
        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <div className="font-medium">Consent Expires Soon</div>
            <div className="text-xs">
              {consentStatus.daysTillExpiration} days remaining
            </div>
          </div>
        </div>
      );
    }

    if (!consentStatus.consentGiven) {
      return (
        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
          <XCircle className="w-5 h-5" />
          <div>
            <div className="font-medium">No Consent on File</div>
            <div className="text-xs">Consent required to continue</div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
        <XCircle className="w-5 h-5" />
        <div>
          <div className="font-medium">Consent Expired</div>
          <div className="text-xs">Renewal required</div>
        </div>
      </div>
    );
  };

  // Cleanup stream on unmount - MUST clear srcObject before stopping tracks to avoid removeChild errors
  useEffect(() => {
    return () => {
      // First, clear srcObject from video element to prevent DOM conflicts
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = null;
          console.log('✅ WaitingRoom: Cleared video srcObject');
        } catch (e) {
          console.warn('WaitingRoom: Could not clear video srcObject:', e);
        }
      }
      // Then stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('WaitingRoom: Could not stop track:', e);
          }
        });
        streamRef.current = null;
        console.log('✅ WaitingRoom: Stopped all media tracks');
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 20); // Divide by 20 since we increment every 3 seconds
    const secs = (seconds % 20) * 3;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Consent Modal */}
      {clientId && (
        <ConsentSigningModal
          clientId={clientId}
          consentType="Georgia_Telehealth"
          onConsentSigned={handleConsentSigned}
          onDecline={handleConsentDecline}
          isOpen={showConsentModal}
        />
      )}

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
              {/* Consent Status Card */}
              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">{getConsentBadge()}</div>
                    <button
                      onClick={() => setShowConsentDetails(!showConsentDetails)}
                      className="ml-4 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {showConsentDetails ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Consent Details (Collapsible) */}
                  {showConsentDetails && consentStatus && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="text-sm text-gray-700">
                        <strong>Consent Type:</strong> {consentStatus.consentType.replace('_', ' ')}
                      </div>
                      {consentStatus.expirationDate && (
                        <div className="text-sm text-gray-700">
                          <strong>Expiration Date:</strong>{' '}
                          {consentStatus.expirationDate.toLocaleDateString()}
                        </div>
                      )}
                      {consentStatus.requiresRenewal && (
                        <button
                          onClick={() => setShowConsentModal(true)}
                          className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Renew Consent Now
                        </button>
                      )}
                      {!consentStatus.isValid && (
                        <button
                          onClick={() => setShowConsentModal(true)}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Sign Consent Form
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                    playsInline
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
                <div className="space-y-4">
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
                          Your camera and microphone are working properly. Click below when you're ready to join.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ready to Join Button */}
                  <button
                    onClick={onSessionStart}
                    className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg transform hover:scale-105"
                  >
                    I'm Ready to Join
                  </button>
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
    </>
  );
}
