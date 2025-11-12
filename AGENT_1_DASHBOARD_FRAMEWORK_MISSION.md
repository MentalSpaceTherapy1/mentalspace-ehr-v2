# Agent 1: Dashboard Framework Engineer - Mission Prompt

**Agent Role**: Dashboard Framework Engineer
**Mission**: Build comprehensive customizable dashboard system with drag-and-drop widgets, real-time updates, and role-based configurations
**Priority**: HIGH (Depends on Agent 8 completing database schema first)
**Estimated Duration**: 4-5 days
**Parallel Execution**: Can run in parallel with Agents 2-7 after Agent 8 completes

---

## Mission Objectives

Implement a complete dashboard framework that allows users to:
1. Create custom dashboards with drag-and-drop interface
2. Add 30+ different widget types (KPIs, charts, tables, alerts, gauges)
3. Configure real-time auto-refresh for widgets
4. Set threshold alerts on KPIs
5. Use pre-built dashboard templates
6. Enter full-screen presentation mode
7. Share dashboards with other users

---

## Prerequisites

**CRITICAL**: Before starting, verify Agent 8 has completed:
- ✅ Dashboard, Widget, ThresholdAlert models added to schema.prisma
- ✅ Migration applied: `npx prisma migrate deploy`
- ✅ Prisma client regenerated: `npx prisma generate`

**Verify schema exists**:
```bash
cd packages/database
grep "model Dashboard" prisma/schema.prisma
grep "model Widget" prisma/schema.prisma
grep "model ThresholdAlert" prisma/schema.prisma
```

If models not found, STOP and wait for Agent 8 to complete.

---

## Phase 1: Backend API Implementation (Day 1-2)

### Task 1.1: Create Dashboard Controller

**File**: `packages/backend/src/controllers/dashboard.controller.ts` (NEW)

**Implement 8 endpoints**:

