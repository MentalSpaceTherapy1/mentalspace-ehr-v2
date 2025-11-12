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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterIcon,
  ViewColumn as ColumnIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  AreaChart as AreaChartIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCustomReports, ReportFilter } from '../../hooks/useModule9Reports';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const reportTypes = [
  { id: 'credentialing', name: 'Credentialing Report', icon: '📋', color: '#3B82F6' },
  { id: 'training', name: 'Training Compliance', icon: '🎓', color: '#8B5CF6' },
  { id: 'incidents', name: 'Incident Reports', icon: '⚠️', color: '#EF4444' },
  { id: 'policies', name: 'Policy Management', icon: '📜', color: '#10B981' },
  { id: 'onboarding', name: 'Onboarding Status', icon: '👋', color: '#F59E0B' },
  { id: 'financial', name: 'Financial Overview', icon: '💰', color: '#06B6D4' },
  { id: 'vendor', name: 'Vendor Performance', icon: '🤝', color: '#EC4899' },
  { id: 'guardian', name: 'Guardian Access', icon: '👨‍👩‍👧', color: '#6366F1' },
  { id: 'messaging', name: 'Secure Messaging', icon: '💬', color: '#8B5CF6' },
];

const chartTypes = [
  { id: 'bar', name: 'Bar Chart', icon: <BarChartIcon /> },
  { id: 'line', name: 'Line Chart', icon: <LineChartIcon /> },
  { id: 'pie', name: 'Pie Chart', icon: <PieChartIcon /> },
  { id: 'area', name: 'Area Chart', icon: <AreaChartIcon /> },
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'between', label: 'Between' },
];

const ReportBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { saveCustomReport, loading } = useCustomReports();

  const [activeStep, setActiveStep] = useState(0);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedChartType, setSelectedChartType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const steps = ['Select Report Type', 'Configure Filters', 'Choose Columns', 'Select Chart Type', 'Preview & Save'];

  // Available columns based on report type
  const availableColumns: Record<string, string[]> = {
    credentialing: ['Provider Name', 'License Type', 'License Number', 'Expiration Date', 'Status'],
    training: ['Staff Name', 'Training Name', 'Completion Date', 'Status', 'Due Date'],
    incidents: ['Incident ID', 'Date', 'Type', 'Severity', 'Status', 'Reporter'],
    policies: ['Policy Name', 'Version', 'Effective Date', 'Review Date', 'Acknowledgments'],
    onboarding: ['Employee Name', 'Start Date', 'Department', 'Completion %', 'Status'],
    financial: ['Category', 'Budget', 'Actual', 'Variance', 'Period'],
    vendor: ['Vendor Name', 'Contract Value', 'Start Date', 'End Date', 'Performance Score'],
    guardian: ['Guardian Name', 'Dependent', 'Access Level', 'Last Login', 'Status'],
    messaging: ['Sender', 'Recipient', 'Date', 'Subject', 'Status'],
  };

  // Available filter fields based on report type
  const availableFilterFields: Record<string, string[]> = {
    credentialing: ['status', 'licenseType', 'expirationDate'],
    training: ['status', 'completionDate', 'trainingType'],
    incidents: ['severity', 'status', 'incidentType', 'dateRange'],
    policies: ['status', 'effectiveDate', 'policyType'],
    onboarding: ['status', 'department', 'startDate'],
    financial: ['category', 'period', 'variance'],
    vendor: ['contractStatus', 'performanceScore', 'contractValue'],
    guardian: ['accessLevel', 'status', 'lastLogin'],
    messaging: ['status', 'dateRange', 'messageType'],
  };

  const handleAddFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  const handleUpdateFilter = (index: number, key: keyof ReportFilter, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [key]: value };
    setFilters(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedColumns(items);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!reportName || !selectedReportType || selectedColumns.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await saveCustomReport({
        name: reportName,
        description: reportDescription,
        reportType: selectedReportType,
        filters,
        columns: selectedColumns,
        chartType: selectedChartType
      });

      setSuccess(true);
      setTimeout(() => navigate('/reports'), 2000);
    } catch (err) {
      setError('Failed to save custom report');
    }
  };

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return selectedReportType !== '';
      case 1:
        return true; // Filters are optional
      case 2:
        return selectedColumns.length > 0;
      case 3:
        return true; // Chart type is optional
      case 4:
        return reportName !== '';
      default:
        return false;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/reports')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            🏗️ Custom Report Builder
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Create custom reports with drag-and-drop filters and columns
        </Typography>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Report saved successfully!</Alert>}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      <Paper sx={{ p: 4, mb: 3 }}>
        {/* Step 0: Select Report Type */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Select Report Type
            </Typography>
            <Grid container spacing={2}>
              {reportTypes.map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type.id}>
                  <Card
                    onClick={() => setSelectedReportType(type.id)}
                    sx={{
                      cursor: 'pointer',
                      border: selectedReportType === type.id ? `3px solid ${type.color}` : '2px solid transparent',
                      transition: 'all 0.3s',
                      background: selectedReportType === type.id
                        ? `linear-gradient(135deg, ${alpha(type.color, 0.1)} 0%, ${alpha(type.color, 0.05)} 100%)`
                        : 'white',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                        border: `3px solid ${type.color}`,
                      }
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          fontSize: '40px',
                          mb: 2,
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, ${type.color} 0%, ${alpha(type.color, 0.7)} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {type.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {type.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 1: Configure Filters */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Configure Filters (Optional)
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddFilter}
                variant="outlined"
              >
                Add Filter
              </Button>
            </Box>

            {filters.length === 0 ? (
              <Alert severity="info">
                No filters added. Click "Add Filter" to add filtering criteria.
              </Alert>
            ) : (
              <List>
                {filters.map((filter, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 2,
                      p: 2
                    }}
                  >
                    <Grid container spacing={2} sx={{ flex: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Field</InputLabel>
                          <Select
                            value={filter.field}
                            onChange={(e) => handleUpdateFilter(index, 'field', e.target.value)}
                            label="Field"
                          >
                            {selectedReportType && availableFilterFields[selectedReportType]?.map((field) => (
                              <MenuItem key={field} value={field}>
                                {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Operator</InputLabel>
                          <Select
                            value={filter.operator}
                            onChange={(e) => handleUpdateFilter(index, 'operator', e.target.value)}
                            label="Operator"
                          >
                            {operators.map((op) => (
                              <MenuItem key={op.value} value={op.value}>
                                {op.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          value={filter.value}
                          onChange={(e) => handleUpdateFilter(index, 'value', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <IconButton onClick={() => handleRemoveFilter(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Step 2: Choose Columns */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Select Columns to Include
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Available Columns
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                  {selectedReportType && availableColumns[selectedReportType]?.map((column) => (
                    <FormControlLabel
                      key={column}
                      control={
                        <Checkbox
                          checked={selectedColumns.includes(column)}
                          onChange={() => handleColumnToggle(column)}
                        />
                      }
                      label={column}
                      sx={{ display: 'block', mb: 1 }}
                    />
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Selected Columns (Drag to reorder)
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 400 }}>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="columns">
                      {(provided) => (
                        <List {...provided.droppableProps} ref={provided.innerRef}>
                          {selectedColumns.map((column, index) => (
                            <Draggable key={column} draggableId={column} index={index}>
                              {(provided) => (
                                <ListItem
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    mb: 1,
                                    backgroundColor: 'background.paper'
                                  }}
                                >
                                  <ListItemIcon>
                                    <DragIcon />
                                  </ListItemIcon>
                                  <ListItemText primary={column} />
                                </ListItem>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </List>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 3: Select Chart Type */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Select Chart Type (Optional)
            </Typography>
            <Grid container spacing={2}>
              {chartTypes.map((chart) => (
                <Grid item xs={12} sm={6} md={3} key={chart.id}>
                  <Card
                    onClick={() => setSelectedChartType(chart.id)}
                    sx={{
                      cursor: 'pointer',
                      border: selectedChartType === chart.id ? '3px solid #3B82F6' : '2px solid transparent',
                      transition: 'all 0.3s',
                      background: selectedChartType === chart.id
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
                        : 'white',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ fontSize: 48, color: '#3B82F6', mb: 2 }}>
                        {chart.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {chart.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 4: Preview & Save */}
        {activeStep === 4 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Report Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Report Name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Preview Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Report Type
                    </Typography>
                    <Typography variant="h6">
                      {reportTypes.find(t => t.id === selectedReportType)?.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Chart Type
                    </Typography>
                    <Typography variant="h6">
                      {selectedChartType ? chartTypes.find(c => c.id === selectedChartType)?.name : 'None'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Filters
                    </Typography>
                    <Typography variant="h6">{filters.length} filter(s)</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Columns
                    </Typography>
                    <Typography variant="h6">{selectedColumns.length} column(s)</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Selected Columns:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedColumns.map((column) => (
                  <Chip key={column} label={column} color="primary" variant="outlined" />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!canProceed() || loading}
              startIcon={<SaveIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                }
              }}
            >
              Save Report
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default ReportBuilder;
