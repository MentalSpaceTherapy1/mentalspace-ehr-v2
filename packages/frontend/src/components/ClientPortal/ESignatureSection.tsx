import React, { useState } from 'react';
import SignaturePad from './SignaturePad';
import ESignatureConsent from './ESignatureConsent';

interface ESignatureSectionProps {
  signatureData: string | null;
  signedByName: string;
  consentAgreed: boolean;
  onSignatureChange: (data: string | null) => void;
  onNameChange: (name: string) => void;
  onConsentChange: (agreed: boolean) => void;
  required?: boolean;
  className?: string;
}

/**
 * ESignatureSection Component
 *
 * Complete e-signature section for form submissions.
 * Includes consent, name input, and signature pad.
 *
 * Features:
 * - Legal consent disclosure
 * - Typed name field
 * - Canvas signature pad
 * - Validation
 * - E-SIGN Act compliant
 */
export const ESignatureSection: React.FC<ESignatureSectionProps> = ({
  signatureData,
  signedByName,
  consentAgreed,
  onSignatureChange,
  onNameChange,
  onConsentChange,
  required = true,
  className = '',
}) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const isComplete = consentAgreed && signedByName.trim().length > 0 && signatureData !== null;

  return (
    <div className={`e-signature-section ${className}`}>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <h2 className="text-2xl font-bold text-gray-900">Electronic Signature</h2>
            <p className="text-sm text-gray-600 mt-1">
              {required && <span className="text-red-600 font-semibold">Required - </span>}
              Please review the consent and provide your signature below
            </p>
          </div>
        </div>

        {/* Step 1: E-Signature Consent */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Review and Accept Consent</h3>
          </div>
          <ESignatureConsent
            consentAgreed={consentAgreed}
            onConsentChange={onConsentChange}
          />
        </div>

        {/* Step 2: Enter Full Name */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              consentAgreed ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Enter Your Full Legal Name</h3>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Legal Name
              {required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={signedByName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="John Doe"
              required={required}
              disabled={!consentAgreed}
            />
            <p className="mt-2 text-xs text-gray-500">
              Type your full legal name exactly as it appears on legal documents
            </p>
            {signedByName.trim().length > 0 && consentAgreed && (
              <div className="mt-3 flex items-center text-sm text-green-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Name entered
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Draw Signature */}
        <div>
          <div className="flex items-center mb-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              consentAgreed && signedByName.trim().length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Draw Your Signature</h3>
          </div>

          {consentAgreed && signedByName.trim().length > 0 ? (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              {!showSignaturePad && (
                <button
                  type="button"
                  onClick={() => setShowSignaturePad(true)}
                  className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Click Here to Sign
                </button>
              )}

              {showSignaturePad && (
                <SignaturePad
                  onSignatureChange={onSignatureChange}
                  width={600}
                  height={200}
                />
              )}

              {signatureData && (
                <div className="mt-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center text-green-700">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold">Signature captured successfully</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-gray-600">
                Please complete steps 1 and 2 before providing your signature
              </p>
            </div>
          )}
        </div>

        {/* Completion Status */}
        {isComplete && (
          <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold text-green-900">E-Signature Complete</p>
                <p className="text-sm text-green-700">
                  Signed by: <strong>{signedByName}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ESignatureSection;
