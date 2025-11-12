import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Tooltip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

interface DistributionList {
  id: string;
  name: string;
  description: string | null;
  emails: string[];
  emailCount: number;
  createdAt: string;
  updatedAt: string;
}

export const DistributionLists: React.FC = () => {
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; list: DistributionList | null }>({
    open: false,
    list: null
  });
  const [viewDialog, setViewDialog] = useState<{ open: boolean; list: DistributionList | null }>({
    open: false,
    list: null
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emails: ['']
  });

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/distribution-lists');
      setLists(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch distribution lists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const validEmails = formData.emails.filter(email => email && validateEmail(email));

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    if (validEmails.length === 0) {
      setError('At least one valid email is required');
      return;
    }

    try {
      await axios.post('/api/v1/distribution-lists', {
        name: formData.name,
        description: formData.description || undefined,
        emails: validEmails
      });
      setCreateDialog(false);
      resetForm();
      fetchLists();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create distribution list');
    }
  };

  const handleUpdate = async () => {
    if (!editDialog.list) return;

    const validEmails = formData.emails.filter(email => email && validateEmail(email));

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    if (validEmails.length === 0) {
      setError('At least one valid email is required');
      return;
    }

    try {
      await axios.put(`/api/v1/distribution-lists/${editDialog.list.id}`, {
        name: formData.name,
        description: formData.description || undefined,
        emails: validEmails
      });
      setEditDialog({ open: false, list: null });
      resetForm();
      fetchLists();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update distribution list');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this distribution list?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/distribution-lists/${id}`);
      fetchLists();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete distribution list');
    }
  };

  const openEditDialog = (list: DistributionList) => {
    setFormData({
      name: list.name,
      description: list.description || '',
      emails: list.emails
    });
    setEditDialog({ open: true, list });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      emails: ['']
    });
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const addEmailField = () => {
    setFormData({
      ...formData,
      emails: [...formData.emails, '']
    });
  };

  const removeEmailField = (index: number) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((_, i) => i !== index)
    });
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...formData.emails];
    updated[index] = value;
    setFormData({
      ...formData,
      emails: updated
    });
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Distribution Lists</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialog(true)}>
            Create List
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Email Count</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">No distribution lists found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell>{list.name}</TableCell>
                    <TableCell>{list.description || '-'}</TableCell>
                    <TableCell>
                      <Chip icon={<EmailIcon />} label={`${list.emailCount} emails`} size="small" />
                    </TableCell>
                    <TableCell>{new Date(list.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Emails">
                          <IconButton size="small" onClick={() => setViewDialog({ open: true, list })}>
                            <EmailIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditDialog(list)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(list.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Dialog */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create Distribution List</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="List Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Email Addresses
                  </Typography>
                  {formData.emails.map((email, index) => (
                    <Box key={index} display="flex" gap={1} mb={1}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        error={email !== '' && !validateEmail(email)}
                        helperText={email !== '' && !validateEmail(email) ? 'Invalid email format' : ''}
                      />
                      {formData.emails.length > 1 && (
                        <IconButton size="small" onClick={() => removeEmailField(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button startIcon={<PersonAddIcon />} onClick={addEmailField} size="small">
                    Add Email
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, list: null })} maxWidth="md" fullWidth>
          <DialogTitle>Edit Distribution List</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="List Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Email Addresses
                  </Typography>
                  {formData.emails.map((email, index) => (
                    <Box key={index} display="flex" gap={1} mb={1}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        error={email !== '' && !validateEmail(email)}
                        helperText={email !== '' && !validateEmail(email) ? 'Invalid email format' : ''}
                      />
                      {formData.emails.length > 1 && (
                        <IconButton size="small" onClick={() => removeEmailField(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button startIcon={<PersonAddIcon />} onClick={addEmailField} size="small">
                    Add Email
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog({ open: false, list: null })}>Cancel</Button>
            <Button onClick={handleUpdate} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, list: null })} maxWidth="sm" fullWidth>
          <DialogTitle>{viewDialog.list?.name} - Email Addresses</DialogTitle>
          <DialogContent>
            <List>
              {viewDialog.list?.emails.map((email, index) => (
                <ListItem key={index}>
                  <ListItemText primary={email} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialog({ open: false, list: null })}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};
