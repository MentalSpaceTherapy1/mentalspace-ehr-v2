import React, { useState, useEffect } from 'react';
import {
  Play,
  Edit,
  Copy,
  Share2,
  History,
  Trash2,
  Search,
  Plus,
  MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface Report {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isPublic: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CustomReportsList: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executeResults, setExecuteResults] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, tabValue, searchTerm]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get('/custom-reports', {
        params: { includePublic: true }
      });
      setReports(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch reports');
      console.error('Fetch reports error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by tab
    if (tabValue === 1) {
      // My Reports
      filtered = filtered.filter((r) => !r.isTemplate);
    } else if (tabValue === 2) {
      // Templates
      filtered = filtered.filter((r) => r.isTemplate);
    } else if (tabValue === 3) {
      // Shared
      filtered = filtered.filter((r) => r.isPublic);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleExecuteReport = async (report: Report) => {
    setSelectedReport(report);
    setExecuteDialogOpen(true);
    setMenuOpen(null);

    try {
      const response = await api.post(`/custom-reports/${report.id}/execute`, {});
      setExecuteResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute report');
      console.error('Execute error:', err);
    }
  };

  const handleCloneReport = async (report: Report) => {
    setMenuOpen(null);

    try {
      const response = await api.post(`/custom-reports/${report.id}/clone`, {
        name: `${report.name} (Copy)`
      });
      setReports([response.data, ...reports]);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clone report');
      console.error('Clone error:', err);
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport) return;

    try {
      await api.delete(`/custom-reports/${selectedReport.id}`);
      setReports(reports.filter((r) => r.id !== selectedReport.id));
      setDeleteDialogOpen(false);
      setSelectedReport(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete report');
      console.error('Delete error:', err);
    }
  };

  const handleShareReport = async (report: Report) => {
    setMenuOpen(null);

    try {
      await api.post(`/custom-reports/${report.id}/share`, {
        isPublic: !report.isPublic
      });
      setReports(
        reports.map((r) =>
          r.id === report.id ? { ...r, isPublic: !r.isPublic } : r
        )
      );
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to share report');
      console.error('Share error:', err);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600"></div>
      </div>
    );
  }

  const tabs = ['All Reports', 'My Reports', 'Templates', 'Shared'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 flex items-center">
              <span className="text-5xl mr-3">📄</span>
              Custom Reports
            </h1>
            <p className="text-gray-600 text-lg">Build and manage custom reports with advanced query builder</p>
          </div>
          <button
            onClick={() => navigate('/reports/custom/new')}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center"
          >
            <Plus className="w-6 h-6 mr-2" />
            Create Report
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-3xl mr-3">⚠️</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 p-2 flex gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              onClick={() => setTabValue(index)}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                tabValue === index
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-300 focus:border-emerald-400 transition-all duration-200 font-medium text-lg"
          />
        </div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">📄</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">No reports found</h2>
            <p className="text-gray-600 text-lg mb-8">Create your first custom report to get started</p>
            <button
              onClick={() => navigate('/reports/custom/new')}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white bg-opacity-30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {report.name}
                        </h3>
                        <p className="text-green-100 text-sm">
                          {report.category}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === report.id ? null : report.id)}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200"
                      >
                        <MoreVertical className="w-5 h-5 text-white" />
                      </button>
                      {menuOpen === report.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-10 overflow-hidden">
                          <button
                            onClick={() => handleExecuteReport(report)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center font-medium"
                          >
                            <Play className="w-4 h-4 mr-2" /> Execute
                          </button>
                          <button
                            onClick={() => navigate(`/reports/custom/${report.id}/edit`)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center font-medium"
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </button>
                          <button
                            onClick={() => handleCloneReport(report)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center font-medium"
                          >
                            <Copy className="w-4 h-4 mr-2" /> Clone
                          </button>
                          <button
                            onClick={() => handleShareReport(report)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center font-medium"
                          >
                            <Share2 className="w-4 h-4 mr-2" /> {report.isPublic ? 'Make Private' : 'Share'}
                          </button>
                          <button
                            onClick={() => navigate(`/reports/custom/${report.id}/versions`)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-all duration-200 flex items-center font-medium"
                          >
                            <History className="w-4 h-4 mr-2" /> Version History
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setDeleteDialogOpen(true);
                              setMenuOpen(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 transition-all duration-200 flex items-center font-medium"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {report.isTemplate && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-400 text-blue-900 shadow-md">
                        📋 Template
                      </span>
                    )}
                    {report.isPublic && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 shadow-md">
                        🌍 Shared
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-4 line-clamp-2 min-h-[48px]">
                    {report.description || 'No description'}
                  </p>

                  <div className="text-xs text-gray-500 mb-4">
                    <p>Created by {report.user.firstName} {report.user.lastName}</p>
                    <p>Updated {new Date(report.updatedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleExecuteReport(report)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold flex items-center justify-center"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Execute
                    </button>
                    <button
                      onClick={() => navigate(`/reports/custom/${report.id}/edit`)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <span className="text-3xl mr-3">⚠️</span>
                  Delete Report
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-700 text-lg mb-6">
                  Are you sure you want to delete "{selectedReport?.name}"? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteDialogOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteReport}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execute Results Dialog */}
        {executeDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <span className="text-3xl mr-3">📊</span>
                  Report Results: {selectedReport?.name}
                </h2>
              </div>
              <div className="p-6 overflow-auto flex-1">
                {executeResults ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Executed at: {executeResults.executedAt}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {Array.isArray(executeResults.results)
                        ? `${executeResults.results.length} rows returned`
                        : 'Aggregation result'}
                    </p>
                    <pre className="bg-gray-100 rounded-xl p-4 overflow-auto text-sm">
                      {JSON.stringify(executeResults.results, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600"></div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-gray-50 border-t-2 border-gray-200">
                <button
                  onClick={() => setExecuteDialogOpen(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomReportsList;
