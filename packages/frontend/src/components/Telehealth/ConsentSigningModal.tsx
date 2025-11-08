import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileText, CheckCircle, X } from 'lucide-react';
import api from '../../lib/api';

interface ConsentSigningModalProps {
  clientId: string;
  consentType?: 'Georgia_Telehealth' | 'HIPAA_Telehealth' | 'Recording';
  onConsentSigned: () => void;
  onDecline: () => void;
  isOpen: boolean;
}

interface ConsentData {
  id: string;
  consentText: string;
  consentType: string;
  expirationDate: string;
}

export default function ConsentSigningModal({
  clientId,
  consentType = 'Georgia_Telehealth',
  onConsentSigned,
  onDecline,
  isOpen,
}: ConsentSigningModalProps) {
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Georgia requirements checkboxes
  const [patientRightsAcknowledged, setPatientRightsAcknowledged] = useState(false);
  const [emergencyProtocolsUnderstood, setEmergencyProtocolsUnderstood] = useState(false);
  const [privacyRisksAcknowledged, setPrivacyRisksAcknowledged] = useState(false);
  const [technologyRequirementsUnderstood, setTechnologyRequirementsUnderstood] = useState(false);

  // Electronic signature
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (isOpen && clientId) {
      fetchOrCreateConsent();
    }
  }, [isOpen, clientId, consentType]);

  const fetchOrCreateConsent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/telehealth-consent/get-or-create', {
        clientId,
        consentType,
      });

      setConsent(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load consent form');
      console.error('Error fetching consent:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    // Validate all requirements
    if (!patientRightsAcknowledged || !emergencyProtocolsUnderstood ||
        !privacyRisksAcknowledged || !technologyRequirementsUnderstood) {
      setError('Please acknowledge all requirements before signing');
      return;
    }

    if (!signature.trim()) {
      setError('Please enter your full name as your electronic signature');
      return;
    }

    try {
      setSigning(true);
      setError(null);

      // Capture client information
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      const userAgent = navigator.userAgent;

      await api.post('/telehealth-consent/sign', {
        consentId: consent?.id,
        consentGiven: true,
        patientRightsAcknowledged,
        emergencyProtocolsUnderstood,
        privacyRisksAcknowledged,
        technologyRequirementsUnderstood,
        clientSignature: signature,
        clientIPAddress: ip,
        clientUserAgent: userAgent,
      });

      onConsentSigned();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign consent');
      console.error('Error signing consent:', err);
    } finally {
      setSigning(false);
    }
  };

  const allRequirementsChecked =
    patientRightsAcknowledged &&
    emergencyProtocolsUnderstood &&
    privacyRisksAcknowledged &&
    technologyRequirementsUnderstood &&
    signature.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Telehealth Consent Required</h2>
              <p className="text-blue-100 text-sm">Georgia Telehealth Regulations</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!loading && consent && (
            <>
              {/* Alert Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-900 font-medium">Consent Required to Continue</p>
                    <p className="text-yellow-800 text-sm">
                      Georgia law requires explicit consent for telehealth services. Please read and acknowledge all requirements below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Consent Document */}
              <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                    {consent.consentText}
                  </pre>
                </div>
              </div>

              {/* Georgia Requirements Checkboxes */}
              <div className="space-y-4 border border-blue-200 rounded-lg p-6 bg-blue-50">
                <h3 className="font-bold text-lg text-blue-900 mb-4">
                  Required Acknowledgments (Georgia Law)
                </h3>

                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={patientRightsAcknowledged}
                    onChange={(e) => setPatientRightsAcknowledged(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 group-hover:text-gray-900">
                    I acknowledge my <strong>rights as a patient</strong>, including the right to withhold or withdraw consent at any time
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={emergencyProtocolsUnderstood}
                    onChange={(e) => setEmergencyProtocolsUnderstood(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 group-hover:text-gray-900">
                    I understand the <strong>emergency protocols</strong> and what to do if technology fails or a clinical emergency occurs
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={privacyRisksAcknowledged}
                    onChange={(e) => setPrivacyRisksAcknowledged(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 group-hover:text-gray-900">
                    I acknowledge the <strong>privacy risks</strong> of telehealth including potential breach of confidentiality
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={technologyRequirementsUnderstood}
                    onChange={(e) => setTechnologyRequirementsUnderstood(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 group-hover:text-gray-900">
                    I understand the <strong>technology requirements</strong> including internet connectivity, device capabilities, and being in a private location
                  </span>
                </label>
              </div>

              {/* Electronic Signature */}
              <div className="border border-gray-300 rounded-lg p-6 bg-white">
                <label className="block mb-2">
                  <span className="text-gray-800 font-semibold">Electronic Signature *</span>
                  <p className="text-gray-600 text-sm mb-3">
                    By typing your full name below, you are providing your legally binding electronic signature.
                  </p>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-serif text-lg"
                  />
                </label>

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>This consent will be valid for one year from the date of signature.</p>
                  <p>Your IP address and device information will be recorded for verification purposes.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <button
              onClick={onDecline}
              disabled={signing}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              Decline & Return to Dashboard
            </button>

            <button
              onClick={handleSign}
              disabled={!allRequirementsChecked || signing}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {signing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Sign and Continue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
