import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Switch,
  FormControlLabel,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Event,
  Save,
  Close,
} from '@mui/icons-material';
import api from '../../lib/api';

interface AppointmentType {
  id?: string;
  typeName: string;
  category: string; // INDIVIDUAL, GROUP, FAMILY, COUPLES
  description?: string;
  defaultDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  isBillable: boolean;
  requiresAuth: boolean;
  requiresSupervisor: boolean;
  maxPerDay?: number;
  cptCode?: string;
  defaultRate?: number;
  colorCode?: string;
  iconName?: string;
  isActive: boolean;
  allowOnlineBooking: boolean;
}

export default function AppointmentTypes() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<AppointmentType>({
    typeName: '',
    category: 'INDIVIDUAL',
    description: '',
    defaultDuration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    isBillable: true,
    requiresAuth: false,
    requiresSupervisor: false,
    maxPerDay: undefined,
    cptCode: '',
    defaultRate: undefined,
    colorCode: '#3b82f6',
    iconName: 'Event',
    isActive: true,
    allowOnlineBooking: false,
  });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointment-types');
      setTypes(response.data.data || []);
    } catch (error: any) {
      setErrorMessage('Failed to load appointment types');
      console.error('Error loading types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type?: AppointmentType) => {
    if (type) {
      setSelectedType(type);
      setFormData(type);
    } else {
      setSelectedType(null);
      setFormData({
        typeName: '',
        category: 'INDIVIDUAL',
        description: '',
        defaultDuration: 60,
        bufferBefore: 0,
        bufferAfter: 15,
        isBillable: true,
        requiresAuth: false,
        requiresSupervisor: false,
        maxPerDay: undefined,
        cptCode: '',
        defaultRate: undefined,
        colorCode: '#3b82f6',
        iconName: 'Event',
        isActive: true,
        allowOnlineBooking: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedType(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (selectedType?.id) {
        // Update existing
        await api.put(`/appointment-types/${selectedType.id}`, formData);
        setSuccessMessage('Appointment type updated successfully');
      } else {
        // Create new
        await api.post('/appointment-types', formData);
        setSuccessMessage('Appointment type created successfully');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
      handleCloseDialog();
      await loadTypes();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save appointment type');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      await api.delete(`/appointment-types/${typeToDelete}`);
      setSuccessMessage('Appointment type deleted successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
      await loadTypes();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to delete appointment type');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'INDIVIDUAL':
        return 'primary';
      case 'GROUP':
        return 'secondary';
      case 'FAMILY':
        return 'success';
      case 'COUPLES':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Appointment Types
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage appointment types and their default settings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          size="large"
        >
          Create Type
        </Button>
      </Stack>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Type Name</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Buffer</strong></TableCell>
              <TableCell><strong>CPT Code</strong></TableCell>
              <TableCell><strong>Rate</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No appointment types found. Create your first type to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: type.colorCode || '#3b82f6',
                        }}
                      />
                      {type.typeName}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={type.category}
                      size="small"
                      color={getCategoryColor(type.category) as any}
                    />
                  </TableCell>
                  <TableCell>{type.defaultDuration} min</TableCell>
                  <TableCell>
                    {type.bufferBefore}/{type.bufferAfter} min
                  </TableCell>
                  <TableCell>{type.cptCode || '-'}</TableCell>
                  <TableCell>${type.defaultRate?.toFixed(2) || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={type.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={type.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(type)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setTypeToDelete(type.id!);
                        setDeleteDialogOpen(true);
                      }}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedType ? 'Edit Appointment Type' : 'Create Appointment Type'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Type Name"
                value={formData.typeName}
                onChange={(e) => setFormData({ ...formData, typeName: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="GROUP">Group</option>
                <option value="FAMILY">Family</option>
                <option value="COUPLES">Couples</option>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Color Code"
                type="color"
                value={formData.colorCode}
                onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Default Duration (min)"
                value={formData.defaultDuration}
                onChange={(e) =>
                  setFormData({ ...formData, defaultDuration: parseInt(e.target.value) })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Buffer Before (min)"
                value={formData.bufferBefore}
                onChange={(e) =>
                  setFormData({ ...formData, bufferBefore: parseInt(e.target.value) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Buffer After (min)"
                value={formData.bufferAfter}
                onChange={(e) =>
                  setFormData({ ...formData, bufferAfter: parseInt(e.target.value) })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="CPT Code"
                value={formData.cptCode}
                onChange={(e) => setFormData({ ...formData, cptCode: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Default Rate ($)"
                value={formData.defaultRate || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultRate: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Max Per Day"
                value={formData.maxPerDay || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                helperText="Leave empty for no limit"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isBillable}
                      onChange={(e) =>
                        setFormData({ ...formData, isBillable: e.target.checked })
                      }
                    />
                  }
                  label="Billable"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresAuth}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresAuth: e.target.checked })
                      }
                    />
                  }
                  label="Requires Prior Authorization"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresSupervisor}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresSupervisor: e.target.checked })
                      }
                    />
                  }
                  label="Requires Supervision"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allowOnlineBooking}
                      onChange={(e) =>
                        setFormData({ ...formData, allowOnlineBooking: e.target.checked })
                      }
                    />
                  }
                  label="Allow Online Booking"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Close />}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<Save />}
            disabled={saving || !formData.typeName}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this appointment type? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
