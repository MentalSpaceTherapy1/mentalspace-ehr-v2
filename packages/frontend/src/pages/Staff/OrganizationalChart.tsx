import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Search,
  Users,
  ChevronDown,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { useStaff, OrgChartNode } from '../../hooks/useStaff';

const OrganizationalChart: React.FC = () => {
  const navigate = useNavigate();
  const { getOrgChart } = useStaff();
  const chartRef = useRef<HTMLDivElement>(null);
  const [orgData, setOrgData] = useState<OrgChartNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchOrgChart = async () => {
      const data = await getOrgChart();
      setOrgData(data);
      setLoading(false);
    };
    fetchOrgChart();
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
  };

  const handleExportPNG = () => {
    if (chartRef.current) {
      // In a real implementation, use html2canvas or similar library
      toast('Export to PNG functionality - integrate html2canvas library', { icon: 'ℹ️' });
    }
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const searchInTree = (node: OrgChartNode, term: string): boolean => {
    if (!term) return false;
    const searchLower = term.toLowerCase();
    if (
      node.name.toLowerCase().includes(searchLower) ||
      node.title.toLowerCase().includes(searchLower) ||
      node.department.toLowerCase().includes(searchLower)
    ) {
      setHighlightedId(node.id);
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (searchInTree(child, term)) return true;
      }
    }
    return false;
  };

  const handleSearch = () => {
    if (orgData && searchTerm) {
      searchInTree(orgData, searchTerm);
    } else {
      setHighlightedId(null);
    }
  };

  const renderNode = (node: OrgChartNode, level: number = 0) => {
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isHighlighted = highlightedId === node.id;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          className={`relative transition-all duration-300 ${
            isHighlighted ? 'ring-4 ring-yellow-400 shadow-2xl' : ''
          }`}
        >
          <div
            onClick={() => navigate(`/staff/${node.id}`)}
            className={`bg-white rounded-xl shadow-lg border-2 p-4 cursor-pointer hover:shadow-xl transition-all duration-300 w-64 ${
              isHighlighted
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {node.photoUrl ? (
                <img
                  src={node.photoUrl}
                  alt={node.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{node.name}</h3>
                <p className="text-sm text-gray-600 truncate">{node.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {node.department}
              </div>
              {hasChildren && (
                <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {node.children!.length} reports
                </div>
              )}
            </div>
          </div>

          {/* Collapse/Expand Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(node.id);
              }}
              className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-full p-1 hover:bg-gray-100 transition-colors shadow-md z-10"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div className="mt-12">
            {/* Connector Line */}
            <div className="flex justify-center">
              <div className="w-0.5 h-8 bg-gradient-to-b from-blue-400 to-transparent"></div>
            </div>

            {/* Children Container */}
            <div className="flex gap-8 mt-4">
              {node.children!.map((child, index) => (
                <div key={child.id} className="relative">
                  {/* Horizontal connector */}
                  {index > 0 && (
                    <div className="absolute top-0 left-0 w-8 h-0.5 bg-blue-300 -translate-x-full"></div>
                  )}
                  {renderNode(child, level + 1)}
                </div>
              ))}
            </div>

            {/* Horizontal line connecting children */}
            {node.children!.length > 1 && (
              <div
                className="absolute h-0.5 bg-blue-300"
                style={{
                  top: '-2rem',
                  left: '50%',
                  width: `calc(${(node.children!.length - 1) * 16}rem)`,
                  transform: 'translateX(-50%)',
                }}
              ></div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizational chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          Organizational Chart
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, title, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
              <span className="px-3 text-sm font-medium text-gray-700 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button
                onClick={handleReset}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Reset Zoom"
              >
                <Maximize2 className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Export */}
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              <Download className="w-5 h-5" />
              Export PNG
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 overflow-auto">
        <div
          ref={chartRef}
          className="min-w-max transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          {orgData ? (
            <div className="flex justify-center">{renderNode(orgData)}</div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No organizational data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">How to use:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span>Click on any card to view full profile</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </div>
            <span>Click arrows to expand/collapse departments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-yellow-600" />
            </div>
            <span>Search highlights matching employees</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationalChart;
