import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Calendar,
  User,
  Award,
  FileText,
} from 'lucide-react';
import { useCredentials, useDeleteCredential } from '../../hooks/useCredentialing';
import ConfirmModal from '../../components/ConfirmModal';

const ITEMS_PER_PAGE = 10;

export default function CredentialList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const { data: credentials, isLoading } = useCredentials({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const deleteCredential = useDeleteCredential();

  // Filter credentials by search term
  const filteredCredentials = credentials?.filter((cred) =>
    cred.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.credentialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pagination
  const totalPages = Math.ceil(filteredCredentials.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCredentials = filteredCredentials.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Calculate days until expiration
  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationBadge = (expirationDate: string, status: string) => {
    const days = getDaysUntilExpiration(expirationDate);

    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 border-2 border-red-300 text-red-700">
          <XCircle className="w-4 h-4" />
          Expired
        </span>
      );
    }

    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 border-2 border-red-300 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          {days} days
        </span>
      );
    }

    if (days <= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 border-2 border-yellow-300 text-yellow-700">
          <Clock className="w-4 h-4" />
          {days} days
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 border-2 border-green-300 text-green-700">
        <CheckCircle className="w-4 h-4" />
        {days} days
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Verified',
      },
      PENDING: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        icon: <Clock className="w-4 h-4" />,
        label: 'Pending',
      },
      EXPIRED: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Expired',
      },
      REVOKED: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Revoked',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.bg} border-2 ${config.border} ${config.text}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: '', name: '' });
    try {
      await deleteCredential.mutateAsync(id);
      toast.success('Credential deleted successfully');
    } catch (error) {
      toast.error('Failed to delete credential');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Shield className="w-12 h-12 text-purple-600 mr-4" />
          Credentials & Licenses
        </h1>
        <p className="text-gray-600 text-lg">
          View and manage all staff credentials and certifications
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search credentials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all appearance-none bg-white"
            >
              <option value="">All Types</option>
              <option value="LICENSE">License</option>
              <option value="CERTIFICATION">Certification</option>
              <option value="DEA">DEA</option>
              <option value="NPI">NPI</option>
              <option value="INSURANCE">Insurance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all appearance-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/credentialing/add')}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
            <button className="px-4 py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-100 to-blue-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Staff Member
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Type
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Credential #
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Expiration
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      Loading credentials...
                    </div>
                  </td>
                </tr>
              ) : paginatedCredentials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-bold">No credentials found</p>
                    <p className="text-sm">Try adjusting your filters or add a new credential</p>
                  </td>
                </tr>
              ) : (
                paginatedCredentials.map((credential, index) => (
                  <tr
                    key={credential.id}
                    className={`hover:bg-purple-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{credential.staffName}</p>
                          <p className="text-xs text-gray-500">{credential.issuingAuthority}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 border-2 border-purple-200 text-purple-700">
                        <Award className="w-4 h-4" />
                        {credential.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-700">{credential.credentialNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(credential.expirationDate).toLocaleDateString()}
                        </p>
                        {getExpirationBadge(credential.expirationDate, credential.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(credential.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/credentialing/${credential.id}`)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-all group"
                          title="View"
                        >
                          <Eye className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => navigate(`/credentialing/${credential.id}/edit`)}
                          className="p-2 hover:bg-green-100 rounded-lg transition-all group"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(credential.id, credential.staffName)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-all group"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-bold">{startIndex + 1}</span> to{' '}
              <span className="font-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredCredentials.length)}</span> of{' '}
              <span className="font-bold">{filteredCredentials.length}</span> credentials
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                        : 'bg-white border-2 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Delete Credential"
        message={`Are you sure you want to delete this credential for ${deleteConfirm.name}?`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
