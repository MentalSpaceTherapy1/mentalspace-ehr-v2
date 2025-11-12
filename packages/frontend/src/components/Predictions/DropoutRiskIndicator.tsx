/**
 * Module 8: AI & Predictive Analytics
 * Dropout Risk Indicator - Display dropout risk on client profiles
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface DropoutPrediction {
  clientId: string;
  probability30Days: number;
  probability60Days: number;
  probability90Days: number;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  factors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  interventions: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    intervention: string;
    description: string;
  }[];
}

interface DropoutRiskIndicatorProps {
  clientId: string;
  showDetails?: boolean;
  inline?: boolean;
}

export const DropoutRiskIndicator: React.FC<DropoutRiskIndicatorProps> = ({
  clientId,
  showDetails = false,
  inline = false
}) => {
  const [prediction, setPrediction] = useState<DropoutPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrediction();
  }, [clientId]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/predictions/dropout/${clientId}`);
      setPrediction(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dropout prediction:', err);
      setError(err.response?.data?.message || 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={inline ? 'inline-block' : ''}>
        <span className="text-xs text-gray-500">Analyzing retention risk...</span>
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      case 'LOW':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
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
            prediction.overallRiskLevel
          )}`}
          title={`30-day dropout risk: ${(prediction.probability30Days * 100).toFixed(0)}%`}
        >
          <span className="mr-1">{getRiskIcon(prediction.overallRiskLevel)}</span>
          DROPOUT: {prediction.overallRiskLevel}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Treatment Retention Risk</h4>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(
            prediction.overallRiskLevel
          )}`}
        >
          <span className="mr-1">{getRiskIcon(prediction.overallRiskLevel)}</span>
          {prediction.overallRiskLevel} RISK
        </span>
      </div>

      {/* Risk Timeline */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">30 Days:</span>
          <span className="text-gray-900 font-semibold">
            {(prediction.probability30Days * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${prediction.probability30Days * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">60 Days:</span>
          <span className="text-gray-900 font-semibold">
            {(prediction.probability60Days * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full"
            style={{ width: `${prediction.probability60Days * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">90 Days:</span>
          <span className="text-gray-900 font-semibold">
            {(prediction.probability90Days * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-500 h-2 rounded-full"
            style={{ width: `${prediction.probability90Days * 100}%` }}
          />
        </div>
      </div>

      {prediction.factors.length > 0 && (
        <div className="mb-4">
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

      {prediction.interventions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">
            Recommended Interventions:
          </h5>
          <div className="space-y-2">
            {prediction.interventions.map((intervention, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded p-2"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-900">
                    {intervention.intervention}
                  </span>
                  <span
                    className={`text-xs font-medium ${getPriorityColor(
                      intervention.priority
                    )}`}
                  >
                    {intervention.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{intervention.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
        Confidence: {(prediction.confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
};

export default DropoutRiskIndicator;
