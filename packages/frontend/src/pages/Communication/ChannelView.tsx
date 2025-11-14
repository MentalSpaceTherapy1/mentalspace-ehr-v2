import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Drawer,
  Divider,
  Chip,
  Menu,
  MenuItem,
  InputAdornment,
  Badge,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  PushPin as PushPinIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessaging } from '../../hooks/useMessaging';
import { format } from 'date-fns';

interface ChannelViewProps {
  channelId?: string;
}

const ChannelView: React.FC<ChannelViewProps> = ({ channelId: propChannelId }) => {
  const { channelId: paramChannelId } = useParams<{ channelId: string }>();
  const channelId = propChannelId || paramChannelId || '';
  const navigate = useNavigate();
  const { messages, sendMessage, loading } = useMessaging();
  const [messageText, setMessageText] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock channel data
  const channel = {
    id: channelId,
    name: 'Clinical Team',
    type: 'TEAM',
    members: [
      { id: '1', name: 'Dr. Sarah Johnson', avatar: 'S', status: 'online' },
      { id: '2', name: 'Dr. Michael Chen', avatar: 'M', status: 'online' },
      { id: '3', name: 'Dr. Emily Williams', avatar: 'E', status: 'away' },
      { id: '4', name: 'Dr. David Martinez', avatar: 'D', status: 'offline' },
    ],
  };

  const channelMessages = messages.filter((msg) => msg.channelId === channelId);
  const pinnedMessages = channelMessages.filter((msg: any) => msg.isPinned);

  useEffect(() => {
    scrollToBottom();
  }, [channelMessages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendMessage({
        body: messageText,
        channelId,
      });
      setMessageText('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'away':
        return '#f59e0b';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Channel Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(to right, #667eea, #764ba2)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha('#fff', 0.2),
                border: '2px solid white',
                width: 48,
                height: 48,
              }}
            >
              {channel.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {channel.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {channel.members.length} members · {channel.members.filter(m => m.status === 'online').length} online
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search in channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'white' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  bgcolor: alpha('#fff', 0.15),
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: alpha('#fff', 0.3) },
                },
              }}
            />
            <IconButton
              onClick={() => setShowMemberList(!showMemberList)}
              sx={{ color: 'white', bgcolor: alpha('#fff', 0.15) }}
            >
              <PersonAddIcon />
            </IconButton>
            <IconButton sx={{ color: 'white', bgcolor: alpha('#fff', 0.15) }}>
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha('#fff', 0.15), borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PushPinIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2" fontWeight={600}>
                Pinned: {pinnedMessages[0].body}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Messages Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#fafbfc' }}>
        <AnimatePresence>
          {channelMessages.map((message, index) => {
            const member = channel.members.find(m => m.id === message.senderId);
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Box sx={{ display: 'flex', gap: 2, mb: 3, '&:hover .message-actions': { opacity: 1 } }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: getStatusColor(member?.status || 'offline'),
                          border: '2px solid white',
                        }}
                      />
                    }
                  >
                    <Avatar sx={{ bgcolor: '#667eea', border: '2px solid white' }}>
                      {member?.avatar || 'U'}
                    </Avatar>
                  </Badge>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {message.senderName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(message.createdAt), 'h:mm a')}
                      </Typography>
                    </Box>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.body}
                      </Typography>
                    </Paper>
                  </Box>

                  <Box
                    className="message-actions"
                    sx={{ display: 'flex', gap: 0.5, opacity: 0, transition: 'opacity 0.2s' }}
                  >
                    <IconButton size="small" sx={{ bgcolor: alpha('#667eea', 0.1) }}>
                      <EmojiIcon fontSize="small" sx={{ color: '#667eea' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ bgcolor: alpha('#667eea', 0.1) }}
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                      <MoreVertIcon fontSize="small" sx={{ color: '#667eea' }} />
                    </IconButton>
                  </Box>
                </Box>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderTop: '1px solid #e2e8f0',
          background: 'linear-gradient(to top, #ffffff, #f8fafc)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={`Message ${channel.name}...`}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'white',
              },
            }}
          />

          <IconButton sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea' }}>
            <AttachFileIcon />
          </IconButton>

          <IconButton sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea' }}>
            <EmojiIcon />
          </IconButton>

          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!messageText.trim() || loading}
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
            Send
          </Button>
        </Box>
      </Paper>

      {/* Member List Drawer */}
      <Drawer
        anchor="right"
        open={showMemberList}
        onClose={() => setShowMemberList(false)}
        PaperProps={{
          sx: { width: 320, p: 2 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Members ({channel.members.length})
          </Typography>
          <IconButton onClick={() => setShowMemberList(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<PersonAddIcon />}
          sx={{
            mb: 2,
            borderColor: '#667eea',
            color: '#667eea',
            '&:hover': {
              borderColor: '#667eea',
              bgcolor: alpha('#667eea', 0.05),
            },
          }}
        >
          Add Members
        </Button>

        <Divider sx={{ mb: 2 }} />

        <List>
          {channel.members.map((member) => (
            <ListItem
              key={member.id}
              sx={{
                borderRadius: 2,
                mb: 1,
                '&:hover': { bgcolor: alpha('#667eea', 0.05) },
              }}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: getStatusColor(member.status),
                        border: '2px solid white',
                      }}
                    />
                  }
                >
                  <Avatar sx={{ bgcolor: '#667eea' }}>{member.avatar}</Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={member.name}
                secondary={member.status}
                secondaryTypographyProps={{
                  sx: { color: getStatusColor(member.status), fontWeight: 600 },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Message Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <PushPinIcon sx={{ mr: 1, fontSize: 18 }} />
          Pin Message
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Reply</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>Copy Text</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: '#ef4444' }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChannelView;
