import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { api } from '../../lib/api';

type MeasureType = 'PHQ9' | 'GAD7' | 'PCL5';

interface ProgressDataPoint {
  id: string;
  date: string;
  score: number;
  severity: string;
  severityLabel: string;
}

interface ProgressData {
  measureType: MeasureType;
  dataPoints: ProgressDataPoint[];
}

interface ProgressChartProps {
  clientId: string;
  measureType: MeasureType;
}

// Severity thresholds for reference lines
const SEVERITY_THRESHOLDS = {
  PHQ9: [
    { value: 5, label: 'Mild', color: '#fbbf24' },
    { value: 10, label: 'Moderate', color: '#fb923c' },
    { value: 15, label: 'Moderately Severe', color: '#ef4444' },
    { value: 20, label: 'Severe', color: '#991b1b' },
  ],
  GAD7: [
    { value: 5, label: 'Mild', color: '#fbbf24' },
    { value: 10, label: 'Moderate', color: '#fb923c' },
    { value: 15, label: 'Severe', color: '#ef4444' },
  ],
  PCL5: [
    { value: 31, label: 'Mild', color: '#fbbf24' },
    { value: 41, label: 'Moderate', color: '#fb923c' },
    { value: 51, label: 'Severe', color: '#ef4444' },
  ],
};

const MEASURE_INFO = {
  PHQ9: { name: 'PHQ-9 (Depression)', maxScore: 27, color: '#3b82f6' },
  GAD7: { name: 'GAD-7 (Anxiety)', maxScore: 21, color: '#8b5cf6' },
  PCL5: { name: 'PCL-5 (PTSD)', maxScore: 80, color: '#10b981' },
};

export default function ProgressChart({ clientId, measureType }: ProgressChartProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [clientId, measureType]);

  const loadProgressData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/outcome-measures/progress/${clientId}/${measureType}`);
      setProgressData(res.data.data);
    } catch (err: any) {
      console.error('Error loading progress data:', err);
      setError(err.response?.data?.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading progress data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!progressData || progressData.dataPoints.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          No {MEASURE_INFO[measureType].name} assessments recorded yet.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Administer at least one assessment to see progress over time.
        </p>
      </div>
    );
  }

  // Format data for chart
  const chartData = progressData.dataPoints.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: new Date(point.date).toLocaleDateString(),
    score: point.score,
    severityLabel: point.severityLabel,
  }));

  const info = MEASURE_INFO[measureType];
  const thresholds = SEVERITY_THRESHOLDS[measureType];

  // Calculate statistics
  const scores = progressData.dataPoints.map(p => p.score);
  const latestScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const trend = latestScore - firstScore;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{info.name} Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Latest Score</p>
            <p className="text-2xl font-bold text-gray-900">{latestScore}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">First Score</p>
            <p className="text-2xl font-bold text-gray-900">{firstScore}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">{averageScore.toFixed(1)}</p>
          </div>
          <div className={`rounded-lg p-4 ${trend <= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm text-gray-600">Trend</p>
            <p className={`text-2xl font-bold ${trend <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {trend < 0 ? 'Improving' : trend > 0 ? 'Worsening' : 'No change'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, info.maxScore]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="text-sm font-semibold">{data.fullDate}</p>
                      <p className="text-sm">
                        Score: <span className="font-bold">{data.score}</span>
                      </p>
                      <p className="text-sm text-gray-600">{data.severityLabel}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />

            {/* Severity threshold lines */}
            {thresholds.map(threshold => (
              <ReferenceLine
                key={threshold.value}
                y={threshold.value}
                stroke={threshold.color}
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: threshold.label,
                  position: 'right',
                  fill: threshold.color,
                  fontSize: 12,
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="score"
              stroke={info.color}
              strokeWidth={3}
              dot={{ fill: info.color, r: 6 }}
              activeDot={{ r: 8 }}
              name="Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Interpretation</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Total Assessments:</strong> {progressData.dataPoints.length}
          </p>
          <p>
            <strong>Score Range:</strong> {Math.min(...scores)} - {Math.max(...scores)} (out of {info.maxScore})
          </p>
          <p>
            <strong>Note:</strong> Lower scores indicate improvement. Dashed lines show severity thresholds.
          </p>
        </div>
      </div>
    </div>
  );
}