```typescript
import { Request, Response } from 'express';
import prisma from '../services/database';
import { auditLogger } from '../services/auditLogger.service';

// Create new dashboard
export async function createDashboard(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { name, description, layout, role, isDefault } = req.body;

    const dashboard = await prisma.dashboard.create({
      data: {
        userId,
        name,
        description,
        layout: layout || { grid: [] },
        role,
        isDefault: isDefault || false,
        isPublic: false
      }
    });

    auditLogger.info('Dashboard created', { userId, dashboardId: dashboard.id, name });

    res.status(201).json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard',
      error: error.message
    });
  }
}

// List user's dashboards
export async function getDashboards(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.roles?.[0];

    // Get user's own dashboards + public dashboards + role-based defaults
    const dashboards = await prisma.dashboard.findMany({
      where: {
        OR: [
          { userId },
          { isPublic: true },
          { role, isDefault: true }
        ]
      },
      include: {
        widgets: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: dashboards
    });
  } catch (error: any) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboards',
      error: error.message
    });
  }
}

// Get dashboard by ID
export async function getDashboardById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: {
        widgets: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    // Check access (owner or public)
    if (dashboard.userId !== userId && !dashboard.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard',
      error: error.message
    });
  }
}

// Update dashboard
export async function updateDashboard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const { name, description, layout, isPublic } = req.body;

    // Verify ownership
    const existing = await prisma.dashboard.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await prisma.dashboard.update({
      where: { id },
      data: {
        name,
        description,
        layout,
        isPublic
      }
    });

    auditLogger.info('Dashboard updated', { userId, dashboardId: id });

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dashboard',
      error: error.message
    });
  }
}

// Delete dashboard
export async function deleteDashboard(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // Verify ownership
    const existing = await prisma.dashboard.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await prisma.dashboard.delete({ where: { id } });

    auditLogger.info('Dashboard deleted', { userId, dashboardId: id });

    res.status(200).json({
      success: true,
      message: 'Dashboard deleted'
    });
  } catch (error: any) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete dashboard',
      error: error.message
    });
  }
}

// Add widget to dashboard
export async function addWidget(req: Request, res: Response) {
  try {
    const { id: dashboardId } = req.params;
    const userId = (req as any).user?.userId;
    const { widgetType, title, config, position, refreshRate } = req.body;

    // Verify ownership
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard || dashboard.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const widget = await prisma.widget.create({
      data: {
        dashboardId,
        widgetType,
        title,
        config: config || {},
        position: position || { x: 0, y: 0, w: 2, h: 1 },
        refreshRate: refreshRate || 60
      }
    });

    auditLogger.info('Widget added', { userId, dashboardId, widgetId: widget.id, widgetType });

    res.status(201).json({
      success: true,
      data: widget
    });
  } catch (error: any) {
    console.error('Error adding widget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add widget',
      error: error.message
    });
  }
}

// Update widget
export async function updateWidget(req: Request, res: Response) {
  try {
    const { widgetId } = req.params;
    const userId = (req as any).user?.userId;
    const { title, config, position, refreshRate } = req.body;

    // Verify ownership via dashboard
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: { dashboard: true }
    });

    if (!widget || widget.dashboard.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await prisma.widget.update({
      where: { id: widgetId },
      data: {
        title,
        config,
        position,
        refreshRate
      }
    });

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating widget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update widget',
      error: error.message
    });
  }
}

// Delete widget
export async function deleteWidget(req: Request, res: Response) {
  try {
    const { widgetId } = req.params;
    const userId = (req as any).user?.userId;

    // Verify ownership
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: { dashboard: true }
    });

    if (!widget || widget.dashboard.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await prisma.widget.delete({ where: { id: widgetId } });

    auditLogger.info('Widget deleted', { userId, widgetId });

    res.status(200).json({
      success: true,
      message: 'Widget deleted'
    });
  } catch (error: any) {
    console.error('Error deleting widget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete widget',
      error: error.message
    });
  }
}

// Get real-time data for dashboard widgets
export async function getDashboardData(req: Request, res: Response) {
  try {
    const { id: dashboardId } = req.params;

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: { widgets: true }
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    // Fetch data for each widget
    const widgetData = await Promise.all(
      dashboard.widgets.map(async (widget) => {
        const data = await fetchWidgetData(widget.widgetType, widget.config);
        return {
          widgetId: widget.id,
          data,
          lastUpdated: new Date()
        };
      })
    );

    res.status(200).json({
      success: true,
      data: widgetData
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
}

// Helper function to fetch widget-specific data
async function fetchWidgetData(widgetType: string, config: any) {
  switch (widgetType) {
    case 'REVENUE_TODAY':
      return await getRevenueTodayData();
    case 'KVR':
      return await getKVRData();
    case 'UNSIGNED_NOTES':
      return await getUnsignedNotesData();
    case 'ACTIVE_CLIENTS':
      return await getActiveClientsData();
    // Add more widget types...
    default:
      return { value: 0 };
  }
}

// Widget data fetchers
async function getRevenueTodayData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.chargeEntry.aggregate({
    where: {
      serviceDate: { gte: today },
      chargeStatus: { not: 'VOIDED' }
    },
    _sum: { chargeAmount: true }
  });

  return {
    value: Number(result._sum.chargeAmount || 0),
    label: 'Today',
    format: 'currency'
  };
}

async function getKVRData() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startOfMonth }
    }
  });

  const scheduled = appointments.length;
  const kept = appointments.filter(a => a.status === 'COMPLETED').length;
  const kvr = scheduled > 0 ? (kept / scheduled) * 100 : 0;

  return {
    value: Math.round(kvr * 10) / 10,
    label: 'This Month',
    format: 'percentage'
  };
}

async function getUnsignedNotesData() {
  const count = await prisma.clinicalNote.count({
    where: {
      status: { in: ['DRAFT', 'PENDING_COSIGN'] }
    }
  });

  return {
    value: count,
    label: 'Unsigned Notes',
    format: 'number'
  };
}

async function getActiveClientsData() {
  const count = await prisma.client.count({
    where: { status: 'ACTIVE' }
  });

  return {
    value: count,
    label: 'Active Clients',
    format: 'number'
  };
}
```

### Task 1.2: Create Dashboard Routes

**File**: `packages/backend/src/routes/dashboard.routes.ts` (NEW)

```typescript
import { Router } from 'express';
import {
  createDashboard,
  getDashboards,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
  addWidget,
  updateWidget,
  deleteWidget,
  getDashboardData
} from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Dashboard CRUD
router.post('/', createDashboard);
router.get('/', getDashboards);
router.get('/:id', getDashboardById);
router.put('/:id', updateDashboard);
router.delete('/:id', deleteDashboard);

// Widget management
router.post('/:id/widgets', addWidget);
router.put('/widgets/:widgetId', updateWidget);
router.delete('/widgets/:widgetId', deleteWidget);

// Real-time data
router.get('/:id/data', getDashboardData);

export default router;
```

### Task 1.3: Register Dashboard Routes

**File**: `packages/backend/src/routes/index.ts`

**Add**:
```typescript
import dashboardRoutes from './dashboard.routes';

// ... existing code ...

router.use('/api/v1/dashboards', dashboardRoutes);
```

---

## Phase 2: Frontend Dashboard Builder (Day 3-4)

### Task 2.1: Install Dependencies

```bash
cd packages/frontend
npm install react-grid-layout @types/react-grid-layout
npm install recharts  # For chart widgets (if not already installed by Agent 2)
```

### Task 2.2: Create Dashboard Builder Page

