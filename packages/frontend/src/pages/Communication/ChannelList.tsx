import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Badge,
  IconButton,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Campaign as CampaignIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  ExitToApp as ExitToAppIcon,
  Lock as LockIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useMessaging } from '../../hooks/useMessaging';

interface Channel {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP' | 'TEAM' | 'BROADCAST';
  description?: string;
  memberCount: number;
  unreadCount: number;
  lastMessageAt?: string;
  createdAt: string;
}

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: string | null;
  onSelectChannel: (channelId: string) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
}) => {
  const { createChannel } = useMessaging();
  const [openDialog, setOpenDialog] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    type: 'GROUP',
    description: '',
  });

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'DIRECT':
        return <PersonIcon />;
      case 'GROUP':
        return <GroupIcon />;
      case 'TEAM':
        return <BusinessIcon />;
      case 'BROADCAST':
        return <CampaignIcon />;
      default:
        return <GroupIcon />;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'DIRECT':
        return '#3b82f6';
      case 'GROUP':
        return '#8b5cf6';
      case 'TEAM':
        return '#10b981';
      case 'BROADCAST':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const handleCreateChannel = async () => {
    try {
      await createChannel({
        name: newChannel.name,
        type: newChannel.type,
        description: newChannel.description,
        memberIds: [], // Add member selection logic
      });
      setOpenDialog(false);
      setNewChannel({ name: '', type: 'GROUP', description: '' });
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  return (
    <Box>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setOpenDialog(true)}
        sx={{
          mb: 2,
          borderColor: '#cbd5e1',
          color: '#667eea',
          borderRadius: 2,
          '&:hover': {
            borderColor: '#667eea',
            bgcolor: alpha('#667eea', 0.05),
          },
        }}
      >
        Create Channel
      </Button>

      <Grid container spacing={2}>
        {channels.map((channel, index) => (
          <Grid item xs={12} key={channel.id}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedChannel === channel.id ? '2px solid #667eea' : '2px solid transparent',
                  bgcolor: selectedChannel === channel.id ? alpha('#667eea', 0.05) : 'white',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  },
                }}
                onClick={() => onSelectChannel(channel.id)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: alpha(getChannelColor(channel.type), 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: getChannelColor(channel.type),
                      }}
                    >
                      {getChannelIcon(channel.type)}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {channel.name}
                        </Typography>
                        {channel.unreadCount > 0 && (
                          <Badge
                            badgeContent={channel.unreadCount}
                            sx={{
                              '& .MuiBadge-badge': {
                                bgcolor: '#ef4444',
                                color: 'white',
                                fontWeight: 600,
                              },
                            }}
                          />
                        )}
                      </Box>

                      {channel.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                          noWrap
                        >
                          {channel.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={channel.type}
                          size="small"
                          sx={{
                            bgcolor: alpha(getChannelColor(channel.type), 0.1),
                            color: getChannelColor(channel.type),
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Chip
                          icon={<GroupIcon sx={{ fontSize: 14 }} />}
                          label={`${channel.memberCount} members`}
                          size="small"
                          sx={{
                            bgcolor: alpha('#6b7280', 0.1),
                            color: '#6b7280',
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: alpha('#10b981', 0.1),
                          color: '#10b981',
                          '&:hover': { bgcolor: alpha('#10b981', 0.2) },
                        }}
                      >
                        <PersonAddIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: alpha('#ef4444', 0.1),
                          color: '#ef4444',
                          '&:hover': { bgcolor: alpha('#ef4444', 0.2) },
                        }}
                      >
                        <ExitToAppIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Create Channel Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          Create New Channel
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Channel Name"
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Channel Type</InputLabel>
            <Select
              value={newChannel.type}
              onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
              label="Channel Type"
            >
              <MenuItem value="DIRECT">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: '#3b82f6' }} />
                  Direct Message
                </Box>
              </MenuItem>
              <MenuItem value="GROUP">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ color: '#8b5cf6' }} />
                  Group Chat
                </Box>
              </MenuItem>
              <MenuItem value="TEAM">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon sx={{ color: '#10b981' }} />
                  Team Channel
                </Box>
              </MenuItem>
              <MenuItem value="BROADCAST">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CampaignIcon sx={{ color: '#f59e0b' }} />
                  Broadcast
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Description (optional)"
            multiline
            rows={3}
            value={newChannel.description}
            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateChannel}
            disabled={!newChannel.name.trim()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
              },
            }}
          >
            Create Channel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChannelList;
