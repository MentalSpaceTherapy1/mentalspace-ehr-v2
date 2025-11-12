/**
 * Module 8: AI & Predictive Analytics
 * No-Show Risk Indicator - Display risk badge on appointments
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface NoShowPrediction {
  appointmentId: string;
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  factors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  recommendations: string[];
}

interface NoShowRiskIndicatorProps {
  appointmentId: string;
  showDetails?: boolean;
  inline?: boolean;
}

export const NoShowRiskIndicator: React.FC<NoShowRiskIndicatorProps> = ({
  appointmentId,
  showDetails = false,
  inline = false
}) => {
  const [prediction, setPrediction] = useState<NoShowPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrediction();
  }, [appointmentId]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/predictions/noshow/${appointmentId}`);
      setPrediction(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching no-show prediction:', err);
      setError(err.response?.data?.message || 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={inline ? 'inline-block' : ''}>
        <span className="text-xs text-gray-500">Calculating risk...</span>
      </div>
    );
  }

  if (error || !prediction) {
    return null;
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'HIGH':
        return '🚨';
      case 'MEDIUM':
        return '⚠️';
      case 'LOW':
        return '✓';
      default:
        return '•';
    }
  };

  if (!showDetails) {
    return (
      <div className={inline ? 'inline-block' : ''}>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(
            prediction.riskLevel
          )}`}
          title={`No-show risk: ${(prediction.probability * 100).toFixed(0)}%`}
        >
          <span className="mr-1">{getRiskIcon(prediction.riskLevel)}</span>
          {prediction.riskLevel} RISK
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">No-Show Risk Assessment</h4>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(
            prediction.riskLevel
          )}`}
        >
          <span className="mr-1">{getRiskIcon(prediction.riskLevel)}</span>
          {prediction.riskLevel} RISK
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Probability:</span>
          <span className="font-semibold text-gray-900">
            {(prediction.probability * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              prediction.riskLevel === 'HIGH'
                ? 'bg-red-500'
                : prediction.riskLevel === 'MEDIUM'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${prediction.probability * 100}%` }}
          />
        </div>
      </div>

      {prediction.factors.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Risk Factors:</h5>
          <div className="space-y-1">
            {prediction.factors.map((factor, index) => (
              <div key={index} className="text-xs text-gray-600">
                <span className="font-medium">{factor.factor}:</span>{' '}
                <span>{factor.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {prediction.recommendations.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Recommendations:</h5>
          <ul className="space-y-1">
            {prediction.recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start">
                <span className="text-blue-500 mr-2">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        Confidence: {(prediction.confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
};

export default NoShowRiskIndicator;
