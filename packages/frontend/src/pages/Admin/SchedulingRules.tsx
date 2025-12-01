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
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  CircularProgress,
  Avatar,
  Autocomplete,
  Radio,
  RadioGroup,
  FormLabel,
  Divider,
  TableSortLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Business,
  Person,
  Schedule,
  CheckCircle,
  Settings,
  FilterList,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

/**
 * Module 7: Enhanced Admin Scheduling Rules Interface
 *
 * Complete management interface for organization-wide and clinician-specific scheduling rules
 * with statistics, advanced filtering, and comprehensive rule configuration
 */

interface SchedulingRule {
  id: string;
  clinicianId: string | null;
  clinician?: {
    id: string;
    firstName: string;
    lastName: string;
    title?: string;
  };
  maxAdvanceBookingDays: number;
  minNoticeHours: number;
  cancellationWindowHours: number;
  allowWeekends: boolean;
  allowedDays: string[];
  blockoutPeriods: BlockoutPeriod[];
  slotDuration: number;
  bufferTime: number;
  maxDailyAppointments: number | null;
  autoConfirm: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlockoutPeriod {
  startDate: string;
  endDate: string;
  reason: string;
}

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

interface RuleFormData {
  clinicianId: string | null;
  maxAdvanceBookingDays: number;
  minNoticeHours: number;
  cancellationWindowHours: number;
  allowWeekends: boolean;
  allowedDays: string[];
  blockoutPeriods: BlockoutPeriod[];
  slotDuration: number;
  bufferTime: number;
  maxDailyAppointments: number | null;
  autoConfirm: boolean;
  isActive: boolean;
}

interface RuleStatistics {
  totalRules: number;
  activeRules: number;
  cliniciansWithRules: number;
  defaultRulesApplied: number;
}

export default function SchedulingRules() {
  // Data state
  const [rules, setRules] = useState<SchedulingRule[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [statistics, setStatistics] = useState<RuleStatistics>({
    totalRules: 0,
    activeRules: 0,
    cliniciansWithRules: 0,
    defaultRulesApplied: 0,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<SchedulingRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<SchedulingRule | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'org-wide' | 'clinician-specific'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'type' | 'clinician' | 'created'>('type');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formData, setFormData] = useState<RuleFormData>({
    clinicianId: null,
    maxAdvanceBookingDays: 30,
    minNoticeHours: 24,
    cancellationWindowHours: 24,
    allowWeekends: false,
    allowedDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    blockoutPeriods: [],
    slotDuration: 60,
    bufferTime: 0,
    maxDailyAppointments: null,
    autoConfirm: false,
    isActive: true,
  });

  // Blockout form state
  const [newBlockout, setNewBlockout] = useState<{
    startDate: Dayjs | null;
    endDate: Dayjs | null;
    reason: string;
  }>({
    startDate: null,
    endDate: null,
    reason: '',
  });

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const slotDurations = [15, 30, 45, 60, 90, 120];
  const bufferTimes = [0, 5, 10, 15, 30];

  useEffect(() => {
    fetchRules();
    fetchClinicians();
  }, []);

  useEffect(() => {
    calculateStatistics();
  }, [rules, clinicians]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/scheduling-rules');
      if (response.data.success) {
        setRules(response.data.data);
      }
    } catch (error: any) {
      toast.error('Failed to load scheduling rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicians = async () => {
    try {
      const response = await api.get('/users', { params: { role: 'CLINICIAN' } });
      if (response.data.success) {
        setClinicians(response.data.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load clinicians');
    }
  };

  const calculateStatistics = () => {
    const totalRules = rules.length;
    const activeRules = rules.filter((r) => r.isActive).length;
    const cliniciansWithRules = new Set(
      rules.filter((r) => r.clinicianId).map((r) => r.clinicianId)
    ).size;
    const defaultRulesApplied = clinicians.length - cliniciansWithRules;

    setStatistics({
      totalRules,
      activeRules,
      cliniciansWithRules,
      defaultRulesApplied,
    });
  };

  const handleOpenModal = (rule?: SchedulingRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        clinicianId: rule.clinicianId,
        maxAdvanceBookingDays: rule.maxAdvanceBookingDays,
        minNoticeHours: rule.minNoticeHours,
        cancellationWindowHours: rule.cancellationWindowHours,
        allowWeekends: rule.allowWeekends,
        allowedDays: rule.allowedDays,
        blockoutPeriods: rule.blockoutPeriods || [],
        slotDuration: rule.slotDuration,
        bufferTime: rule.bufferTime,
        maxDailyAppointments: rule.maxDailyAppointments,
        autoConfirm: rule.autoConfirm,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setFormData({
        clinicianId: null,
        maxAdvanceBookingDays: 30,
        minNoticeHours: 24,
        cancellationWindowHours: 24,
        allowWeekends: false,
        allowedDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        blockoutPeriods: [],
        slotDuration: 60,
        bufferTime: 0,
        maxDailyAppointments: null,
        autoConfirm: false,
        isActive: true,
      });
    }
    setNewBlockout({ startDate: null, endDate: null, reason: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRule(null);
  };

  const validateForm = (): string | null => {
    if (formData.allowedDays.length === 0) {
      return 'Please select at least one allowed day';
    }
    if (formData.minNoticeHours >= formData.maxAdvanceBookingDays * 24) {
      return 'Minimum notice must be less than maximum advance booking';
    }
    if (formData.maxDailyAppointments !== null && formData.maxDailyAppointments < 1) {
      return 'Maximum daily appointments must be at least 1';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        ...formData,
        blockoutPeriods: formData.blockoutPeriods.map((bp) => ({
          startDate: bp.startDate,
          endDate: bp.endDate,
          reason: bp.reason,
        })),
      };

      if (editingRule) {
        await api.put(`/scheduling-rules/${editingRule.id}`, payload);
        toast.success('Scheduling rule updated successfully');
      } else {
        await api.post('/scheduling-rules', payload);
        toast.success('Scheduling rule created successfully');
      }

      handleCloseModal();
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save scheduling rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (rule: SchedulingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      await api.delete(`/scheduling-rules/${ruleToDelete.id}`);
      toast.success('Scheduling rule deleted successfully');
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete scheduling rule');
    }
  };

  const handleToggleActive = async (rule: SchedulingRule) => {
    try {
      await api.put(`/scheduling-rules/${rule.id}`, {
        ...rule,
        blockoutPeriods: rule.blockoutPeriods || [],
        isActive: !rule.isActive,
      });
      toast.success(`Rule ${!rule.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update rule status');
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter((d) => d !== day)
        : [...prev.allowedDays, day],
    }));
  };

  const handleAddBlockout = () => {
    if (!newBlockout.startDate || !newBlockout.endDate || !newBlockout.reason.trim()) {
      toast.error('Please fill in all blockout period fields');
      return;
    }

    if (newBlockout.endDate.isBefore(newBlockout.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      blockoutPeriods: [
        ...prev.blockoutPeriods,
        {
          startDate: newBlockout.startDate!.format('YYYY-MM-DD'),
          endDate: newBlockout.endDate!.format('YYYY-MM-DD'),
          reason: newBlockout.reason.trim(),
        },
      ],
    }));

    setNewBlockout({ startDate: null, endDate: null, reason: '' });
  };

  const handleRemoveBlockout = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      blockoutPeriods: prev.blockoutPeriods.filter((_, i) => i !== index),
    }));
  };

  // Filter and sort rules
  const filteredAndSortedRules = useMemo(() => {
    let filtered = [...rules];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((rule) => {
        if (!rule.clinicianId) return 'Organization-Wide'.toLowerCase().includes(searchQuery.toLowerCase());
        const clinicianName = `${rule.clinician?.firstName} ${rule.clinician?.lastName}`.toLowerCase();
        return clinicianName.includes(searchQuery.toLowerCase());
      });
    }

    // Apply type filter
    if (typeFilter === 'org-wide') {
      filtered = filtered.filter((rule) => !rule.clinicianId);
    } else if (typeFilter === 'clinician-specific') {
      filtered = filtered.filter((rule) => rule.clinicianId);
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((rule) => rule.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((rule) => !rule.isActive);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'type') {
        const aType = a.clinicianId ? 1 : 0;
        const bType = b.clinicianId ? 1 : 0;
        comparison = aType - bType;
      } else if (sortBy === 'clinician') {
        const aName = a.clinicianId
          ? `${a.clinician?.firstName} ${a.clinician?.lastName}`
          : 'All Clinicians';
        const bName = b.clinicianId
          ? `${b.clinician?.firstName} ${b.clinician?.lastName}`
          : 'All Clinicians';
        comparison = aName.localeCompare(bName);
      } else if (sortBy === 'created') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [rules, searchQuery, typeFilter, statusFilter, sortBy, sortOrder]);

  const handleSortChange = (field: 'type' | 'clinician' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Settings sx={{ fontSize: 48 }} />
              <Box>
                <Typography variant="h3" component="h1" fontWeight="bold">
                  Scheduling Rules
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                  Configure self-scheduling parameters for your organization
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => handleOpenModal()}
              sx={{
                bgcolor: 'white',
                color: '#10b981',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                fontWeight: 'bold',
              }}
            >
              Create Rule
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <Schedule sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {statistics.totalRules}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Rules
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <CheckCircle sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {statistics.activeRules}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Active Rules
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <Person sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {statistics.cliniciansWithRules}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Custom Rules
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{xs: 12, sm: 6, md: 3}}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    <Business sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {statistics.defaultRulesApplied}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Default Rules
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FilterList />
              <Typography variant="h6" fontWeight="bold">
                Filters
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{xs: 12, md: 4}}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by Clinician"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter clinician name..."
                />
              </Grid>
              <Grid size={{xs: 12, md: 4}}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rule Type</InputLabel>
                  <Select
                    value={typeFilter}
                    label="Rule Type"
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="org-wide">Organization-Wide</MenuItem>
                    <MenuItem value="clinician-specific">Clinician-Specific</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{xs: 12, md: 4}}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={48} />
              </Box>
            ) : filteredAndSortedRules.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Settings sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No scheduling rules found
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Create your first scheduling rule to enable self-scheduling'}
                </Typography>
                {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenModal()}
                  >
                    Create Rule
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f9fafb' }}>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'type'}
                          direction={sortBy === 'type' ? sortOrder : 'asc'}
                          onClick={() => handleSortChange('type')}
                        >
                          <strong>Rule Type</strong>
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'clinician'}
                          direction={sortBy === 'clinician' ? sortOrder : 'asc'}
                          onClick={() => handleSortChange('clinician')}
                        >
                          <strong>Clinician</strong>
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <strong>Advance Booking</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Min Notice</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Cancel Window</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Slot Duration</strong>
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
                    {filteredAndSortedRules.map((rule) => (
                      <TableRow key={rule.id} hover>
                        <TableCell>
                          <Chip
                            label={rule.clinicianId ? 'Clinician-Specific' : 'Organization-Wide'}
                            color={rule.clinicianId ? 'secondary' : 'primary'}
                            size="small"
                            icon={rule.clinicianId ? <Person /> : <Business />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {rule.clinicianId
                              ? `${rule.clinician?.firstName} ${rule.clinician?.lastName}`
                              : 'All Clinicians'}
                          </Typography>
                          {rule.clinician?.title && (
                            <Typography variant="caption" color="text.secondary">
                              {rule.clinician.title}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{rule.maxAdvanceBookingDays} days</TableCell>
                        <TableCell>{rule.minNoticeHours} hours</TableCell>
                        <TableCell>{rule.cancellationWindowHours} hours</TableCell>
                        <TableCell>{rule.slotDuration} min</TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={rule.isActive}
                                onChange={() => handleToggleActive(rule)}
                                color="success"
                              />
                            }
                            label={rule.isActive ? 'Active' : 'Inactive'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenModal(rule)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(rule)}
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
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Rule Dialog */}
        <Dialog
          open={showModal}
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h5" fontWeight="bold">
              {editingRule ? 'Edit Scheduling Rule' : 'Create Scheduling Rule'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Configure parameters for self-scheduling appointments
            </Typography>
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={3}>
                {/* Rule Type */}
                <Grid size={{xs: 12}}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Rule Type</FormLabel>
                    <RadioGroup
                      row
                      value={formData.clinicianId ? 'clinician' : 'org'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          clinicianId: e.target.value === 'org' ? null : prev.clinicianId || '',
                        }))
                      }
                    >
                      <FormControlLabel
                        value="org"
                        control={<Radio />}
                        label="Organization-Wide (applies to all clinicians)"
                      />
                      <FormControlLabel
                        value="clinician"
                        control={<Radio />}
                        label="Clinician-Specific"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Clinician Selection */}
                {formData.clinicianId !== null && (
                  <Grid size={{xs: 12}}>
                    <Autocomplete
                      options={clinicians}
                      getOptionLabel={(option) =>
                        `${option.firstName} ${option.lastName}${option.title ? ` (${option.title})` : ''}`
                      }
                      value={
                        clinicians.find((c) => c.id === formData.clinicianId) || null
                      }
                      onChange={(event, newValue) =>
                        setFormData((prev) => ({
                          ...prev,
                          clinicianId: newValue?.id || null,
                        }))
                      }
                      disabled={!!editingRule}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Clinician"
                          required={formData.clinicianId !== null}
                        />
                      )}
                    />
                  </Grid>
                )}

                <Grid size={{xs: 12}}>
                  <Divider>
                    <Typography variant="body2" color="text.secondary">
                      Booking Window
                    </Typography>
                  </Divider>
                </Grid>

                {/* Booking Restrictions */}
                <Grid size={{xs: 12, md: 4}}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Advance Booking (days)"
                    value={formData.maxAdvanceBookingDays}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxAdvanceBookingDays: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 1, max: 365 }}
                    required
                  />
                </Grid>

                <Grid size={{xs: 12, md: 4}}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Min Notice (hours)"
                    value={formData.minNoticeHours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minNoticeHours: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 0, max: 168 }}
                    required
                  />
                </Grid>

                <Grid size={{xs: 12, md: 4}}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Cancellation Window (hours)"
                    value={formData.cancellationWindowHours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cancellationWindowHours: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 0, max: 168 }}
                    required
                    helperText="Clients cannot cancel within this window"
                  />
                </Grid>

                <Grid size={{xs: 12}}>
                  <Divider>
                    <Typography variant="body2" color="text.secondary">
                      Appointment Slots
                    </Typography>
                  </Divider>
                </Grid>

                {/* Slot Configuration */}
                <Grid size={{xs: 12, md: 4}}>
                  <FormControl fullWidth required>
                    <InputLabel>Slot Duration</InputLabel>
                    <Select
                      value={formData.slotDuration}
                      label="Slot Duration"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          slotDuration: e.target.value as number,
                        }))
                      }
                    >
                      {slotDurations.map((duration) => (
                        <MenuItem key={duration} value={duration}>
                          {duration} minutes
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{xs: 12, md: 4}}>
                  <FormControl fullWidth required>
                    <InputLabel>Buffer Time</InputLabel>
                    <Select
                      value={formData.bufferTime}
                      label="Buffer Time"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bufferTime: e.target.value as number,
                        }))
                      }
                    >
                      {bufferTimes.map((buffer) => (
                        <MenuItem key={buffer} value={buffer}>
                          {buffer} minutes
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{xs: 12, md: 4}}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Daily Appointments"
                    value={formData.maxDailyAppointments || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxDailyAppointments: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                    inputProps={{ min: 1, max: 20 }}
                    placeholder="Unlimited"
                    helperText="Leave empty for unlimited"
                  />
                </Grid>

                <Grid size={{xs: 12}}>
                  <Divider>
                    <Typography variant="body2" color="text.secondary">
                      Availability Settings
                    </Typography>
                  </Divider>
                </Grid>

                {/* Allowed Days */}
                <Grid size={{xs: 12}}>
                  <FormLabel component="legend">Allowed Days *</FormLabel>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {daysOfWeek.map((day) => (
                      <Chip
                        key={day}
                        label={day.slice(0, 3)}
                        onClick={() => handleDayToggle(day)}
                        color={formData.allowedDays.includes(day) ? 'primary' : 'default'}
                        variant={formData.allowedDays.includes(day) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Toggles */}
                <Grid size={{xs: 12, md: 6}}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowWeekends}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            allowWeekends: e.target.checked,
                          }))
                        }
                        color="primary"
                      />
                    }
                    label="Allow weekend appointments"
                  />
                </Grid>

                <Grid size={{xs: 12, md: 6}}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.autoConfirm}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            autoConfirm: e.target.checked,
                          }))
                        }
                        color="primary"
                      />
                    }
                    label="Auto-confirm bookings"
                  />
                </Grid>

                <Grid size={{xs: 12}}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        color="success"
                      />
                    }
                    label="Active"
                  />
                </Grid>

                <Grid size={{xs: 12}}>
                  <Divider>
                    <Typography variant="body2" color="text.secondary">
                      Blockout Periods
                    </Typography>
                  </Divider>
                </Grid>

                {/* Blockout Periods */}
                <Grid size={{xs: 12}}>
                  {formData.blockoutPeriods.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      {formData.blockoutPeriods.map((period, idx) => (
                        <Alert
                          key={idx}
                          severity="info"
                          onClose={() => handleRemoveBlockout(idx)}
                          sx={{ mb: 1 }}
                        >
                          <strong>{period.reason}</strong>: {period.startDate} to{' '}
                          {period.endDate}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  <Grid container spacing={2}>
                    <Grid size={{xs: 12, md: 4}}>
                      <DatePicker
                        label="Start Date"
                        value={newBlockout.startDate}
                        onChange={(newValue) =>
                          setNewBlockout((prev) => ({ ...prev, startDate: newValue }))
                        }
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                    </Grid>
                    <Grid size={{xs: 12, md: 4}}>
                      <DatePicker
                        label="End Date"
                        value={newBlockout.endDate}
                        onChange={(newValue) =>
                          setNewBlockout((prev) => ({ ...prev, endDate: newValue }))
                        }
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                    </Grid>
                    <Grid size={{xs: 12, md: 4}}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Reason"
                        value={newBlockout.reason}
                        onChange={(e) =>
                          setNewBlockout((prev) => ({ ...prev, reason: e.target.value }))
                        }
                        placeholder="e.g., Holiday, Vacation"
                      />
                    </Grid>
                  </Grid>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleAddBlockout}
                    sx={{ mt: 1 }}
                  >
                    Add Blockout Period
                  </Button>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
              <Button onClick={handleCloseModal} variant="outlined">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              Delete Scheduling Rule
            </Typography>
          </DialogTitle>
          <DialogContent>
            {ruleToDelete?.isActive && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This rule is currently active. Deleting it will affect scheduling
                availability.
              </Alert>
            )}
            <Typography>
              Are you sure you want to delete this scheduling rule for{' '}
              <strong>
                {ruleToDelete?.clinicianId
                  ? `${ruleToDelete.clinician?.firstName} ${ruleToDelete.clinician?.lastName}`
                  : 'all clinicians'}
              </strong>
              ?
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={2}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="contained" color="error">
              Delete Rule
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}