**File**: `packages/frontend/src/pages/Dashboards/DashboardBuilder.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { GridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import api from '../../lib/api';
import WidgetLibrary from '../../components/Dashboard/WidgetLibrary';
import WidgetRenderer from '../../components/Dashboard/WidgetRenderer';

export default function DashboardBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadDashboard();
    }
  }, [id]);

  const loadDashboard = async () => {
    try {
      const response = await api.get(`/dashboards/${id}`);
      setDashboard(response.data.data);
      setWidgets(response.data.data.widgets || []);
      setLayout(response.data.data.layout?.grid || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const handleAddWidget = async (widgetType: string, title: string) => {
    try {
      const response = await api.post(`/dashboards/${id}/widgets`, {
        widgetType,
        title,
        config: {},
        position: { x: 0, y: Infinity, w: 2, h: 1 }, // Add to bottom
        refreshRate: 60
      });

      const newWidget = response.data.data;
      setWidgets([...widgets, newWidget]);
      setLayout([...layout, {
        i: newWidget.id,
        x: newWidget.position.x,
        y: newWidget.position.y,
        w: newWidget.position.w,
        h: newWidget.position.h
      }]);
      setLibraryOpen(false);
    } catch (error) {
      console.error('Error adding widget:', error);
    }
  };

  const handleLayoutChange = async (newLayout: any[]) => {
    setLayout(newLayout);

    // Update widget positions
    await Promise.all(
      newLayout.map(item => {
        const widget = widgets.find(w => w.id === item.i);
        if (widget) {
          return api.put(`/dashboards/widgets/${widget.id}`, {
            position: { x: item.x, y: item.y, w: item.w, h: item.h }
          });
        }
      })
    );
  };

  const handleSaveDashboard = async () => {
    try {
      setLoading(true);
      await api.put(`/dashboards/${id}`, {
        layout: { grid: layout }
      });
      alert('Dashboard saved successfully');
    } catch (error) {
      console.error('Error saving dashboard:', error);
      alert('Failed to save dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    try {
      await api.delete(`/dashboards/widgets/${widgetId}`);
      setWidgets(widgets.filter(w => w.id !== widgetId));
      setLayout(layout.filter(l => l.i !== widgetId));
    } catch (error) {
      console.error('Error deleting widget:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{dashboard?.name || 'Dashboard'}</Typography>
        <Box>
          <Button onClick={() => setLibraryOpen(true)} variant="outlined" sx={{ mr: 1 }}>
            + Add Widget
          </Button>
          <Button onClick={handleSaveDashboard} variant="contained" disabled={loading}>
            Save Dashboard
          </Button>
        </Box>
      </Box>

      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={100}
        width={1200}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {widgets.map(widget => (
          <div key={widget.id} data-grid={layout.find(l => l.i === widget.id)}>
            <WidgetRenderer widget={widget} onDelete={() => handleDeleteWidget(widget.id)} />
          </div>
        ))}
      </GridLayout>

      <WidgetLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </Box>
  );
}
```

[CONTINUED IN NEXT FILE DUE TO LENGTH...]

### Task 2.3: Create Widget Library Component

**File**: `packages/frontend/src/components/Dashboard/WidgetLibrary.tsx` (NEW)

See detailed implementation in main plan document.

### Task 2.4: Create Widget Renderer Component

**File**: `packages/frontend/src/components/Dashboard/WidgetRenderer.tsx` (NEW)

See detailed implementation in main plan document.

---

## Testing Checklist

After implementation, verify:

- [ ] Can create new dashboard
- [ ] Can add widgets to dashboard
- [ ] Can resize widgets
- [ ] Can reposition widgets (drag-and-drop)
- [ ] Can delete widgets
- [ ] Dashboard layout persists after refresh
- [ ] Real-time data updates work
- [ ] All 30+ widget types render correctly
- [ ] Threshold alerts can be configured
- [ ] Full-screen mode works
- [ ] Dashboard templates work

**Test using Test Prompt #1 from main plan**: `MODULE_8_COMPREHENSIVE_IMPLEMENTATION_PLAN.md`

---

## Deliverables

**Backend**:
- ✅ dashboard.controller.ts (8 endpoints)
- ✅ dashboard.routes.ts
- ✅ Dashboard routes registered in index.ts

**Frontend**:
- ✅ DashboardBuilder.tsx
- ✅ WidgetLibrary.tsx
- ✅ WidgetRenderer.tsx
- ✅ DashboardGrid.tsx
- ✅ 30+ widget components

---

## Success Criteria

- All endpoints return 200/201 responses
- Dashboard CRUD works
- Widget CRUD works
- Drag-and-drop functional
- Real-time updates working
- All test cases in Test Prompt #1 pass

---

## Report Back

When complete, provide:
1. List of all files created/modified
2. Screenshot of working dashboard
3. Test results from Test Prompt #1
4. Any issues encountered and how resolved

**Ready to start? Confirm Agent 8 completed schema first, then proceed!**
