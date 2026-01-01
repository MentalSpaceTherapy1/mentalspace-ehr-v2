import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  MessageSquare,
  Clock,
  User,
  Calendar,
  Award,
  Building,
  Hash,
  AlertCircle,
  ChevronRight,
  Download,
} from 'lucide-react';
import {
  useCredential,
  useVerifyCredential,
  useVerificationHistory,
} from '../../hooks/useCredentialing';

const VERIFICATION_STEPS = [
  { id: 1, title: 'Document Review', icon: Eye },
  { id: 2, title: 'Verification Check', icon: Shield },
  { id: 3, title: 'Final Approval', icon: CheckCircle },
];

export default function CredentialVerification() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: credential, isLoading } = useCredential(id || '');
  const { data: history } = useVerificationHistory(id || '');
  const verifyCredential = useVerifyCredential();

  const [currentStep, setCurrentStep] = useState(1);
  const [notes, setNotes] = useState('');
  const [documentReviewed, setDocumentReviewed] = useState(false);

  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!notes.trim()) {
      toast.error('Please add verification notes');
      return;
    }

    if (status === 'VERIFIED' && !documentReviewed) {
      toast.error('Please confirm that you have reviewed the document');
      return;
    }

    try {
      await verifyCredential.mutateAsync({
        credentialId: id || '',
        status,
        notes,
      });
      navigate('/credentialing/list');
    } catch (error) {
      toast.error('Failed to verify credential');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Loading credential...</p>
        </div>
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Credential not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Shield className="w-12 h-12 text-purple-600 mr-4" />
          Credential Verification
        </h1>
        <p className="text-gray-600 text-lg">
          Review and verify credential documentation
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          {VERIFICATION_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all ${
                    currentStep >= step.id
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <step.icon
                    className={`w-8 h-8 ${
                      currentStep >= step.id ? 'text-white' : 'text-gray-400'
                    }`}
                  />
                </div>
                <p
                  className={`mt-3 text-sm font-bold ${
                    currentStep >= step.id ? 'text-purple-600' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </p>
              </div>
              {index < VERIFICATION_STEPS.length - 1 && (
                <ChevronRight
                  className={`w-8 h-8 ${
                    currentStep > step.id ? 'text-purple-600' : 'text-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credential Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-7 h-7 text-purple-600 mr-3" />
              Credential Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <InfoField
                icon={<User className="w-5 h-5 text-purple-600" />}
                label="Staff Member"
                value={credential.staffName}
              />
              <InfoField
                icon={<Award className="w-5 h-5 text-purple-600" />}
                label="Type"
                value={credential.type}
              />
              <InfoField
                icon={<Hash className="w-5 h-5 text-purple-600" />}
                label="Credential Number"
                value={credential.credentialNumber}
              />
              <InfoField
                icon={<Building className="w-5 h-5 text-purple-600" />}
                label="Issuing Authority"
                value={credential.issuingAuthority}
              />
              <InfoField
                icon={<Calendar className="w-5 h-5 text-purple-600" />}
                label="Issue Date"
                value={new Date(credential.issueDate).toLocaleDateString()}
              />
              <InfoField
                icon={<Calendar className="w-5 h-5 text-purple-600" />}
                label="Expiration Date"
                value={new Date(credential.expirationDate).toLocaleDateString()}
              />
            </div>

            {credential.notes && (
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <p className="text-sm font-bold text-gray-700 mb-2">Notes</p>
                <p className="text-gray-600">{credential.notes}</p>
              </div>
            )}
          </div>

          {/* Document Viewer */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Eye className="w-7 h-7 text-blue-600 mr-3" />
              Document Review
            </h2>

            {credential.documentUrl ? (
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-4 flex items-center justify-between border-b-2 border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-gray-900">
                      Credential Document
                    </span>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <div className="bg-white h-96 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Document preview would appear here</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Click download to view the full document
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No document uploaded</p>
              </div>
            )}

            <div className="mt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentReviewed}
                  onChange={(e) => setDocumentReviewed(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="font-bold text-gray-900">
                  I have reviewed and verified the document
                </span>
              </label>
            </div>
          </div>

          {/* Verification Notes */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <MessageSquare className="w-7 h-7 text-green-600 mr-3" />
              Verification Notes
            </h2>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition-all resize-none"
              placeholder="Add your verification notes here..."
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => handleVerify('VERIFIED')}
                disabled={verifyCredential.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-6 h-6" />
                Approve & Verify
              </button>
              <button
                onClick={() => handleVerify('REJECTED')}
                disabled={verifyCredential.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-6 h-6" />
                Reject
              </button>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 sticky top-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Clock className="w-7 h-7 text-indigo-600 mr-3" />
              Audit Trail
            </h2>

            {history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((entry) => (
                  <AuditEntry key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No verification history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Info Field Component
interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoField({ icon, label, value }: InfoFieldProps) {
  return (
    <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-bold text-gray-600">{label}</span>
      </div>
      <p className="text-gray-900 font-bold">{value}</p>
    </div>
  );
}

// Audit Entry Component
interface AuditEntryProps {
  entry: {
    id: string;
    verifiedBy: string;
    verifiedAt: string;
    status: string;
    notes: string;
  };
}

function AuditEntry({ entry }: AuditEntryProps) {
  const statusConfig = {
    VERIFIED: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'text-green-700',
    },
    REJECTED: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      text: 'text-red-700',
    },
    PENDING: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <Clock className="w-5 h-5 text-yellow-600" />,
      text: 'text-yellow-700',
    },
  };

  const config = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <div className={`p-4 ${config.bg} border-2 ${config.border} rounded-xl`}>
      <div className="flex items-center gap-2 mb-2">
        {config.icon}
        <span className={`font-bold ${config.text}`}>{entry.status}</span>
      </div>
      <p className="text-sm text-gray-900 font-bold mb-1">{entry.verifiedBy}</p>
      <p className="text-xs text-gray-600 mb-2">
        {new Date(entry.verifiedAt).toLocaleString()}
      </p>
      {entry.notes && (
        <p className="text-sm text-gray-700 italic">{entry.notes}</p>
      )}
    </div>
  );
}
