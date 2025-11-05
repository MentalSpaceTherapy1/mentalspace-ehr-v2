import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import DuplicateMatchCard from '../../components/Clients/DuplicateMatchCard';
import MergeDuplicatesDialog from '../../components/Clients/MergeDuplicatesDialog';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryPhone: string;
  medicalRecordNumber: string;
}

interface DuplicateRecord {
  id: string;
  client1: Client;
  client2: Client;
  matchType: string;
  confidenceScore: number;
  matchFields: string[];
  createdAt: string;
}

interface DuplicateStats {
  total: number;
  pending: number;
  dismissed: number;
  merged: number;
  byMatchType: Array<{
    matchType: string;
    _count: number;
  }>;
}

export default function DuplicateDetectionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateRecord | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  // Fetch pending duplicates
  const { data: duplicatesData, isLoading: duplicatesLoading, error: duplicatesError } = useQuery({
    queryKey: ['duplicates', 'pending'],
    queryFn: async () => {
      const response = await api.get('/duplicates/pending');
      return response.data;
    },
  });

  // Fetch duplicate statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['duplicates', 'stats'],
    queryFn: async () => {
      const response = await api.get('/duplicates/stats');
      return response.data;
    },
  });

  const duplicates: DuplicateRecord[] = duplicatesData?.duplicates || [];
  const stats: DuplicateStats = statsData || { total: 0, pending: 0, dismissed: 0, merged: 0, byMatchType: [] };

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (duplicateId: string) => {
      const response = await api.post(`/duplicates/${duplicateId}/dismiss`, {
        resolutionNotes: 'Dismissed by user',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
    },
  });

  const handleDismiss = async (duplicateId: string) => {
    if (window.confirm('Are you sure you want to dismiss this potential duplicate?')) {
      try {
        await dismissMutation.mutateAsync(duplicateId);
      } catch (error) {
        console.error('Error dismissing duplicate:', error);
        alert('Failed to dismiss duplicate. Please try again.');
      }
    }
  };

  const handleMerge = (duplicate: DuplicateRecord) => {
    setSelectedDuplicate(duplicate);
    setMergeDialogOpen(true);
  };

  const handleMergeComplete = () => {
    setMergeDialogOpen(false);
    setSelectedDuplicate(null);
    queryClient.invalidateQueries({ queryKey: ['duplicates'] });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'from-red-500 to-rose-600';
    if (score >= 0.7) return 'from-yellow-500 to-amber-600';
    return 'from-green-500 to-emerald-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'High Confidence';
    if (score >= 0.7) return 'Medium Confidence';
    return 'Low Confidence';
  };

  if (duplicatesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-2 flex items-center">
            <span className="mr-2">Warning</span> Error Loading Duplicates
          </h2>
          <p>Failed to load duplicate records. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/clients')}
          className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
        >
          Back to Clients
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-3">Duplicate Detection</span>
            </h1>
            <p className="text-gray-600 text-lg">Review and resolve potential duplicate client records</p>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">Total Duplicates</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.total}
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">Total</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">Pending Review</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.pending}
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">Pending</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">Merged</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.merged}
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">Merged</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-1">Dismissed</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.dismissed}
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">Dismissed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match Type Breakdown */}
      {!statsLoading && stats.byMatchType && stats.byMatchType.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Duplicates by Match Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.byMatchType.map((type: any) => (
              <div
                key={type.matchType}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200"
              >
                <p className="text-sm font-bold text-gray-600 mb-1">{type.matchType}</p>
                <p className="text-2xl font-bold text-indigo-600">{type._count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate List */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <h2 className="text-2xl font-bold text-gray-800">Pending Duplicates</h2>
          <p className="text-sm text-gray-600 mt-1">
            {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {duplicatesLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading duplicates...</p>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">No Duplicates</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Pending Duplicates</h3>
            <p className="text-gray-600 mb-6">
              There are no pending duplicate records to review at this time.
            </p>
            <button
              onClick={() => navigate('/clients')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              Back to Clients
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {duplicates.map((duplicate) => (
              <DuplicateMatchCard
                key={duplicate.id}
                duplicate={duplicate}
                onMerge={() => handleMerge(duplicate)}
                onDismiss={() => handleDismiss(duplicate.id)}
                dismissing={dismissMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Merge Dialog */}
      {selectedDuplicate && (
        <MergeDuplicatesDialog
          open={mergeDialogOpen}
          onClose={() => {
            setMergeDialogOpen(false);
            setSelectedDuplicate(null);
          }}
          duplicate={selectedDuplicate}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
}
