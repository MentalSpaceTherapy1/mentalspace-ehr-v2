import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Divider
} from '@mui/material';
import {
  Send,
  Preview,
  Group,
  Person,
  Business,
  Delete,
  CheckCircle,
  Email,
  ArrowBack,
  Notifications
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { usePolicy } from '../../hooks/usePolicy';

interface Recipient {
  type: 'DEPARTMENT' | 'ROLE' | 'INDIVIDUAL';
  id: string;
  name: string;
}

const mockDepartments = [
  { id: 'd1', name: 'Clinical Services' },
  { id: 'd2', name: 'Administration' },
  { id: 'd3', name: 'Human Resources' },
  { id: 'd4', name: 'IT' }
];

const mockRoles = [
  { id: 'r1', name: 'Clinician' },
  { id: 'r2', name: 'Administrator' },
  { id: 'r3', name: 'Manager' },
  { id: 'r4', name: 'Staff' }
];

const mockIndividuals = [
  { id: 'u1', name: 'Dr. Sarah Johnson', role: 'Clinician' },
  { id: 'u2', name: 'Michael Chen', role: 'Administrator' },
  { id: 'u3', name: 'Emily Davis', role: 'Manager' }
];

const mockDistributionHistory = [
  {
    id: '1',
    sentAt: '2024-01-15T10:00:00Z',
    sentBy: 'Admin User',
    recipients: 45,
    acknowledged: 32,
    pending: 13
  },
  {
    id: '2',
    sentAt: '2024-01-01T09:00:00Z',
    sentBy: 'Admin User',
    recipients: 50,
    acknowledged: 48,
    pending: 2
  }
];

export default function PolicyDistribution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchPolicyById, distributePolicy } = usePolicy();
  const [policy, setPolicy] = useState<any>(null);
  const [recipientType, setRecipientType] = useState<'DEPARTMENT' | 'ROLE' | 'INDIVIDUAL'>('DEPARTMENT');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [previewDialog, setPreviewDialog] = useState(false);
  const [sendDialog, setSendDialog] = useState(false);

  useEffect(() => {
    if (id) {
      loadPolicy();
    }
  }, [id]);

  const loadPolicy = async () => {
    const data = await fetchPolicyById(id!);
    if (data) {
      setPolicy(data);
      setCustomMessage(
        `A new policy has been published and requires your acknowledgment.\n\nPolicy: ${data.title}\nEffective Date: ${new Date(data.effectiveDate).toLocaleDateString()}\n\nPlease review and acknowledge this policy at your earliest convenience.`
      );
    }
  };

  const handleAddRecipient = (item: any) => {
    const recipient: Recipient = {
      type: recipientType,
      id: item.id,
      name: item.name
    };

    if (!selectedRecipients.find(r => r.id === item.id)) {
      setSelectedRecipients([...selectedRecipients, recipient]);
    }
  };

  const handleRemoveRecipient = (id: string) => {
    setSelectedRecipients(selectedRecipients.filter(r => r.id !== id));
  };

  const handleDistribute = async () => {
    const success = await distributePolicy(id!, {
      recipients: selectedRecipients.map(r => ({
        type: r.type,
        id: r.id
      })),
      message: customMessage
    });

    if (success) {
      setSendDialog(false);
      navigate('/compliance/policies');
    }
  };

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'DEPARTMENT': return <Business />;
      case 'ROLE': return <Group />;
      case 'INDIVIDUAL': return <Person />;
      default: return <Group />;
    }
  };

  const getRecipientColor = (type: string) => {
    switch (type) {
      case 'DEPARTMENT': return '#0EA5E9';
      case 'ROLE': return '#10B981';
      case 'INDIVIDUAL': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getRecipientList = () => {
    switch (recipientType) {
      case 'DEPARTMENT': return mockDepartments;
      case 'ROLE': return mockRoles;
      case 'INDIVIDUAL': return mockIndividuals;
    }
  };

  if (!policy) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          color: 'white',
          borderRadius: 3,
          mb: 3,
          boxShadow: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton sx={{ color: 'white' }} onClick={() => navigate('/compliance/policies')}>
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Distribute Policy
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {policy.title}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Preview />}
                onClick={() => setPreviewDialog(true)}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Preview Email
              </Button>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => setSendDialog(true)}
                disabled={selectedRecipients.length === 0}
                sx={{
                  bgcolor: 'white',
                  color: '#667EEA',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                Send to {selectedRecipients.length} Recipients
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left: Recipient Selection */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Select Recipients
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Recipient Type</InputLabel>
                <Select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as any)}
                  label="Recipient Type"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="DEPARTMENT">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Business />
                      <span>Departments</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="ROLE">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Group />
                      <span>Roles</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="INDIVIDUAL">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Person />
                      <span>Individuals</span>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>

              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {getRecipientList().map((item) => {
                  const isSelected = selectedRecipients.find(r => r.id === item.id);
                  return (
                    <ListItem
                      key={item.id}
                      onClick={() => handleAddRecipient(item)}
                      sx={{
                        mb: 1,
                        borderRadius: 2,
                        bgcolor: isSelected ? alpha(getRecipientColor(recipientType), 0.1) : 'transparent',
                        border: '1px solid',
                        borderColor: isSelected ? getRecipientColor(recipientType) : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(getRecipientColor(recipientType), 0.05)
                        }
                      }}
                    >
                      <Checkbox
                        checked={!!isSelected}
                        sx={{
                          color: getRecipientColor(recipientType),
                          '&.Mui-checked': {
                            color: getRecipientColor(recipientType)
                          }
                        }}
                      />
                      <Box sx={{ color: getRecipientColor(recipientType), mr: 2 }}>
                        {getRecipientIcon(recipientType)}
                      </Box>
                      <ListItemText
                        primary={item.name}
                        secondary={'role' in item ? (item as any).role : undefined}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Selected Recipients & Message */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            {/* Selected Recipients */}
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Selected Recipients ({selectedRecipients.length})
                </Typography>

                {selectedRecipients.length === 0 ? (
                  <Box
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      borderRadius: 2,
                      bgcolor: alpha('#667EEA', 0.05)
                    }}
                  >
                    <Notifications sx={{ fontSize: 60, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      No recipients selected
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1} sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {selectedRecipients.map((recipient) => (
                      <Chip
                        key={recipient.id}
                        icon={getRecipientIcon(recipient.type)}
                        label={recipient.name}
                        onDelete={() => handleRemoveRecipient(recipient.id)}
                        sx={{
                          justifyContent: 'space-between',
                          bgcolor: alpha(getRecipientColor(recipient.type), 0.1),
                          borderLeft: '4px solid',
                          borderColor: getRecipientColor(recipient.type),
                          borderRadius: 2,
                          py: 2
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Email Message */}
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Email Message
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter custom message for email notification..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Distribution History */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Distribution History
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#667EEA', 0.05) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date Sent</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sent By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Recipients</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acknowledged</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Pending</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockDistributionHistory.map((dist) => {
                      const ackRate = (dist.acknowledged / dist.recipients) * 100;
                      return (
                        <TableRow key={dist.id} hover>
                          <TableCell>
                            {new Date(dist.sentAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{dist.sentBy}</TableCell>
                          <TableCell>
                            <Chip label={dist.recipients} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={dist.acknowledged}
                              size="small"
                              sx={{
                                bgcolor: alpha('#10B981', 0.1),
                                color: '#10B981'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={dist.pending}
                              size="small"
                              sx={{
                                bgcolor: alpha('#F59E0B', 0.1),
                                color: '#F59E0B'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<CheckCircle />}
                              label={`${ackRate.toFixed(0)}% Complete`}
                              size="small"
                              color={ackRate === 100 ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Email Preview</DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 3, bgcolor: '#F9FAFB' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Policy Acknowledgment Required
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
              {customMessage}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                mt: 2
              }}
            >
              View & Acknowledge Policy
            </Button>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Distribution</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You are about to distribute this policy to <strong>{selectedRecipients.length}</strong> recipients.
            They will receive an email notification and be required to acknowledge the policy.
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha('#0EA5E9', 0.1),
              border: '1px solid',
              borderColor: '#0EA5E9'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Recipients will have 14 days to acknowledge this policy. Reminders will be sent automatically.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDistribute}
            startIcon={<Send />}
            sx={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            }}
          >
            Send Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
