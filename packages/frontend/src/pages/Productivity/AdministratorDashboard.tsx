import React, { useState } from 'react';
import { useAdministratorDashboard } from '../../hooks/productivity/useProductivityMetrics';
import MetricCard from '../../components/Productivity/MetricCard';
import {
  Building2,
  DollarSign,
  Users,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

export default function AdministratorDashboard() {
  const { data: dashboardData, isLoading, error } = useAdministratorDashboard();
  const [selectedMetric, setSelectedMetric] = useState<string>('revenue');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading practice dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2 text-center">Error Loading Dashboard</h2>
          <p className="text-red-700 text-center">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const practiceMetrics = dashboardData?.practiceMetrics || {};
  const revenueMetrics = dashboardData?.revenueMetrics || {};
  const georgiaCompliance = dashboardData?.georgiaCompliance || {};
  const clinicianPerformance = dashboardData?.clinicianPerformance || [];

  // Extract key metrics
  const totalRevenue = revenueMetrics.TOTAL_REVENUE?.value || 0;
  const collectionRate = revenueMetrics.COLLECTION_RATE?.value || 0;
  const avgReimbursementRate = revenueMetrics.AVG_REIMBURSEMENT_RATE?.value || 0;
  const practiceKVR = practiceMetrics.KVR?.value || 0;
  const practiceUtilization = practiceMetrics.UTILIZATION_RATE?.value || 0;
  const totalClinicians = clinicianPerformance.length;

  // Georgia Compliance metrics
  const noteSignatureCompliance = georgiaCompliance.noteSignatureCompliance || 0;
  const treatmentPlanCompliance = georgiaCompliance.treatmentPlanCompliance || 0;
  const consentCompliance = georgiaCompliance.consentCompliance || 0;
  const supervisionCompliance = georgiaCompliance.supervisionCompliance || 0;

  const getComplianceStatus = (rate: number): 'success' | 'warning' | 'danger' => {
    if (rate >= 95) return 'success';
    if (rate >= 85) return 'warning';
    return 'danger';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Practice Overview Dashboard</h1>
        <p className="text-gray-600 text-lg">Executive view of practice performance and compliance</p>
        <div className="mt-2 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700 font-medium">MentalSpace EHR</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-gray-700 font-medium">{totalClinicians} Active Clinicians</span>
          </div>
        </div>
      </div>

      {/* Practice Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Practice KVR"
          value={`${practiceKVR.toFixed(1)}%`}
          subtitle="Overall keep visit rate"
          benchmark={85}
          status={practiceKVR >= 85 ? 'success' : practiceKVR >= 70 ? 'warning' : 'danger'}
          trend={practiceMetrics?.KVR?.trend}
        />

        <MetricCard
          title="Utilization Rate"
          value={`${practiceUtilization.toFixed(1)}%`}
          subtitle="Schedule efficiency"
          benchmark={80}
          status={practiceUtilization >= 80 ? 'success' : practiceUtilization >= 65 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="Collection Rate"
          value={`${collectionRate.toFixed(1)}%`}
          subtitle="Revenue cycle health"
          benchmark={95}
          status={collectionRate >= 95 ? 'success' : collectionRate >= 85 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="Avg Reimbursement"
          value={`$${avgReimbursementRate.toFixed(2)}`}
          subtitle="Per session"
          status={avgReimbursementRate >= 100 ? 'success' : 'warning'}
        />
      </div>

      {/* Revenue Metrics */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-7 h-7 mr-3 text-green-600" />
            Revenue Cycle Health
          </h2>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold"
          >
            <option value="revenue">Total Revenue</option>
            <option value="collections">Collections</option>
            <option value="outstanding">Outstanding AR</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600 uppercase mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-700 mb-1">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">This month</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
            <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600 uppercase mb-2">Collection Rate</h3>
            <p className="text-3xl font-bold text-blue-700 mb-1">{collectionRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Target: 95%</p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-center">
            <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-600 uppercase mb-2">Avg Reimbursement</h3>
            <p className="text-3xl font-bold text-purple-700 mb-1">
              ${avgReimbursementRate.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Per session</p>
          </div>
        </div>
      </div>

      {/* Georgia Compliance Dashboard */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="w-7 h-7 mr-3 text-blue-600" />
            Georgia Compliance Dashboard
          </h2>
          <span className="text-sm text-gray-600">State regulatory requirements</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Note Signature Compliance */}
          <div
            className={`rounded-xl border-2 p-6 ${
              getComplianceStatus(noteSignatureCompliance) === 'success'
                ? 'bg-green-50 border-green-200'
                : getComplianceStatus(noteSignatureCompliance) === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <FileCheck className="w-8 h-8 text-gray-700" />
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  getComplianceStatus(noteSignatureCompliance) === 'success'
                    ? 'bg-green-200 text-green-800'
                    : getComplianceStatus(noteSignatureCompliance) === 'warning'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-red-200 text-red-800'
                }`}
              >
                {getComplianceStatus(noteSignatureCompliance).toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">7-Day Note Signature</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {noteSignatureCompliance.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Notes signed within 7 days</p>
          </div>

          {/* Treatment Plan Compliance */}
          <div
            className={`rounded-xl border-2 p-6 ${
              getComplianceStatus(treatmentPlanCompliance) === 'success'
                ? 'bg-green-50 border-green-200'
                : getComplianceStatus(treatmentPlanCompliance) === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-gray-700" />
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  getComplianceStatus(treatmentPlanCompliance) === 'success'
                    ? 'bg-green-200 text-green-800'
                    : getComplianceStatus(treatmentPlanCompliance) === 'warning'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-red-200 text-red-800'
                }`}
              >
                {getComplianceStatus(treatmentPlanCompliance).toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">90-Day Treatment Plan</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {treatmentPlanCompliance.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Plans reviewed on time</p>
          </div>

          {/* Consent Compliance */}
          <div
            className={`rounded-xl border-2 p-6 ${
              getComplianceStatus(consentCompliance) === 'success'
                ? 'bg-green-50 border-green-200'
                : getComplianceStatus(consentCompliance) === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <FileCheck className="w-8 h-8 text-gray-700" />
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  getComplianceStatus(consentCompliance) === 'success'
                    ? 'bg-green-200 text-green-800'
                    : getComplianceStatus(consentCompliance) === 'warning'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-red-200 text-red-800'
                }`}
              >
                {getComplianceStatus(consentCompliance).toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Informed Consent</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {consentCompliance.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Active consents on file</p>
          </div>

          {/* Supervision Compliance */}
          <div
            className={`rounded-xl border-2 p-6 ${
              getComplianceStatus(supervisionCompliance) === 'success'
                ? 'bg-green-50 border-green-200'
                : getComplianceStatus(supervisionCompliance) === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-gray-700" />
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  getComplianceStatus(supervisionCompliance) === 'success'
                    ? 'bg-green-200 text-green-800'
                    : getComplianceStatus(supervisionCompliance) === 'warning'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-red-200 text-red-800'
                }`}
              >
                {getComplianceStatus(supervisionCompliance).toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Supervision Hours</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {supervisionCompliance.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Required hours completed</p>
          </div>
        </div>

        {/* Compliance Notes */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Georgia State Requirements:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>" Clinical notes must be signed within 7 days of service</li>
            <li>" Treatment plans must be reviewed every 90 days</li>
            <li>" Informed consent required for all clients</li>
            <li>" LPC Associates require 100 hours of supervision (3,000 total hours)</li>
          </ul>
        </div>
      </div>

      {/* Clinician Performance Matrix */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-7 h-7 mr-3 text-indigo-600" />
            Clinician Performance Matrix
          </h2>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
            Export Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Clinician</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">KVR</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Utilization</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Documentation</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Revenue</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Overall</th>
              </tr>
            </thead>
            <tbody>
              {clinicianPerformance.map((clinician: any, index: number) => {
                const kvr = clinician?.metrics?.KVR?.value || 0;
                const utilization = clinician?.metrics?.UTILIZATION_RATE?.value || 0;
                const docRate = clinician?.metrics?.DOCUMENTATION_COMPLETION_RATE?.value || 0;
                const revenue = clinician?.metrics?.REVENUE_GENERATED?.value || 0;

                // Calculate overall score (weighted average)
                const overallScore =
                  kvr * 0.3 + utilization * 0.25 + docRate * 0.25 + (revenue / 10000) * 0.2;

                const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                return (
                  <tr
                    key={clinician.userId}
                    className={`${rowBg} hover:bg-indigo-50 transition-colors border-b border-gray-200`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-700 font-bold text-sm">
                            {clinician.firstName?.[0]}{clinician.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {clinician.firstName} {clinician.lastName}
                          </p>
                          <p className="text-xs text-gray-600">{clinician.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">{kvr.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">{utilization.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">{docRate.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">${revenue.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          overallScore >= 80
                            ? 'bg-green-100 text-green-700'
                            : overallScore >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {overallScore.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
