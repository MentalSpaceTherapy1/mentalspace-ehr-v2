import React from 'react';

interface ESignatureConsentProps {
  consentAgreed: boolean;
  onConsentChange: (agreed: boolean) => void;
  className?: string;
}

/**
 * ESignatureConsent Component
 *
 * Displays the legal consent text for electronic signatures
 * as required by the E-SIGN Act and state regulations.
 *
 * Features:
 * - Full legal disclosure
 * - Required consent checkbox
 * - Compliant with E-SIGN Act
 * - Clear explanation of e-signature rights
 */
export const ESignatureConsent: React.FC<ESignatureConsentProps> = ({
  consentAgreed,
  onConsentChange,
  className = '',
}) => {
  return (
    <div className={`e-signature-consent bg-blue-50 border-2 border-blue-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start mb-4">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Electronic Signature Consent
          </h3>
          <div className="text-sm text-blue-800 space-y-3">
            <p>
              By checking the box below and providing your electronic signature, you agree to the following:
            </p>

            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>Legal Effect:</strong> Your electronic signature will have the same legal force and effect
                as a handwritten signature.
              </li>
              <li>
                <strong>Consent to Electronic Records:</strong> You consent to electronically sign this document
                and agree that your electronic signature is legally binding.
              </li>
              <li>
                <strong>Identity Verification:</strong> You confirm that you are the person whose name appears
                on this form and that you are authorized to sign this document.
              </li>
              <li>
                <strong>Record Retention:</strong> This electronically signed document will be retained in our
                secure system and is subject to the same confidentiality protections as paper documents under
                HIPAA regulations.
              </li>
              <li>
                <strong>Right to Paper Copy:</strong> You have the right to request a paper copy of this
                electronically signed document at any time.
              </li>
              <li>
                <strong>Audit Trail:</strong> The following information will be recorded with your signature
                for security and legal compliance: date and time of signature, IP address, and device information.
              </li>
            </ul>

            <p className="font-semibold mt-4">
              By proceeding, you acknowledge that you have read and understand this consent and
              that you wish to electronically sign this document.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white border-2 border-blue-300 rounded p-4">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            checked={consentAgreed}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            required
          />
          <span className="ml-3 text-sm font-medium text-gray-900">
            I consent to use electronic signatures and I agree that my electronic signature
            has the same legal effect as a handwritten signature.{' '}
            <span className="text-red-600">*</span>
          </span>
        </label>
      </div>

      {!consentAgreed && (
        <div className="mt-3 flex items-center text-xs text-gray-600">
          <svg
            className="w-4 h-4 mr-1 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          You must agree to the consent before you can provide your signature.
        </div>
      )}
    </div>
  );
};

export default ESignatureConsent;
