import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Mail as MailIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessaging } from '../../hooks/useMessaging';
import MessageThread from './MessageThread';
import MessageComposer from './MessageComposer';
import ChannelList from './ChannelList';

const MessagingHub: React.FC = () => {
  const { messages, channels, loading, fetchMessages, fetchChannels } = useMessaging();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchChannels();
  }, []);

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

  const filteredMessages = messages.filter(
    (msg) =>
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = messages.filter((msg) => !msg.isRead).length;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MailIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Messaging Hub
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Secure communication and collaboration
              </Typography>
            </Box>
          </Box>
          <Badge badgeContent={unreadCount} color="error">
            <InboxIcon sx={{ fontSize: 32 }} />
          </Badge>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Sidebar - Channels/Folders */}
          <Grid size={{xs: 12, md: 3}} sx={{ height: '100%', borderRight: '1px solid #e2e8f0' }}>
            <Paper elevation={0} sx={{ height: '100%', borderRadius: 0, overflow: 'auto' }}>
              <Box sx={{ p: 2 }}>
                <Tabs
                  value={tabValue}
                  onChange={(e, v) => setTabValue(v)}
                  variant="fullWidth"
                  sx={{ mb: 2 }}
                >
                  <Tab icon={<InboxIcon />} label="Messages" />
                  <Tab icon={<GroupIcon />} label="Channels" />
                </Tabs>

                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: '#f1f5f9',
                      },
                    }}
                  />
                </motion.div>

                <Button
                  fullWidth
                  onClick={() => setShowComposer(true)}
                  startIcon={<AddIcon />}
                  sx={{
                    mb: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 2,
                    py: 1.5,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                    },
                  }}
                >
                  New Message
                </Button>

                {tabValue === 0 ? (
                  <List sx={{ p: 0 }}>
                    <AnimatePresence>
                      {filteredMessages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <ListItemButton
                            selected={selectedThread === message.threadId}
                            onClick={() => setSelectedThread(message.threadId || message.id)}
                            sx={{
                              borderRadius: 2,
                              mb: 1,
                              bgcolor: !message.isRead ? alpha('#667eea', 0.05) : 'transparent',
                              borderLeft: !message.isRead ? `3px solid #667eea` : 'none',
                              '&.Mui-selected': {
                                bgcolor: alpha('#667eea', 0.1),
                                borderLeft: `3px solid #667eea`,
                              },
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: getPriorityColor(message.priority) }}>
                                {message.senderName?.charAt(0) || 'U'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={!message.isRead ? 700 : 500}
                                    noWrap
                                  >
                                    {message.senderName}
                                  </Typography>
                                  {!message.isRead && (
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: '#667eea',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight={!message.isRead ? 600 : 400}
                                    noWrap
                                    sx={{ mb: 0.5 }}
                                  >
                                    {message.subject}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {message.body}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItemButton>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </List>
                ) : (
                  <ChannelList
                    channels={channels}
                    selectedChannel={selectedChannel}
                    onSelectChannel={setSelectedChannel}
                  />
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Middle - Message Thread or Content */}
          <Grid size={{xs: 12, md: 6}} sx={{ height: '100%', overflow: 'auto' }}>
            {showComposer ? (
              <MessageComposer onClose={() => setShowComposer(false)} />
            ) : selectedThread ? (
              <MessageThread threadId={selectedThread} />
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <ChatIcon sx={{ fontSize: 100, color: '#cbd5e1' }} />
                </motion.div>
                <Typography variant="h6" color="text.secondary">
                  Select a message to view conversation
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Right Sidebar - Message Details/Actions */}
          <Grid
            size={{xs: 12, md: 3}}
            sx={{ height: '100%', borderLeft: '1px solid #e2e8f0', overflow: 'auto' }}
          >
            <Paper elevation={0} sx={{ p: 3, borderRadius: 0 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Actions
              </Typography>
              <List>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
                    <StarIcon sx={{ mr: 2, color: '#f59e0b' }} />
                    <ListItemText primary="Starred" secondary="0 messages" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
                    <SendIcon sx={{ mr: 2, color: '#3b82f6' }} />
                    <ListItemText primary="Sent" secondary={`${messages.length} messages`} />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton sx={{ borderRadius: 2, mb: 1 }}>
                    <ArchiveIcon sx={{ mr: 2, color: '#6b7280' }} />
                    <ListItemText primary="Archive" secondary="0 messages" />
                  </ListItemButton>
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" fontWeight={600} gutterBottom>
                Priority Filters
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="Urgent"
                  size="small"
                  sx={{
                    bgcolor: alpha('#ef4444', 0.1),
                    color: '#ef4444',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label="High"
                  size="small"
                  sx={{
                    bgcolor: alpha('#f97316', 0.1),
                    color: '#f97316',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label="Normal"
                  size="small"
                  sx={{
                    bgcolor: alpha('#3b82f6', 0.1),
                    color: '#3b82f6',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label="Low"
                  size="small"
                  sx={{
                    bgcolor: alpha('#6b7280', 0.1),
                    color: '#6b7280',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MessagingHub;
