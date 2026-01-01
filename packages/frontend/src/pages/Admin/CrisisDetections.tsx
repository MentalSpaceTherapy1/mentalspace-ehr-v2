import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Pagination,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Warning,
  Error as ErrorIcon,
  Info,
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
  CheckCircle,
  Flag,
  Visibility,
  Assignment,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../lib/api';

interface CrisisDetectionLog {
  id: string;
  messageId: string;
  userId: string;
  conversationId: string | null;
  detectedAt: string;
  keywords: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  messageSnippet: string;
  notificationsSent: boolean;
  notifiedUsers: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  falsePositive: boolean;
  actionTaken: string | null;
}

interface CrisisStats {
  totalDetections: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
  };
  reviewedCount: number;
  pendingReviewCount: number;
  falsePositiveCount: number;
}

export default function CrisisDetections() {
  const [logs, setLogs] = useState<CrisisDetectionLog[]>([]);
  const [stats, setStats] = useState<CrisisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [showFilters, setShowFilters] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [reviewedFilter, setReviewedFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  // Review Dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CrisisDetectionLog | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [markFalsePositive, setMarkFalsePositive] = useState(false);
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch crisis detection logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
      };

      if (severityFilter) params.severity = severityFilter;
      if (reviewedFilter === 'reviewed') params.reviewed = 'true';
      if (reviewedFilter === 'pending') params.reviewed = 'false';
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await api.get('/crisis/logs', { params });

      setLogs(response.data.data.logs || []);
      setTotalPages(response.data.data.pagination.pages || 1);
    } catch (err: any) {
      console.error('Failed to fetch crisis logs:', err);
      setError(err.response?.data?.message || 'Failed to load crisis detections');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await api.get('/crisis/stats', { params });
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch crisis stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, severityFilter, reviewedFilter, startDate, endDate]);

  const handleOpenReviewDialog = (log: CrisisDetectionLog) => {
    setSelectedLog(log);
    setReviewNotes(log.reviewNotes || '');
    setMarkFalsePositive(log.falsePositive);
    setActionTaken(log.actionTaken || '');
    setReviewDialogOpen(true);
  };

  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
    setSelectedLog(null);
    setReviewNotes('');
    setMarkFalsePositive(false);
    setActionTaken('');
  };

  const handleSubmitReview = async () => {
    if (!selectedLog || !reviewNotes.trim()) {
      toast.error('Please provide review notes');
      return;
    }

    try {
      setSubmitting(true);

      await api.put(`/crisis/logs/${selectedLog.id}/review`, {
        notes: reviewNotes,
        falsePositive: markFalsePositive,
        actionTaken: actionTaken.trim() || undefined,
      });

      // Refresh logs
      await fetchLogs();
      await fetchStats();

      handleCloseReviewDialog();
      toast.success('Review submitted successfully');
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setSeverityFilter('');
    setReviewedFilter('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon />;
      case 'HIGH':
        return <Warning />;
      case 'MEDIUM':
        return <Info />;
      default:
        return <Flag />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Crisis Detection Monitoring
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and review messages flagged for crisis keywords
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs: 12, sm: 6, md: 2.4}}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Assignment color="primary" />
                    <Typography variant="h6">{stats.totalDetections}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Detections
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 2.4}}>
              <Card sx={{ bgcolor: '#ffebee' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ErrorIcon color="error" />
                    <Typography variant="h6">{stats.bySeverity.critical}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Critical
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 2.4}}>
              <Card sx={{ bgcolor: '#fff3e0' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Warning color="warning" />
                    <Typography variant="h6">{stats.bySeverity.high}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    High
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 2.4}}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Info color="info" />
                    <Typography variant="h6">{stats.bySeverity.medium}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Medium
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 2.4}}>
              <Card sx={{ bgcolor: '#f1f8e9' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="success" />
                    <Typography variant="h6">{stats.reviewedCount}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Reviewed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <FilterList />
                <Typography variant="h6">Filters</Typography>
              </Box>
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={showFilters}>
              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <FormControl fullWidth>
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      label="Severity"
                    >
                      <MenuItem value="">All Severities</MenuItem>
                      <MenuItem value="CRITICAL">Critical</MenuItem>
                      <MenuItem value="HIGH">High</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <FormControl fullWidth>
                    <InputLabel>Review Status</InputLabel>
                    <Select
                      value={reviewedFilter}
                      onChange={(e) => setReviewedFilter(e.target.value)}
                      label="Review Status"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="pending">Pending Review</MenuItem>
                      <MenuItem value="reviewed">Reviewed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>

              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  variant="outlined"
                >
                  Clear Filters
                </Button>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Detected At</TableCell>
                    <TableCell>Keywords</TableCell>
                    <TableCell>Message Snippet</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" py={4}>
                          No crisis detections found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow
                        key={log.id}
                        sx={{
                          backgroundColor: log.reviewedBy ? 'inherit' : 'rgba(255, 152, 0, 0.08)',
                        }}
                      >
                        <TableCell>
                          <Chip
                            icon={getSeverityIcon(log.severity)}
                            label={log.severity}
                            color={getSeverityColor(log.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {dayjs(log.detectedAt).format('MMM D, YYYY h:mm A')}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {log.keywords.slice(0, 3).map((keyword, idx) => (
                              <Chip
                                key={idx}
                                label={keyword}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {log.keywords.length > 3 && (
                              <Chip
                                label={`+${log.keywords.length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {log.messageSnippet}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {log.falsePositive ? (
                            <Chip label="False Positive" color="default" size="small" />
                          ) : log.reviewedBy ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="Reviewed"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip label="Pending Review" color="warning" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Review Detection">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenReviewDialog(log)}
                              color="primary"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}

        {/* Review Dialog */}
        <Dialog
          open={reviewDialogOpen}
          onClose={handleCloseReviewDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Review Crisis Detection</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{xs: 12}}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Severity
                    </Typography>
                    <Chip
                      icon={getSeverityIcon(selectedLog.severity)}
                      label={selectedLog.severity}
                      color={getSeverityColor(selectedLog.severity) as any}
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid size={{xs: 12}}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Detected Keywords
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                      {selectedLog.keywords.map((keyword, idx) => (
                        <Chip key={idx} label={keyword} variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                  <Grid size={{xs: 12}}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Message Snippet
                    </Typography>
                    <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">{selectedLog.messageSnippet}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{xs: 12}}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Detected At
                    </Typography>
                    <Typography variant="body2" mt={1}>
                      {dayjs(selectedLog.detectedAt).format('MMMM D, YYYY [at] h:mm A')}
                    </Typography>
                  </Grid>
                  <Grid size={{xs: 12}}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Review Notes *"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Document your review and assessment of this detection..."
                    />
                  </Grid>
                  <Grid size={{xs: 12}}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Action Taken (Optional)"
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="Describe any actions taken (e.g., contacted client, scheduled safety assessment...)"
                    />
                  </Grid>
                  <Grid size={{xs: 12}}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={markFalsePositive}
                          onChange={(e) => setMarkFalsePositive(e.target.checked)}
                        />
                      }
                      label="Mark as False Positive"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReviewDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              variant="contained"
              disabled={submitting || !reviewNotes.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}
