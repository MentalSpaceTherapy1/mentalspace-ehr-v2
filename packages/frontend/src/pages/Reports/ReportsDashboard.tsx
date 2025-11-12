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
import ReportViewModalEnhanced from '../../components/ReportViewModalEnhanced';

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
        const revenueClinicianData = query.data?.data?.report || query.data?.report || [];
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
              key: 'averagePerSession',
              label: 'Avg per Session',
              format: (v: number) => `$${v.toLocaleString()}`,
            },
          ],
          data: Array.isArray(revenueClinicianData) ? revenueClinicianData : [],
          summary: Array.isArray(revenueClinicianData) && revenueClinicianData.length > 0
            ? [
                {
                  label: 'Total Clinicians',
                  value: revenueClinicianData.length,
                },
                {
                  label: 'Total Revenue',
                  value: `$${revenueClinicianData.reduce((sum: number, r: any) => sum + (r.totalRevenue || 0), 0).toLocaleString()}`,
                },
                {
                  label: 'Total Sessions',
                  value: revenueClinicianData.reduce((sum: number, r: any) => sum + (r.sessionCount || 0), 0).toLocaleString(),
                },
              ]
            : [],
          chartConfig: {
            xKey: 'clinicianName',
            yKeys: [
              { key: 'totalRevenue', name: 'Total Revenue', color: '#6366f1' },
              { key: 'sessionCount', name: 'Sessions', color: '#10b981' },
            ],
            defaultChartType: 'bar' as const,
            enabledChartTypes: ['bar' as const, 'line' as const],
          },
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
          chartConfig: {
            xKey: 'cptCode',
            yKeys: [
              { key: 'totalRevenue', name: 'Total Revenue', color: '#8b5cf6' },
            ],
            nameKey: 'cptCode',
            valueKey: 'totalRevenue',
            defaultChartType: 'bar' as const,
            enabledChartTypes: ['bar' as const, 'donut' as const],
          },
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
          chartConfig: {
            xKey: 'payerName',
            nameKey: 'payerName',
            valueKey: 'totalRevenue',
            defaultChartType: 'pie' as const,
            enabledChartTypes: ['pie' as const, 'donut' as const, 'bar' as const],
          },
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
          chartConfig: {
            xKey: 'clinicianName',
            yKeys: [
              { key: 'kept', name: 'Kept', color: '#10b981' },
              { key: 'cancelled', name: 'Cancelled', color: '#f59e0b' },
              { key: 'noShow', name: 'No-Show', color: '#ef4444' },
            ],
            defaultChartType: 'bar' as const,
            enabledChartTypes: ['bar' as const],
          },
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
          chartConfig: {
            xKey: 'date',
            yKeys: [
              { key: 'sessionCount', name: 'Sessions', color: '#3b82f6' },
            ],
            defaultChartType: 'area' as const,
            enabledChartTypes: ['area' as const, 'line' as const, 'bar' as const],
          },
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
          chartConfig: {
            xKey: 'clinicianName',
            yKeys: [
              { key: 'daysOverdue', name: 'Days Overdue', color: '#ef4444' },
            ],
            defaultChartType: 'bar' as const,
            enabledChartTypes: ['bar' as const],
          },
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
          chartConfig: {
            xKey: 'value',
            nameKey: 'value',
            valueKey: 'count',
            defaultChartType: 'pie' as const,
            enabledChartTypes: ['pie' as const, 'donut' as const, 'bar' as const],
          },
        };

      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-5xl mr-3">📊</span>
          Reports & Analytics
        </h1>
        <p className="text-gray-600 text-lg">
          Generate comprehensive reports for revenue, productivity, compliance, and demographics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-5xl">💰</span>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {statsLoading ? '...' : `$${quickStats?.totalRevenue?.toLocaleString() || '0'}`}
          </p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-teal-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-5xl">📊</span>
            <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-teal-600" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Average KVR</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            {statsLoading ? '...' : `${quickStats?.avgKVR?.toFixed(1) || '0'}%`}
          </p>
          <p className="text-xs text-gray-500 mt-2">Keep visit rate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-amber-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-5xl">📝</span>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Unsigned Notes</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            {statsLoading ? '...' : quickStats?.unsignedNotes || '0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Pending signature</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-5xl">👥</span>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Active Clients</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {statsLoading ? '...' : quickStats?.activeClients || '0'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Currently active</p>
        </div>
      </div>

      {/* Revenue Reports */}
      <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-emerald-100 p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center">
            <span className="text-4xl mr-3">💵</span>
            Revenue Reports
          </h2>
          <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold">
            <Download className="w-5 h-5" />
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
      <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-teal-100 p-8 mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6 flex items-center">
          <span className="text-4xl mr-3">📈</span>
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
      <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-amber-100 p-8 mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-6 flex items-center">
          <span className="text-4xl mr-3">✅</span>
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
      <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-purple-100 p-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center">
          <span className="text-4xl mr-3">👥</span>
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
      {modalConfig && <ReportViewModalEnhanced {...modalConfig} />}
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
    <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center shadow-md">
          {icon}
        </div>
        <span className="text-3xl">📄</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{description}</p>
      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
        >
          <BarChart3 className="w-5 h-5" />
          View Report
        </button>
      </div>
    </div>
  );
}
