import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useMessaging } from '../../hooks/useMessaging';

interface MessageComposerProps {
  onClose?: () => void;
  replyTo?: string;
  channelId?: string;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onClose: propOnClose, replyTo, channelId }) => {
  const navigate = useNavigate();
  const onClose = propOnClose || (() => navigate('/messages'));
  const { sendMessage, loading } = useMessaging();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Mock recipients for autocomplete
  const availableRecipients = [
    { id: '1', name: 'Dr. Sarah Johnson', email: 'sarah.j@example.com' },
    { id: '2', name: 'Dr. Michael Chen', email: 'michael.c@example.com' },
    { id: '3', name: 'Dr. Emily Williams', email: 'emily.w@example.com' },
    { id: '4', name: 'Dr. David Martinez', email: 'david.m@example.com' },
  ];

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

    try {
      await sendMessage({
        subject,
        body,
        priority,
        recipientIds: recipients,
        channelId,
        attachments,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
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

        {loading && <LinearProgress />}

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

          {/* Recipients */}
          {!channelId && (
            <Autocomplete
              multiple
              options={availableRecipients}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={availableRecipients.filter((r) => recipients.includes(r.id))}
              onChange={(e, value) => setRecipients(value.map((v) => v.id))}
              renderInput={(params) => (
                <TextField {...params} label="To" placeholder="Select recipients" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    sx={{
                      bgcolor: alpha('#667eea', 0.1),
                      color: '#667eea',
                      fontWeight: 600,
                    }}
                  />
                ))
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
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
              },
            }}
          >
            Send Message
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default MessageComposer;
