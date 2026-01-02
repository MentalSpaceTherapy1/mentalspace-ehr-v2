import React, { useState, useEffect, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  PersonOutline as PersonOutlineIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessaging } from '../../hooks/useMessaging';
import { usePortalMessaging, PortalMessage } from '../../hooks/usePortalMessaging';
import MessageThread from './MessageThread';
import MessageComposer from './MessageComposer';
import ChannelList from './ChannelList';

// Interface for grouped conversation threads
interface ConversationThread {
  threadId: string;
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
  subject: string;
  messages: PortalMessage[];
  latestMessage: PortalMessage;
  unreadCount: number;
}

const MessagingHub: React.FC = () => {
  const { messages, channels, loading, fetchMessages, fetchChannels } = useMessaging();
  const {
    portalMessages,
    unreadCount: portalUnreadCount,
    fetchPortalInbox,
    replyToMessage,
    markAsRead: markPortalAsRead
  } = usePortalMessaging();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Default to Client Portal tab (index 0 = Client Portal, 1 = Staff, 2 = Channels)
  const [tabValue, setTabValue] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Group portal messages into conversation threads
  const conversationThreads = useMemo(() => {
    const threadMap = new Map<string, ConversationThread>();

    portalMessages.forEach((msg) => {
      // Use threadId if available, otherwise use the message's own id as the thread identifier
      const threadKey = msg.threadId || msg.id;

      if (threadMap.has(threadKey)) {
        const thread = threadMap.get(threadKey)!;
        thread.messages.push(msg);
        // Update latest message if this one is newer
        if (new Date(msg.createdAt) > new Date(thread.latestMessage.createdAt)) {
          thread.latestMessage = msg;
        }
        // Count unread messages sent BY clients (therapist needs to read those)
        if (!msg.isRead && msg.sentByClient) {
          thread.unreadCount++;
        }
      } else {
        threadMap.set(threadKey, {
          threadId: threadKey,
          clientId: msg.clientId,
          client: msg.client,
          subject: msg.subject.replace(/^Re:\s*/i, ''), // Strip Re: prefix for display
          messages: [msg],
          latestMessage: msg,
          unreadCount: (!msg.isRead && msg.sentByClient) ? 1 : 0,
        });
      }
    });

    // Sort messages within each thread by date (oldest first for conversation view)
    threadMap.forEach((thread) => {
      thread.messages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    // Convert to array and sort by latest message date (newest first)
    return Array.from(threadMap.values()).sort((a, b) =>
      new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime()
    );
  }, [portalMessages]);

  // Get unique clients from portal messages for filtering
  const uniqueClients = useMemo(() => {
    const clientMap = new Map<string, { id: string; firstName: string; lastName: string; medicalRecordNumber: string }>();
    portalMessages.forEach((msg) => {
      if (msg.client && !clientMap.has(msg.clientId)) {
        clientMap.set(msg.clientId, msg.client);
      }
    });
    return Array.from(clientMap.values());
  }, [portalMessages]);

  // Filter conversations by search and client
  const filteredConversations = useMemo(() => {
    return conversationThreads.filter((thread) => {
      // First apply client filter
      if (selectedClientFilter !== 'all' && thread.clientId !== selectedClientFilter) {
        return false;
      }
      // Then apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          thread.subject?.toLowerCase().includes(searchLower) ||
          thread.latestMessage.message?.toLowerCase().includes(searchLower) ||
          thread.client?.firstName?.toLowerCase().includes(searchLower) ||
          thread.client?.lastName?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [conversationThreads, selectedClientFilter, searchQuery]);

  useEffect(() => {
    fetchMessages();
    fetchChannels();
    fetchPortalInbox();
  }, []);

  // Update selected conversation when messages refresh
  useEffect(() => {
    if (selectedConversation) {
      const updatedThread = conversationThreads.find(t => t.threadId === selectedConversation.threadId);
      if (updatedThread) {
        setSelectedConversation(updatedThread);
      }
    }
  }, [conversationThreads]);

  // Handle tab change - tabs reordered: 0=Client Portal, 1=Staff, 2=Channels
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedThread(null);
    setSelectedConversation(null);
    if (newValue === 0) {
      fetchPortalInbox();
    }
  };

  // Handle conversation selection
  const handleSelectConversation = async (thread: ConversationThread) => {
    setSelectedConversation(thread);
    setSelectedThread(null);
    // Mark all unread messages from client as read
    for (const msg of thread.messages) {
      if (!msg.isRead && msg.sentByClient) {
        await markPortalAsRead(msg.id);
      }
    }
  };

  // Handle reply to conversation
  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSendingReply(true);
    try {
      // Reply to the latest message in the thread
      const latestMessage = selectedConversation.messages[selectedConversation.messages.length - 1];
      await replyToMessage(latestMessage.id, replyText.trim());
      setReplyText('');
      // Refresh the inbox
      await fetchPortalInbox();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
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
          <Badge badgeContent={unreadCount + portalUnreadCount} color="error">
            <InboxIcon sx={{ fontSize: 32 }} />
          </Badge>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Sidebar - Channels/Folders */}
          <Grid size={{xs: 12, md: 4}} sx={{ height: '100%', borderRight: '1px solid #e2e8f0' }}>
            <Paper elevation={0} sx={{ height: '100%', borderRadius: 0, overflow: 'auto' }}>
              <Box sx={{ p: 2 }}>
                {/* Tabs - Client Portal first (most important), then Staff, then Channels */}
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  sx={{
                    mb: 2,
                    '& .MuiTab-root': {
                      minHeight: 56,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textTransform: 'none',
                    },
                    '& .Mui-selected': {
                      color: '#10b981 !important',
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#10b981',
                      height: 3,
                    },
                  }}
                >
                  <Tab
                    icon={
                      <Badge badgeContent={portalUnreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}>
                        <PersonIcon />
                      </Badge>
                    }
                    label="Clients"
                    sx={{ color: tabValue === 0 ? '#10b981' : 'inherit' }}
                  />
                  <Tab
                    icon={<InboxIcon />}
                    label="Staff"
                  />
                  <Tab
                    icon={<GroupIcon />}
                    label="Channels"
                  />
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

                {/* Tab 0 = Client Portal Messages (Primary) */}
                {tabValue === 0 ? (
                  <Box>
                    {/* Client Filter Dropdown */}
                    {uniqueClients.length > 0 && (
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Filter by Client</InputLabel>
                        <Select
                          value={selectedClientFilter}
                          onChange={(e) => setSelectedClientFilter(e.target.value)}
                          label="Filter by Client"
                          sx={{ borderRadius: 2, bgcolor: '#f1f5f9' }}
                        >
                          <MenuItem value="all">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <GroupIcon sx={{ fontSize: 18, color: '#10b981' }} />
                              All Clients ({conversationThreads.length} conversations)
                            </Box>
                          </MenuItem>
                          {uniqueClients.map((client) => (
                            <MenuItem key={client.id} value={client.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#10b981' }}>
                                  {client.firstName?.charAt(0)}
                                </Avatar>
                                {client.firstName} {client.lastName}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                  ({conversationThreads.filter(t => t.clientId === client.id).length})
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    <List sx={{ p: 0 }}>
                      {filteredConversations.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <PersonOutlineIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            No conversations with clients
                          </Typography>
                        </Box>
                      ) : (
                        <AnimatePresence>
                          {filteredConversations.map((thread, index) => (
                            <motion.div
                              key={thread.threadId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <ListItemButton
                                selected={selectedConversation?.threadId === thread.threadId}
                                onClick={() => handleSelectConversation(thread)}
                                sx={{
                                  borderRadius: 2,
                                  mb: 1,
                                  bgcolor: thread.unreadCount > 0 ? alpha('#10b981', 0.05) : 'transparent',
                                  borderLeft: thread.unreadCount > 0 ? `3px solid #10b981` : 'none',
                                  '&.Mui-selected': {
                                    bgcolor: alpha('#10b981', 0.1),
                                    borderLeft: `3px solid #10b981`,
                                  },
                                }}
                              >
                                <ListItemAvatar>
                                  <Badge
                                    badgeContent={thread.messages.length > 1 ? thread.messages.length : 0}
                                    color="primary"
                                    sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
                                  >
                                    <Avatar sx={{ bgcolor: '#10b981' }}>
                                      {thread.client?.firstName?.charAt(0) || 'C'}
                                    </Avatar>
                                  </Badge>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={thread.unreadCount > 0 ? 700 : 500}
                                        noWrap
                                      >
                                        {thread.client
                                          ? `${thread.client.firstName} ${thread.client.lastName}`
                                          : 'Unknown Client'}
                                      </Typography>
                                      {thread.unreadCount > 0 && (
                                        <Box
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: '#10b981',
                                          }}
                                        />
                                      )}
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight={thread.unreadCount > 0 ? 600 : 400}
                                        noWrap
                                        sx={{ mb: 0.5 }}
                                      >
                                        {thread.subject}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" noWrap>
                                        {thread.latestMessage.sentByClient ? '' : 'You: '}
                                        {thread.latestMessage.message}
                                      </Typography>
                                    </Box>
                                  }
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                                  {new Date(thread.latestMessage.createdAt).toLocaleDateString()}
                                </Typography>
                              </ListItemButton>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </List>
                  </Box>
                ) : tabValue === 1 ? (
                  /* Tab 1 = Staff Messages */
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
                  /* Tab 2 = Channels */
                  <ChannelList
                    channels={channels}
                    selectedChannel={selectedChannel}
                    onSelectChannel={setSelectedChannel}
                  />
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Middle - Message Thread or Content (expanded to fill space after removing Quick Actions) */}
          <Grid size={{xs: 12, md: 8}} sx={{ height: '100%', overflow: 'auto' }}>
            {showComposer ? (
              <MessageComposer onClose={() => setShowComposer(false)} />
            ) : selectedThread ? (
              <MessageThread threadId={selectedThread} />
            ) : selectedConversation ? (
              /* Conversation Thread View - Shows ALL messages in the thread */
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Paper elevation={0} sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#10b981', width: 48, height: 48 }}>
                      {selectedConversation.client?.firstName?.charAt(0) || 'C'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedConversation.client
                          ? `${selectedConversation.client.firstName} ${selectedConversation.client.lastName}`
                          : 'Unknown Client'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        MRN: {selectedConversation.client?.medicalRecordNumber || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                      <Chip
                        label={`${selectedConversation.messages.length} message${selectedConversation.messages.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}
                      />
                      <Chip
                        label="Client Portal"
                        size="small"
                        sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="h5" fontWeight={600}>
                    {selectedConversation.subject}
                  </Typography>
                </Paper>

                {/* Conversation Thread - All messages */}
                <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
                  {selectedConversation.messages.map((msg, index) => (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sentByClient ? 'flex-start' : 'flex-end',
                        mb: 2,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          maxWidth: '90%',
                          bgcolor: msg.sentByClient
                            ? alpha('#10b981', 0.05)
                            : alpha('#667eea', 0.05),
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: msg.sentByClient
                            ? alpha('#10b981', 0.2)
                            : alpha('#667eea', 0.2),
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              fontSize: 12,
                              bgcolor: msg.sentByClient ? '#10b981' : '#667eea',
                            }}
                          >
                            {msg.sentByClient
                              ? msg.client?.firstName?.charAt(0) || 'C'
                              : 'Y'}
                          </Avatar>
                          <Typography variant="caption" fontWeight={600}>
                            {msg.sentByClient
                              ? `${msg.client?.firstName || 'Client'}`
                              : 'You'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {msg.message}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>

                {/* Reply Section */}
                <Paper elevation={0} sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Reply to {selectedConversation.client?.firstName}
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<ReplyIcon />}
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sendingReply}
                      sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        },
                      }}
                    >
                      {sendingReply ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </Box>
                </Paper>
              </Box>
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

        </Grid>
      </Box>
    </Box>
  );
};

export default MessagingHub;
