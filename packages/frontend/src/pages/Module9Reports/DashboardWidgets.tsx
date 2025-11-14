import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  GridView as GridViewIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useDashboardWidgets, DashboardWidget } from '../../hooks/useModule9Reports';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const widgetTypes = [
  {
    type: 'credentialExpiry',
    name: 'Credential Expiry',
    icon: '⏰',
    color: '#EF4444',
    description: 'Track expiring credentials'
  },
  {
    type: 'trainingCompliance',
    name: 'Training Compliance',
    icon: '📚',
    color: '#8B5CF6',
    description: 'Monitor training completion rates'
  },
  {
    type: 'incidentTrends',
    name: 'Incident Trends',
    icon: '📈',
    color: '#F59E0B',
    description: 'Safety incident analytics'
  },
  {
    type: 'budgetUtilization',
    name: 'Budget Utilization',
    icon: '💰',
    color: '#10B981',
    description: 'Financial performance metrics'
  },
  {
    type: 'staffOnboarding',
    name: 'Staff Onboarding',
    icon: '👋',
    color: '#06B6D4',
    description: 'New hire progress tracking'
  },
  {
    type: 'policyAcknowledgment',
    name: 'Policy Status',
    icon: '📋',
    color: '#3B82F6',
    description: 'Policy acknowledgment rates'
  },
  {
    type: 'guardianActivity',
    name: 'Guardian Activity',
    icon: '👨‍👩‍👧',
    color: '#EC4899',
    description: 'Portal usage statistics'
  },
  {
    type: 'messagingVolume',
    name: 'Messaging Volume',
    icon: '💬',
    color: '#6366F1',
    description: 'Secure messaging metrics'
  }
];

const DashboardWidgets: React.FC = () => {
  const navigate = useNavigate();
  const { widgets, setWidgets, saveDashboard, loading } = useDashboardWidgets();
  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLayoutChange = (layout: Layout[]) => {
    const updatedWidgets = widgets.map((widget) => {
      const layoutItem = layout.find((l) => l.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return widget;
    });
    setWidgets(updatedWidgets);
  };

  const handleAddWidget = () => {
    if (!selectedWidgetType) return;

    const widgetConfig = widgetTypes.find((w) => w.type === selectedWidgetType);
    if (!widgetConfig) return;

    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: selectedWidgetType,
      title: widgetConfig.name,
      config: {},
      position: { x: 0, y: Infinity, w: 4, h: 4 }
    };

    setWidgets([...widgets, newWidget]);
    setAddWidgetDialogOpen(false);
    setSelectedWidgetType('');
  };

  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(widgets.filter((w) => w.id !== widgetId));
  };

  const handleSaveDashboard = async () => {
    setError(null);
    setSuccess(false);

    try {
      await saveDashboard(widgets);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save dashboard');
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    const widgetConfig = widgetTypes.find((w) => w.type === widget.type);
    if (!widgetConfig) return null;

    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${alpha(widgetConfig.color, 0.1)} 0%, ${alpha(widgetConfig.color, 0.05)} 100%)`,
          border: `2px solid ${alpha(widgetConfig.color, 0.3)}`,
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: `0 8px 24px ${alpha(widgetConfig.color, 0.3)}`,
            border: `2px solid ${widgetConfig.color}`
          }
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: 'move'
          }}
          className="drag-handle"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIcon sx={{ color: 'text.secondary' }} />
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                background: widgetConfig.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              {widgetConfig.icon}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {widget.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => handleRemoveWidget(widget.id)}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
        <CardContent sx={{ flex: 1, overflow: 'auto' }}>
          <WidgetContent type={widget.type} config={widget.config} color={widgetConfig.color} />
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/reports')}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                📊 Dashboard Widgets
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Customize your dashboard with drag-and-drop widgets
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setAddWidgetDialogOpen(true)}
            >
              Add Widget
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveDashboard}
              disabled={loading || widgets.length === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                }
              }}
            >
              Save Dashboard
            </Button>
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Dashboard saved successfully!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Dashboard Grid */}
      {widgets.length === 0 ? (
        <Paper
          sx={{
            p: 8,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)'
          }}
        >
          <GridViewIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            No Widgets Added
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Start building your custom dashboard by adding widgets
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddWidgetDialogOpen(true)}
            size="large"
          >
            Add Your First Widget
          </Button>
        </Paper>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={{
            lg: widgets.map((w) => ({
              i: w.id,
              x: w.position.x,
              y: w.position.y,
              w: w.position.w,
              h: w.position.h
            }))
          }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
        >
          {widgets.map((widget) => (
            <div key={widget.id}>{renderWidget(widget)}</div>
          ))}
        </ResponsiveGridLayout>
      )}

      {/* Add Widget Dialog */}
      <Dialog
        open={addWidgetDialogOpen}
        onClose={() => setAddWidgetDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add Widget
            </Typography>
            <IconButton onClick={() => setAddWidgetDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a widget type to add to your dashboard
          </Typography>
          <Grid container spacing={2}>
            {widgetTypes.map((widget) => (
              <Grid size={{ xs: 12, sm: 6 }} key={widget.type}>
                <Card
                  onClick={() => setSelectedWidgetType(widget.type)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedWidgetType === widget.type ? `3px solid ${widget.color}` : '2px solid transparent',
                    transition: 'all 0.3s',
                    background: selectedWidgetType === widget.type
                      ? `linear-gradient(135deg, ${alpha(widget.color, 0.1)} 0%, ${alpha(widget.color, 0.05)} 100%)`
                      : 'white',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                      border: `3px solid ${widget.color}`
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          background: widget.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}
                      >
                        {widget.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {widget.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {widget.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAddWidgetDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleAddWidget}
            disabled={!selectedWidgetType}
            variant="contained"
            startIcon={<AddIcon />}
          >
            Add Widget
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Widget Content Component
const WidgetContent: React.FC<{ type: string; config: any; color: string }> = ({ type, config, color }) => {
  // Mock data for demonstration
  const getMockData = () => {
    switch (type) {
      case 'credentialExpiry':
        return {
          expiringSoon: 5,
          expired: 2,
          total: 47
        };
      case 'trainingCompliance':
        return {
          completed: 85,
          pending: 12,
          overdue: 3
        };
      case 'incidentTrends':
        return {
          thisMonth: 8,
          lastMonth: 12,
          trend: 'down'
        };
      case 'budgetUtilization':
        return {
          used: 75,
          available: 25,
          total: 100
        };
      default:
        return {
          value: 42,
          label: 'Items'
        };
    }
  };

  const data = getMockData();

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h2" sx={{ fontWeight: 700, color, mb: 2 }}>
        {Object.values(data)[0]}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {Object.keys(data)[0].replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        {Object.entries(data).slice(1).map(([key, value]) => (
          <Chip
            key={key}
            label={`${key}: ${value}`}
            size="small"
            sx={{
              backgroundColor: alpha(color, 0.2),
              color
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default DashboardWidgets;
