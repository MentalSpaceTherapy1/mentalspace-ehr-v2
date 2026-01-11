import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Target,
  Activity,
  BarChart2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  ClipboardList,
  FileText,
} from 'lucide-react';
import api from '../../lib/api';

interface ClientOutcomeMeasure {
  id: string;
  clientId: string;
  measureType: 'PHQ9' | 'GAD7' | 'PCL5';
  totalScore: number;
  severity: string;
  severityLabel: string;
  administeredDate: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
}

interface ClientWithProgress {
  id: string;
  name: string;
  measure: string;
  baseline: number;
  current: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
}

const ProgressTrackingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMeasureType, setSelectedMeasureType] = useState<string>('all');

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  // Fetch clients assigned to this clinician
  const {
    data: clients,
    isLoading: loadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['assignedClients', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(`/clients?therapistId=${currentUser.id}&status=ACTIVE`);
      return response.data.data || [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch outcome measures for all clients
  const {
    data: clientProgress,
    isLoading: loadingProgress,
    error: progressError,
  } = useQuery<ClientWithProgress[]>({
    queryKey: ['clientsProgress', clients, selectedMeasureType],
    queryFn: async () => {
      if (!clients || clients.length === 0) return [];

      // Fetch outcome measures for each client
      const progressPromises = clients.map(async (client: any) => {
        try {
          const response = await api.get(`/outcome-measures/client/${client.id}?limit=50`);
          const measures: ClientOutcomeMeasure[] = response.data.data?.measures || [];

          if (measures.length === 0) return null;

          // Group measures by type and get first and last for each type
          const measuresByType: Record<string, ClientOutcomeMeasure[]> = {};
          measures.forEach((m) => {
            if (!measuresByType[m.measureType]) {
              measuresByType[m.measureType] = [];
            }
            measuresByType[m.measureType].push(m);
          });

          // Return progress data for each measure type
          const progressData: ClientWithProgress[] = [];
          Object.entries(measuresByType).forEach(([measureType, typeMeasures]) => {
            // Sort by date
            typeMeasures.sort(
              (a, b) => new Date(a.administeredDate).getTime() - new Date(b.administeredDate).getTime()
            );
            const baseline = typeMeasures[0];
            const current = typeMeasures[typeMeasures.length - 1];
            const change = current.totalScore - baseline.totalScore;

            // For mental health measures, lower scores are better
            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (change < -2) trend = 'improving';
            else if (change > 2) trend = 'declining';

            progressData.push({
              id: `${client.id}-${measureType}`,
              name: `${client.firstName} ${client.lastName}`,
              measure: measureType,
              baseline: baseline.totalScore,
              current: current.totalScore,
              change,
              trend,
            });
          });

          return progressData;
        } catch (error) {
          console.error(`Error fetching measures for client ${client.id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(progressPromises);
      const allProgress = results.flat().filter((p): p is ClientWithProgress => p !== null);

      // Filter by selected measure type
      if (selectedMeasureType !== 'all') {
        return allProgress.filter((p) => p.measure === selectedMeasureType);
      }

      return allProgress;
    },
    enabled: !!clients && clients.length > 0,
  });

  // Calculate stats from real data
  const stats = React.useMemo(() => {
    if (!clientProgress || !clients) {
      return {
        clientsTracked: 0,
        goalsMet: 0,
        avgImprovement: 0,
        assessmentsDue: 0,
      };
    }

    // Count unique clients with progress data
    const uniqueClients = new Set(clientProgress.map((p) => p.id.split('-')[0]));
    const clientsTracked = uniqueClients.size;

    // Count improving clients (goals met)
    const goalsMet = clientProgress.filter((p) => p.trend === 'improving').length;

    // Calculate average improvement
    const improvements = clientProgress.filter((p) => p.change < 0);
    const avgImprovement =
      improvements.length > 0
        ? Math.round(
            (improvements.reduce((acc, p) => acc + Math.abs(p.change), 0) / improvements.length) * 10
          ) / 10
        : 0;

    // Clients without recent assessments (more than 30 days)
    const assessmentsDue = clients.length - clientsTracked;

    return { clientsTracked, goalsMet, avgImprovement, assessmentsDue };
  }, [clientProgress, clients]);

  const isLoading = loadingClients || loadingProgress;
  const hasError = clientsError || progressError;

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-6 border border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-bold">Error Loading Progress Data</h3>
                <p className="text-sm text-red-500">
                  {(clientsError as Error)?.message || (progressError as Error)?.message || 'Unknown error'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Progress Tracking</h1>
            <p className="text-gray-600">Monitor client outcomes and treatment progress</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Clients Tracked</p>
              {isLoading ? (
                <div className="mt-1">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : (
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.clientsTracked}</p>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Improving</p>
              {isLoading ? (
                <div className="mt-1">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.goalsMet}</p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Avg. Score Change</p>
              {isLoading ? (
                <div className="mt-1">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {stats.avgImprovement > 0 ? `-${stats.avgImprovement}` : '0'}
                </p>
              )}
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Need Assessment</p>
              {isLoading ? (
                <div className="mt-1">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              ) : (
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.assessmentsDue}</p>
              )}
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Client Progress Table */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-green-500" />
            Client Outcome Measures
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedMeasureType}
              onChange={(e) => setSelectedMeasureType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Measures</option>
              <option value="PHQ9">PHQ-9</option>
              <option value="GAD7">GAD-7</option>
              <option value="PCL5">PCL-5</option>
            </select>
            <button
              onClick={() => navigate('/clinician/client-progress')}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              View All Details
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <span className="ml-2 text-gray-500">Loading progress data...</span>
          </div>
        ) : !clientProgress || clientProgress.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No outcome measures recorded yet</p>
            <p className="text-sm mt-1">Start by assigning outcome measures to your clients</p>
            <button
              onClick={() => navigate('/progress-tracking/assign-measures')}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Assign Measures
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-100">
                  <th className="pb-4 font-medium">Client</th>
                  <th className="pb-4 font-medium">Measure</th>
                  <th className="pb-4 font-medium">Baseline</th>
                  <th className="pb-4 font-medium">Current</th>
                  <th className="pb-4 font-medium">Change</th>
                  <th className="pb-4 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {clientProgress.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/clinician/client-progress?clientId=${client.id.split('-')[0]}`)}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {client.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <span className="font-medium text-gray-900">{client.name}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {client.measure === 'PHQ9'
                          ? 'PHQ-9'
                          : client.measure === 'GAD7'
                            ? 'GAD-7'
                            : 'PCL-5'}
                      </span>
                    </td>
                    <td className="py-4 text-gray-600">{client.baseline}</td>
                    <td className="py-4 font-medium text-gray-900">{client.current}</td>
                    <td className="py-4">
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          client.change < 0 ? 'text-green-600' : client.change > 0 ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {client.change < 0 ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : client.change > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : null}
                        {client.change === 0 ? '0' : Math.abs(client.change)}
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          client.trend === 'improving'
                            ? 'bg-green-100 text-green-700'
                            : client.trend === 'declining'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {client.trend === 'improving'
                          ? 'Improving'
                          : client.trend === 'declining'
                            ? 'Needs Attention'
                            : 'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/clinician/client-progress')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-green-100 rounded-xl inline-block mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Client Progress</h3>
          <p className="text-sm text-gray-500">View detailed self-tracking progress for all clients</p>
        </button>

        <button
          onClick={() => navigate('/progress-tracking/assign-measures')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-blue-100 rounded-xl inline-block mb-4">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Assign Measures</h3>
          <p className="text-sm text-gray-500">Assign outcome measures (PHQ-9, GAD-7) to clients</p>
        </button>

        <button
          onClick={() => navigate('/progress-tracking/reports')}
          className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 text-left"
        >
          <div className="p-3 bg-purple-100 rounded-xl inline-block mb-4">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Progress Reports</h3>
          <p className="text-sm text-gray-500">Generate outcome measure reports</p>
        </button>
      </div>
    </div>
  );
};

export default ProgressTrackingDashboard;

