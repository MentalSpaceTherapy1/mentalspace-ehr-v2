import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  alpha,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as FileDownloadIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useAuditLogs, AuditLogEntry } from '../../hooks/useModule9Reports';
import dayjs, { Dayjs } from 'dayjs';
import { format } from 'date-fns';

const actionColors: Record<string, string> = {
  CREATE: '#10B981',
  UPDATE: '#3B82F6',
  DELETE: '#EF4444',
  VIEW: '#8B5CF6',
  LOGIN: '#06B6D4',
  LOGOUT: '#F59E0B',
  EXPORT: '#EC4899',
  IMPORT: '#6366F1'
};

const moduleIcons: Record<string, string> = {
  Credentialing: '📋',
  Training: '🎓',
  Incidents: '⚠️',
  Policies: '📜',
  Onboarding: '👋',
  Financial: '💰',
  Vendor: '🤝',
  Guardian: '👨‍👩‍👧',
  Messaging: '💬',
  Reports: '📊'
};

const AuditLogViewer: React.FC = () => {
  const navigate = useNavigate();
  const { logs, totalCount, loading, error, fetchAuditLogs, exportAuditLogs } = useAuditLogs();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage, selectedAction, selectedModule, selectedUser, startDate, endDate]);

  const loadLogs = () => {
    fetchAuditLogs({
      action: selectedAction || undefined,
      module: selectedModule || undefined,
      userId: selectedUser || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      page: page + 1,
      limit: rowsPerPage
    });
  };

  const handleSearch = () => {
    setPage(0);
    loadLogs();
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const blob = await exportAuditLogs(
        {
          action: selectedAction || undefined,
          module: selectedModule || undefined,
          userId: selectedUser || undefined,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        },
        exportFormat
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleClearFilters = () => {
    setSelectedAction('');
    setSelectedModule('');
    setSelectedUser('');
    setSearchQuery('');
    setStartDate(dayjs().subtract(7, 'day'));
    setEndDate(dayjs());
    setPage(0);
  };

  const activeFiltersCount = [selectedAction, selectedModule, selectedUser].filter(Boolean).length;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                  🔍 Audit Log Viewer
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Track all system activities and user actions
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Refresh">
                <IconButton onClick={loadLogs} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel>Format</InputLabel>
                <Select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  label="Format"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                  }
                }}
              >
                Export Audit Trail
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {totalCount.toLocaleString()}
                </Typography>
                <Typography variant="body2">Total Events</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {logs.filter(l => l.action === 'LOGIN').length}
                </Typography>
                <Typography variant="body2">Login Events</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {logs.filter(l => ['CREATE', 'UPDATE', 'DELETE'].includes(l.action)).length}
                </Typography>
                <Typography variant="body2">Data Changes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {new Set(logs.map(l => l.userId)).size}
                </Typography>
                <Typography variant="body2">Unique Users</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              Filters
              {activeFiltersCount > 0 && (
                <Badge badgeContent={activeFiltersCount} color="primary" />
              )}
            </Typography>
            {activeFiltersCount > 0 && (
              <Button onClick={handleClearFilters} size="small">
                Clear All
              </Button>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  label="Action"
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {Object.keys(actionColors).map((action) => (
                    <MenuItem key={action} value={action}>
                      <Chip
                        label={action}
                        size="small"
                        sx={{
                          backgroundColor: actionColors[action],
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Module</InputLabel>
                <Select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  label="Module"
                >
                  <MenuItem value="">All Modules</MenuItem>
                  {Object.entries(moduleIcons).map(([module, icon]) => (
                    <MenuItem key={module} value={module}>
                      {icon} {module}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Audit Log Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Loading audit logs...</Typography>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No audit logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha('#667eea', 0.05)
                        }
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {log.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {log.userId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          sx={{
                            backgroundColor: actionColors[log.action] || '#6B7280',
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 20 }}>
                            {moduleIcons[log.module] || '📄'}
                          </Typography>
                          <Typography variant="body2">{log.module}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {JSON.stringify(log.details).substring(0, 50)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.ipAddress || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(log)}
                            color="primary"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>

        {/* Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Audit Log Details
              </Typography>
              <IconButton onClick={() => setDetailsDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Timestamp
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {format(new Date(selectedLog.timestamp), 'PPpp')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      User
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedLog.userName} ({selectedLog.userId})
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Action
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={selectedLog.action}
                        sx={{
                          backgroundColor: actionColors[selectedLog.action] || '#6B7280',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Module
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {moduleIcons[selectedLog.module]} {selectedLog.module}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      IP Address
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedLog.ipAddress || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body2" noWrap>
                      {selectedLog.userAgent || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Event Details
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        backgroundColor: alpha('#667eea', 0.05),
                        fontFamily: 'monospace',
                        maxHeight: 300,
                        overflow: 'auto'
                      }}
                    >
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default AuditLogViewer;
