import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip,
  Badge,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Block,
  Description,
  Search,
  Download,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  Info,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/v1';

interface GuardianRelationship {
  id: string;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  minor: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
    dateOfBirth: Date;
  };
  relationshipType: string;
  accessLevel: string;
  permissions: {
    canScheduleAppointments: boolean;
    canViewRecords: boolean;
    canCommunicateWithClinician: boolean;
  };
  verificationStatus: string;
  verificationDocuments: Array<{
    id: string;
    fileName: string;
    storageLocation: string;
    uploadedAt: string;
  }>;
  createdAt: Date;
  verifiedAt?: Date;
  verifiedBy?: {
    firstName: string;
    lastName: string;
  };
  notes?: string;
  rejectionReason?: string;
}

interface Stats {
  pending: number;
  verified: number;
  rejected: number;
  averageVerificationDays: number;
}

const GuardianVerification: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [relationships, setRelationships] = useState<GuardianRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    verified: 0,
    rejected: 0,
    averageVerificationDays: 0,
  });

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('ALL');
  const [accessLevelFilter, setAccessLevelFilter] = useState('ALL');

  // Modal state
  const [selectedRelationship, setSelectedRelationship] = useState<GuardianRelationship | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentZoom, setDocumentZoom] = useState(1);

  // Form state
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState('INSUFFICIENT_DOCUMENTATION');
  const [revocationReason, setRevocationReason] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const REJECTION_CATEGORIES = [
    { value: 'INSUFFICIENT_DOCUMENTATION', label: 'Insufficient documentation' },
    { value: 'DOCUMENTS_EXPIRED', label: 'Documents expired/invalid' },
    { value: 'CANNOT_VERIFY_IDENTITY', label: 'Cannot verify identity' },
    { value: 'NOT_A_CLIENT', label: 'Minor is not a current client' },
    { value: 'OTHER', label: 'Other (specify)' },
  ];

  useEffect(() => {
    fetchRelationships();
    fetchStats();
  }, [tabValue, page, searchTerm, relationshipFilter, accessLevelFilter]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/guardian/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchRelationships = async () => {
    try {
      setLoading(true);
      setError(null);

      const status = ['PENDING', 'VERIFIED', 'REJECTED'][tabValue];
      const params: any = {
        page,
        limit: 20,
        verificationStatus: status,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (relationshipFilter !== 'ALL') {
        params.relationshipType = relationshipFilter;
      }

      if (accessLevelFilter !== 'ALL') {
        params.accessLevel = accessLevelFilter;
      }

      const response = await axios.get(`${API_BASE_URL}/admin/guardian/relationships`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.data.success) {
        setRelationships(response.data.data);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedRelationship) return;

    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/admin/guardian/${selectedRelationship.id}/verify`,
        { notes: verificationNotes },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSuccess('Guardian relationship verified successfully');
        setVerifyModalOpen(false);
        setVerificationNotes('');
        setSelectedRelationship(null);
        fetchRelationships();
        fetchStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify relationship');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRelationship || !rejectionReason) return;

    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/admin/guardian/${selectedRelationship.id}/reject`,
        {
          reason: `[${rejectionCategory}] ${rejectionReason}`,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSuccess('Guardian relationship rejected');
        setRejectModalOpen(false);
        setRejectionReason('');
        setRejectionCategory('INSUFFICIENT_DOCUMENTATION');
        setSelectedRelationship(null);
        fetchRelationships();
        fetchStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject relationship');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedRelationship || !revocationReason) return;

    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/admin/guardian/${selectedRelationship.id}/revoke`,
        { reason: revocationReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSuccess('Guardian relationship revoked');
        setRevokeModalOpen(false);
        setRevocationReason('');
        setSelectedRelationship(null);
        fetchRelationships();
        fetchStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke relationship');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (documentUrl: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/guardian/document-url`,
        { storageLocation: documentUrl },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSelectedDocument(response.data.data.url);
        setDocumentViewerOpen(true);
      }
    } catch (err: any) {
      setError('Failed to load document');
    }
  };

  const handleOpenReviewModal = (relationship: GuardianRelationship) => {
    setSelectedRelationship(relationship);
    setReviewModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateAge = (dob: Date): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const renderRelationshipTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Request Date</TableCell>
            <TableCell>Guardian</TableCell>
            <TableCell>Minor</TableCell>
            <TableCell>Relationship</TableCell>
            <TableCell>Access Level</TableCell>
            <TableCell>Documents</TableCell>
            {tabValue === 0 && <TableCell>Days Pending</TableCell>}
            {tabValue === 1 && <TableCell>Verified By</TableCell>}
            {tabValue === 2 && <TableCell>Rejection Reason</TableCell>}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {relationships.map((rel) => {
            const daysPending = Math.floor(
              (new Date().getTime() - new Date(rel.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <TableRow key={rel.id}>
                <TableCell>{dayjs(rel.createdAt).format('MMM DD, YYYY')}</TableCell>
                <TableCell>
                  {rel.guardian.firstName} {rel.guardian.lastName}
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    {rel.guardian.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  {rel.minor.firstName} {rel.minor.lastName}
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    MRN: {rel.minor.medicalRecordNumber} | Age: {calculateAge(rel.minor.dateOfBirth)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={rel.relationshipType.replace('_', ' ')} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={rel.accessLevel}
                    size="small"
                    color={
                      rel.accessLevel === 'FULL'
                        ? 'success'
                        : rel.accessLevel === 'LIMITED'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Description />}
                    onClick={() => handleOpenReviewModal(rel)}
                  >
                    {rel.verificationDocuments?.length || 0}
                  </Button>
                </TableCell>
                {tabValue === 0 && (
                  <TableCell>
                    <Chip
                      label={`${daysPending} days`}
                      size="small"
                      color={daysPending > 5 ? 'error' : daysPending > 3 ? 'warning' : 'default'}
                    />
                  </TableCell>
                )}
                {tabValue === 1 && (
                  <TableCell>
                    {rel.verifiedBy
                      ? `${rel.verifiedBy.firstName} ${rel.verifiedBy.lastName}`
                      : 'N/A'}
                  </TableCell>
                )}
                {tabValue === 2 && (
                  <TableCell>
                    <Typography variant="caption">{rel.rejectionReason || 'N/A'}</Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {rel.verificationStatus === 'PENDING' && (
                      <>
                        <Tooltip title="Verify">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedRelationship(rel);
                              setVerifyModalOpen(true);
                            }}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedRelationship(rel);
                              setRejectModalOpen(true);
                            }}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {rel.verificationStatus === 'VERIFIED' && (
                      <Tooltip title="Revoke">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedRelationship(rel);
                            setRevokeModalOpen(true);
                          }}
                        >
                          <Block />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleOpenReviewModal(rel)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Guardian Relationship Verification
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                <Badge badgeContent={stats.pending > 10 ? '!' : null} color="error">
                  {stats.pending}
                </Badge>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.verified}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified Relationships
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.rejected}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejected This Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {stats.averageVerificationDays}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg. Verification Time (days)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search guardian or minor name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Relationship Type</InputLabel>
                <Select
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value)}
                  label="Relationship Type"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="PARENT">Parent</MenuItem>
                  <MenuItem value="LEGAL_GUARDIAN">Legal Guardian</MenuItem>
                  <MenuItem value="HEALTHCARE_PROXY">Healthcare Proxy</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={accessLevelFilter}
                  onChange={(e) => setAccessLevelFilter(e.target.value)}
                  label="Access Level"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="FULL">Full</MenuItem>
                  <MenuItem value="LIMITED">Limited</MenuItem>
                  <MenuItem value="VIEW_ONLY">View Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`Pending Verification (${stats.pending})`} />
          <Tab label={`Verified (${stats.verified})`} />
          <Tab label="Rejected" />
        </Tabs>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : relationships.length === 0 ? (
        <Alert severity="info">No relationships found</Alert>
      ) : (
        <>
          {renderRelationshipTable()}
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Review Guardian Relationship Request</DialogTitle>
        <DialogContent>
          {selectedRelationship && (
            <Grid container spacing={3}>
              {/* Left Panel: Request Details */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Guardian Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Name"
                      secondary={`${selectedRelationship.guardian.firstName} ${selectedRelationship.guardian.lastName}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Email" secondary={selectedRelationship.guardian.email} />
                  </ListItem>
                  {selectedRelationship.guardian.phoneNumber && (
                    <ListItem>
                      <ListItemText primary="Phone" secondary={selectedRelationship.guardian.phoneNumber} />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText primary="User ID" secondary={selectedRelationship.guardian.id} />
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Minor Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Name"
                      secondary={`${selectedRelationship.minor.firstName} ${selectedRelationship.minor.lastName}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Age"
                      secondary={`${calculateAge(selectedRelationship.minor.dateOfBirth)} years old`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="MRN" secondary={selectedRelationship.minor.medicalRecordNumber} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Client ID" secondary={selectedRelationship.minor.id} />
                  </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Request Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Relationship Type"
                      secondary={selectedRelationship.relationshipType.replace('_', ' ')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Access Level" secondary={selectedRelationship.accessLevel} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Permissions"
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {selectedRelationship.permissions.canScheduleAppointments && (
                            <Chip label="Schedule" size="small" />
                          )}
                          {selectedRelationship.permissions.canViewRecords && (
                            <Chip label="View Records" size="small" />
                          )}
                          {selectedRelationship.permissions.canCommunicateWithClinician && (
                            <Chip label="Communicate" size="small" />
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Request Date"
                      secondary={dayjs(selectedRelationship.createdAt).format('MMM DD, YYYY h:mm A')}
                    />
                  </ListItem>
                </List>

                {selectedRelationship.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Explanation:
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="body2">{selectedRelationship.notes}</Typography>
                    </Paper>
                  </Box>
                )}
              </Grid>

              {/* Right Panel: Documents */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Verification Documents
                </Typography>
                {selectedRelationship.verificationDocuments && selectedRelationship.verificationDocuments.length > 0 ? (
                  <List>
                    {selectedRelationship.verificationDocuments.map((doc, index) => (
                      <ListItem
                        key={doc.id}
                        secondaryAction={
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Document">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleViewDocument(doc.storageLocation)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => window.open(doc.storageLocation, '_blank')}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        }
                      >
                        <ListItemText
                          primary={doc.fileName || `Document ${index + 1}`}
                          secondary={dayjs(doc.uploadedAt).format('MMM DD, YYYY')}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="warning">No documents uploaded</Alert>
                )}

                {selectedDocument && (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2">Document Preview</Typography>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => setDocumentZoom(documentZoom - 0.1)}>
                          <ZoomOut />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDocumentZoom(documentZoom + 0.1)}>
                          <ZoomIn />
                        </IconButton>
                        <IconButton size="small" onClick={() => window.open(selectedDocument, '_blank')}>
                          <Fullscreen />
                        </IconButton>
                      </Stack>
                    </Box>
                    <Paper sx={{ height: 400, overflow: 'auto' }}>
                      <iframe
                        src={selectedDocument}
                        width="100%"
                        height="100%"
                        style={{ border: 'none', transform: `scale(${documentZoom})`, transformOrigin: 'top left' }}
                        title="Document Viewer"
                      />
                    </Paper>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedRelationship?.verificationStatus === 'PENDING' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => {
                  setReviewModalOpen(false);
                  setVerifyModalOpen(true);
                }}
              >
                Verify
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={() => {
                  setReviewModalOpen(false);
                  setRejectModalOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setReviewModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Verify Modal */}
      <Dialog open={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Guardian Relationship</DialogTitle>
        <DialogContent>
          {selectedRelationship && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }} icon={<Info />}>
                Verifying relationship for <strong>{selectedRelationship.guardian.firstName}{' '}
                {selectedRelationship.guardian.lastName}</strong> to access records of{' '}
                <strong>{selectedRelationship.minor.firstName} {selectedRelationship.minor.lastName}</strong>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Verification Notes (Optional)"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                sx={{ mt: 2 }}
                helperText="Add any notes about the verification process"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleVerify} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Guardian Relationship</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Rejection Category</InputLabel>
            <Select
              value={rejectionCategory}
              onChange={(e) => setRejectionCategory(e.target.value)}
              label="Rejection Category"
            >
              {REJECTION_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Detailed Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
            helperText="Please provide a detailed reason for rejection (minimum 10 characters)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={loading || rejectionReason.length < 10}
          >
            {loading ? <CircularProgress size={20} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Modal */}
      <Dialog open={revokeModalOpen} onClose={() => setRevokeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke Guardian Access</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will immediately revoke the guardian's access to the minor's records. This action cannot be undone.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Revocation Reason"
            value={revocationReason}
            onChange={(e) => setRevocationReason(e.target.value)}
            required
            helperText="Please provide a detailed reason for revocation (minimum 10 characters)"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRevoke}
            disabled={loading || revocationReason.length < 10}
          >
            {loading ? <CircularProgress size={20} /> : 'Revoke Access'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog
        open={documentViewerOpen}
        onClose={() => {
          setDocumentViewerOpen(false);
          setSelectedDocument(null);
          setDocumentZoom(1);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Document Viewer
            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={() => setDocumentZoom(documentZoom - 0.1)}>
                <ZoomOut />
              </IconButton>
              <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center', lineHeight: 2.5 }}>
                {Math.round(documentZoom * 100)}%
              </Typography>
              <IconButton size="small" onClick={() => setDocumentZoom(documentZoom + 0.1)}>
                <ZoomIn />
              </IconButton>
              <IconButton size="small" onClick={() => window.open(selectedDocument || '', '_blank')}>
                <Fullscreen />
              </IconButton>
            </Stack>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Paper sx={{ height: 600, overflow: 'auto' }}>
              <iframe
                src={selectedDocument}
                width="100%"
                height="100%"
                style={{ border: 'none', transform: `scale(${documentZoom})`, transformOrigin: 'top left' }}
                title="Document Viewer"
              />
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDocumentViewerOpen(false);
              setSelectedDocument(null);
              setDocumentZoom(1);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GuardianVerification;
