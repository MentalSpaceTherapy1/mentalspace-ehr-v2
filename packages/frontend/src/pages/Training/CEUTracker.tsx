import React, { useState } from 'react';
import {
  Award,
  Download,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useCEURecords, useCEUSummary } from '../../hooks/useTraining';
import DonutChart from '../../components/charts/DonutChart';

export default function CEUTracker() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: ceuRecords } = useCEURecords(undefined, selectedYear);
  const { data: ceuSummary } = useCEUSummary(undefined, selectedYear);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Mock data for chart
  const creditTypeData = [
    { name: 'APA', value: ceuSummary?.byType?.APA || 12 },
    { name: 'NBCC', value: ceuSummary?.byType?.NBCC || 8 },
    { name: 'NASW', value: ceuSummary?.byType?.NASW || 6 },
    { name: 'Other', value: ceuSummary?.byType?.Other || 4 },
  ];

  const totalEarned = ceuSummary?.totalEarned || 30;
  const totalRequired = ceuSummary?.totalRequired || 40;
  const percentComplete = ((totalEarned / totalRequired) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">🏆</span>
          CEU Credits Tracker
        </h1>
        <p className="text-gray-600 text-lg">
          Monitor your continuing education credits and maintain professional licensure
        </p>
      </div>

      {/* Year Selector */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Viewing Credits for:</h2>
          <div className="flex gap-2">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                  selectedYear === year
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Progress Ring */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-100 p-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-6 flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              Annual Progress
            </h2>

            {/* Circular Progress */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative w-64 h-64">
                <svg className="transform -rotate-90 w-64 h-64">
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke="#fef3c7"
                    strokeWidth="24"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke="url(#gradientCEU)"
                    strokeWidth="24"
                    fill="none"
                    strokeDasharray={`${(Number(percentComplete) / 100) * 704} 704`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradientCEU" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#eab308" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {percentComplete}%
                  </span>
                  <span className="text-sm text-gray-600 mt-2">Complete</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-gray-700">Earned</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{totalEarned}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-gray-700">Required</span>
                </div>
                <p className="text-3xl font-bold text-amber-600">{totalRequired}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Remaining</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {Math.max(0, totalRequired - totalEarned)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Export Report */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-600" />
              Reports
            </h3>
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold mb-3">
              <Download className="w-5 h-5" />
              Export PDF Report
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold">
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>

          {/* Expiration Alert */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-xl border-2 border-red-200 p-6">
            <h3 className="text-xl font-bold text-red-900 mb-2 flex items-center gap-2">
              <Clock className="w-6 h-6 text-red-600" />
              Expiration Alert
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              3 credits expiring in 30 days
            </p>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition-colors">
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Credit Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <DonutChart
          data={creditTypeData}
          nameKey="name"
          valueKey="value"
          title="Credits by Type"
          height={300}
          centerLabel="Total CEUs"
          centerValue={totalEarned.toString()}
        />

        {/* Credit Type Table */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-amber-600" />
            Breakdown by Type
          </h2>
          <div className="space-y-3">
            {creditTypeData.map((item, index) => {
              const colors = [
                'from-indigo-500 to-purple-500',
                'from-purple-500 to-pink-500',
                'from-pink-500 to-red-500',
                'from-orange-500 to-amber-500',
              ];
              return (
                <div
                  key={item.name}
                  className="bg-gradient-to-r from-gray-50 to-amber-50 rounded-xl p-4 border border-amber-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <span className="text-2xl font-bold text-amber-600">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${colors[index]} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${(item.value / totalEarned) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Credits History */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-amber-600" />
          Credits History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Course
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Credit Type
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Credits
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Earned Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Expires
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ceuRecords && ceuRecords.length > 0 ? (
                ceuRecords.map((record: any) => (
                  <tr key={record.id} className="hover:bg-amber-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {record.courseName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                        {record.creditType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-600">
                      {record.credits}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(record.earnedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.expiresAt
                        ? new Date(record.expiresAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      {record.expiresAt && new Date(record.expiresAt) < new Date() ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          EXPIRED
                        </span>
                      ) : record.expiresAt &&
                        new Date(record.expiresAt) <
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                          EXPIRING SOON
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No CEU records found for {selectedYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
