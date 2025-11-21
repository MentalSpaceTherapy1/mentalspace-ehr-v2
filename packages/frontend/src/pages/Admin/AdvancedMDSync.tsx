/**
 * AdvancedMD Sync Dashboard
 *
 * Admin interface for monitoring and managing AdvancedMD synchronization
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Refresh,
  Sync,
  Error,
  CheckCircle,
  OpenInNew,
  FilterList,
  Settings,
  CloudUpload,
  CloudDownload,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

import { useAdvancedMD } from '../../components/AdvancedMD';
import { SyncStatusBadge } from '../../components/AdvancedMD';
import advancedMDService from '../../services/advancedmd.service';
import type { SyncLog, LogFilters } from '../../types/advancedmd.types';

/**
 * AdvancedMD Sync Dashboard Component
 */
export default function AdvancedMDSync() {
  const {
    dashboard,
    stats,
    config,
    isLoadingDashboard,
    isLoadingStats,
    refreshDashboard,
    refreshStats,
    refreshConfig,
    testConnection,
  } = useAdvancedMD();

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Sync logs state
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsFilter, setLogsFilter] = useState<LogFilters>({ limit: 20, offset: 0 });

  // Bulk sync dialog state
  const [bulkSyncOpen, setBulkSyncOpen] = useState(false);
  const [bulkSyncStartDate, setBulkSyncStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'days'));
  const [bulkSyncEndDate, setBulkSyncEndDate] = useState<Dayjs | null>(dayjs());
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  // Pull updates dialog state
  const [pullUpdatesOpen, setPullUpdatesOpen] = useState(false);
  const [pullUpdatesSince, setPullUpdatesSince] = useState<Dayjs | null>(dayjs().subtract(1, 'day'));
  const [isPullingUpdates, setIsPullingUpdates] = useState(false);

  // Connection test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Load initial data
  useEffect(() => {
    refreshDashboard();
    refreshStats(7);
    refreshConfig();
    loadLogs();
  }, []);

  /**
   * Load sync logs
   */
  const loadLogs = async (filters?: LogFilters) => {
    setIsLoadingLogs(true);
    try {
      const result = await advancedMDService.getSyncLogs(filters || logsFilter);
      setLogs(result.logs);
      setLogsTotal(result.total);
    } catch (error: any) {
      console.error('Failed to load logs:', error);
      toast.error('Failed to load sync logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  /**
   * Handle connection test
   */
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const connected = await testConnection();
      if (connected) {
        toast.success('AdvancedMD connection successful');
      } else {
        toast.error('AdvancedMD connection failed');
      }
    } catch (error: any) {
      toast.error('Connection test failed: ' + error.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  /**
   * Handle bulk sync
   */
  const handleBulkSync = async () => {
    if (!bulkSyncStartDate || !bulkSyncEndDate) {
      toast.error('Please select start and end dates');
      return;
    }

    setIsBulkSyncing(true);
    try {
      const result = await advancedMDService.bulkSyncAppointments({
        startDate: bulkSyncStartDate.toISOString(),
        endDate: bulkSyncEndDate.toISOString(),
      });

      toast.success(
        `Bulk sync completed: ${result.successCount} succeeded, ${result.errorCount} failed`
      );
      setBulkSyncOpen(false);
      refreshDashboard();
      loadLogs();
    } catch (error: any) {
      toast.error('Bulk sync failed: ' + error.message);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  /**
   * Handle pull updates
   */
  const handlePullUpdates = async () => {
    setIsPullingUpdates(true);
    try {
      const result = await advancedMDService.pullAppointmentUpdates({
        since: pullUpdatesSince?.toISOString(),
      });

      toast.success(
        `Pull completed: ${result.updatedCount} updated, ${result.newCount} new`
      );
      setPullUpdatesOpen(false);
      refreshDashboard();
      loadLogs();
    } catch (error: any) {
      toast.error('Pull updates failed: ' + error.message);
    } finally {
      setIsPullingUpdates(false);
    }
  };

  /**
   * Render overview cards
   */
  const renderOverviewCards = () => {
    if (!dashboard) return null;

    return (
      <Box display="flex" gap={3} flexWrap="wrap">
        {/* Patients Card */}
        <Box flex="1" minWidth="400px">
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Patient Sync</Typography>
                <CheckCircle color="success" />
              </Box>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h4">{dashboard.patients.total}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Synced
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {dashboard.patients.synced}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {dashboard.patients.pending}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {dashboard.patients.errors}
                  </Typography>
                </Box>
              </Box>

              {dashboard.patients.lastSynced && (
                <Typography variant="caption" color="text.secondary" mt={2} display="block">
                  Last synced: {format(new Date(dashboard.patients.lastSynced), 'MMM d, yyyy h:mm a')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Appointments Card */}
        <Box flex="1" minWidth="400px">
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Appointment Sync</Typography>
                <Sync color="primary" />
              </Box>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h4">{dashboard.appointments.total}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Synced
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {dashboard.appointments.synced}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {dashboard.appointments.pending}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {dashboard.appointments.errors}
                  </Typography>
                </Box>
              </Box>

              {dashboard.appointments.lastSynced && (
                <Typography variant="caption" color="text.secondary" mt={2} display="block">
                  Last synced: {format(new Date(dashboard.appointments.lastSynced), 'MMM d, yyyy h:mm a')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  };

  /**
   * Render action buttons
   */
  const renderActionButtons = () => {
    return (
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent>
          <Typography variant="h6" mb={2}>
            Sync Actions
          </Typography>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Box flex="1" minWidth="200px">
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  refreshDashboard();
                  refreshStats();
                  loadLogs();
                }}
                disabled={isLoadingDashboard}
              >
                Refresh Dashboard
              </Button>
            </Box>

            <Box flex="1" minWidth="200px">
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => setBulkSyncOpen(true)}
              >
                Bulk Sync Appointments
              </Button>
            </Box>

            <Box flex="1" minWidth="200px">
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CloudDownload />}
                onClick={() => setPullUpdatesOpen(true)}
              >
                Pull Updates from AMD
              </Button>
            </Box>

            <Box flex="1" minWidth="200px">
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Settings />}
                onClick={handleTestConnection}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Render sync statistics chart
   */
  const renderStatsChart = () => {
    if (!stats) return null;

    const chartData = stats.byDay.map(day => ({
      date: format(new Date(day.date), 'MMM d'),
      Patients: day.patients,
      Appointments: day.appointments,
      Errors: day.errors,
    }));

    return (
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent>
          <Typography variant="h6" mb={2}>
            Sync Activity (Last {stats.period.days} Days)
          </Typography>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="Patients" fill="#4caf50" />
              <Bar dataKey="Appointments" fill="#2196f3" />
              <Bar dataKey="Errors" fill="#f44336" />
            </BarChart>
          </ResponsiveContainer>

          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            <Box flex="1" minWidth="200px">
              <Typography variant="body2" color="text.secondary">
                Patient Success Rate
              </Typography>
              <Typography variant="h5">{stats.patients.successRate.toFixed(1)}%</Typography>
            </Box>
            <Box flex="1" minWidth="200px">
              <Typography variant="body2" color="text.secondary">
                Appointment Success Rate
              </Typography>
              <Typography variant="h5">{stats.appointments.successRate.toFixed(1)}%</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Render sync logs table
   */
  const renderLogsTable = () => {
    return (
      <Card
        sx={{
          mt: 3,
          borderRadius: 3,
          boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Sync Activity</Typography>
            <Button
              startIcon={<FilterList />}
              onClick={() => loadLogs()}
            >
              Refresh
            </Button>
          </Box>

          {isLoadingLogs ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Entity ID</TableCell>
                    <TableCell>AMD ID</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Chip label={log.syncType} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.syncDirection === 'to_amd' ? 'To AMD' : 'From AMD'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <SyncStatusBadge status={log.syncStatus} />
                      </TableCell>
                      <TableCell>{log.entityId.substring(0, 8)}...</TableCell>
                      <TableCell>{log.amdEntityId || 'N/A'}</TableCell>
                      <TableCell>
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        {log.syncError && (
                          <Tooltip title={log.syncError}>
                            <Error color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box py={4}>
          {/* Modern Gradient Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 4,
              p: 4,
              mb: 4,
              color: 'white',
              boxShadow: '0 8px 32px 0 rgba(102, 126, 234, 0.37)',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 2,
                    p: 1.5,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sync sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="600">
                    AdvancedMD Sync Dashboard
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Monitor and manage synchronization between MentalSpace EHR and AdvancedMD
                  </Typography>
                </Box>
              </Box>
              {config && (
                <Box
                  sx={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                  }}
                >
                  <Typography variant="caption" display="block">
                    Office Key: {config.officeKey}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Environment: {config.environment.toUpperCase()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Loading State */}
          {isLoadingDashboard && <LinearProgress sx={{ mb: 2 }} />}

          {/* Overview Cards */}
          {renderOverviewCards()}

          {/* Action Buttons */}
          {renderActionButtons()}

          {/* Statistics Chart */}
          {renderStatsChart()}

          {/* Sync Logs */}
          {renderLogsTable()}

          {/* Bulk Sync Dialog */}
          <Dialog open={bulkSyncOpen} onClose={() => setBulkSyncOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Bulk Sync Appointments</DialogTitle>
            <DialogContent>
              <Box mt={2}>
                <DatePicker
                  label="Start Date"
                  value={bulkSyncStartDate}
                  onChange={setBulkSyncStartDate}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                <DatePicker
                  label="End Date"
                  value={bulkSyncEndDate}
                  onChange={setBulkSyncEndDate}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                <Alert severity="info" sx={{ mt: 2 }}>
                  This will sync all appointments in the selected date range to AdvancedMD.
                </Alert>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBulkSyncOpen(false)}>Cancel</Button>
              <Button
                onClick={handleBulkSync}
                variant="contained"
                disabled={isBulkSyncing}
              >
                {isBulkSyncing ? 'Syncing...' : 'Start Sync'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Pull Updates Dialog */}
          <Dialog open={pullUpdatesOpen} onClose={() => setPullUpdatesOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Pull Updates from AdvancedMD</DialogTitle>
            <DialogContent>
              <Box mt={2}>
                <DatePicker
                  label="Since Date"
                  value={pullUpdatesSince}
                  onChange={setPullUpdatesSince}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                <Alert severity="info" sx={{ mt: 2 }}>
                  This will pull all appointment updates from AdvancedMD since the selected date.
                </Alert>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPullUpdatesOpen(false)}>Cancel</Button>
              <Button
                onClick={handlePullUpdates}
                variant="contained"
                disabled={isPullingUpdates}
              >
                {isPullingUpdates ? 'Pulling...' : 'Pull Updates'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </LocalizationProvider>
  );
}
