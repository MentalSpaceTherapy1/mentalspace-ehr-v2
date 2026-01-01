import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
  User,
  AlertTriangle,
  Eye,
  FileText,
} from 'lucide-react';
import { useScreeningResults, useRunScreening } from '../../hooks/useCredentialing';
import ConfirmModal from '../../components/ConfirmModal';

export default function ScreeningStatus() {
  const [selectedStaff, setSelectedStaff] = useState('');
  const { data: screenings, isLoading } = useScreeningResults(selectedStaff || undefined);
  const runScreening = useRunScreening();

  const [screeningConfirm, setScreeningConfirm] = useState<{
    isOpen: boolean;
    staffId: string;
    staffName: string;
    type: 'OIG' | 'SAM' | 'NPDB';
  }>({
    isOpen: false,
    staffId: '',
    staffName: '',
    type: 'OIG',
  });

  const handleRunScreeningClick = (staffId: string, staffName: string, type: 'OIG' | 'SAM' | 'NPDB') => {
    setScreeningConfirm({ isOpen: true, staffId, staffName, type });
  };

  const confirmRunScreening = async () => {
    const { staffId, type } = screeningConfirm;
    setScreeningConfirm({ isOpen: false, staffId: '', staffName: '', type: 'OIG' });
    try {
      await runScreening.mutateAsync({ staffId, screeningType: type });
      toast.success('Screening initiated successfully');
    } catch (error) {
      toast.error('Failed to run screening');
    }
  };

  const handleRunScreening = async (staffId: string, staffName: string, type: 'OIG' | 'SAM' | 'NPDB') => {
    handleRunScreeningClick(staffId, staffName, type);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      CLEAR: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Clear',
      },
      FLAGGED: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Flagged',
      },
      PENDING: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        icon: <Clock className="w-4 h-4" />,
        label: 'Pending',
      },
    };

    const c = config[status as keyof typeof config] || config.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${c.bg} border-2 ${c.border} ${c.text}`}>
        {c.icon}
        {c.label}
      </span>
    );
  };

  // Group screenings by staff
  const screeningsByStaff = screenings?.reduce((acc: any, screening: any) => {
    if (!acc[screening.staffId]) {
      acc[screening.staffId] = {
        staffId: screening.staffId,
        staffName: screening.staffName,
        screenings: [],
      };
    }
    acc[screening.staffId].screenings.push(screening);
    return acc;
  }, {});

  const staffList = screeningsByStaff ? Object.values(screeningsByStaff) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Shield className="w-12 h-12 text-blue-600 mr-4" />
          OIG/SAM Screening Status
        </h1>
        <p className="text-gray-600 text-lg">
          Monitor exclusion list screening and compliance verification
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          icon={<CheckCircle className="w-8 h-8 text-white" />}
          title="Clear"
          count={screenings?.filter((s) => s.status === 'CLEAR').length || 0}
          gradient="from-green-600 to-green-700"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-8 h-8 text-white" />}
          title="Flagged"
          count={screenings?.filter((s) => s.status === 'FLAGGED').length || 0}
          gradient="from-red-600 to-red-700"
        />
        <SummaryCard
          icon={<Clock className="w-8 h-8 text-white" />}
          title="Pending"
          count={screenings?.filter((s) => s.status === 'PENDING').length || 0}
          gradient="from-yellow-600 to-yellow-700"
        />
      </div>

      {/* Screening Actions */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <RefreshCw className="w-7 h-7 text-purple-600 mr-3" />
          Run Screening
        </h2>
        <p className="text-gray-600 mb-4">
          Screen all staff against OIG, SAM, and NPDB exclusion lists
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => toast('Running OIG screening for all staff...', { icon: '🔍' })}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold"
          >
            <Shield className="w-5 h-5" />
            Run OIG Screening
          </button>
          <button
            onClick={() => toast('Running SAM screening for all staff...', { icon: '🛡️' })}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold"
          >
            <Shield className="w-5 h-5" />
            Run SAM Screening
          </button>
          <button
            onClick={() => toast('Running NPDB screening for all staff...', { icon: '📋' })}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold"
          >
            <Shield className="w-5 h-5" />
            Run NPDB Screening
          </button>
        </div>
      </div>

      {/* Screening Results */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-6 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-7 h-7 text-purple-600 mr-3" />
            Screening Results
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-900">Loading screening results...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-900 mb-2">No screening results</p>
            <p className="text-gray-600">Run a screening to see results</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(staffList as any[]).map((staff: any) => (
              <div key={staff.staffId} className="p-6 hover:bg-purple-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{staff.staffName}</h3>
                      <p className="text-sm text-gray-600">Staff ID: {staff.staffId}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {staff.screenings.map((screening: any) => (
                    <ScreeningCard
                      key={screening.id}
                      screening={screening}
                      onRescreen={() =>
                        handleRunScreening(
                          staff.staffId,
                          staff.staffName,
                          screening.screeningType
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={screeningConfirm.isOpen}
        onClose={() => setScreeningConfirm({ isOpen: false, staffId: '', staffName: '', type: 'OIG' })}
        onConfirm={confirmRunScreening}
        title="Run Screening"
        message={`Run ${screeningConfirm.type} screening for ${screeningConfirm.staffName}?`}
        confirmText="Run Screening"
        confirmVariant="primary"
      />
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  gradient: string;
}

function SummaryCard({ icon, title, count, gradient }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
        {icon}
      </div>
      <p className="text-sm font-bold text-gray-600 uppercase mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{count}</p>
    </div>
  );
}

// Screening Card Component
interface ScreeningCardProps {
  screening: {
    id: string;
    screeningType: string;
    status: string;
    screenedAt: string;
    nextScreeningDate: string;
    findings?: string;
  };
  onRescreen: () => void;
}

function ScreeningCard({ screening, onRescreen }: ScreeningCardProps) {
  const typeConfig = {
    OIG: { bg: 'from-blue-100 to-blue-200', icon: '🔍', name: 'OIG Exclusion' },
    SAM: { bg: 'from-purple-100 to-purple-200', icon: '🛡️', name: 'SAM Exclusion' },
    NPDB: { bg: 'from-indigo-100 to-indigo-200', icon: '📋', name: 'NPDB Check' },
  };

  const config = typeConfig[screening.screeningType as keyof typeof typeConfig] || typeConfig.OIG;

  const statusConfig = {
    CLEAR: { border: 'border-green-200', bg: 'bg-green-50' },
    FLAGGED: { border: 'border-red-200', bg: 'bg-red-50' },
    PENDING: { border: 'border-yellow-200', bg: 'bg-yellow-50' },
  };

  const statusStyle = statusConfig[screening.status as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <div className={`${statusStyle.bg} border-2 ${statusStyle.border} rounded-xl p-4`}>
      <div className={`w-12 h-12 bg-gradient-to-br ${config.bg} rounded-xl flex items-center justify-center mb-3`}>
        <span className="text-2xl">{config.icon}</span>
      </div>

      <h4 className="font-bold text-gray-900 mb-2">{config.name}</h4>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Status:</span>
          {getStatusBadge(screening.status)}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="w-3 h-3" />
          <span>Last: {new Date(screening.screenedAt).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="w-3 h-3" />
          <span>Next: {new Date(screening.nextScreeningDate).toLocaleDateString()}</span>
        </div>
      </div>

      {screening.findings && (
        <div className="mb-4 p-2 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-700 font-bold mb-1">Findings:</p>
          <p className="text-xs text-gray-600">{screening.findings}</p>
        </div>
      )}

      <button
        onClick={onRescreen}
        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-all text-sm font-bold"
      >
        <RefreshCw className="w-4 h-4" />
        Re-screen
      </button>
    </div>
  );
}

function getStatusBadge(status: string) {
  const config = {
    CLEAR: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Clear',
    },
    FLAGGED: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'Flagged',
    },
    PENDING: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: <Clock className="w-3 h-3" />,
      label: 'Pending',
    },
  };

  const c = config[status as keyof typeof config] || config.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}
