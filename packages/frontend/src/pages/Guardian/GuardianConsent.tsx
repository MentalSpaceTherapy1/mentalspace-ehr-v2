import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Switch,
  FormControlLabel,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Info,
  Visibility,
  Edit,
  Block,
  Shield,
  Lock,
  LockOpen,
  AccessTime,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';

dayjs.extend(relativeTime);

const API_BASE_URL = 'http://localhost:3001/api/v1';

interface Guardian {
  relationshipId: string;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  relationshipType: string;
  accessLevel: string;
  permissions: {
    canScheduleAppointments: boolean;
    canViewRecords: boolean;
    canCommunicateWithClinician: boolean;
  };
  startDate: Date;
  endDate?: Date;
  verifiedAt: Date;
  lastAccessedAt?: Date;
}

interface ConsentPreferences {
  allowViewAppointments: boolean;
  allowScheduleAppointments: boolean;
  allowViewClinicalNotes: boolean;
  allowViewMedications: boolean;
  allowViewDiagnoses: boolean;
  allowCommunicateWithClinician: boolean;
  allowViewTestResults: boolean;
}

interface AccessLog {
  id: string;
  action: string;
  timestamp: Date;
  details: string;
}

const GuardianConsent: React.FC = () => {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clientAge, setClientAge] = useState(0);

  // Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [requestChangeModalOpen, setRequestChangeModalOpen] = useState(false);
  const [revocationModalOpen, setRevocationModalOpen] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  // Form state
  const [changeReason, setChangeReason] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [revocationReason, setRevocationReason] = useState('');

  // Consent preferences
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences>({
    allowViewAppointments: true,
    allowScheduleAppointments: true,
    allowViewClinicalNotes: true,
    allowViewMedications: true,
    allowViewDiagnoses: true,
    allowCommunicateWithClinician: true,
    allowViewTestResults: true,
  });

  useEffect(() => {
    fetchGuardians();
    fetchClientAge();
    fetchConsentPreferences();
  }, []);

  const fetchClientAge = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/client/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.data.success) {
        const dob = new Date(response.data.data.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        setClientAge(age);
      }
    } catch (err: any) {
      console.error('Failed to load client age:', err);
    }
  };

  const fetchGuardians = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/client/guardian-relationships`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.data.success) {
        setGuardians(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load guardians:', err);
      setError('Failed to load guardian relationships');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsentPreferences = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/client/guardian-consent-preferences`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.data.success && response.data.data) {
        setConsentPreferences(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load consent preferences:', err);
    }
  };

  const fetchAccessLogs = async (guardianId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/client/guardian-access-logs/${guardianId}`,
        {
          params: { limit: 10 },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (response.data.success) {
        setAccessLogs(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load access logs:', err);
    }
  };

  const handleViewDetails = async (guardian: Guardian) => {
    setSelectedGuardian(guardian);
    await fetchAccessLogs(guardian.guardian.id);
    setDetailsModalOpen(true);
  };

  const handleRequestChange = async () => {
    if (!selectedGuardian || !changeReason || !requestedChanges) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/client/request-guardian-change`,
        {
          relationshipId: selectedGuardian.relationshipId,
          changeReason,
          requestedChanges,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSuccess('Change request submitted. An administrator will review your request.');
        setRequestChangeModalOpen(false);
        setChangeReason('');
        setRequestedChanges('');
        setSelectedGuardian(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit change request');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevocation = async () => {
    if (!selectedGuardian || !revocationReason) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/client/request-guardian-revocation`,
        {
          relationshipId: selectedGuardian.relationshipId,
          reason: revocationReason,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSuccess(
          clientAge < 18
            ? 'Revocation request submitted. An administrator will review your request.'
            : 'Guardian access has been revoked successfully.'
        );
        setRevocationModalOpen(false);
        setRevocationReason('');
        setSelectedGuardian(null);
        fetchGuardians();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit revocation request');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (field: keyof ConsentPreferences, value: boolean) => {
    setConsentPreferences({
      ...consentPreferences,
      [field]: value,
    });
  };

  const saveConsentPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/client/guardian-consent-preferences`,
        consentPreferences,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setSuccess('Consent preferences updated successfully. Guardians have been notified.');
      }
    } catch (err: any) {
      setError('Failed to update consent preferences');
    } finally {
      setLoading(false);
    }
  };

  if (loading && guardians.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Guardian Access Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage who has access to your health records and what information they can see.
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

      {/* Privacy Rights Information */}
      <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Your Privacy Rights
        </Typography>
        <List dense>
          {clientAge >= 16 && clientAge < 18 && (
            <ListItem>
              <ListItemText
                primary={`At age ${clientAge}, you have increased say in who accesses your records`}
                secondary="You can request to limit or revoke access at any time, subject to admin approval"
              />
            </ListItem>
          )}
          {clientAge >= 18 && (
            <ListItem>
              <ListItemText
                primary="At age 18, you have full control over your health information"
                secondary="Guardian access automatically expires unless you grant Healthcare Proxy access"
              />
            </ListItem>
          )}
          {clientAge < 16 && (
            <ListItem>
              <ListItemText
                primary="Guardians have been granted access to your records by administrators"
                secondary="If you have concerns about guardian access, you can request changes which will be reviewed"
              />
            </ListItem>
          )}
        </List>
      </Alert>

      {/* Current Guardians */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Current Guardians
          </Typography>
          {guardians.length === 0 ? (
            <Alert severity="info">No guardians currently have access to your records.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Guardian</TableCell>
                    <TableCell>Relationship</TableCell>
                    <TableCell>Access Level</TableCell>
                    <TableCell>Permissions</TableCell>
                    <TableCell>Active Since</TableCell>
                    <TableCell>Last Accessed</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {guardians.map((guardian) => (
                    <TableRow key={guardian.relationshipId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {guardian.guardian.firstName} {guardian.guardian.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {guardian.guardian.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={guardian.relationshipType.replace('_', ' ')} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={guardian.accessLevel}
                          size="small"
                          color={
                            guardian.accessLevel === 'FULL'
                              ? 'success'
                              : guardian.accessLevel === 'LIMITED'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {guardian.permissions.canViewRecords && (
                            <Tooltip title="Can view records">
                              <Chip icon={<Visibility />} label="View" size="small" sx={{ mb: 0.5 }} />
                            </Tooltip>
                          )}
                          {guardian.permissions.canScheduleAppointments && (
                            <Tooltip title="Can schedule appointments">
                              <Chip icon={<CheckCircle />} label="Schedule" size="small" sx={{ mb: 0.5 }} />
                            </Tooltip>
                          )}
                          {guardian.permissions.canCommunicateWithClinician && (
                            <Tooltip title="Can communicate with clinician">
                              <Chip icon={<Info />} label="Communicate" size="small" sx={{ mb: 0.5 }} />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {dayjs(guardian.startDate).format('MMM DD, YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {guardian.lastAccessedAt
                            ? dayjs(guardian.lastAccessedAt).fromNow()
                            : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewDetails(guardian)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {clientAge >= 16 && (
                            <>
                              <Tooltip title="Request Changes">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => {
                                    setSelectedGuardian(guardian);
                                    setRequestChangeModalOpen(true);
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={clientAge >= 18 ? 'Revoke Access' : 'Request Revocation'}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedGuardian(guardian);
                                    setRevocationModalOpen(true);
                                  }}
                                >
                                  <Block />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Consent Preferences (for 16+) */}
      {clientAge >= 16 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Shield color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Data Sharing Preferences
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Control what information guardians can access. Note: Some information may be shared regardless
              of these settings based on legal requirements.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowViewAppointments}
                      onChange={(e) => handleConsentChange('allowViewAppointments', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowViewAppointments ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow access to appointments</Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowScheduleAppointments}
                      onChange={(e) => handleConsentChange('allowScheduleAppointments', e.target.checked)}
                      disabled={!consentPreferences.allowViewAppointments}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowScheduleAppointments ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow scheduling appointments</Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowViewClinicalNotes}
                      onChange={(e) => handleConsentChange('allowViewClinicalNotes', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowViewClinicalNotes ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow access to clinical notes</Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowViewMedications}
                      onChange={(e) => handleConsentChange('allowViewMedications', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowViewMedications ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow access to medications</Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowViewDiagnoses}
                      onChange={(e) => handleConsentChange('allowViewDiagnoses', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowViewDiagnoses ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow access to diagnoses</Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowCommunicateWithClinician}
                      onChange={(e) =>
                        handleConsentChange('allowCommunicateWithClinician', e.target.checked)
                      }
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowCommunicateWithClinician ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow communication with clinician</Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={consentPreferences.allowViewTestResults}
                      onChange={(e) => handleConsentChange('allowViewTestResults', e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {consentPreferences.allowViewTestResults ? <LockOpen sx={{ mr: 1 }} /> : <Lock sx={{ mr: 1 }} />}
                      <Typography variant="body2">Allow access to test results</Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>

            <Alert severity="warning" icon={<Warning />} sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body2">
                Therapy session notes are protected by law and typically not shared with guardians unless
                required by court order or immediate safety concerns.
              </Typography>
            </Alert>

            <Box mt={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={saveConsentPreferences}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Shield />}
              >
                Save Preferences
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Guardian Relationship Details</DialogTitle>
        <DialogContent>
          {selectedGuardian && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Guardian Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Name"
                      secondary={`${selectedGuardian.guardian.firstName} ${selectedGuardian.guardian.lastName}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Email" secondary={selectedGuardian.guardian.email} />
                  </ListItem>
                  {selectedGuardian.guardian.phoneNumber && (
                    <ListItem>
                      <ListItemText primary="Phone" secondary={selectedGuardian.guardian.phoneNumber} />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText
                      primary="Relationship"
                      secondary={selectedGuardian.relationshipType.replace('_', ' ')}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Access Level" secondary={selectedGuardian.accessLevel} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Verified"
                      secondary={dayjs(selectedGuardian.verifiedAt).format('MMM DD, YYYY')}
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  What This Guardian Can Access
                </Typography>
                <List dense>
                  {selectedGuardian.permissions.canViewRecords && (
                    <ListItem>
                      <ListItemText primary="View your medical records and clinical information" />
                    </ListItem>
                  )}
                  {selectedGuardian.permissions.canScheduleAppointments && (
                    <ListItem>
                      <ListItemText primary="Schedule and cancel your appointments" />
                    </ListItem>
                  )}
                  {selectedGuardian.permissions.canCommunicateWithClinician && (
                    <ListItem>
                      <ListItemText primary="Communicate with your healthcare providers" />
                    </ListItem>
                  )}
                </List>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Recent Access Log (Last 10 Activities)
                </Typography>
                {accessLogs.length > 0 ? (
                  <List dense>
                    {accessLogs.map((log) => (
                      <ListItem key={log.id}>
                        <ListItemIcon>
                          <AccessTime fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={log.action}
                          secondary={`${log.details} - ${dayjs(log.timestamp).format('MMM DD, YYYY h:mm A')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">No recent access activity</Alert>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Request Change Modal */}
      <Dialog
        open={requestChangeModalOpen}
        onClose={() => setRequestChangeModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Changes to Guardian Access</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will send a request to administrators to modify the guardian's access. You will be notified
            when your request is reviewed.
          </Alert>
          {selectedGuardian && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Requesting changes for: <strong>{selectedGuardian.guardian.firstName}{' '}
              {selectedGuardian.guardian.lastName}</strong>
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="What changes would you like?"
            value={requestedChanges}
            onChange={(e) => setRequestedChanges(e.target.value)}
            required
            helperText="e.g., 'Reduce to view-only access' or 'Remove appointment scheduling permission'"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Request"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            required
            helperText="Please explain why you are requesting these changes (minimum 20 characters)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestChangeModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRequestChange}
            disabled={loading || changeReason.length < 20 || !requestedChanges}
          >
            {loading ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revocation Modal */}
      <Dialog
        open={revocationModalOpen}
        onClose={() => setRevocationModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {clientAge >= 18 ? 'Revoke Guardian Access' : 'Request Guardian Access Revocation'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {clientAge >= 18 ? (
              <Typography variant="body2">
                This will immediately revoke the guardian's access to your records. This action cannot be
                undone without submitting a new guardian access request.
              </Typography>
            ) : (
              <Typography variant="body2">
                This will send a request to administrators to revoke guardian access. The request will be
                reviewed, and you will be notified of the decision. Note that parent/guardian consent may be
                required depending on state law.
              </Typography>
            )}
          </Alert>
          {selectedGuardian && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {clientAge >= 18 ? 'Revoking' : 'Requesting revocation for'}:{' '}
              <strong>
                {selectedGuardian.guardian.firstName} {selectedGuardian.guardian.lastName}
              </strong>
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Revocation"
            value={revocationReason}
            onChange={(e) => setRevocationReason(e.target.value)}
            required
            helperText="Please explain why you want to revoke this guardian's access (minimum 20 characters)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevocationModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRequestRevocation}
            disabled={loading || revocationReason.length < 20}
            startIcon={loading ? <CircularProgress size={20} /> : <Block />}
          >
            {loading ? 'Processing...' : clientAge >= 18 ? 'Revoke Access' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GuardianConsent;
