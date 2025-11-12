import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from 'react-grid-layout';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardGrid from '../../components/Dashboard/DashboardGrid';
import WidgetLibrary, { WIDGET_DEFINITIONS } from '../../components/Dashboard/WidgetLibrary';
import { Dashboard, Widget, WidgetData, WidgetType } from '../../types/dashboard.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const DashboardBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State management
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetsData, setWidgetsData] = useState<Record<string, WidgetData>>({});
  const [loadingWidgets, setLoadingWidgets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI State
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  // Auto-refresh interval
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Load dashboard
  useEffect(() => {
    if (id) {
      loadDashboard();
    } else {
      // New dashboard - set defaults
      setDashboardName('New Dashboard');
      setDashboardDescription('');
    }
  }, [id]);

  // Auto-refresh widget data
  useEffect(() => {
    if (!autoRefreshEnabled || !dashboard) return;

    const interval = setInterval(() => {
      widgets.forEach((widget) => {
        fetchWidgetData(widget.id);
      });
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, dashboard, widgets]);

  // Initial data fetch
  useEffect(() => {
    if (widgets.length > 0) {
      widgets.forEach((widget) => {
        fetchWidgetData(widget.id);
      });
    }
  }, [widgets]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/dashboards/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const dashboardData = response.data.data;
      setDashboard(dashboardData);
      setWidgets(dashboardData.widgets || []);
      setDashboardName(dashboardData.name);
      setDashboardDescription(dashboardData.description || '');
      setIsDefault(dashboardData.isDefault);
      setIsPublic(dashboardData.isPublic);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      toast.error(error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetData = async (widgetId: string) => {
    if (!dashboard) return;

    try {
      setLoadingWidgets((prev) => ({ ...prev, [widgetId]: true }));
      const response = await axios.get(`${API_BASE_URL}/dashboards/${dashboard.id}/data`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const widgetData = response.data.data.widgets.find(
        (w: WidgetData) => w.widgetId === widgetId
      );

      if (widgetData) {
        setWidgetsData((prev) => ({ ...prev, [widgetId]: widgetData }));
      }
    } catch (error) {
      console.error(`Failed to fetch data for widget ${widgetId}:`, error);
    } finally {
      setLoadingWidgets((prev) => ({ ...prev, [widgetId]: false }));
    }
  };

  const handleSaveDashboard = async () => {
    try {
      setSaving(true);

      const dashboardData = {
        name: dashboardName,
        description: dashboardDescription,
        isDefault,
        isPublic,
        layout: {},
      };

      if (id) {
        // Update existing dashboard
        await axios.put(`${API_BASE_URL}/dashboards/${id}`, dashboardData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        toast.success('Dashboard updated successfully');
      } else {
        // Create new dashboard
        const response = await axios.post(`${API_BASE_URL}/dashboards`, dashboardData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const newDashboard = response.data.data;
        setDashboard(newDashboard);
        navigate(`/dashboards/${newDashboard.id}`, { replace: true });
        toast.success('Dashboard created successfully');
      }
    } catch (error: any) {
      console.error('Failed to save dashboard:', error);
      toast.error(error.response?.data?.error || 'Failed to save dashboard');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = async (widgetType: WidgetType) => {
    if (!dashboard) {
      toast.error('Please save the dashboard first');
      return;
    }

    try {
      const widgetDef = WIDGET_DEFINITIONS.find((w) => w.type === widgetType);
      if (!widgetDef) return;

      const widgetData = {
        widgetType,
        title: widgetDef.name,
        config: widgetDef.defaultConfig,
        position: widgetDef.defaultSize,
        refreshRate: 60,
      };

      const response = await axios.post(
        `${API_BASE_URL}/dashboards/${dashboard.id}/widgets`,
        widgetData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const newWidget = response.data.data;
      setWidgets((prev) => [...prev, newWidget]);
      setLibraryOpen(false);
      toast.success('Widget added successfully');

      // Fetch data for new widget
      fetchWidgetData(newWidget.id);
    } catch (error: any) {
      console.error('Failed to add widget:', error);
      toast.error(error.response?.data?.error || 'Failed to add widget');
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/dashboards/widgets/${widgetId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
      setWidgetsData((prev) => {
        const newData = { ...prev };
        delete newData[widgetId];
        return newData;
      });
      toast.success('Widget removed');
    } catch (error: any) {
      console.error('Failed to remove widget:', error);
      toast.error(error.response?.data?.error || 'Failed to remove widget');
    }
  };

  const handleRefreshWidget = (widgetId: string) => {
    fetchWidgetData(widgetId);
    toast.success('Widget refreshed');
  };

  const handleLayoutChange = async (layout: Layout[]) => {
    // Update widget positions
    const updatedWidgets = widgets.map((widget) => {
      const layoutItem = layout.find((l) => l.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        };
      }
      return widget;
    });

    setWidgets(updatedWidgets);

    // Save positions to backend
    if (dashboard) {
      try {
        await Promise.all(
          updatedWidgets.map((widget) =>
            axios.put(
              `${API_BASE_URL}/dashboards/widgets/${widget.id}`,
              { position: widget.position },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              }
            )
          )
        );
      } catch (error) {
        console.error('Failed to save layout:', error);
      }
    }
  };

  const handleDeleteDashboard = async () => {
    if (!dashboard) return;

    try {
      await axios.delete(`${API_BASE_URL}/dashboards/${dashboard.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      toast.success('Dashboard deleted');
      navigate('/dashboards');
    } catch (error: any) {
      console.error('Failed to delete dashboard:', error);
      toast.error(error.response?.data?.error || 'Failed to delete dashboard');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleRefreshAll = () => {
    widgets.forEach((widget) => {
      fetchWidgetData(widget.id);
    });
    toast.success('All widgets refreshed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      {/* Header Bar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboards')}
                className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
              >
                <span className="text-white text-xl">←</span>
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">📊</span>
                <h1 className="text-xl font-bold text-white">{dashboardName}</h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {dashboard && (
                <>
                  <label className="flex items-center space-x-2 text-white text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefreshEnabled}
                      onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                      className="rounded border-white"
                    />
                    <span>Auto-refresh</span>
                  </label>

                  <button
                    onClick={handleRefreshAll}
                    className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all duration-200 flex items-center space-x-2"
                    title="Refresh all"
                  >
                    <span className="text-lg">🔄</span>
                  </button>

                  <button
                    onClick={() => setLibraryOpen(true)}
                    className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all duration-200 flex items-center space-x-2"
                    title="Add widget"
                  >
                    <span className="text-lg">➕</span>
                  </button>

                  <button
                    onClick={() => setEditDialogOpen(true)}
                    className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all duration-200 flex items-center space-x-2"
                    title="Edit dashboard"
                  >
                    <span className="text-lg">✏️</span>
                  </button>
                </>
              )}

              <button
                onClick={handleSaveDashboard}
                disabled={saving}
                className="px-4 py-2 bg-white text-cyan-600 font-bold rounded-lg hover:bg-opacity-90 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <span className="text-lg">💾</span>
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>

              {dashboard && (
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="px-3 py-2 bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white rounded-lg transition-all duration-200"
                  title="More options"
                >
                  <span className="text-lg">⋮</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!dashboard && !id ? (
          <div className="bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-300 rounded-2xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">ℹ️</span>
              <p className="text-cyan-900 font-semibold text-lg">
                Please save your dashboard before adding widgets
              </p>
            </div>
          </div>
        ) : null}

        {widgets.length === 0 && dashboard ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">📊</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Your dashboard is empty</h2>
            <p className="text-gray-600 text-lg mb-8">Add widgets to get started</p>
            <button
              onClick={() => setLibraryOpen(true)}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 mx-auto"
            >
              <span className="text-2xl">➕</span>
              <span>Add Widgets</span>
            </button>
          </div>
        ) : (
          <DashboardGrid
            widgets={widgets}
            widgetsData={widgetsData}
            loading={loadingWidgets}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={handleRemoveWidget}
            onRefreshWidget={handleRefreshWidget}
            editable={true}
          />
        )}
      </div>

      {/* Widget Library Drawer */}
      {libraryOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setLibraryOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-2xl">
              <div className="h-full flex flex-col bg-white shadow-xl">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Widget Library</h2>
                    <button
                      onClick={() => setLibraryOpen(false)}
                      className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                    >
                      <span className="text-2xl">✕</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <WidgetLibrary onAddWidget={handleAddWidget} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dashboard Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6">
              <h2 className="text-2xl font-bold text-white">Edit Dashboard</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={dashboardDescription}
                  onChange={(e) => setDashboardDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                  rows={3}
                />
              </div>
              <div className="mb-4 space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Set as default dashboard</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Make public (visible to all users)</span>
                </label>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSaveDashboard();
                    setEditDialogOpen(false);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
              <h2 className="text-2xl font-bold text-white">Delete Dashboard</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-lg mb-6">
                Are you sure you want to delete this dashboard? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDashboard}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;
