import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import DiagnosisCard from '../../components/Clients/DiagnosisCard';
import DiagnosisForm from '../../components/Clients/DiagnosisForm';
import ICD10SearchDialog from '../../components/Clients/ICD10SearchDialog';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

interface ClientDiagnosis {
  id: string;
  clientId: string;
  diagnosisType: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT' | 'HISTORICAL' | 'PROVISIONAL';
  icd10Code?: string;
  dsm5Code?: string;
  diagnosisName: string;
  diagnosisCategory?: string;
  severitySpecifier?: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  courseSpecifier?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'RULE_OUT_REJECTED';
  dateDiagnosed: string;
  onsetDate?: string;
  remissionDate?: string;
  dateResolved?: string;
  resolutionNotes?: string;
  supportingEvidence?: string;
  differentialConsiderations?: string;
  diagnosedBy: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  lastReviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  lastReviewedDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface DiagnosisStats {
  total: number;
  active: number;
  resolved: number;
  ruleOutRejected: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

export default function ClientDiagnosesPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState<ClientDiagnosis | null>(null);
  const [showICD10Search, setShowICD10Search] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline'>('grouped');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; diagnosisId: string }>({
    isOpen: false,
    diagnosisId: '',
  });

  // Fetch client data
  const { data: clientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data.data;
    },
  });

  // Fetch diagnoses
  const { data: diagnosesData, isLoading: diagnosesLoading } = useQuery({
    queryKey: ['client-diagnoses', clientId, statusFilter],
    queryFn: async () => {
      const params = statusFilter === 'active' ? '?activeOnly=true' : '';
      const response = await api.get(`/clients/${clientId}/diagnoses${params}`);
      return response.data.data as ClientDiagnosis[];
    },
  });

  // Fetch statistics
  const { data: statsData } = useQuery({
    queryKey: ['client-diagnoses-stats', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}/diagnoses/stats`);
      return response.data.data as DiagnosisStats;
    },
  });

  // Delete diagnosis mutation
  const deleteMutation = useMutation({
    mutationFn: async (diagnosisId: string) => {
      const response = await api.delete(`/diagnoses/${diagnosisId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-diagnoses', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-diagnoses-stats', clientId] });
    },
  });

  const handleDeleteClick = (diagnosisId: string) => {
    setDeleteConfirm({ isOpen: true, diagnosisId });
  };

  const confirmDelete = () => {
    deleteMutation.mutate(deleteConfirm.diagnosisId);
    setDeleteConfirm({ isOpen: false, diagnosisId: '' });
  };

  const handleEdit = (diagnosis: ClientDiagnosis) => {
    setEditingDiagnosis(diagnosis);
    setShowAddForm(true);
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingDiagnosis(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    queryClient.invalidateQueries({ queryKey: ['client-diagnoses', clientId] });
    queryClient.invalidateQueries({ queryKey: ['client-diagnoses-stats', clientId] });
  };

  // Filter diagnoses based on status filter
  const filteredDiagnoses = diagnosesData?.filter(d => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return d.status === 'ACTIVE';
    if (statusFilter === 'resolved') return d.status === 'RESOLVED';
    return true;
  }) || [];

  // Group diagnoses by type
  const groupedDiagnoses = {
    PRIMARY: filteredDiagnoses.filter(d => d.diagnosisType === 'PRIMARY'),
    SECONDARY: filteredDiagnoses.filter(d => d.diagnosisType === 'SECONDARY'),
    RULE_OUT: filteredDiagnoses.filter(d => d.diagnosisType === 'RULE_OUT'),
    HISTORICAL: filteredDiagnoses.filter(d => d.diagnosisType === 'HISTORICAL'),
    PROVISIONAL: filteredDiagnoses.filter(d => d.diagnosisType === 'PROVISIONAL'),
  };

  // Sort by date for timeline view
  const timelineDiagnoses = [...filteredDiagnoses].sort((a, b) =>
    new Date(b.dateDiagnosed).getTime() - new Date(a.dateDiagnosed).getTime()
  );

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'MILD': return 'from-green-500 to-emerald-500';
      case 'MODERATE': return 'from-yellow-500 to-amber-500';
      case 'SEVERE': return 'from-orange-500 to-red-500';
      case 'EXTREME': return 'from-red-600 to-rose-700';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  if (diagnosesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Diagnoses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
        >
          Back to Client
        </button>

        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Diagnoses</h1>
              {clientData && (
                <p className="text-indigo-100 text-lg">
                  {clientData.firstName} {clientData.lastName} - MRN: {clientData.medicalRecordNumber}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center"
            >
              <span className="mr-2 text-xl">+</span> Add Diagnosis
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600">Active Diagnoses</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statsData.active}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statsData.resolved}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statsData.total}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">#</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {Object.keys(statsData.byCategory).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">📋</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              viewMode === 'grouped'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Grouped View
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              viewMode === 'timeline'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Timeline View
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              statusFilter === 'active'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              statusFilter === 'resolved'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            All
          </button>
        </div>

        <button
          onClick={() => setShowICD10Search(true)}
          className="px-6 py-3 bg-white text-indigo-600 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
        >
          Search ICD-10 Codes
        </button>
      </div>

      {/* Diagnoses Display */}
      {viewMode === 'grouped' ? (
        <div className="space-y-6">
          {(['PRIMARY', 'SECONDARY', 'RULE_OUT', 'HISTORICAL', 'PROVISIONAL'] as const).map(type => {
            const diagnoses = groupedDiagnoses[type];
            if (diagnoses.length === 0) return null;

            return (
              <div key={type} className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className={`inline-block px-3 py-1 rounded-lg text-white text-sm font-bold mr-3 bg-gradient-to-r ${
                    type === 'PRIMARY' ? 'from-red-500 to-rose-500' :
                    type === 'SECONDARY' ? 'from-blue-500 to-cyan-500' :
                    type === 'RULE_OUT' ? 'from-amber-500 to-orange-500' :
                    type === 'HISTORICAL' ? 'from-gray-500 to-slate-500' :
                    'from-purple-500 to-pink-500'
                  }`}>
                    {type.replace('_', ' ')}
                  </span>
                  <span className="text-gray-600 text-lg">({diagnoses.length})</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {diagnoses.map(diagnosis => (
                    <DiagnosisCard
                      key={diagnosis.id}
                      diagnosis={diagnosis}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredDiagnoses.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No Diagnoses Found</h3>
              <p className="text-gray-600 mb-6">
                {statusFilter === 'active' ? 'No active diagnoses for this client.' :
                 statusFilter === 'resolved' ? 'No resolved diagnoses for this client.' :
                 'No diagnoses recorded for this client yet.'}
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
              >
                Add First Diagnosis
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Diagnosis Timeline</h2>
          <div className="space-y-4">
            {timelineDiagnoses.map((diagnosis, index) => (
              <div key={diagnosis.id} className="flex">
                <div className="flex flex-col items-center mr-4">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getSeverityColor(diagnosis.severitySpecifier)} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {index + 1}
                  </div>
                  {index < timelineDiagnoses.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <DiagnosisCard
                    diagnosis={diagnosis}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                </div>
              </div>
            ))}

            {timelineDiagnoses.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">No Diagnoses Found</h3>
                <p className="text-gray-600">No diagnoses to display in timeline view.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Diagnosis Form Dialog */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingDiagnosis ? 'Edit Diagnosis' : 'Add New Diagnosis'}
                </h2>
                <button
                  onClick={handleFormClose}
                  className="text-white hover:text-gray-200 text-3xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <DiagnosisForm
                clientId={clientId!}
                diagnosis={editingDiagnosis}
                onSuccess={handleFormSuccess}
                onCancel={handleFormClose}
              />
            </div>
          </div>
        </div>
      )}

      {/* ICD-10 Search Dialog */}
      {showICD10Search && (
        <ICD10SearchDialog
          onClose={() => setShowICD10Search(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, diagnosisId: '' })}
        onConfirm={confirmDelete}
        title="Delete Diagnosis"
        message="Are you sure you want to delete this diagnosis? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
