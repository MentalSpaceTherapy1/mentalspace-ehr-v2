import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Dashboard } from '../../types/dashboard.types';

const DashboardList: React.FC = () => {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboards');
      setDashboards(response.data.data);
    } catch (error: any) {
      console.error('Failed to load dashboards:', error);
      toast.error(error.response?.data?.error || 'Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDashboard = async () => {
    try {
      const response = await api.post('/dashboards', {
        name: newDashboardName,
        description: newDashboardDescription,
        layout: {},
        isDefault: false,
        isPublic: false,
      });

      const newDashboard = response.data.data;
      toast.success('Dashboard created successfully');
      setCreateDialogOpen(false);
      setNewDashboardName('');
      setNewDashboardDescription('');
      navigate(`/dashboards/${newDashboard.id}`);
    } catch (error: any) {
      console.error('Failed to create dashboard:', error);
      toast.error(error.response?.data?.error || 'Failed to create dashboard');
      setCreateDialogOpen(false);
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) {
      return;
    }

    try {
      await api.delete(`/dashboards/${dashboardId}`);
      toast.success('Dashboard deleted');
      loadDashboards();
    } catch (error: any) {
      console.error('Failed to delete dashboard:', error);
      toast.error(error.response?.data?.error || 'Failed to delete dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2 flex items-center">
              <span className="mr-3">📊</span> My Dashboards
            </h1>
            <p className="text-gray-600 text-lg">Create and manage your custom dashboards</p>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center"
          >
            <span className="text-2xl mr-2">➕</span>
            Create Dashboard
          </button>
        </div>

        {dashboards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">📊</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">No dashboards yet</h2>
            <p className="text-gray-600 text-lg mb-8">Create your first dashboard to get started</p>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <span className="mr-2">➕</span>
              Create Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white bg-opacity-30 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {dashboard.name}
                        </h3>
                        <p className="text-cyan-100 text-sm">
                          {dashboard.widgets?.length || 0} widgets
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dashboard.isDefault && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 shadow-md">
                        ⭐ Default
                      </span>
                    )}
                    {dashboard.isPublic && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-400 text-green-900 shadow-md">
                        🌍 Public
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {dashboard.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {dashboard.description}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mb-4">
                    Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteDashboard(dashboard.id)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Dashboard Dialog */}
        {createDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6">
                <h2 className="text-2xl font-bold text-white">Create New Dashboard</h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dashboard Name
                  </label>
                  <input
                    type="text"
                    value={newDashboardName}
                    onChange={(e) => setNewDashboardName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                    placeholder="Enter dashboard name..."
                    autoFocus
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newDashboardDescription}
                    onChange={(e) => setNewDashboardDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                    rows={3}
                    placeholder="Enter description..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCreateDialogOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDashboard}
                    disabled={!newDashboardName.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardList;
