import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Button,
  Chip,
  Divider,
  Menu,
  MenuItem,
  alpha,
} from '@mui/material';
import {
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessaging } from '../../hooks/useMessaging';
import { format } from 'date-fns';

interface MessageThreadProps {
  threadId?: string;
}

const MessageThread: React.FC<MessageThreadProps> = ({ threadId: propThreadId }) => {
  const { threadId: paramThreadId } = useParams<{ threadId: string }>();
  const threadId = propThreadId || paramThreadId || '';
  const navigate = useNavigate();
  const { messages, sendMessage, markAsRead, loading } = useMessaging();
  const [replyText, setReplyText] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const threadMessages = messages.filter(
    (msg) => msg.threadId === threadId || msg.id === threadId
  );

  useEffect(() => {
    // Mark messages as read
    threadMessages.forEach((msg) => {
      if (!msg.isRead) {
        markAsRead(msg.id);
      }
    });
    scrollToBottom();
  }, [threadId, threadMessages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    try {
      await sendMessage({
        body: replyText,
        threadId,
      });
      setReplyText('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send reply:', err);
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

  const isCurrentUser = (senderId: string) => {
    // Mock check - replace with actual user ID check
    return senderId === localStorage.getItem('userId');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Thread Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {threadMessages[0]?.subject || 'Conversation'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {threadMessages.length} message{threadMessages.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {threadMessages[0] && (
            <Chip
              label={threadMessages[0].priority}
              size="small"
              sx={{
                bgcolor: alpha(getPriorityColor(threadMessages[0].priority), 0.1),
                color: getPriorityColor(threadMessages[0].priority),
                fontWeight: 600,
                mr: 2,
              }}
            />
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              sx={{
                bgcolor: alpha('#667eea', 0.1),
                color: '#667eea',
                '&:hover': { bgcolor: alpha('#667eea', 0.2) },
              }}
            >
              <ReplyIcon />
            </IconButton>
            <IconButton
              sx={{
                bgcolor: alpha('#3b82f6', 0.1),
                color: '#3b82f6',
                '&:hover': { bgcolor: alpha('#3b82f6', 0.2) },
              }}
            >
              <ForwardIcon />
            </IconButton>
            <IconButton
              sx={{
                bgcolor: alpha('#6b7280', 0.1),
                color: '#6b7280',
                '&:hover': { bgcolor: alpha('#6b7280', 0.2) },
              }}
            >
              <ArchiveIcon />
            </IconButton>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => setAnchorEl(null)}>Mark as Unread</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Move to Folder</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Delete</MenuItem>
        </Menu>
      </Paper>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#fafbfc' }}>
        <AnimatePresence>
          {threadMessages.map((message, index) => {
            const isSender = isCurrentUser(message.senderId);
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: isSender ? 'row-reverse' : 'row',
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: isSender ? '#667eea' : '#3b82f6',
                      border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    {message.senderName?.charAt(0) || 'U'}
                  </Avatar>

                  <Box sx={{ flex: 1, maxWidth: '70%' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.5,
                        flexDirection: isSender ? 'row-reverse' : 'row',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {message.senderName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(message.createdAt), 'MMM dd, yyyy h:mm a')}
                      </Typography>
                      {message.isRead && isSender && (
                        <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                      )}
                    </Box>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: isSender ? '#667eea' : 'white',
                        color: isSender ? 'white' : 'inherit',
                        borderRadius: 3,
                        borderTopLeftRadius: isSender ? 20 : 4,
                        borderTopRightRadius: isSender ? 4 : 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.body}
                      </Typography>

                      {message.attachments && message.attachments.length > 0 && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha('#fff', 0.2)}` }}>
                          {message.attachments.map((attachment: any, idx: number) => (
                            <Chip
                              key={idx}
                              icon={<AttachFileIcon />}
                              label={attachment.name}
                              size="small"
                              sx={{
                                mr: 1,
                                bgcolor: isSender ? alpha('#fff', 0.2) : alpha('#667eea', 0.1),
                                color: isSender ? 'white' : '#667eea',
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Box>
                </Box>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </Box>

      {/* Reply Box */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          background: 'linear-gradient(to top, #ffffff, #f8fafc)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <Avatar sx={{ bgcolor: '#667eea' }}>
            {localStorage.getItem('userName')?.charAt(0) || 'U'}
          </Avatar>

          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'white',
              },
            }}
          />

          <IconButton
            sx={{
              bgcolor: alpha('#667eea', 0.1),
              color: '#667eea',
              '&:hover': { bgcolor: alpha('#667eea', 0.2) },
            }}
          >
            <AttachFileIcon />
          </IconButton>

          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendReply}
            disabled={!replyText.trim() || loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              px: 3,
              py: 1.5,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
              },
            }}
          >
            Reply
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default MessageThread;
