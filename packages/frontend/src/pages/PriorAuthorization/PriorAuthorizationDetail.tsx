/**
 * PriorAuthorizationDetail.tsx
 * PRD Section 6.1 - Single PA view with tabs
 *
 * Shows a single Prior Authorization with its questionnaire form
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PriorAuthorizationForm from './PriorAuthorizationForm';

interface PriorAuthorization {
  id: string;
  clientId: string;
  client?: {
    firstName: string;
    lastName: string;
  };
  authorizationNumber: string;
  authorizationType: string;
  status: string;
  sessionsAuthorized: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export default function PriorAuthorizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'details' | 'questionnaire'>('questionnaire');

  // Fetch PA details
  const { data: pa, isLoading, error } = useQuery<PriorAuthorization>({
    queryKey: ['prior-authorization', id],
    queryFn: async () => {
      const response = await api.get(`/prior-authorizations/${id}`);
      return response.data.data || response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Prior Authorization...</p>
        </div>
      </div>
    );
  }

  if (error || !pa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-2">Error Loading Prior Authorization</h2>
          <p>Unable to load the prior authorization details.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'DENIED': return 'bg-red-100 text-red-800 border-red-300';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'EXHAUSTED': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* PA Summary Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Prior Authorization #{pa.authorizationNumber}
            </h1>
            {pa.client && (
              <p className="text-gray-600 mt-1">
                Client: {pa.client.firstName} {pa.client.lastName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-lg border font-semibold ${getStatusColor(pa.status)}`}>
              {pa.status}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Sessions Authorized</p>
            <p className="text-2xl font-bold text-gray-900">{pa.sessionsAuthorized}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Sessions Used</p>
            <p className="text-2xl font-bold text-gray-900">{pa.sessionsUsed}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Sessions Remaining</p>
            <p className="text-2xl font-bold text-indigo-600">{pa.sessionsRemaining}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Valid Until</p>
            <p className="text-lg font-bold text-gray-900">
              {new Date(pa.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveView('questionnaire')}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
              activeView === 'questionnaire'
                ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Clinical Questionnaire
          </button>
          <button
            onClick={() => setActiveView('details')}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
              activeView === 'details'
                ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Authorization Details
          </button>
        </div>
      </div>

      {/* Content */}
      {activeView === 'questionnaire' && (
        <PriorAuthorizationForm
          priorAuthorizationId={id!}
          onSaveSuccess={() => {
            // Could show a toast or update UI
          }}
        />
      )}

      {activeView === 'details' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Authorization Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600">Authorization Number</label>
              <p className="text-lg font-semibold text-gray-900">{pa.authorizationNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Authorization Type</label>
              <p className="text-lg font-semibold text-gray-900">{pa.authorizationType}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Start Date</label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(pa.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">End Date</label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(pa.endDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Created</label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(pa.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Status</label>
              <span className={`inline-block px-3 py-1 rounded-lg border font-semibold ${getStatusColor(pa.status)}`}>
                {pa.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
