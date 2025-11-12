import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  Slider,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  LinearProgress,
  Pagination,
  Autocomplete,
  Divider,
  TableSortLabel,
} from '@mui/material';
import {
  People,
  TrendingUp,
  Speed,
  PriorityHigh,
  Pending,
  Edit as AdjustIcon,
  Send,
  Delete,
  Search,
  FilterList,
  Close,
  Star,
  PersonAdd,
  CalendarMonth,
  AccessTime,
  Clear,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

/**
 * Module 7: Comprehensive Waitlist Management Interface
 *
 * Admin interface to manage waitlist entries, adjust priorities, offer slots,
 * and find best matches for available appointments
 */

interface WaitlistEntry {
  id: string;
  clientId: string;
  client: {
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
  clinicianPreference: string | null;
  clinician?: {
    firstName: string;
    lastName: string;
  };
  appointmentType: string;
  preferredDays: string[];
  preferredTimes: string[];
  priorityScore: number;
  status: 'ACTIVE' | 'MATCHED' | 'CANCELLED' | 'EXPIRED';
  urgency: number;
  flexibility: number;
  joinedAt: string;
  notes: string | null;
}

interface WaitlistStatistics {
  totalActive: number;
  averageWaitDays: number;
  matchRate: number;
  highPriorityCount: number;
  pendingOffers: number;
  byAppointmentType: { type: string; count: number }[];
  priorityDistribution: { range: string; count: number }[];
}

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
}

interface MatchResult {
  clientId: string;
  clientName: string;
  score: number;
  breakdown: {
    clinicianMatch: number;
    appointmentTypeMatch: number;
    dayPreference: number;
    timePreference: number;
    priorityBonus: number;
  };
  priorityScore: number;
  daysWaiting: number;
}

export default function WaitlistManagement() {
  // Data state
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [statistics, setStatistics] = useState<WaitlistStatistics | null>(null);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [clinicianFilter, setClinicianFilter] = useState<Clinician | null>(null);
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [priorityRange, setPriorityRange] = useState<number[]>([0, 100]);
  const [sortBy, setSortBy] = useState<'priority' | 'wait' | 'joined' | 'name'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog state
  const [adjustPriorityDialog, setAdjustPriorityDialog] = useState(false);
  const [offerSlotDialog, setOfferSlotDialog] = useState(false);
  const [removeEntryDialog, setRemoveEntryDialog] = useState(false);
  const [matchFinderDialog, setMatchFinderDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  // Priority adjustment state
  const [newPriority, setNewPriority] = useState(50);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Offer slot state
  const [offerData, setOfferData] = useState({
    clinicianId: '',
    dateTime: null as Dayjs | null,
    appointmentType: '',
    duration: 60,
    expiresIn: 24,
    sendEmail: true,
    sendSMS: false,
  });

  // Remove entry state
  const [removeReason, setRemoveReason] = useState('');
  const [removeReasonCategory, setRemoveReasonCategory] = useState('');

  // Match finder state
  const [matchSlot, setMatchSlot] = useState({
    clinicianId: '',
    date: null as Dayjs | null,
    time: '',
    appointmentType: '',
  });

  const appointmentTypes = ['Initial Consultation', 'Follow-up', 'Therapy Session', 'Assessment'];
  const removeCategories = [
    'Client no longer needs appointment',
    'Client scheduled elsewhere',
    'Duplicate entry',
    'Other'
  ];

  useEffect(() => {
    fetchEntries();
    fetchStatistics();
    fetchClinicians();
  }, [page, limit, statusFilter, clinicianFilter, appointmentTypeFilter, priorityRange, sortBy, sortOrder]);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (clinicianFilter) params.clinicianId = clinicianFilter.id;
      if (appointmentTypeFilter) params.appointmentType = appointmentTypeFilter;
      if (priorityRange[0] > 0 || priorityRange[1] < 100) {
        params.minPriority = priorityRange[0];
        params.maxPriority = priorityRange[1];
      }
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const response = await api.get('/admin/waitlist', { params });

      if (response.data.success) {
        setEntries(response.data.data.entries || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      toast.error('Failed to load waitlist entries');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/admin/waitlist/stats');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load statistics', error);
    }
  };

  const fetchClinicians = async () => {
    try {
      const response = await api.get('/users', { params: { role: 'CLINICIAN' } });
      if (response.data.success) {
        setClinicians(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load clinicians', error);
    }
  };

  const handleAdjustPriority = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setNewPriority(entry.priorityScore);
    setAdjustmentReason('');
    setAdjustPriorityDialog(true);
  };

  const handleSavePriority = async () => {
    if (!selectedEntry || !adjustmentReason.trim() || adjustmentReason.trim().length < 20) {
      toast.error('Please provide a reason (at least 20 characters)');
      return;
    }

    try {
      await api.put(`/admin/waitlist/${selectedEntry.id}/priority`, {
        newPriority,
        reason: adjustmentReason.trim(),
      });

      toast.success('Priority updated successfully');
      setAdjustPriorityDialog(false);
      fetchEntries();
      fetchStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update priority');
    }
  };

  const handleOfferSlot = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setOfferData({
      clinicianId: entry.clinicianPreference || '',
      dateTime: null,
      appointmentType: entry.appointmentType,
      duration: 60,
      expiresIn: 24,
      sendEmail: true,
      sendSMS: false,
    });
    setOfferSlotDialog(true);
  };

  const handleSendOffer = async () => {
    if (!selectedEntry || !offerData.clinicianId || !offerData.dateTime || !offerData.appointmentType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (offerData.dateTime.isBefore(dayjs())) {
      toast.error('Slot date/time must be in the future');
      return;
    }

    try {
      await api.post(`/admin/waitlist/${selectedEntry.id}/offer`, {
        clinicianId: offerData.clinicianId,
        slotDateTime: offerData.dateTime.toISOString(),
        appointmentType: offerData.appointmentType,
        duration: offerData.duration,
        expiresInHours: offerData.expiresIn,
        sendEmail: offerData.sendEmail,
        sendSMS: offerData.sendSMS,
      });

      toast.success('Slot offer sent successfully');
      setOfferSlotDialog(false);
      fetchEntries();
      fetchStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send slot offer');
    }
  };

  const handleRemoveEntry = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setRemoveReason('');
    setRemoveReasonCategory('');
    setRemoveEntryDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedEntry || !removeReasonCategory || (removeReasonCategory === 'Other' && !removeReason.trim())) {
      toast.error('Please select/provide a reason');
      return;
    }

    try {
      await api.delete(`/admin/waitlist/${selectedEntry.id}`, {
        data: {
          reason: removeReasonCategory === 'Other' ? removeReason.trim() : removeReasonCategory,
        },
      });

      toast.success('Entry removed successfully');
      setRemoveEntryDialog(false);
      fetchEntries();
      fetchStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove entry');
    }
  };

  const handleFindMatches = async () => {
    if (!matchSlot.clinicianId || !matchSlot.date || !matchSlot.time || !matchSlot.appointmentType) {
      toast.error('Please fill in all slot details');
      return;
    }

    try {
      const slotDateTime = dayjs(matchSlot.date)
        .hour(parseInt(matchSlot.time.split(':')[0]))
        .minute(parseInt(matchSlot.time.split(':')[1]));

      const response = await api.post('/admin/waitlist/find-matches', {
        clinicianId: matchSlot.clinicianId,
        slotDateTime: slotDateTime.toISOString(),
        appointmentType: matchSlot.appointmentType,
      });

      if (response.data.success) {
        setMatches(response.data.data.matches || []);
        toast.success(`Found ${response.data.data.matches?.length || 0} potential matches`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to find matches');
    }
  };

  const handleOfferFromMatch = (match: MatchResult) => {
    const entry = entries.find(e => e.clientId === match.clientId);
    if (entry) {
      setSelectedEntry(entry);

      const slotDateTime = dayjs(matchSlot.date)
        .hour(parseInt(matchSlot.time.split(':')[0]))
        .minute(parseInt(matchSlot.time.split(':')[1]));

      setOfferData({
        clinicianId: matchSlot.clinicianId,
        dateTime: slotDateTime,
        appointmentType: matchSlot.appointmentType,
        duration: 60,
        expiresIn: 24,
        sendEmail: true,
        sendSMS: false,
      });
      setMatchFinderDialog(false);
      setOfferSlotDialog(true);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setClinicianFilter(null);
    setAppointmentTypeFilter('');
    setStatusFilter('ACTIVE');
    setPriorityRange([0, 100]);
    setPage(1);
  };

  const calculateDaysWaiting = (joinedAt: string) => {
    return Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getPriorityColor = (score: number): 'default' | 'primary' | 'warning' | 'error' => {
    if (score >= 81) return 'error';
    if (score >= 61) return 'warning';
    if (score >= 31) return 'primary';
    return 'default';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 81) return 'Critical';
    if (score >= 61) return 'High';
    if (score >= 31) return 'Medium';
    return 'Low';
  };

  const getStatusColor = (status: string): 'success' | 'info' | 'warning' | 'error' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'MATCHED': return 'info';
      case 'CANCELLED': return 'warning';
      case 'EXPIRED': return 'error';
      default: return 'info';
    }
  };

  const handleSortChange = (field: 'priority' | 'wait' | 'joined' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'priority' || field === 'wait' ? 'desc' : 'asc');
    }
  };

  const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (clinicianFilter) count++;
    if (appointmentTypeFilter) count++;
    if (statusFilter !== 'ACTIVE') count++;
    if (priorityRange[0] > 0 || priorityRange[1] < 100) count++;
    return count;
  }, [searchQuery, clinicianFilter, appointmentTypeFilter, statusFilter, priorityRange]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <People sx={{ fontSize: 48 }} />
              <Box>
                <Typography variant="h3" component="h1" fontWeight="bold">
                  Waitlist Management
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                  Manage entries, adjust priorities, and offer available slots
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Search />}
              onClick={() => setMatchFinderDialog(true)}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                fontWeight: 'bold',
              }}
            >
              Match Finder
            </Button>
          </Box>
        </Box>

        {/* Statistics Dashboard */}
        {statistics && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center' }}>
                      <People sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h3" fontWeight="bold">
                        {statistics.totalActive}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Active Entries
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center' }}>
                      <AccessTime sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h3" fontWeight="bold">
                        {statistics.averageWaitDays}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Avg Wait (days)
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center' }}>
                      <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h3" fontWeight="bold">
                        {statistics.matchRate}%
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Match Rate
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center' }}>
                      <PriorityHigh sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h3" fontWeight="bold">
                        {statistics.highPriorityCount}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        High Priority
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center' }}>
                      <Pending sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h3" fontWeight="bold">
                        {statistics.pendingOffers}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Pending Offers
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Entries by Appointment Type
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statistics.byAppointmentType}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.type}: ${entry.count}`}
                        >
                          {statistics.byAppointmentType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Priority Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statistics.priorityDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#667eea" name="Entries" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge badgeContent={activeFilterCount} color="primary">
                  <FilterList />
                </Badge>
                <Typography variant="h6" fontWeight="bold">
                  Filters
                </Typography>
              </Box>
              {activeFilterCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleResetFilters}
                >
                  Clear All
                </Button>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Client"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter client name..."
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Autocomplete
                  size="small"
                  options={clinicians}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={clinicianFilter}
                  onChange={(event, newValue) => setClinicianFilter(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Clinician Preference" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Appointment Type</InputLabel>
                  <Select
                    value={appointmentTypeFilter}
                    label="Appointment Type"
                    onChange={(e) => setAppointmentTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {appointmentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="MATCHED">Matched</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Priority Range: {priorityRange[0]} - {priorityRange[1]}
                  </Typography>
                  <Slider
                    value={priorityRange}
                    onChange={(e, newValue) => setPriorityRange(newValue as number[])}
                    valueLabelDisplay="auto"
                    min={0}
                    max={100}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                    ]}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Waitlist Entries Table */}
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={48} />
              </Box>
            ) : entries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <People sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No waitlist entries found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeFilterCount > 0
                    ? 'Try adjusting your filters to see more results.'
                    : 'Waitlist entries will appear here once clients join.'}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f9fafb' }}>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'name'}
                            direction={sortBy === 'name' ? sortOrder : 'asc'}
                            onClick={() => handleSortChange('name')}
                          >
                            <strong>Client</strong>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <strong>Clinician</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Appt Type</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Preferences</strong>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'priority'}
                            direction={sortBy === 'priority' ? sortOrder : 'asc'}
                            onClick={() => handleSortChange('priority')}
                          >
                            <strong>Priority</strong>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'wait'}
                            direction={sortBy === 'wait' ? sortOrder : 'asc'}
                            onClick={() => handleSortChange('wait')}
                          >
                            <strong>Days Waiting</strong>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <strong>Status</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Actions</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: '#667eea',
                                  width: 36,
                                  height: 36,
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                }}
                              >
                                {entry.client.firstName[0]}
                                {entry.client.lastName[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {entry.client.firstName} {entry.client.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  MRN: {entry.client.medicalRecordNumber}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {entry.clinicianPreference
                                ? `${entry.clinician?.firstName} ${entry.clinician?.lastName}`
                                : 'Any'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{entry.appointmentType}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {entry.preferredDays.slice(0, 3).map((day) => (
                                  <Chip key={day} label={day.slice(0, 3)} size="small" />
                                ))}
                                {entry.preferredDays.length > 3 && (
                                  <Chip label={`+${entry.preferredDays.length - 3}`} size="small" />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {entry.preferredTimes.map((time) => (
                                  <Chip key={time} label={time} size="small" color="primary" />
                                ))}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${entry.priorityScore} - ${getPriorityLabel(entry.priorityScore)}`}
                              color={getPriorityColor(entry.priorityScore)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {calculateDaysWaiting(entry.joinedAt)} days
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.status}
                              color={getStatusColor(entry.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Adjust Priority">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleAdjustPriority(entry)}
                                disabled={entry.status !== 'ACTIVE'}
                              >
                                <AdjustIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Offer Slot">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOfferSlot(entry)}
                                disabled={entry.status !== 'ACTIVE'}
                              >
                                <Send />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveEntry(entry)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                    size="large"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Adjust Priority Dialog */}
        <Dialog
          open={adjustPriorityDialog}
          onClose={() => setAdjustPriorityDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              Adjust Priority Score
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Current priority: <strong>{selectedEntry?.priorityScore}</strong>
                <br />
                Base score (urgency + flexibility): Calculated automatically
                <br />
                Manual adjustment will override automatic calculations
              </Alert>

              <Typography variant="body2" gutterBottom>
                New Priority: {newPriority}
              </Typography>
              <Slider
                value={newPriority}
                onChange={(e, value) => setNewPriority(value as number)}
                min={0}
                max={100}
                marks={[
                  { value: 0, label: 'Low' },
                  { value: 50, label: 'Medium' },
                  { value: 100, label: 'Critical' },
                ]}
                valueLabelDisplay="auto"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Adjustment"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Why are you manually adjusting this priority?"
                required
                helperText={`${adjustmentReason.length}/20 characters minimum`}
                sx={{ mt: 3 }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setAdjustPriorityDialog(false)} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSavePriority}
              variant="contained"
              disabled={adjustmentReason.trim().length < 20}
            >
              Save Priority
            </Button>
          </DialogActions>
        </Dialog>

        {/* Offer Slot Dialog */}
        <Dialog
          open={offerSlotDialog}
          onClose={() => setOfferSlotDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              Offer Appointment Slot
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Client: {selectedEntry?.client.firstName} {selectedEntry?.client.lastName}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 2 }}>
              <Grid item xs={12}>
                <Autocomplete
                  options={clinicians}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={clinicians.find((c) => c.id === offerData.clinicianId) || null}
                  onChange={(event, newValue) =>
                    setOfferData((prev) => ({ ...prev, clinicianId: newValue?.id || '' }))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Clinician" required />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <DateTimePicker
                  label="Date & Time"
                  value={offerData.dateTime}
                  onChange={(newValue) =>
                    setOfferData((prev) => ({ ...prev, dateTime: newValue }))
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Appointment Type</InputLabel>
                  <Select
                    value={offerData.appointmentType}
                    label="Appointment Type"
                    onChange={(e) =>
                      setOfferData((prev) => ({ ...prev, appointmentType: e.target.value }))
                    }
                  >
                    {appointmentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (minutes)"
                  value={offerData.duration}
                  onChange={(e) =>
                    setOfferData((prev) => ({ ...prev, duration: parseInt(e.target.value) }))
                  }
                  inputProps={{ min: 15, max: 180, step: 15 }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Offer Expires In (hours)"
                  value={offerData.expiresIn}
                  onChange={(e) =>
                    setOfferData((prev) => ({ ...prev, expiresIn: parseInt(e.target.value) }))
                  }
                  inputProps={{ min: 1, max: 72 }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Notifications
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={offerData.sendEmail}
                      onChange={(e) =>
                        setOfferData((prev) => ({ ...prev, sendEmail: e.target.checked }))
                      }
                    />
                  }
                  label="Send Email Notification"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={offerData.sendSMS}
                      onChange={(e) =>
                        setOfferData((prev) => ({ ...prev, sendSMS: e.target.checked }))
                      }
                    />
                  }
                  label="Send SMS Notification"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOfferSlotDialog(false)} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleSendOffer} variant="contained" startIcon={<Send />}>
              Send Offer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Remove Entry Dialog */}
        <Dialog
          open={removeEntryDialog}
          onClose={() => setRemoveEntryDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              Remove Waitlist Entry
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography gutterBottom>
                Are you sure you want to remove{' '}
                <strong>
                  {selectedEntry?.client.firstName} {selectedEntry?.client.lastName}
                </strong>{' '}
                from the waitlist?
              </Typography>

              <FormControl fullWidth sx={{ mt: 3 }} required>
                <InputLabel>Reason</InputLabel>
                <Select
                  value={removeReasonCategory}
                  label="Reason"
                  onChange={(e) => setRemoveReasonCategory(e.target.value)}
                >
                  {removeCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {removeReasonCategory === 'Other' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Specify Reason"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  sx={{ mt: 2 }}
                  required
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setRemoveEntryDialog(false)} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRemove}
              variant="contained"
              color="error"
              disabled={
                !removeReasonCategory ||
                (removeReasonCategory === 'Other' && !removeReason.trim())
              }
            >
              Remove Entry
            </Button>
          </DialogActions>
        </Dialog>

        {/* Match Finder Dialog */}
        <Dialog
          open={matchFinderDialog}
          onClose={() => setMatchFinderDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              Slot Match Finder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find best matches for an available appointment slot
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 2, mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={clinicians}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  value={clinicians.find((c) => c.id === matchSlot.clinicianId) || null}
                  onChange={(event, newValue) =>
                    setMatchSlot((prev) => ({ ...prev, clinicianId: newValue?.id || '' }))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Clinician" required />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Appointment Type</InputLabel>
                  <Select
                    value={matchSlot.appointmentType}
                    label="Appointment Type"
                    onChange={(e) =>
                      setMatchSlot((prev) => ({ ...prev, appointmentType: e.target.value }))
                    }
                  >
                    {appointmentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Date"
                  value={matchSlot.date}
                  onChange={(newValue) =>
                    setMatchSlot((prev) => ({ ...prev, date: newValue }))
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Time"
                  value={matchSlot.time}
                  onChange={(e) =>
                    setMatchSlot((prev) => ({ ...prev, time: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<Search />}
                  onClick={handleFindMatches}
                >
                  Find Matches
                </Button>
              </Grid>
            </Grid>

            {matches.length > 0 && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Top {matches.length} Matches
                  </Typography>
                </Divider>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f9fafb' }}>
                        <TableCell><strong>Rank</strong></TableCell>
                        <TableCell><strong>Client</strong></TableCell>
                        <TableCell><strong>Match Score</strong></TableCell>
                        <TableCell><strong>Priority</strong></TableCell>
                        <TableCell><strong>Days Waiting</strong></TableCell>
                        <TableCell align="right"><strong>Action</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {matches.map((match, index) => (
                        <TableRow key={match.clientId} hover>
                          <TableCell>
                            <Chip
                              label={`#${index + 1}`}
                              color={index === 0 ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {match.clientName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip
                              title={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Clinician: {match.breakdown.clinicianMatch}/30
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Type: {match.breakdown.appointmentTypeMatch}/20
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Day: {match.breakdown.dayPreference}/20
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Time: {match.breakdown.timePreference}/15
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Priority: {match.breakdown.priorityBonus}/15
                                  </Typography>
                                </Box>
                              }
                            >
                              <Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={match.score}
                                  sx={{ mb: 0.5 }}
                                />
                                <Typography variant="body2" fontWeight={600}>
                                  {match.score}/100
                                </Typography>
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={match.priorityScore}
                              color={getPriorityColor(match.priorityScore)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{match.daysWaiting} days</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Send />}
                              onClick={() => handleOfferFromMatch(match)}
                            >
                              Offer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setMatchFinderDialog(false)} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}
