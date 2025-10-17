import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Client {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: string;
  primaryPhone: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCHARGED' | 'DECEASED';
  primaryTherapist: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
  addressCity: string;
  addressState: string;
  createdAt: string;
}

export default function ClientList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch clients
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', search, statusFilter, page],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await axios.get(`/api/v1/clients?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const clients = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200';
      case 'INACTIVE':
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg shadow-gray-200';
      case 'DISCHARGED':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200';
      case 'DECEASED':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-200';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'MALE':
        return '♂️';
      case 'FEMALE':
        return '♀️';
      case 'NON_BINARY':
        return '⚧️';
      default:
        return '👤';
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-2 flex items-center">
            <span className="mr-2">⚠️</span> Error Loading Clients
          </h2>
          <p>Failed to load clients. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <span className="mr-3">🧑‍⚕️</span> Client Management
          </h1>
          <p className="text-gray-600 text-lg">Manage your client roster and demographics</p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center"
        >
          <span className="text-2xl mr-2">➕</span>
          Add New Client
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Search Clients
              </label>
              <input
                type="text"
                placeholder="Search by name, MRN, or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📊 Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">✅ Active</option>
                <option value="INACTIVE">⏸️ Inactive</option>
                <option value="DISCHARGED">🔵 Discharged</option>
                <option value="DECEASED">🔴 Deceased</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">
            Showing {clients.length} of {pagination.total} clients
          </p>
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Clients Found</h3>
            <p className="text-gray-600 mb-6">
              {search || statusFilter
                ? 'Try adjusting your filters'
                : 'Start by adding your first client'}
            </p>
            <button
              onClick={() => navigate('/clients/new')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              Add First Client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">MRN</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Client Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Demographics</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Primary Therapist</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client: Client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-gradient-to-r from-indigo-100 to-purple-100 px-3 py-1 rounded-lg font-bold text-indigo-700">
                        {client.medicalRecordNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm">
                            {client.firstName.charAt(0)}
                            {client.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {client.firstName} {client.lastName}
                          </p>
                          {client.preferredName && (
                            <p className="text-xs text-gray-600">
                              Preferred: {client.preferredName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800">
                          {getGenderIcon(client.gender)} Age {calculateAge(client.dateOfBirth)}
                        </p>
                        <p className="text-xs text-gray-600">
                          DOB: {new Date(client.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800">📱 {client.primaryPhone}</p>
                        {client.email && (
                          <p className="text-xs text-gray-600">📧 {client.email}</p>
                        )}
                        <p className="text-xs text-gray-600">
                          📍 {client.addressCity}, {client.addressState}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800">
                          {client.primaryTherapist.firstName} {client.primaryTherapist.lastName}
                        </p>
                        <p className="text-xs text-gray-600">{client.primaryTherapist.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusBadgeColor(
                          client.status
                        )}`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.id}/edit`);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                ← Previous
              </button>
              <span className="text-sm font-bold text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
