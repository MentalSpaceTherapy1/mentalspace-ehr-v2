import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Tooltip,
  CircularProgress,
  Alert,
  Badge,
  Switch,
  FormControlLabel,
  TableSortLabel,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Stack,
} from '@mui/material';
import {
  Schedule,
  PersonAdd,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Cancel,
  Send,
  Edit,
  CalendarMonth,
  ArrowUpward,
  ArrowDownward,
  Notifications,
  NotificationsActive,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Types
interface WaitlistEntry {
  id: string;
  clientId: string;
  clinicianId: string | null;
  appointmentType: string;
  preferredDays: string[];
  preferredTimes: string[];
  priority: number;
  status: 'ACTIVE' | 'MATCHED' | 'CANCELLED' | 'EXPIRED';
  joinedAt: string;
  notificationsSent: number;
  lastNotifiedAt: string | null;
  notes: string | null;
  expiresAt: string | null;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

interface SlotOffer {
  id: string;
  waitlistEntryId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  sentAt: string;
  respondedAt: string | null;
  client: {
    firstName: string;
    lastName: string;
  };
}

interface AppointmentSlot {
  date: string;
  time: string;
  available: boolean;
  scheduledCount: number;
  availableSlots: number;
  matchingEntries: number;
}

interface WaitlistStats {
  totalWaiting: number;
  highPriority: number;
  averageWaitDays: number;
  matchesThisWeek: number;
}

const APPOINTMENT_TYPES: { [key: string]: number } = {
  INITIAL_CONSULTATION: 60,
  FOLLOW_UP: 30,
  THERAPY_SESSION: 50,
  PSYCHIATRIC_EVALUATION: 90,
  MEDICATION_MANAGEMENT: 30,
};

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIMES_OF_DAY = ['MORNING', 'AFTERNOON', 'EVENING'];

const formatAppointmentType = (type: string): string => {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

const getDaysWaiting = (joinedAt: string): number => {
  const joined = new Date(joinedAt);
  const now = new Date();
  return Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
};

const getPriorityColor = (priority: number): 'error' | 'warning' | 'info' | 'success' => {
  if (priority > 80) return 'error';
  if (priority > 60) return 'warning';
  if (priority > 40) return 'info';
  return 'success';
};

export default function MyWaitlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<'priority' | 'waitTime' | 'name'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriorityMin, setFilterPriorityMin] = useState(0);
  const [filterPriorityMax, setFilterPriorityMax] = useState(100);

  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [offerDate, setOfferDate] = useState('');
  const [offerTime, setOfferTime] = useState('');
  const [offerDuration, setOfferDuration] = useState(60);
  const [offerExpiration, setOfferExpiration] = useState(24);

  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [newPriority, setNewPriority] = useState(50);
  const [priorityReason, setPriorityReason] = useState('');

  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Get current user (clinician)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  // Fetch waitlist entries for this clinician
  const { data: waitlistEntries, isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['clinicianWaitlist', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(`/waitlist?clinicianId=${currentUser.id}&status=ACTIVE`);
      return response.data.data;
    },
    enabled: !!currentUser?.id,
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Fetch waitlist statistics
  const { data: stats } = useQuery<WaitlistStats>({
    queryKey: ['waitlistStats', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const response = await api.get(`/waitlist/stats?clinicianId=${currentUser.id}`);
      return response.data.data;
    },
    enabled: !!currentUser?.id,
  });

  // Fetch pending offers
  const { data: pendingOffers } = useQuery<SlotOffer[]>({
    queryKey: ['pendingOffers', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(
        `/waitlist/offers?clinicianId=${currentUser.id}&status=PENDING`
      );
      return response.data.data;
    },
    enabled: !!currentUser?.id,
    refetchInterval: autoRefresh ? 15000 : false, // More frequent for pending offers
  });

  // Fetch recent matches
  const { data: recentMatches } = useQuery<SlotOffer[]>({
    queryKey: ['recentMatches', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(
        `/waitlist/offers?clinicianId=${currentUser.id}&status=ACCEPTED&days=30`
      );
      return response.data.data;
    },
    enabled: !!currentUser?.id,
  });

  // Fetch clinician's calendar for next 7 days
  const { data: calendarSlots } = useQuery<AppointmentSlot[]>({
    queryKey: ['clinicianCalendar', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(`/waitlist/calendar?clinicianId=${currentUser.id}&days=7`);
      return response.data.data;
    },
    enabled: !!currentUser?.id,
  });

  // Offer slot mutation
  const offerSlotMutation = useMutation({
    mutationFn: async (data: {
      waitlistEntryId: string;
      appointmentDate: string;
      appointmentTime: string;
      duration: number;
      expirationHours: number;
    }) => {
      const response = await api.post('/waitlist/offer-slot', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Slot offer sent successfully');
      queryClient.invalidateQueries({ queryKey: ['clinicianWaitlist'] });
      queryClient.invalidateQueries({ queryKey: ['pendingOffers'] });
      setOfferDialogOpen(false);
      resetOfferForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send slot offer');
    },
  });

  // Adjust priority mutation
  const adjustPriorityMutation = useMutation({
    mutationFn: async (data: { entryId: string; priority: number; reason: string }) => {
      const response = await api.patch(`/waitlist/${data.entryId}/priority`, {
        priority: data.priority,
        reason: data.reason,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Priority updated successfully');
      queryClient.invalidateQueries({ queryKey: ['clinicianWaitlist'] });
      setPriorityDialogOpen(false);
      setPriorityReason('');
    },
    onError: () => {
      toast.error('Failed to update priority');
    },
  });

  // Cancel offer mutation
  const cancelOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await api.delete(`/waitlist/offers/${offerId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Offer cancelled');
      queryClient.invalidateQueries({ queryKey: ['pendingOffers'] });
    },
    onError: () => {
      toast.error('Failed to cancel offer');
    },
  });

  const resetOfferForm = () => {
    setOfferDate('');
    setOfferTime('');
    setOfferDuration(60);
    setOfferExpiration(24);
    setSelectedEntry(null);
  };

  const handleOfferSlot = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setOfferDuration(APPOINTMENT_TYPES[entry.appointmentType] || 60);
    // Set default to next available business day
    const nextDay = dayjs().add(1, 'day');
    setOfferDate(nextDay.format('YYYY-MM-DD'));
    setOfferDialogOpen(true);
  };

  const handleSubmitOffer = () => {
    if (!selectedEntry || !offerDate || !offerTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    offerSlotMutation.mutate({
      waitlistEntryId: selectedEntry.id,
      appointmentDate: offerDate,
      appointmentTime: offerTime,
      duration: offerDuration,
      expirationHours: offerExpiration,
    });
  };

  const handleAdjustPriority = (entry: WaitlistEntry, adjustment?: number) => {
    setSelectedEntry(entry);
    if (adjustment !== undefined) {
      const newValue = Math.max(0, Math.min(100, entry.priority + adjustment));
      if (Math.abs(adjustment) > 20) {
        setNewPriority(newValue);
        setPriorityDialogOpen(true);
      } else {
        adjustPriorityMutation.mutate({
          entryId: entry.id,
          priority: newValue,
          reason: `Quick adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`,
        });
      }
    } else {
      setNewPriority(entry.priority);
      setPriorityDialogOpen(true);
    }
  };

  const handleSubmitPriority = () => {
    if (!selectedEntry) return;

    const priorityChange = Math.abs(newPriority - selectedEntry.priority);
    if (priorityChange > 20 && !priorityReason.trim()) {
      toast.error('Please provide a reason for large priority changes');
      return;
    }

    adjustPriorityMutation.mutate({
      entryId: selectedEntry.id,
      priority: newPriority,
      reason: priorityReason || `Priority adjusted to ${newPriority}`,
    });
  };

  const handleSort = (field: 'priority' | 'waitTime' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    if (!waitlistEntries) return [];

    let filtered = waitlistEntries.filter((entry) => {
      if (filterType !== 'ALL' && entry.appointmentType !== filterType) return false;
      if (entry.priority < filterPriorityMin || entry.priority > filterPriorityMax) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'waitTime':
          comparison = getDaysWaiting(a.joinedAt) - getDaysWaiting(b.joinedAt);
          break;
        case 'name':
          comparison = `${a.client.firstName} ${a.client.lastName}`.localeCompare(
            `${b.client.firstName} ${b.client.lastName}`
          );
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [waitlistEntries, filterType, filterPriorityMin, filterPriorityMax, sortBy, sortOrder]);

  // Time remaining for offers
  const getTimeRemaining = (expiresAt: string): string => {
    return dayjs(expiresAt).fromNow();
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4caf50 0%, #009688 100%)',
          color: 'white',
          p: 4,
          borderRadius: 2,
          mb: 3,
        }}
      >
        <Typography variant="h4" gutterBottom>
          My Waitlist - Clients Waiting for Appointments
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">
            Last updated: {dayjs().format('MMM DD, YYYY h:mm A')}
          </Typography>
          <FormControlLabel
            control={
              <Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            }
            label="Auto-refresh"
            sx={{ color: 'white' }}
          />
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Schedule sx={{ fontSize: 40, color: '#2196f3' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Waiting
                  </Typography>
                  <Typography variant="h4">{stats?.totalWaiting || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge badgeContent={stats?.highPriority || 0} color="error">
                  <TrendingUp sx={{ fontSize: 40, color: '#f44336' }} />
                </Badge>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    High Priority
                  </Typography>
                  <Typography variant="h4">{stats?.highPriority || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccessTime sx={{ fontSize: 40, color: '#ff9800' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Avg Wait Time
                  </Typography>
                  <Typography variant="h4">{stats?.averageWaitDays || 0} days</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    This Week's Matches
                  </Typography>
                  <Typography variant="h4">{stats?.matchesThisWeek || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Waitlist Entries Table */}
        <Grid size={{xs: 12, lg: 8}}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  value={filterType}
                  label="Appointment Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  {Object.keys(APPOINTMENT_TYPES).map((type) => (
                    <MenuItem key={type} value={type}>
                      {formatAppointmentType(type)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                  Priority Range: {filterPriorityMin} - {filterPriorityMax}
                </Typography>
                <Slider
                  value={[filterPriorityMin, filterPriorityMax]}
                  onChange={(_, value) => {
                    const [min, max] = value as number[];
                    setFilterPriorityMin(min);
                    setFilterPriorityMax(max);
                  }}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                />
              </FormControl>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Appointment Type</TableCell>
                    <TableCell>Preferences</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'priority'}
                        direction={sortBy === 'priority' ? sortOrder : 'asc'}
                        onClick={() => handleSort('priority')}
                      >
                        Priority
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'waitTime'}
                        direction={sortBy === 'waitTime' ? sortOrder : 'asc'}
                        onClick={() => handleSort('waitTime')}
                      >
                        Days Waiting
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Alert severity="info" sx={{ mt: 2 }}>
                          No one is waiting for you - Great job!
                        </Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedEntries.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar>
                              {entry.client.firstName[0]}
                              {entry.client.lastName[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {entry.client.firstName} {entry.client.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.client.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{formatAppointmentType(entry.appointmentType)}</TableCell>
                        <TableCell>
                          <Box>
                            <Box sx={{ mb: 0.5 }}>
                              {entry.preferredDays.slice(0, 2).map((day) => (
                                <Chip
                                  key={day}
                                  label={day.slice(0, 3)}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))}
                              {entry.preferredDays.length > 2 && (
                                <Chip label={`+${entry.preferredDays.length - 2}`} size="small" />
                              )}
                            </Box>
                            <Box>
                              {entry.preferredTimes.map((time) => (
                                <Chip
                                  key={time}
                                  label={time}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 0.5 }}
                                />
                              ))}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.priority}
                            color={getPriorityColor(entry.priority)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {getDaysWaiting(entry.joinedAt)} days
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Offer Slot">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOfferSlot(entry)}
                              >
                                <Send />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Adjust Priority">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => handleAdjustPriority(entry)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                            <Button
                              size="small"
                              onClick={() => handleAdjustPriority(entry, 5)}
                              sx={{ minWidth: 'auto', px: 0.5 }}
                            >
                              +5
                            </Button>
                            <Button
                              size="small"
                              onClick={() => handleAdjustPriority(entry, -5)}
                              sx={{ minWidth: 'auto', px: 0.5 }}
                            >
                              -5
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Pending Offers Section */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Offers
            </Typography>
            {!pendingOffers || pendingOffers.length === 0 ? (
              <Alert severity="info">No pending offers at the moment</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Slot Offered</TableCell>
                      <TableCell>Sent</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          {offer.client.firstName} {offer.client.lastName}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {dayjs(offer.appointmentDate).format('MMM DD, YYYY')} at{' '}
                            {offer.appointmentTime}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {offer.duration} minutes
                          </Typography>
                        </TableCell>
                        <TableCell>{dayjs(offer.sentAt).format('MMM DD, h:mm A')}</TableCell>
                        <TableCell>
                          <Tooltip title={dayjs(offer.expiresAt).format('MMM DD, h:mm A')}>
                            <Chip
                              label={getTimeRemaining(offer.expiresAt)}
                              size="small"
                              color="warning"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip label="Pending" size="small" color="info" />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => cancelOfferMutation.mutate(offer.id)}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Recently Matched Section */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recently Matched (Last 30 Days)
            </Typography>
            {!recentMatches || recentMatches.length === 0 ? (
              <Alert severity="info">No recent matches</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Appointment Date</TableCell>
                      <TableCell>Matched On</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>
                          {match.client.firstName} {match.client.lastName}
                        </TableCell>
                        <TableCell>
                          {dayjs(match.appointmentDate).format('MMM DD, YYYY')} at{' '}
                          {match.appointmentTime}
                        </TableCell>
                        <TableCell>
                          {match.respondedAt &&
                            dayjs(match.respondedAt).format('MMM DD, YYYY')}
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            View Appointment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Calendar Widget Sidebar */}
        <Grid size={{xs: 12, lg: 4}}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              My Calendar - Next 7 Days
            </Typography>
            <List>
              {calendarSlots?.map((slot, idx) => (
                <React.Fragment key={idx}>
                  <ListItemButton
                    onClick={() => setExpandedDay(expandedDay === slot.date ? null : slot.date)}
                  >
                    <ListItemText
                      primary={dayjs(slot.date).format('dddd, MMM DD')}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Scheduled: {slot.scheduledCount} | Available: {slot.availableSlots}
                          </Typography>
                          {slot.matchingEntries > 0 && (
                            <Chip
                              label={`${slot.matchingEntries} waitlist matches`}
                              size="small"
                              color="primary"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    {expandedDay === slot.date ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={expandedDay === slot.date} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Available Slots: {slot.availableSlots}
                      </Typography>
                      {slot.matchingEntries > 0 && (
                        <>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Top Matches:
                          </Typography>
                          <Alert severity="info" sx={{ mb: 1 }}>
                            {slot.matchingEntries} clients prefer this day
                          </Alert>
                          <Button
                            size="small"
                            variant="contained"
                            fullWidth
                            onClick={() => {
                              // Find top match for this day
                              const topMatch = filteredAndSortedEntries.find((entry) =>
                                entry.preferredDays.some((day) => {
                                  const slotDay = dayjs(slot.date).format('dddd').toUpperCase();
                                  return day === slotDay;
                                })
                              );
                              if (topMatch) {
                                handleOfferSlot(topMatch);
                              }
                            }}
                          >
                            Offer to Top Match
                          </Button>
                        </>
                      )}
                    </Box>
                  </Collapse>
                  {idx < (calendarSlots?.length || 0) - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>

          {/* Quick Stats */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Insights
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Most Requested Type
                </Typography>
                <Typography variant="h6">
                  {waitlistEntries && waitlistEntries.length > 0
                    ? formatAppointmentType(
                        Object.entries(
                          waitlistEntries.reduce((acc, entry) => {
                            acc[entry.appointmentType] = (acc[entry.appointmentType] || 0) + 1;
                            return acc;
                          }, {} as { [key: string]: number })
                        ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                      )
                    : 'N/A'}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Most Preferred Day
                </Typography>
                <Typography variant="h6">
                  {waitlistEntries && waitlistEntries.length > 0
                    ? Object.entries(
                        waitlistEntries
                          .flatMap((e) => e.preferredDays)
                          .reduce((acc, day) => {
                            acc[day] = (acc[day] || 0) + 1;
                            return acc;
                          }, {} as { [key: string]: number })
                      ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                    : 'N/A'}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Longest Wait
                </Typography>
                <Typography variant="h6" color="error">
                  {waitlistEntries && waitlistEntries.length > 0
                    ? Math.max(...waitlistEntries.map((e) => getDaysWaiting(e.joinedAt)))
                    : 0}{' '}
                  days
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Offer Slot Dialog */}
      <Dialog open={offerDialogOpen} onClose={() => setOfferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Offer Appointment Slot</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Offering slot to {selectedEntry.client.firstName} {selectedEntry.client.lastName}
              </Alert>

              <TextField
                fullWidth
                label="Date"
                type="date"
                value={offerDate}
                onChange={(e) => setOfferDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Time"
                type="time"
                value={offerTime}
                onChange={(e) => setOfferTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={offerDuration}
                onChange={(e) => setOfferDuration(Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Offer Expires In (hours)"
                type="number"
                value={offerExpiration}
                onChange={(e) => setOfferExpiration(Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <Alert severity="success">
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Preview Notification
                </Typography>
                <Typography variant="body2">
                  {selectedEntry.client.firstName}, we have an appointment available for you on{' '}
                  {offerDate && dayjs(offerDate).format('dddd, MMMM DD, YYYY')} at {offerTime}.
                  This offer expires in {offerExpiration} hours. Please respond as soon as possible.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOfferDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitOffer}
            disabled={offerSlotMutation.isPending}
            startIcon={<Send />}
          >
            Send Offer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Priority Dialog */}
      <Dialog
        open={priorityDialogOpen}
        onClose={() => setPriorityDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adjust Priority</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Current priority: {selectedEntry.priority}
              </Alert>

              <Typography gutterBottom>New Priority: {newPriority}</Typography>
              <Slider
                value={newPriority}
                onChange={(_, value) => setNewPriority(value as number)}
                min={0}
                max={100}
                valueLabelDisplay="on"
                sx={{ mb: 3 }}
              />

              {Math.abs(newPriority - selectedEntry.priority) > 20 && (
                <TextField
                  fullWidth
                  label="Reason for Adjustment (required for large changes)"
                  multiline
                  rows={3}
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  required
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriorityDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitPriority}
            disabled={adjustPriorityMutation.isPending}
          >
            Update Priority
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
