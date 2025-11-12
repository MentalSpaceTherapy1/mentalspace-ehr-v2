import React, { useState } from 'react';
import {
  Download,
  Printer,
  Share2,
  Award,
  CheckCircle2,
  Copy,
  ExternalLink,
  Grid,
  List,
} from 'lucide-react';
import { useEnrollments, useDownloadCertificate } from '../../hooks/useTraining';

export default function CertificateViewer() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [shareLink, setShareLink] = useState<string>('');

  const { data: enrollments } = useEnrollments();
  const downloadMutation = useDownloadCertificate();

  // Filter only completed courses with certificates
  const completedCourses = enrollments?.filter(
    (e: any) => e.status === 'COMPLETED' && e.certificateUrl
  );

  const handleDownload = async (enrollmentId: string) => {
    try {
      await downloadMutation.mutateAsync(enrollmentId);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateShareLink = (enrollmentId: string) => {
    const link = `${window.location.origin}/certificates/verify/${enrollmentId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
    alert('Share link copied to clipboard!');
  };

  const generateVerificationCode = (enrollmentId: string) => {
    // Mock verification code generation
    return `CERT-${enrollmentId.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">🏅</span>
          My Certificates
        </h1>
        <p className="text-gray-600 text-lg">
          View, download, and share your training certificates
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">🏆</span>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">
              Total Certificates
            </h3>
            <p className="text-4xl font-bold text-purple-600">
              {completedCourses?.length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-pink-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">📅</span>
              <CheckCircle2 className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">This Year</h3>
            <p className="text-4xl font-bold text-pink-600">
              {completedCourses?.filter(
                (e: any) =>
                  new Date(e.completedAt).getFullYear() === new Date().getFullYear()
              ).length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-rose-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-100 to-red-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">⭐</span>
              <Award className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">
              Avg Score
            </h3>
            <p className="text-4xl font-bold text-rose-600">
              {completedCourses && completedCourses.length > 0
                ? (
                    completedCourses.reduce((sum: number, e: any) => sum + (e.score || 0), 0) /
                    completedCourses.length
                  ).toFixed(0)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">View Mode</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid className="w-5 h-5" />
              Gallery
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-5 h-5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Certificates Display */}
      {completedCourses && completedCourses.length > 0 ? (
        viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedCourses.map((enrollment: any) => (
              <div
                key={enrollment.id}
                className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-purple-100 overflow-hidden cursor-pointer transform hover:scale-105"
                onClick={() => setSelectedCertificate(enrollment)}
              >
                {/* Certificate Preview */}
                <div className="h-48 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 relative p-6 flex flex-col items-center justify-center text-white">
                  <Award className="w-16 h-16 mb-3" />
                  <h3 className="text-lg font-bold text-center">{enrollment.courseName}</h3>
                  <p className="text-sm mt-2">
                    {new Date(enrollment.completedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="p-4">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(enrollment.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors font-semibold text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateShareLink(enrollment.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-pink-100 text-pink-700 px-3 py-2 rounded-lg hover:bg-pink-200 transition-colors font-semibold text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-gray-600">
                      Score: <span className="font-bold text-purple-600">{enrollment.score}%</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                    Course Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                    Completion Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                    Verification Code
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {completedCourses.map((enrollment: any) => (
                  <tr key={enrollment.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {enrollment.courseName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(enrollment.completedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                        {enrollment.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {generateVerificationCode(enrollment.id)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(enrollment.id)}
                          className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handlePrint}
                          className="p-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateShareLink(enrollment.id)}
                          className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl shadow-xl border-2 border-purple-100">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Certificates Yet</h3>
          <p className="text-gray-600">Complete courses to earn certificates</p>
        </div>
      )}

      {/* Certificate Detail Modal */}
      {selectedCertificate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedCertificate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Certificate Display */}
            <div className="bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 p-12 text-white text-center relative">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSelectedCertificate(null)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Decorative Border */}
              <div className="border-4 border-white border-double p-8 rounded-2xl">
                <Award className="w-24 h-24 mx-auto mb-6" />
                <h1 className="text-4xl font-bold mb-4">Certificate of Completion</h1>
                <p className="text-xl mb-6">This certifies that</p>
                <h2 className="text-3xl font-bold mb-6">
                  {localStorage.getItem('userName') || 'User Name'}
                </h2>
                <p className="text-xl mb-6">has successfully completed</p>
                <h3 className="text-2xl font-bold mb-6">{selectedCertificate.courseName}</h3>
                <div className="flex items-center justify-center gap-8 mt-8">
                  <div>
                    <p className="text-sm mb-1">Completion Date</p>
                    <p className="font-bold">
                      {new Date(selectedCertificate.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1">Score</p>
                    <p className="font-bold">{selectedCertificate.score}%</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1">Verification Code</p>
                    <p className="font-mono font-bold">
                      {generateVerificationCode(selectedCertificate.id)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 bg-gray-50">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => handleDownload(selectedCertificate.id)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
                >
                  <Printer className="w-5 h-5" />
                  Print
                </button>
                <button
                  onClick={() => handleGenerateShareLink(selectedCertificate.id)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
                >
                  <Share2 className="w-5 h-5" />
                  Share Link
                </button>
              </div>

              {/* Share Link Display */}
              {shareLink && (
                <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Share Link (copied to clipboard)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-4 py-2 border-2 border-purple-200 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        alert('Copied!');
                      }}
                      className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <a
                      href={shareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Verification Info */}
              <div className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  Certificate Verification
                </h4>
                <p className="text-sm text-gray-700">
                  This certificate can be verified using the verification code above at:{' '}
                  <span className="font-mono font-bold text-purple-600">
                    {window.location.origin}/verify
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
