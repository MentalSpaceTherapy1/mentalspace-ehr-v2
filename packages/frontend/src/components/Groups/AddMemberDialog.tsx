import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Grid,
  Typography,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { Save, Close } from '@mui/icons-material';
import api from '../../lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  email?: string;
  primaryPhone: string;
}

interface Props {
  open: boolean;
  groupId: string;
  requiresScreening: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMemberDialog({
  open,
  groupId,
  requiresScreening,
  onClose,
  onSuccess,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    screenedBy: '',
    screeningDate: new Date().toISOString().split('T')[0],
    screeningNotes: '',
    approved: false,
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (open) {
      loadClients();
      loadUsers();
    }
  }, [open]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients', {
        params: { status: 'ACTIVE', limit: 1000 },
      });
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', {
        params: { role: 'CLINICIAN' },
      });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.clientId) {
        setError('Please select a client');
        return;
      }

      if (requiresScreening && !formData.approved) {
        if (!formData.screenedBy || !formData.screeningDate) {
          setError('Screening information is required for this group');
          return;
        }
      }

      await api.post(`/group-sessions/${groupId}/members`, {
        clientId: formData.clientId,
        screenedBy: formData.screenedBy || undefined,
        screeningDate: formData.screeningDate ? new Date(formData.screeningDate) : undefined,
        screeningNotes: formData.screeningNotes || undefined,
        approved: formData.approved,
        status: formData.status,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to enroll member');
      console.error('Error enrolling member:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      clientId: '',
      screenedBy: '',
      screeningDate: new Date().toISOString().split('T')[0],
      screeningNotes: '',
      approved: false,
      status: 'ACTIVE',
    });
    setError('');
    onClose();
  };

  const selectedClient = clients.find((c) => c.id === formData.clientId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Member to Group</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Typography color="error" mb={2}>
              {error}
            </Typography>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) =>
                  `${option.firstName} ${option.lastName} (${option.medicalRecordNumber})`
                }
                value={selectedClient || null}
                onChange={(e, value) => setFormData({ ...formData, clientId: value?.id || '' })}
                loading={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Client"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography>
                        {option.firstName} {option.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        MRN: {option.medicalRecordNumber} | Phone: {option.primaryPhone}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {requiresScreening && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Screening Required
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Screened By"
                    value={formData.screenedBy}
                    onChange={(e) => setFormData({ ...formData, screenedBy: e.target.value })}
                    required={requiresScreening}
                  >
                    <MenuItem value="">None</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} {user.title ? `(${user.title})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    type="date"
                    fullWidth
                    label="Screening Date"
                    value={formData.screeningDate}
                    onChange={(e) => setFormData({ ...formData, screeningDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required={requiresScreening}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Screening Notes"
                    value={formData.screeningNotes}
                    onChange={(e) => setFormData({ ...formData, screeningNotes: e.target.value })}
                    placeholder="Note any relevant screening information, concerns, or recommendations"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.approved}
                        onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                      />
                    }
                    label="Approved for Group"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Initial Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="ON_HOLD">On Hold</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<Close />}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          disabled={saving || !formData.clientId}
        >
          {saving ? 'Enrolling...' : 'Enroll Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
