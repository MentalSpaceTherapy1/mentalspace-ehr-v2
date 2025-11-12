import React from 'react';
import { Box } from '@mui/material';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetRenderer from './WidgetRenderer';
import { Widget, WidgetData } from '../../types/dashboard.types';

interface DashboardGridProps {
  widgets: Widget[];
  widgetsData: Record<string, WidgetData>;
  loading: Record<string, boolean>;
  onLayoutChange: (layout: Layout[]) => void;
  onRemoveWidget: (widgetId: string) => void;
  onRefreshWidget: (widgetId: string) => void;
  onConfigureWidget?: (widgetId: string) => void;
  editable?: boolean;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  widgetsData,
  loading,
  onLayoutChange,
  onRemoveWidget,
  onRefreshWidget,
  onConfigureWidget,
  editable = true,
}) => {
  const layout: Layout[] = widgets.map((widget) => ({
    i: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    w: widget.position.w,
    h: widget.position.h,
    minW: 2,
    minH: 2,
    static: !editable,
  }));

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={100}
        width={1200}
        isDraggable={editable}
        isResizable={editable}
        onLayoutChange={onLayoutChange}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetRenderer
              widget={widget}
              data={widgetsData[widget.id]}
              loading={loading[widget.id]}
              onRemove={onRemoveWidget}
              onRefresh={onRefreshWidget}
              onConfigure={onConfigureWidget}
            />
          </div>
        ))}
      </GridLayout>
    </Box>
  );
};

export default DashboardGrid;
