import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  Typography,
  Autocomplete,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  alpha,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatListBulleted as FormatListBulletedIcon,
  InsertLink as InsertLinkIcon,
  Image as ImageIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useMessaging } from '../../hooks/useMessaging';
import api from '../../lib/api';

interface MessageComposerProps {
  onClose?: () => void;
  replyTo?: string;
  channelId?: string;
}

interface Recipient {
  id: string;
  name: string;
  email?: string;
  type: 'staff' | 'client';
  medicalRecordNumber?: string;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onClose: propOnClose, replyTo, channelId }) => {
  const navigate = useNavigate();
  const onClose = propOnClose || (() => navigate('/messages'));
  const { sendMessage, loading: messagingLoading } = useMessaging();

  const [recipientType, setRecipientType] = useState<'staff' | 'client'>('staff');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Available recipients
  const [staffMembers, setStaffMembers] = useState<Recipient[]>([]);
  const [clients, setClients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Fetch staff members
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get<{ success: boolean; data: { users: any[] } }>('/users');
        if (response.data.success && response.data.data.users) {
          setStaffMembers(
            response.data.data.users
              .filter((u: any) => u.isActive)
              .map((u: any) => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                type: 'staff' as const,
              }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch staff members:', err);
      }
    };
    fetchStaff();
  }, []);

  // Fetch assigned clients when switching to client type
  useEffect(() => {
    if (recipientType === 'client' && clients.length === 0) {
      const fetchClients = async () => {
        setLoadingRecipients(true);
        try {
          const response = await api.get<{ success: boolean; data: any[] }>('/client-portal/messaging/clients');
          if (response.data.success && response.data.data) {
            setClients(
              response.data.data.map((c: any) => ({
                id: c.id,
                name: `${c.firstName} ${c.lastName}`,
                email: c.email,
                type: 'client' as const,
                medicalRecordNumber: c.medicalRecordNumber,
              }))
            );
          }
        } catch (err) {
          console.error('Failed to fetch clients:', err);
          setError('Failed to load clients. Make sure you have assigned clients with portal access.');
        } finally {
          setLoadingRecipients(false);
        }
      };
      fetchClients();
    }
  }, [recipientType, clients.length]);

  const handleRecipientTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'staff' | 'client' | null
  ) => {
    if (newType !== null) {
      setRecipientType(newType);
      setRecipients([]); // Clear recipients when switching type
    }
  };

  const handleAttachFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments([...attachments, ...Array.from(event.target.files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message body are required');
      return;
    }

    if (recipients.length === 0 && !channelId) {
      setError('Please select at least one recipient');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (recipientType === 'client') {
        // Send to client via portal messaging
        const clientRecipient = recipients[0]; // Currently supporting single client
        await api.post('/client-portal/portal-messages/send', {
          clientId: clientRecipient.id,
          subject,
          message: body,
          priority,
        });
      } else {
        // Send to staff via internal messaging
        await sendMessage({
          subject,
          body,
          priority: priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
          recipientIds: recipients.map(r => r.id),
          recipientType: 'INDIVIDUAL',
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'NORMAL':
        return '#3b82f6';
      case 'LOW':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const availableRecipients = recipientType === 'staff' ? staffMembers : clients;
  const isLoading = loading || messagingLoading || loadingRecipients;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        elevation={3}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {replyTo ? 'Reply to Message' : 'New Message'}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {isLoading && <LinearProgress />}

        {/* Form */}
        <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Message sent successfully!
            </Alert>
          )}

          {/* Recipient Type Toggle */}
          {!channelId && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Send to:
              </Typography>
              <ToggleButtonGroup
                value={recipientType}
                exclusive
                onChange={handleRecipientTypeChange}
                aria-label="recipient type"
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton
                  value="staff"
                  aria-label="staff"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: alpha('#667eea', 0.1),
                      color: '#667eea',
                      '&:hover': {
                        bgcolor: alpha('#667eea', 0.2),
                      },
                    },
                  }}
                >
                  <GroupIcon sx={{ mr: 1 }} />
                  Staff Members
                </ToggleButton>
                <ToggleButton
                  value="client"
                  aria-label="client"
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: alpha('#10b981', 0.1),
                      color: '#10b981',
                      '&:hover': {
                        bgcolor: alpha('#10b981', 0.2),
                      },
                    },
                  }}
                >
                  <PersonIcon sx={{ mr: 1 }} />
                  My Clients
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* Recipients */}
          {!channelId && (
            <Autocomplete
              multiple={recipientType === 'staff'}
              options={availableRecipients}
              getOptionLabel={(option) => {
                if (recipientType === 'client' && option.medicalRecordNumber) {
                  return `${option.name} (MRN: ${option.medicalRecordNumber})`;
                }
                return option.email ? `${option.name} (${option.email})` : option.name;
              }}
              value={recipientType === 'staff' ? recipients : (recipients[0] || null)}
              onChange={(e, value) => {
                if (recipientType === 'staff') {
                  setRecipients(value as Recipient[]);
                } else {
                  setRecipients(value ? [value as Recipient] : []);
                }
              }}
              loading={loadingRecipients}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={recipientType === 'staff' ? 'To (Staff)' : 'To (Client)'}
                  placeholder={recipientType === 'staff' ? 'Select staff members' : 'Select a client'}
                />
              )}
              renderTags={(value, getTagProps) =>
                (value as Recipient[]).map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    sx={{
                      bgcolor: alpha(recipientType === 'staff' ? '#667eea' : '#10b981', 0.1),
                      color: recipientType === 'staff' ? '#667eea' : '#10b981',
                      fontWeight: 600,
                    }}
                  />
                ))
              }
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {recipientType === 'staff' ? (
                      <GroupIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    ) : (
                      <PersonIcon sx={{ color: '#10b981', fontSize: 20 }} />
                    )}
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {option.name}
                      </Typography>
                      {option.medicalRecordNumber && (
                        <Typography variant="caption" color="text.secondary">
                          MRN: {option.medicalRecordNumber}
                        </Typography>
                      )}
                      {option.email && !option.medicalRecordNumber && (
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </li>
              )}
              noOptionsText={
                recipientType === 'client'
                  ? 'No clients with portal access found'
                  : 'No staff members found'
              }
              sx={{ mb: 2 }}
            />
          )}

          {/* Priority */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} label="Priority">
              <MenuItem value="LOW">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#6b7280' }} />
                  Low
                </Box>
              </MenuItem>
              <MenuItem value="NORMAL">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                  Normal
                </Box>
              </MenuItem>
              <MenuItem value="HIGH">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f97316' }} />
                  High
                </Box>
              </MenuItem>
              <MenuItem value="URGENT">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ef4444' }} />
                  Urgent
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Subject */}
          <TextField
            fullWidth
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mb: 2 }}
          />

          {/* Rich Text Toolbar */}
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              mb: 1,
              display: 'flex',
              gap: 1,
              bgcolor: '#f8fafc',
            }}
          >
            <IconButton size="small">
              <FormatBoldIcon />
            </IconButton>
            <IconButton size="small">
              <FormatItalicIcon />
            </IconButton>
            <IconButton size="small">
              <FormatListBulletedIcon />
            </IconButton>
            <IconButton size="small">
              <InsertLinkIcon />
            </IconButton>
            <IconButton size="small">
              <ImageIcon />
            </IconButton>
          </Paper>

          {/* Message Body */}
          <TextField
            fullWidth
            multiline
            rows={12}
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
              },
            }}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Attachments ({attachments.length})
              </Typography>
              <List dense>
                {attachments.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveAttachment(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                    sx={{
                      bgcolor: alpha('#667eea', 0.05),
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemIcon>
                      <AttachFileIcon sx={{ color: '#667eea' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {/* Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component="label"
              startIcon={<AttachFileIcon />}
              variant="outlined"
              sx={{
                borderColor: '#cbd5e1',
                color: '#64748b',
                '&:hover': {
                  borderColor: '#667eea',
                  color: '#667eea',
                },
              }}
            >
              Attach
              <input type="file" hidden multiple onChange={handleAttachFile} />
            </Button>
            <Button
              startIcon={<SaveIcon />}
              variant="outlined"
              sx={{
                borderColor: '#cbd5e1',
                color: '#64748b',
                '&:hover': {
                  borderColor: '#667eea',
                  color: '#667eea',
                },
              }}
            >
              Save Draft
            </Button>
          </Box>

          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={isLoading}
            sx={{
              background: recipientType === 'client'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
              '&:hover': {
                background: recipientType === 'client'
                  ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  : 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
              },
            }}
          >
            {recipientType === 'client' ? 'Send to Client' : 'Send Message'}
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default MessageComposer;
