import React from 'react';

interface SignatureDisplayProps {
  signatureData: string | null;
  signedByName: string | null;
  signedDate: string | Date | null;
  signatureIpAddress?: string | null;
  consentAgreed?: boolean;
  className?: string;
  showAuditTrail?: boolean;
}

/**
 * SignatureDisplay Component
 *
 * Displays a client's electronic signature on submitted forms in the EHR.
 * Shows signature image, signer name, date, and optional audit trail.
 *
 * Features:
 * - Signature image display
 * - Signer information
 * - Timestamp
 * - Audit trail (IP address)
 * - Legal compliance indicators
 */
export const SignatureDisplay: React.FC<SignatureDisplayProps> = ({
  signatureData,
  signedByName,
  signedDate,
  signatureIpAddress,
  consentAgreed = false,
  className = '',
  showAuditTrail = true,
}) => {
  if (!signatureData && !signedByName) {
    return (
      <div className={`signature-display-empty bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center text-gray-500">
          <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span className="text-sm font-medium">No signature provided</span>
        </div>
      </div>
    );
  }

  const formattedDate = signedDate
    ? new Date(signedDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'Date not recorded';

  return (
    <div className={`signature-display bg-white border-2 border-blue-300 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-lg font-bold">Electronic Signature - Legally Binding</h3>
            <p className="text-sm text-blue-100">
              {consentAgreed && 'Client consented to e-signature under E-SIGN Act'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Signature Image */}
        {signatureData && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Signature:
            </label>
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4 inline-block">
              <img
                src={signatureData}
                alt="Client Signature"
                className="max-w-full h-auto"
                style={{ maxWidth: '600px', maxHeight: '200px' }}
              />
            </div>
          </div>
        )}

        {/* Signer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Signed By
            </label>
            <p className="text-lg font-bold text-gray-900">
              {signedByName || 'Name not provided'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Signed On
            </label>
            <p className="text-sm text-gray-800">{formattedDate}</p>
          </div>
        </div>

        {/* Audit Trail */}
        {showAuditTrail && (signatureIpAddress || consentAgreed) && (
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Audit Trail
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-xs">
              {signatureIpAddress && (
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 min-w-[120px]">IP Address:</span>
                  <span className="text-gray-600 font-mono">{signatureIpAddress}</span>
                </div>
              )}
              {consentAgreed && (
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 min-w-[120px]">Consent Status:</span>
                  <span className="text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Agreed to e-signature consent
                  </span>
                </div>
              )}
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 min-w-[120px]">Compliance:</span>
                <span className="text-gray-600">E-SIGN Act & HIPAA</span>
              </div>
            </div>
          </div>
        )}

        {/* Legal Notice */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-xs text-blue-800 font-semibold">Legal Disclaimer</p>
              <p className="text-xs text-blue-700 mt-1">
                This electronic signature has been verified and has the same legal force and effect
                as a handwritten signature under the Electronic Signatures in Global and National
                Commerce Act (E-SIGN Act, 15 U.S.C. § 7001).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureDisplay;
