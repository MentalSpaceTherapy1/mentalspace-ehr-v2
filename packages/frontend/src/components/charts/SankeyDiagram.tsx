import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

interface SankeyNode {
  id: string;
  name: string;
  color?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  onNodeClick?: (node: SankeyNode) => void;
  onLinkClick?: (link: SankeyLink) => void;
}

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function SankeyDiagram({
  nodes,
  links,
  title,
  height = 500,
  formatValue,
  onNodeClick,
  onLinkClick,
}: SankeyDiagramProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsImage(chartRef.current, title || 'sankey-diagram');
    }
  };

  // Calculate node positions and dimensions
  const width = 800;
  const nodeWidth = 20;
  const nodePadding = 30;

  // Group nodes by column (simple left-to-right layout)
  const columns: { [key: number]: SankeyNode[] } = {};

  // First pass: assign columns based on connections
  nodes.forEach((node, idx) => {
    const isSource = links.some(l => l.source === node.id);
    const isTarget = links.some(l => l.target === node.id);

    let column = 0;
    if (!isSource && isTarget) {
      column = 2; // Right side (final destinations)
    } else if (isSource && isTarget) {
      column = 1; // Middle (intermediate nodes)
    } else {
      column = 0; // Left side (starting points)
    }

    if (!columns[column]) columns[column] = [];
    columns[column].push(node);
  });

  const numColumns = Object.keys(columns).length;
  const columnWidth = width / (numColumns + 1);

  // Calculate node positions and heights
  const nodePositions = new Map<string, { x: number; y: number; height: number }>();

  Object.entries(columns).forEach(([colIdx, colNodes]) => {
    const col = parseInt(colIdx);
    const x = columnWidth * (col + 1);
    const totalHeight = height - nodePadding * (colNodes.length + 1);
    const nodeHeight = totalHeight / colNodes.length;

    colNodes.forEach((node, idx) => {
      const y = nodePadding + idx * (nodeHeight + nodePadding);
      nodePositions.set(node.id, { x, y, height: nodeHeight });
    });
  });

  // Calculate link paths
  const getLinkPath = (link: SankeyLink) => {
    const source = nodePositions.get(link.source);
    const target = nodePositions.get(link.target);

    if (!source || !target) return '';

    const x0 = source.x + nodeWidth;
    const y0 = source.y + source.height / 2;
    const x1 = target.x;
    const y1 = target.y + target.height / 2;
    const xi = (x0 + x1) / 2;

    return `M${x0},${y0} C${xi},${y0} ${xi},${y1} ${x1},${y1}`;
  };

  return (
    <div className="relative bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300" ref={chartRef}>
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔀</span>
            {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-lg hover:bg-white/30 transition-all duration-200 hover:scale-105"
            aria-label="Export chart as image"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl overflow-x-auto">
          <svg width={width} height={height}>
            {/* Draw links */}
            <g className="links">
              {links.map((link, idx) => {
                const path = getLinkPath(link);
                const sourceNode = nodes.find(n => n.id === link.source);
                const strokeWidth = Math.max(2, link.value / 10);

                return (
                  <g key={idx}>
                    <path
                      d={path}
                      fill="none"
                      stroke={sourceNode?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                      strokeWidth={strokeWidth}
                      opacity={0.4}
                      className="cursor-pointer hover:opacity-60 transition-all duration-200"
                      onClick={() => onLinkClick?.(link)}
                    >
                      <title>
                        {link.source} → {link.target}: {formatValue ? formatValue(link.value) : link.value}
                      </title>
                    </path>
                  </g>
                );
              })}
            </g>

            {/* Draw nodes */}
            <g className="nodes">
              {nodes.map((node, idx) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const nodeColor = node.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

                return (
                  <g key={node.id}>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={nodeWidth}
                      height={pos.height}
                      fill={nodeColor}
                      className="cursor-pointer hover:opacity-80 transition-all duration-200"
                      onClick={() => onNodeClick?.(node)}
                    >
                      <title>{node.name}</title>
                    </rect>
                    <text
                      x={pos.x + nodeWidth + 8}
                      y={pos.y + pos.height / 2}
                      dominantBaseline="middle"
                      className="text-sm fill-gray-700"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 text-xs text-gray-600 bg-white/50 backdrop-blur-sm p-3 rounded-lg">
          <p>Flow diagram showing data transitions between stages. Thickness represents volume.</p>
        </div>
      </div>
    </div>
  );
}
