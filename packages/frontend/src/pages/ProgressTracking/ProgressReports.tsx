import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  User,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  medicalRecordNumber: string;
}

interface OutcomeMeasure {
  id: string;
  measureType: 'PHQ9' | 'GAD7' | 'PCL5';
  totalScore: number;
  severity: string;
  severityLabel: string;
  administeredDate: string;
}

interface Statistics {
  PHQ9?: MeasureStats;
  GAD7?: MeasureStats;
  PCL5?: MeasureStats;
}

interface MeasureStats {
  totalAdministered: number;
  latestScore: number;
  latestDate: string;
  firstScore: number;
  firstDate: string;
  averageScore: number;
  minScore: number;
  maxScore: number;
  trend: number;
}

const MEASURE_LABELS: Record<string, { name: string; description: string }> = {
  PHQ9: { name: 'PHQ-9', description: 'Depression' },
  GAD7: { name: 'GAD-7', description: 'Anxiety' },
  PCL5: { name: 'PCL-5', description: 'PTSD' },
};

const ProgressReports: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dateRange, setDateRange] = useState('all');

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  // Fetch clients assigned to this clinician
  const {
    data: clients,
    isLoading: loadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['assignedClients', currentUser?.id, searchTerm],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      let url = `/clients?therapistId=${currentUser.id}&status=ACTIVE`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const response = await api.get(url);
      return response.data.data || [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch outcome measures for selected client
  const { data: measures, isLoading: loadingMeasures } = useQuery<OutcomeMeasure[]>({
    queryKey: ['clientMeasures', selectedClient?.id, dateRange],
    queryFn: async () => {
      let url = `/outcome-measures/client/${selectedClient!.id}?limit=100`;
      if (dateRange !== 'all') {
        const now = new Date();
        const startDate = new Date();
        if (dateRange === '30') startDate.setDate(now.getDate() - 30);
        if (dateRange === '90') startDate.setDate(now.getDate() - 90);
        if (dateRange === '180') startDate.setDate(now.getDate() - 180);
        if (dateRange === '365') startDate.setDate(now.getDate() - 365);
        url += `&startDate=${startDate.toISOString()}`;
      }
      const response = await api.get(url);
      return response.data.data?.measures || [];
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch statistics for selected client
  const { data: statistics, isLoading: loadingStats } = useQuery<Statistics>({
    queryKey: ['clientStatistics', selectedClient?.id],
    queryFn: async () => {
      const response = await api.get(`/outcome-measures/statistics/${selectedClient!.id}`);
      return response.data.data?.statistics || {};
    },
    enabled: !!selectedClient?.id,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'minimal':
      case 'none':
        return 'bg-green-100 text-green-700';
      case 'mild':
        return 'bg-yellow-100 text-yellow-700';
      case 'moderate':
        return 'bg-orange-100 text-orange-700';
      case 'moderately severe':
      case 'severe':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend < -2) return <TrendingDown className="w-5 h-5 text-green-600" />;
    if (trend > 2) return <TrendingUp className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const handleExportPDF = async () => {
    if (!selectedClient) return;
    try {
      const response = await api.get(`/tracking/export/${selectedClient.id}/pdf`);
      // In a real implementation, this would generate and download a PDF
      console.log('PDF data:', response.data);
      toast('PDF export functionality coming soon!', { icon: '📄' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportCSV = async () => {
    if (!selectedClient) return;
    try {
      const response = await api.get(`/tracking/export/${selectedClient.id}/csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `progress-report-${selectedClient.firstName}-${selectedClient.lastName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast('CSV export functionality coming soon!', { icon: '📊' });
    }
  };

  const filteredClients = clients || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/progress-tracking')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Progress Tracking
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Progress Reports</h1>
            <p className="text-gray-600">View and export outcome measure progress reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Client Selection */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Select Client
          </h2>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Client List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : clientsError ? (
              <div className="flex items-center gap-2 text-red-600 py-4">
                <AlertCircle className="w-5 h-5" />
                <span>Error loading clients</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No clients found</p>
              </div>
            ) : (
              filteredClients.map((client: Client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedClient?.id === client.id
                      ? 'bg-purple-50 border-purple-500'
                      : 'bg-white border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {client.firstName[0]}
                    {client.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{client.medicalRecordNumber}</p>
                  </div>
                  {selectedClient?.id === client.id && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedClient ? (
            <div className="bg-white rounded-2xl shadow-md p-12 border border-gray-100 text-center text-gray-500">
              <BarChart2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-medium">Select a client to view their progress report</p>
              <p className="text-sm mt-2">Choose a client from the list to see their outcome measure history</p>
            </div>
          ) : (
            <>
              {/* Client Header & Export */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {selectedClient.firstName[0]}
                      {selectedClient.lastName[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </h2>
                      <p className="text-gray-500">MRN: {selectedClient.medicalRecordNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Time</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="180">Last 6 Months</option>
                      <option value="365">Last Year</option>
                    </select>
                    <button
                      onClick={handleExportCSV}
                      className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Summary */}
              {loadingStats ? (
                <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                </div>
              ) : statistics && Object.keys(statistics).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(statistics).map(([type, stats]) => (
                    <div key={type} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900">{MEASURE_LABELS[type]?.name || type}</h3>
                        {getTrendIcon(stats.trend)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">Latest Score</span>
                          <span className="font-bold">{stats.latestScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">First Score</span>
                          <span className="font-medium">{stats.firstScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">Change</span>
                          <span
                            className={`font-bold ${
                              stats.trend < 0 ? 'text-green-600' : stats.trend > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}
                          >
                            {stats.trend > 0 ? '+' : ''}
                            {stats.trend.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">Assessments</span>
                          <span className="font-medium">{stats.totalAdministered}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Assessment History */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Assessment History
                </h3>

                {loadingMeasures ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : !measures || measures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No assessments recorded yet</p>
                    <button
                      onClick={() => navigate('/progress-tracking/assign-measures')}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Administer Assessment
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-sm border-b border-gray-100">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Measure</th>
                          <th className="pb-3 font-medium">Score</th>
                          <th className="pb-3 font-medium">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {measures.map((measure) => (
                          <tr key={measure.id} className="border-b border-gray-50">
                            <td className="py-3 text-gray-900">
                              {new Date(measure.administeredDate).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                                {MEASURE_LABELS[measure.measureType]?.name || measure.measureType}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-gray-900">{measure.totalScore}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(measure.severity)}`}>
                                {measure.severityLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressReports;
