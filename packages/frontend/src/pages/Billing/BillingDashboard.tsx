import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AgingBucket {
  clientId: string;
  clientName: string;
  balance: number;
}

interface AgingReport {
  current: AgingBucket[];
  days30: AgingBucket[];
  days60: AgingBucket[];
  days90: AgingBucket[];
  days120Plus: AgingBucket[];
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days120Plus: number;
    total: number;
  };
}

interface RevenueReport {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  averageChargeAmount: number;
  averagePaymentAmount: number;
  chargesByStatus: Array<{ status: string; count: number; totalAmount: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; collected: number }>;
}

export default function BillingDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch aging report
  const { data: agingReport, isLoading: agingLoading } = useQuery<AgingReport>({
    queryKey: ['billing', 'aging'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/billing/reports/aging', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Fetch revenue report
  const { data: revenueReport, isLoading: revenueLoading } = useQuery<RevenueReport>({
    queryKey: ['billing', 'revenue', dateRange],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const response = await axios.get(`/billing/reports/revenue?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  const isLoading = agingLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Billing & Revenue Dashboard
          </h1>
          <p className="text-gray-600">Comprehensive financial overview and analytics</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/billing/charges/new')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">New Charge</div>
              <div className="text-sm text-gray-600">Create charge entry</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/billing/payments/new')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">Post Payment</div>
              <div className="text-sm text-gray-600">Record payment</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/billing/charges')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">View Charges</div>
              <div className="text-sm text-gray-600">Manage all charges</div>
            </div>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-600">Total Revenue</div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              ${revenueReport?.totalRevenue.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600 mt-1">All charges billed</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-600">Collected</div>
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">
              ${revenueReport?.totalCollected.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {revenueReport?.collectionRate.toFixed(1)}% collection rate
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-600">Outstanding</div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-600">
              ${revenueReport?.totalOutstanding.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Unpaid balances</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-600">Avg Charge</div>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-indigo-600">
              ${revenueReport?.averageChargeAmount.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Per service</div>
          </div>
        </div>

        {/* Accounts Receivable Aging */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Accounts Receivable Aging</h2>
            <p className="text-gray-600">Outstanding balances by aging period</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <div className="text-sm font-semibold text-green-700 mb-2">Current</div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${agingReport?.totals.current.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-green-600">{agingReport?.current.length || 0} accounts</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200">
              <div className="text-sm font-semibold text-yellow-700 mb-2">1-30 Days</div>
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                ${agingReport?.totals.days30.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-yellow-600">{agingReport?.days30.length || 0} accounts</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200">
              <div className="text-sm font-semibold text-orange-700 mb-2">31-60 Days</div>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                ${agingReport?.totals.days60.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-orange-600">{agingReport?.days60.length || 0} accounts</div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200">
              <div className="text-sm font-semibold text-red-700 mb-2">61-90 Days</div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                ${agingReport?.totals.days90.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-red-600">{agingReport?.days90.length || 0} accounts</div>
            </div>

            <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-xl p-6 border-2 border-red-300">
              <div className="text-sm font-semibold text-red-800 mb-2">90+ Days</div>
              <div className="text-3xl font-bold text-red-700 mb-2">
                ${agingReport?.totals.days120Plus.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-red-700">{agingReport?.days120Plus.length || 0} accounts</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-700">Total Outstanding</div>
              <div className="text-3xl font-bold text-purple-600">
                ${agingReport?.totals.total.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Charge Status Breakdown */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Charges by Status</h2>
            <p className="text-gray-600">Distribution of charge entries</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueReport?.chargesByStatus.map((status) => (
              <div
                key={status.status}
                className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200"
              >
                <div className="text-sm font-semibold text-purple-700 mb-2">{status.status}</div>
                <div className="text-2xl font-bold text-purple-600 mb-1">{status.count}</div>
                <div className="text-sm text-gray-600">${status.totalAmount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
