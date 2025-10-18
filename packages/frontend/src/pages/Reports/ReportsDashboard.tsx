import React, { useState } from 'react';
import {
  BarChart3,
  DollarSign,
  Users,
  FileText,
  Download,
  TrendingUp,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import {
  useReportQuickStats,
  useRevenueByClinicianReport,
  useRevenueByCPTReport,
  useRevenueByPayerReport,
  usePaymentCollectionReport,
  useKVRAnalysisReport,
  useSessionsPerDayReport,
  useUnsignedNotesReport,
  useMissingTreatmentPlansReport,
  useClientDemographicsReport,
} from '../../hooks/useReports';
import ReportViewModal from '../../components/ReportViewModal';

type ReportType =
  | 'revenue-clinician'
  | 'revenue-cpt'
  | 'revenue-payer'
  | 'payment-collection'
  | 'kvr-analysis'
  | 'sessions-per-day'
  | 'unsigned-notes'
  | 'missing-treatment-plans'
  | 'client-demographics';

export default function ReportsDashboard() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  });

  // Fetch quick stats
  const { data: quickStats, isLoading: statsLoading } = useReportQuickStats();

  // Fetch all reports (with enabled based on selectedReport)
  const revenueByClinicianQuery = useRevenueByClinicianReport(
    selectedReport === 'revenue-clinician' ? dateRange.start : undefined,
    selectedReport === 'revenue-clinician' ? dateRange.end : undefined
  );

  const revenueByCPTQuery = useRevenueByCPTReport(
    selectedReport === 'revenue-cpt' ? dateRange.start : undefined,
    selectedReport === 'revenue-cpt' ? dateRange.end : undefined
  );

  const revenueByPayerQuery = useRevenueByPayerReport(
    selectedReport === 'revenue-payer' ? dateRange.start : undefined,
    selectedReport === 'revenue-payer' ? dateRange.end : undefined
  );

  const paymentCollectionQuery = usePaymentCollectionReport(
    selectedReport === 'payment-collection' ? dateRange.start : undefined,
    selectedReport === 'payment-collection' ? dateRange.end : undefined
  );

  const kvrAnalysisQuery = useKVRAnalysisReport(
    selectedReport === 'kvr-analysis' ? dateRange.start : undefined,
    selectedReport === 'kvr-analysis' ? dateRange.end : undefined
  );

  const sessionsPerDayQuery = useSessionsPerDayReport(
    selectedReport === 'sessions-per-day' ? dateRange.start : undefined,
    selectedReport === 'sessions-per-day' ? dateRange.end : undefined
  );

  const unsignedNotesQuery = useUnsignedNotesReport();
  const missingTreatmentPlansQuery = useMissingTreatmentPlansReport();
  const clientDemographicsQuery = useClientDemographicsReport();

  // Get current report query based on selectedReport
  const getCurrentReportQuery = () => {
    switch (selectedReport) {
      case 'revenue-clinician':
        return revenueByClinicianQuery;
      case 'revenue-cpt':
        return revenueByCPTQuery;
      case 'revenue-payer':
        return revenueByPayerQuery;
      case 'payment-collection':
        return paymentCollectionQuery;
      case 'kvr-analysis':
        return kvrAnalysisQuery;
      case 'sessions-per-day':
        return sessionsPerDayQuery;
      case 'unsigned-notes':
        return unsignedNotesQuery;
      case 'missing-treatment-plans':
        return missingTreatmentPlansQuery;
      case 'client-demographics':
        return clientDemographicsQuery;
      default:
        return null;
    }
  };

  const handleViewReport = (reportType: ReportType) => {
    setSelectedReport(reportType);
    const query = getCurrentReportQuery();
    if (query && 'refetch' in query) {
      query.refetch();
    }
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
  };

  // Get modal configuration based on report type
  const getModalConfig = () => {
    const query = getCurrentReportQuery();
    if (!query) return null;

    const baseConfig = {
      isOpen: selectedReport !== null,
      onClose: handleCloseModal,
      isLoading: query.isLoading,
      error: query.error,
      data: query.data || [],
    };

    switch (selectedReport) {
      case 'revenue-clinician':
        return {
          ...baseConfig,
          title: 'Revenue by Clinician',
          description: 'Breakdown of revenue per clinician',
          columns: [
            { key: 'clinicianName', label: 'Clinician' },
            { key: 'sessionCount', label: 'Sessions', format: (v: number) => v.toLocaleString() },
            {
              key: 'totalRevenue',
              label: 'Total Revenue',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
            {
              key: 'avgPerSession',
              label: 'Avg per Session',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
          ],
          summary: query.data
            ? [
                {
                  label: 'Total Clinicians',
                  value: query.data.length,
                },
                {
                  label: 'Total Revenue',
                  value: `$${query.data.reduce((sum: number, r: any) => sum + r.totalRevenue, 0).toLocaleString()}`,
                },
                {
                  label: 'Total Sessions',
                  value: query.data.reduce((sum: number, r: any) => sum + r.sessionCount, 0).toLocaleString(),
                },
              ]
            : [],
        };

      case 'revenue-cpt':
        return {
          ...baseConfig,
          title: 'Revenue by CPT Code',
          description: 'Revenue analysis by service code',
          columns: [
            { key: 'cptCode', label: 'CPT Code' },
            { key: 'description', label: 'Description' },
            { key: 'count', label: 'Count', format: (v: number) => v.toLocaleString() },
            {
              key: 'totalRevenue',
              label: 'Total Revenue',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
            {
              key: 'avgRevenue',
              label: 'Avg Revenue',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
          ],
        };

      case 'revenue-payer':
        return {
          ...baseConfig,
          title: 'Revenue by Payer',
          description: 'Insurance payer analysis',
          columns: [
            { key: 'payerName', label: 'Payer' },
            { key: 'claimCount', label: 'Claims', format: (v: number) => v.toLocaleString() },
            {
              key: 'totalRevenue',
              label: 'Total Revenue',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
            {
              key: 'percentOfTotal',
              label: '% of Total',
              format: (v: number) => `${v.toFixed(1)}%`,
            },
          ],
        };

      case 'payment-collection':
        return {
          ...baseConfig,
          title: 'Payment Collection Report',
          description: 'Collection rate and AR aging',
          columns: [
            { key: 'period', label: 'Period' },
            {
              key: 'totalCharged',
              label: 'Total Charged',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
            {
              key: 'totalCollected',
              label: 'Total Collected',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
            {
              key: 'collectionRate',
              label: 'Collection Rate',
              format: (v: number) => `${v.toFixed(1)}%`,
            },
          ],
        };

      case 'kvr-analysis':
        return {
          ...baseConfig,
          title: 'KVR Analysis',
          description: 'Keep visit rate by clinician',
          columns: [
            { key: 'clinicianName', label: 'Clinician' },
            {
              key: 'scheduled',
              label: 'Scheduled',
              format: (v: number) => v.toLocaleString(),
            },
            { key: 'kept', label: 'Kept', format: (v: number) => v.toLocaleString() },
            {
              key: 'cancelled',
              label: 'Cancelled',
              format: (v: number) => v.toLocaleString(),
            },
            { key: 'noShow', label: 'No-Show', format: (v: number) => v.toLocaleString() },
            { key: 'kvrPercent', label: 'KVR %', format: (v: number) => `${v.toFixed(1)}%` },
          ],
        };

      case 'sessions-per-day':
        return {
          ...baseConfig,
          title: 'Sessions Per Day',
          description: 'Daily session counts and trends',
          columns: [
            {
              key: 'date',
              label: 'Date',
              format: (v: string) => new Date(v).toLocaleDateString(),
            },
            {
              key: 'sessionCount',
              label: 'Sessions',
              format: (v: number) => v.toLocaleString(),
            },
            {
              key: 'clinicianCount',
              label: 'Clinicians',
              format: (v: number) => v.toLocaleString(),
            },
          ],
        };

      case 'unsigned-notes':
        return {
          ...baseConfig,
          title: 'Unsigned Notes',
          description: 'Notes pending signature (Georgia 7-day compliance)',
          columns: [
            { key: 'clientName', label: 'Client' },
            { key: 'clinicianName', label: 'Clinician' },
            {
              key: 'sessionDate',
              label: 'Session Date',
              format: (v: string) => new Date(v).toLocaleDateString(),
            },
            { key: 'status', label: 'Status' },
            { key: 'daysOverdue', label: 'Days Overdue' },
          ],
        };

      case 'missing-treatment-plans':
        return {
          ...baseConfig,
          title: 'Missing Treatment Plans',
          description: '90-day treatment plan compliance',
          columns: [
            { key: 'clientName', label: 'Client' },
            { key: 'clinicianName', label: 'Primary Clinician' },
            {
              key: 'lastPlanDate',
              label: 'Last Plan Date',
              format: (v: string) => (v ? new Date(v).toLocaleDateString() : 'Never'),
            },
            { key: 'daysOverdue', label: 'Days Overdue' },
          ],
        };

      case 'client-demographics':
        return {
          ...baseConfig,
          title: 'Client Demographics',
          description: 'Age, gender, and status distribution',
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'value', label: 'Value' },
            { key: 'count', label: 'Count', format: (v: number) => v.toLocaleString() },
            {
              key: 'percentage',
              label: 'Percentage',
              format: (v: number) => `${v.toFixed(1)}%`,
            },
          ],
        };

      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <BarChart3 className="w-10 h-10 mr-3 text-indigo-600" />
          Reports & Analytics
        </h1>
        <p className="text-gray-600 text-lg">
          Generate comprehensive reports for revenue, productivity, compliance, and demographics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-10 h-10 text-green-600" />
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 uppercase mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-700">
            {statsLoading ? '...' : `$${quickStats?.totalRevenue?.toLocaleString() || '0'}`}
          </p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-10 h-10 text-blue-600" />
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 uppercase mb-1">Average KVR</h3>
          <p className="text-3xl font-bold text-blue-700">
            {statsLoading ? '...' : `${quickStats?.avgKVR?.toFixed(1) || '0'}%`}
          </p>
          <p className="text-xs text-gray-500 mt-2">Keep visit rate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-10 h-10 text-amber-600" />
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 uppercase mb-1">Unsigned Notes</h3>
          <p className="text-3xl font-bold text-amber-700">
            {statsLoading ? '...' : quickStats?.unsignedNotes || '0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Pending signature</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-10 h-10 text-purple-600" />
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 uppercase mb-1">Active Clients</h3>
          <p className="text-3xl font-bold text-purple-700">
            {statsLoading ? '...' : quickStats?.activeClients || '0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Currently active</p>
        </div>
      </div>

      {/* Revenue Reports */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-8 h-8 mr-3 text-green-600" />
            Revenue Reports
          </h2>
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportCard
            icon={<DollarSign className="w-8 h-8 text-green-600" />}
            title="Revenue by Clinician"
            description="Breakdown of revenue per clinician"
            onView={() => handleViewReport('revenue-clinician')}
          />
          <ReportCard
            icon={<DollarSign className="w-8 h-8 text-green-600" />}
            title="Revenue by CPT Code"
            description="Revenue analysis by service code"
            onView={() => handleViewReport('revenue-cpt')}
          />
          <ReportCard
            icon={<DollarSign className="w-8 h-8 text-green-600" />}
            title="Revenue by Payer"
            description="Insurance payer analysis"
            onView={() => handleViewReport('revenue-payer')}
          />
          <ReportCard
            icon={<DollarSign className="w-8 h-8 text-green-600" />}
            title="Payment Collection Report"
            description="Collection rate and AR aging"
            onView={() => handleViewReport('payment-collection')}
          />
        </div>
      </div>

      {/* Productivity Reports */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="w-8 h-8 mr-3 text-blue-600" />
          Productivity Reports
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportCard
            icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
            title="KVR Analysis"
            description="Keep visit rate by clinician"
            onView={() => handleViewReport('kvr-analysis')}
          />
          <ReportCard
            icon={<Clock className="w-8 h-8 text-blue-600" />}
            title="Sessions per Day"
            description="Daily session counts and trends"
            onView={() => handleViewReport('sessions-per-day')}
          />
        </div>
      </div>

      {/* Compliance Reports */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <CheckCircle className="w-8 h-8 mr-3 text-amber-600" />
          Compliance Reports
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportCard
            icon={<FileText className="w-8 h-8 text-amber-600" />}
            title="Unsigned Notes"
            description="Notes pending signature (Georgia 7-day rule)"
            onView={() => handleViewReport('unsigned-notes')}
          />
          <ReportCard
            icon={<FileText className="w-8 h-8 text-amber-600" />}
            title="Missing Treatment Plans"
            description="90-day treatment plan compliance"
            onView={() => handleViewReport('missing-treatment-plans')}
          />
        </div>
      </div>

      {/* Demographics Reports */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Users className="w-8 h-8 mr-3 text-purple-600" />
          Demographics Reports
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportCard
            icon={<Users className="w-8 h-8 text-purple-600" />}
            title="Client Demographics"
            description="Age, gender, and status distribution"
            onView={() => handleViewReport('client-demographics')}
          />
        </div>
      </div>

      {/* Report View Modal */}
      {modalConfig && <ReportViewModal {...modalConfig} />}
    </div>
  );
}

// Report Card Component
interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onView: () => void;
}

function ReportCard({ icon, title, description, onView }: ReportCardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          <BarChart3 className="w-4 h-4" />
          View Report
        </button>
      </div>
    </div>
  );
}
