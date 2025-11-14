import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  Divider,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  BeachAccess as BeachAccessIcon,
  LocalHospital as LocalHospitalIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { usePTO, PTORequest, PTOBalance } from '../../hooks/usePTO';
import { format, differenceInDays } from 'date-fns';

interface PTOApprovalProps {
  managerId?: string;
}

const PTO_TYPE_CONFIG = {
  VACATION: {
    label: 'Vacation',
    color: '#3498DB',
    icon: <BeachAccessIcon />,
  },
  SICK: {
    label: 'Sick Leave',
    color: '#E74C3C',
    icon: <LocalHospitalIcon />,
  },
  PERSONAL: {
    label: 'Personal Day',
    color: '#9B59B6',
    icon: <PersonIcon />,
  },
  BEREAVEMENT: {
    label: 'Bereavement',
    color: '#34495E',
    icon: <PersonIcon />,
  },
  JURY_DUTY: {
    label: 'Jury Duty',
    color: '#16A085',
    icon: <PersonIcon />,
  },
};

const PTOApproval: React.FC<PTOApprovalProps> = ({ managerId }) => {
  const { getRequests, approveRequest, denyRequest, getBalance, checkConflicts, loading } =
    usePTO();
  const [requests, setRequests] = useState<PTORequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PTORequest | null>(null);
  const [employeeBalance, setEmployeeBalance] = useState<PTOBalance | null>(null);
  const [conflicts, setConflicts] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      const data = await getRequests({ status: statusFilter });
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleViewDetails = async (request: PTORequest) => {
    setSelectedRequest(request);

    // Load employee balance
    try {
      const balance = await getBalance(request.employeeId);
      setEmployeeBalance(balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }

    // Check for conflicts
    try {
      const conflictData = await checkConflicts(request.startDate, request.endDate);
      setConflicts(conflictData);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }

    setDetailsDialogOpen(true);
  };

  const handleOpenActionDialog = (type: 'approve' | 'deny') => {
    setActionType(type);
    setNotes('');
    setDetailsDialogOpen(false);
    setActionDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    try {
      if (actionType === 'approve') {
        await approveRequest(selectedRequest.id, notes);
      } else {
        await denyRequest(selectedRequest.id, notes);
      }

      setActionDialogOpen(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Failed to process request:', error);
    }
  };

  const getTypeColor = (type: string) => {
    return PTO_TYPE_CONFIG[type as keyof typeof PTO_TYPE_CONFIG]?.color || '#95A5A6';
  };

  const getTypeLabel = (type: string) => {
    return PTO_TYPE_CONFIG[type as keyof typeof PTO_TYPE_CONFIG]?.label || type;
  };

  const getTypeIcon = (type: string) => {
    return PTO_TYPE_CONFIG[type as keyof typeof PTO_TYPE_CONFIG]?.icon || <PersonIcon />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#2ECC71';
      case 'DENIED':
        return '#E74C3C';
      case 'PENDING':
        return '#F39C12';
      case 'CANCELLED':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
          PTO Approvals
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Review and manage team time off requests
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {pendingCount}
                  </Typography>
                  <Typography variant="body2">Pending Requests</Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 64, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {requests.filter((r) => r.status === 'APPROVED').length}
                  </Typography>
                  <Typography variant="body2">Approved</Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 64, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {requests.filter((r) => r.status === 'DENIED').length}
                  </Typography>
                  <Typography variant="body2">Denied</Typography>
                </Box>
                <CancelIcon sx={{ fontSize: 64, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {requests.reduce((sum, r) => sum + r.totalDays, 0)}
                  </Typography>
                  <Typography variant="body2">Total Days</Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 64, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status Filter"
          >
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="DENIED">Denied</MenuItem>
            <MenuItem value="">All Requests</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Paper elevation={2} sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="textSecondary">
            No {statusFilter.toLowerCase()} requests found
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {requests.map((request) => (
            <Grid size={{ xs: 12 }} key={request.id}>
              <Card
                sx={{
                  border: `2px solid ${getTypeColor(request.type)}40`,
                  '&:hover': {
                    boxShadow: `0 4px 20px ${getTypeColor(request.type)}40`,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease',
                  },
                }}
              >
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            background: `linear-gradient(135deg, ${getTypeColor(request.type)} 0%, ${getTypeColor(
                              request.type
                            )}CC 100%)`,
                            fontSize: '1.5rem',
                            fontWeight: 700,
                          }}
                        >
                          {request.employeeName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {request.employeeName}
                          </Typography>
                          <Chip
                            label={getTypeLabel(request.type)}
                            icon={getTypeIcon(request.type)}
                            size="small"
                            sx={{
                              backgroundColor: getTypeColor(request.type),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 3 }}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Dates
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {format(new Date(request.startDate), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        to {format(new Date(request.endDate), 'MMM dd, yyyy')}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: getTypeColor(request.type) }}>
                          {request.totalDays}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Days ({request.totalHours} hrs)
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>
                      <Chip
                        label={request.status}
                        sx={{
                          backgroundColor: getStatusColor(request.status),
                          color: 'white',
                          fontWeight: 600,
                          width: '100%',
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>
                      <Stack spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(request)}
                          fullWidth
                          sx={{
                            borderColor: '#667EEA',
                            color: '#667EEA',
                            '&:hover': {
                              borderColor: '#667EEA',
                              backgroundColor: '#667EEA10',
                            },
                          }}
                        >
                          View
                        </Button>
                        {request.status === 'PENDING' && (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => {
                                setSelectedRequest(request);
                                handleOpenActionDialog('approve');
                              }}
                              fullWidth
                              sx={{
                                background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<CancelIcon />}
                              onClick={() => {
                                setSelectedRequest(request);
                                handleOpenActionDialog('deny');
                              }}
                              fullWidth
                              sx={{
                                borderColor: '#E74C3C',
                                color: '#E74C3C',
                                '&:hover': {
                                  borderColor: '#E74C3C',
                                  backgroundColor: '#E74C3C10',
                                },
                              }}
                            >
                              Deny
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: selectedRequest
                  ? `linear-gradient(135deg, ${getTypeColor(selectedRequest.type)} 0%, ${getTypeColor(
                      selectedRequest.type
                    )}CC 100%)`
                  : undefined,
              }}
            >
              {selectedRequest?.employeeName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedRequest?.employeeName}</Typography>
              <Chip
                label={selectedRequest ? getTypeLabel(selectedRequest.type) : ''}
                size="small"
                icon={selectedRequest ? getTypeIcon(selectedRequest.type) : undefined}
                sx={{
                  backgroundColor: selectedRequest ? getTypeColor(selectedRequest.type) : undefined,
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Start Date
                  </Typography>
                  <Typography variant="h6">
                    {format(new Date(selectedRequest.startDate), 'MMMM dd, yyyy')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    End Date
                  </Typography>
                  <Typography variant="h6">
                    {format(new Date(selectedRequest.endDate), 'MMMM dd, yyyy')}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: '2px solid #667EEA40', backgroundColor: '#667EEA10' }}>
                    <CardContent>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#667EEA' }}>
                        {selectedRequest.totalDays}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Days Requested
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: '2px solid #2ECC7140', backgroundColor: '#2ECC7110' }}>
                    <CardContent>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2ECC71' }}>
                        {selectedRequest.totalHours}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Hours
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedRequest.reason && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Reason
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#F5F5F5' }}>
                      <Typography variant="body2">{selectedRequest.reason}</Typography>
                    </Paper>
                  </Grid>
                )}

                {selectedRequest.coveragePlan && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Coverage Plan
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#F5F5F5' }}>
                      <Typography variant="body2">{selectedRequest.coveragePlan}</Typography>
                    </Paper>
                  </Grid>
                )}

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Balance Verification
                  </Typography>
                  {employeeBalance && (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Card sx={{ border: '2px solid #3498DB40', backgroundColor: '#3498DB10' }}>
                          <CardContent>
                            <Typography variant="caption" color="textSecondary">
                              Vacation Available
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                              {employeeBalance.vacation.available}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Card sx={{ border: '2px solid #E74C3C40', backgroundColor: '#E74C3C10' }}>
                          <CardContent>
                            <Typography variant="caption" color="textSecondary">
                              Sick Available
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                              {employeeBalance.sick.available}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Card sx={{ border: '2px solid #9B59B640', backgroundColor: '#9B59B610' }}>
                          <CardContent>
                            <Typography variant="caption" color="textSecondary">
                              Personal Available
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                              {employeeBalance.personal.available}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}
                </Grid>

                {conflicts && conflicts.hasConflicts && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="warning" icon={<WarningIcon />}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Coverage Impact Warning
                      </Typography>
                      <Typography variant="body2">
                        {conflicts.conflictCount} other team member(s) have approved PTO during this period.
                        Please verify adequate staffing before approval.
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {selectedRequest.approverName && (
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Approval History
                    </Typography>
                    <Card sx={{ backgroundColor: '#F5F5F5' }}>
                      <CardContent>
                        <Typography variant="body2" color="textSecondary">
                          {selectedRequest.status === 'APPROVED' ? 'Approved' : 'Denied'} by{' '}
                          {selectedRequest.approverName} on{' '}
                          {selectedRequest.approvedAt &&
                            format(new Date(selectedRequest.approvedAt), 'MMM dd, yyyy hh:mm a')}
                        </Typography>
                        {selectedRequest.approvalNotes && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Notes: {selectedRequest.approvalNotes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          {selectedRequest?.status === 'PENDING' && (
            <>
              <Button
                onClick={() => handleOpenActionDialog('deny')}
                startIcon={<CancelIcon />}
                sx={{ color: '#E74C3C' }}
              >
                Deny
              </Button>
              <Button
                onClick={() => handleOpenActionDialog('approve')}
                variant="contained"
                startIcon={<CheckCircleIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                }}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve' : 'Deny'} PTO Request
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert
              severity={actionType === 'approve' ? 'success' : 'warning'}
              sx={{ mb: 3 }}
            >
              You are about to {actionType} this PTO request for {selectedRequest?.employeeName}.
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes (Optional)"
              placeholder={`Add any notes about this ${actionType === 'approve' ? 'approval' : 'denial'}...`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            disabled={loading}
            sx={{
              background:
                actionType === 'approve'
                  ? 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)'
                  : 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
            }}
          >
            Confirm {actionType === 'approve' ? 'Approval' : 'Denial'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PTOApproval;
