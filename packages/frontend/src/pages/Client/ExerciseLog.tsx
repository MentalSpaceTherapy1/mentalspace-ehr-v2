import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  Slider,
  LinearProgress,
  Fab,
  Skeleton,
  Badge,
  Divider,
  Zoom,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  FitnessCenter as FitnessCenterIcon,
  DirectionsRun as DirectionsRunIcon,
  EmojiEvents as TrophyIcon,
  Replay as ReplayIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ExerciseActivityChart } from '../../components/charts/ExerciseActivityChart';
import { CalendarHeatmap } from '../../components/charts/CalendarHeatmap';
import { MoodCorrelationChart } from '../../components/charts/MoodCorrelationChart';
import api from '../../lib/api';
import dayjs from 'dayjs';
import Confetti from 'react-confetti';

// Types
interface ExerciseLog {
  id: string;
  clientId: string;
  activityType: string;
  durationMinutes: number;
  intensity: 'Low' | 'Moderate' | 'High';
  moodAfter?: number;
  notes?: string;
  loggedAt: string;
  createdAt: string;
}

interface ExerciseStats {
  totalMinutesThisWeek: number;
  totalSessionsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  progressToGoal: number;
}

// Custom Tooltip Props Interface for Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
  }>;
}

// Constants
const ACTIVITY_TYPES = [
  { value: 'Walking', emoji: '🚶', label: 'Walking' },
  { value: 'Running', emoji: '🏃', label: 'Running' },
  { value: 'Yoga', emoji: '🧘', label: 'Yoga' },
  { value: 'Gym/Weights', emoji: '🏋️', label: 'Gym/Weights' },
  { value: 'Cycling', emoji: '🚴', label: 'Cycling' },
  { value: 'Swimming', emoji: '🏊', label: 'Swimming' },
  { value: 'Sports', emoji: '⚽', label: 'Sports' },
  { value: 'Basketball', emoji: '🏀', label: 'Basketball' },
  { value: 'Baseball', emoji: '⚾', label: 'Baseball' },
  { value: 'Tennis', emoji: '🎾', label: 'Tennis' },
  { value: 'Volleyball', emoji: '🏐', label: 'Volleyball' },
  { value: 'Boxing/Martial Arts', emoji: '🥊', label: 'Boxing/Martial Arts' },
  { value: 'Climbing', emoji: '🧗', label: 'Climbing' },
  { value: 'Other', emoji: '🎿', label: 'Other' },
];

const INTENSITY_OPTIONS = [
  {
    value: 'Low',
    emoji: '🌱',
    label: 'Low',
    description: 'Light activity, can talk easily',
    color: '#4caf50',
  },
  {
    value: 'Moderate',
    emoji: '🔥',
    label: 'Moderate',
    description: 'Breathing hard, can still talk',
    color: '#ff9800',
  },
  {
    value: 'High',
    emoji: '⚡',
    label: 'High',
    description: "Very hard, can't hold conversation",
    color: '#f44336',
  },
];

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Very Poor' },
  { value: 2, emoji: '🙁', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Very Good' },
];

const ExerciseLog: React.FC = () => {
  // Get clientId from portal authentication
  const portalClient = JSON.parse(localStorage.getItem('portalClient') || '{}');
  const clientId = portalClient.id;

  // Form state
  const [activityType, setActivityType] = useState<string>('Walking');
  const [duration, setDuration] = useState<number>(30);
  const [intensity, setIntensity] = useState<'Low' | 'Moderate' | 'High'>('Moderate');
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Data state
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ExerciseLog[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // UI state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editingLog, setEditingLog] = useState<ExerciseLog | null>(null);
  const [filterActivityType, setFilterActivityType] = useState<string>('All');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(150);
  const [lastActivity, setLastActivity] = useState<ExerciseLog | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string>('');

  // Fetch data on mount
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filterActivityType, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setDataLoading(true);
      const response = await api.get(`/tracking/exercise/${clientId}?limit=100`);
      const logsData = response.data.data || [];
      setLogs(logsData);
      if (logsData.length > 0) {
        setLastActivity(logsData[0]);
      }
      generateWeeklyData(logsData);
      generateHeatmapData(logsData);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      showSnackbar('Failed to load exercise logs', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get stats for the last 30 days by default
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(30, 'days').format('YYYY-MM-DD');

      const response = await api.get(`/tracking/exercise/${clientId}/stats?startDate=${startDate}&endDate=${endDate}`);
      const statsData = response.data.data;
      setStats({
        ...statsData,
        weeklyGoal: weeklyGoal,
        progressToGoal: (statsData.totalMinutesThisWeek / weeklyGoal) * 100,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateWeeklyData = (logsData: ExerciseLog[]) => {
    const weekStart = dayjs().startOf('week').toDate();
    const weekEnd = dayjs().endOf('week').toDate();

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = daysOfWeek.map((day, index) => {
      const date = dayjs(weekStart).add(index, 'day');
      const dateStr = date.format('YYYY-MM-DD');

      const dayLogs = logsData.filter(log => dayjs(log.loggedAt).format('YYYY-MM-DD') === dateStr);
      const minutes = dayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
      const sessions = dayLogs.length;

      return {
        week: day,
        date: dateStr,
        minutes,
        sessions,
      };
    });

    setWeeklyData(weekData);
  };

  const generateHeatmapData = (logsData: ExerciseLog[]) => {
    const last90Days = Array.from({ length: 90 }, (_, i) => {
      const date = dayjs().subtract(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      const dayLogs = logsData.filter(log => dayjs(log.loggedAt).format('YYYY-MM-DD') === dateStr);
      const minutes = dayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

      return {
        date: dateStr,
        value: minutes,
        label: `${minutes} minutes`,
      };
    }).reverse();

    setHeatmapData(last90Days);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filterActivityType !== 'All') {
      filtered = filtered.filter(log => log.activityType === filterActivityType);
    }

    if (startDate) {
      filtered = filtered.filter(log => new Date(log.loggedAt) >= startDate.toDate());
    }

    if (endDate) {
      filtered = filtered.filter(log => new Date(log.loggedAt) <= endDate.toDate());
    }

    setFilteredLogs(filtered);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Map mood number to backend enum string
      const moodMap: { [key: number]: string } = {
        1: 'VERY_POOR',
        2: 'POOR',
        3: 'NEUTRAL',
        4: 'GOOD',
        5: 'VERY_GOOD',
      };
      
      // Map activity type to uppercase enum
      const activityTypeMap: { [key: string]: string } = {
        'Walking': 'WALKING',
        'Running': 'RUNNING',
        'Yoga': 'YOGA',
        'Gym/Weights': 'GYM',
        'Cycling': 'CYCLING',
        'Swimming': 'SWIMMING',
        'Sports': 'SPORTS',
        'Basketball': 'SPORTS',
        'Baseball': 'SPORTS',
        'Tennis': 'SPORTS',
        'Volleyball': 'SPORTS',
        'Boxing/Martial Arts': 'MARTIAL_ARTS',
        'Climbing': 'HIKING',
        'Other': 'OTHER',
      };
      
      // Map intensity to uppercase enum
      const intensityMap: { [key: string]: string } = {
        'Low': 'LOW',
        'Moderate': 'MODERATE',
        'High': 'HIGH',
      };
      
      const data = {
        activityType: activityTypeMap[activityType] || activityType.toUpperCase(),
        duration: duration, // Backend expects 'duration', not 'durationMinutes'
        intensity: intensityMap[intensity] || intensity.toUpperCase(),
        mood: moodAfter ? moodMap[moodAfter] : undefined, // Map number to enum string
        notes: notes || undefined,
      };

      if (editingLog) {
        await api.put(`/tracking/exercise/log/${editingLog.id}`, data);
        showSnackbar('Exercise log updated successfully', 'success');
      } else {
        await api.post(`/tracking/exercise/${clientId}`, data);
        showSnackbar('Exercise logged successfully', 'success');
        checkStreakMilestone();
      }

      resetForm();
      fetchLogs();
      fetchStats();
    } catch (error: any) {
      console.error('Error submitting log:', error);
      showSnackbar(error.response?.data?.message || 'Failed to save exercise log', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLog = () => {
    if (!lastActivity) {
      showSnackbar('No previous activity to repeat', 'error');
      return;
    }

    setActivityType(lastActivity.activityType);
    setDuration(lastActivity.durationMinutes);
    setIntensity(lastActivity.intensity);
    setMoodAfter(lastActivity.moodAfter || null);
    setNotes('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!logToDelete) return;

    try {
      await api.delete(`/tracking/exercise/log/${logToDelete}`);
      showSnackbar('Exercise log deleted', 'success');
      setLogs(logs.filter(log => log.id !== logToDelete));
      setDeleteDialogOpen(false);
      setLogToDelete(null);
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting log:', error);
      showSnackbar('Failed to delete log', 'error');
    }
  };

  const handleEdit = (log: ExerciseLog) => {
    setEditingLog(log);
    setActivityType(log.activityType);
    setDuration(log.durationMinutes);
    setIntensity(log.intensity);
    setMoodAfter(log.moodAfter || null);
    setNotes(log.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setActivityType('Walking');
    setDuration(30);
    setIntensity('Moderate');
    setMoodAfter(null);
    setNotes('');
    setEditingLog(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const checkStreakMilestone = () => {
    if (stats) {
      const milestones = [3, 7, 14, 30];
      const newStreak = stats.currentStreak + 1;

      if (milestones.includes(newStreak)) {
        setCelebrationMessage(`🎉 ${newStreak}-Day Streak! 🎉`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
  };

  const getActivityEmoji = (activity: string): string => {
    const activityObj = ACTIVITY_TYPES.find(a => a.value === activity);
    return activityObj?.emoji || '🏃';
  };

  const getIntensityColor = (intensity: string): string => {
    const intensityObj = INTENSITY_OPTIONS.find(i => i.value === intensity);
    return intensityObj?.color || '#4caf50';
  };

  const getMoodEmoji = (mood: number): string => {
    const moodOption = MOOD_OPTIONS.find(m => m.value === mood);
    return moodOption?.emoji || '😐';
  };

  // Activity breakdown for pie chart
  const getActivityBreakdown = () => {
    const breakdown: { [key: string]: number } = {};
    filteredLogs.forEach(log => {
      breakdown[log.activityType] = (breakdown[log.activityType] || 0) + log.durationMinutes;
    });

    return Object.entries(breakdown)
      .map(([activity, minutes]) => ({
        name: activity,
        value: minutes,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const COLORS = ['#4caf50', '#66bb6a', '#81c784', '#ff9800', '#ffb74d', '#ffa726', '#43a047', '#7cb342'];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4, pb: 10 }}>
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

        {/* Header - Fitness Energy Theme */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 25%, #ff9800 75%, #ffa726 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(76, 175, 80, 0.4)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  p: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontSize: 40 }}>💪</Typography>
              </Box>
              <Box>
                <Typography variant="h3" fontWeight="800" gutterBottom sx={{ mb: 0 }}>
                  Exercise Log 🏃
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 300 }}>
                  Track your physical activity and build healthy exercise habits
                </Typography>
              </Box>
            </Box>
            {stats && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
                <Chip
                  label={`🔥 ${stats.currentStreak} Day Streak`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    backdropFilter: 'blur(10px)',
                    px: 1,
                  }}
                />
                <Chip
                  label={`${stats.totalMinutesThisWeek} min this week`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Chip
                  label={`${logs.length} Total Activities`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>

        {celebrationMessage && (
          <Alert severity="success" sx={{ mb: 3, fontSize: '1.2rem', fontWeight: 'bold' }}>
            {celebrationMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Quick Entry Form */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)',
                border: '1px solid',
                borderColor: 'rgba(76, 175, 80, 0.1)',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                  p: 2,
                  color: 'white',
                }}
              >
                <Typography variant="h6" fontWeight="700">
                  {editingLog ? '✏️ Edit Exercise Log' : '⚡ Quick Entry'}
                </Typography>
              </Box>
              <CardContent sx={{ pt: 3 }}>

                <Grid container spacing={2}>
                  {/* Activity Type */}
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Activity Type</InputLabel>
                      <Select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        label="Activity Type"
                      >
                        {ACTIVITY_TYPES.map((activity) => (
                          <MenuItem key={activity.value} value={activity.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <span>{activity.emoji}</span>
                              <span>{activity.label}</span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Duration */}
                  <Grid size={{ xs: 12 }}>
                    <Typography gutterBottom>
                      Duration: {duration} minutes
                    </Typography>
                    <Slider
                      value={duration}
                      onChange={(_, value) => setDuration(value as number)}
                      min={5}
                      max={120}
                      step={5}
                      marks={[
                        { value: 5, label: '5m' },
                        { value: 30, label: '30m' },
                        { value: 60, label: '1h' },
                        { value: 120, label: '2h' },
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Grid>

                  {/* Intensity */}
                  <Grid size={{ xs: 12 }}>
                    <Typography gutterBottom>Intensity</Typography>
                    <Grid container spacing={1}>
                      {INTENSITY_OPTIONS.map((option) => (
                        <Grid size={{ xs: 12 }} key={option.value}>
                          <Button
                            fullWidth
                            variant={intensity === option.value ? 'contained' : 'outlined'}
                            onClick={() => setIntensity(option.value as any)}
                            sx={{
                              justifyContent: 'flex-start',
                              py: 2,
                              bgcolor: intensity === option.value ? option.color : 'transparent',
                              borderColor: option.color,
                              color: intensity === option.value ? 'white' : option.color,
                              '&:hover': {
                                bgcolor: intensity === option.value ? option.color : `${option.color}22`,
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6">{option.emoji}</Typography>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {option.label}
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {option.description}
                              </Typography>
                            </Box>
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

                  {/* Mood After */}
                  <Grid size={{ xs: 12 }}>
                    <Typography gutterBottom>Mood After Exercise</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {MOOD_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant={moodAfter === option.value ? 'contained' : 'outlined'}
                          onClick={() => setMoodAfter(option.value)}
                          sx={{
                            minWidth: '50px',
                            fontSize: '20px',
                            flexDirection: 'column',
                            py: 1,
                          }}
                        >
                          <span>{option.emoji}</span>
                        </Button>
                      ))}
                    </Box>
                  </Grid>

                  {/* Notes */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Notes"
                      placeholder="How did you feel?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Grid>

                  {/* Actions */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {editingLog && (
                        <Button variant="outlined" onClick={resetForm} fullWidth>
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon />}
                        fullWidth
                      >
                        {submitting ? 'Saving...' : editingLog ? 'Update' : 'Log Exercise'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* This Week Stats */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  This Week
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                      <Typography variant="h3" color="primary">
                        {stats?.totalMinutesThisWeek || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Minutes
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                      <Typography variant="h3" color="secondary">
                        {stats?.totalSessionsThisWeek || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sessions
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                      <Typography variant="h3" color="warning.main">
                        {stats?.currentStreak || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Current Streak (days)
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                      <Typography variant="h3" color="success.main">
                        {stats?.longestStreak || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Longest Streak
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Weekly Goal Progress */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          Weekly Goal Progress
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {stats?.totalMinutesThisWeek || 0} / {weeklyGoal} min
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((stats?.progressToGoal || 0), 100)}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: stats && stats.progressToGoal >= 100 ? '#4caf50' : '#2196f3',
                          },
                        }}
                      />
                      {stats && stats.progressToGoal >= 100 && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          🎉 Congratulations! You've reached your weekly goal!
                        </Alert>
                      )}
                    </Box>
                  </Grid>

                  {/* Weekly Activity Chart */}
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 2 }} />
                    <ExerciseActivityChart
                      data={weeklyData}
                      title="Weekly Activity"
                      height={250}
                      showSessions
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Breakdown */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activity Breakdown
                </Typography>

                {getActivityBreakdown().length === 0 ? (
                  <Alert severity="info">No activity data available</Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getActivityBreakdown()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getActivityBreakdown().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }: CustomTooltipProps) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                              <p>{`${payload[0].value} minutes`}</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Streak Tracker */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activity Streak
                </Typography>

                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 3 }}>
                    <Box>
                      <Badge badgeContent={<TrophyIcon />} color="warning">
                        <Typography variant="h2" color="primary">
                          {stats?.currentStreak || 0}
                        </Typography>
                      </Badge>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Current Streak
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="h2" color="success.main">
                        {stats?.longestStreak || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Longest Streak
                      </Typography>
                    </Box>
                  </Box>

                  {stats && stats.currentStreak >= 3 && (
                    <Alert severity="success" icon={<TrophyIcon />}>
                      Keep it up! You're on a {stats.currentStreak}-day streak!
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Heatmap */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <CalendarHeatmap
                  data={heatmapData}
                  title="90-Day Activity Heatmap"
                  maxValue={120}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Exercise History */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Exercise History</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Filter Activity</InputLabel>
                      <Select
                        value={filterActivityType}
                        onChange={(e) => setFilterActivityType(e.target.value)}
                        label="Filter Activity"
                      >
                        <MenuItem value="All">All Activities</MenuItem>
                        {ACTIVITY_TYPES.map((activity) => (
                          <MenuItem key={activity.value} value={activity.value}>
                            {activity.emoji} {activity.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(date) => setStartDate(date)}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Box>
                </Box>

                {dataLoading ? (
                  <Box>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height={100} sx={{ mb: 1 }} />
                    ))}
                  </Box>
                ) : filteredLogs.length === 0 ? (
                  <Alert severity="info">No exercise logs found. Start logging your workouts!</Alert>
                ) : (
                  <Timeline position="alternate">
                    {filteredLogs.map((log, index) => (
                      <TimelineItem key={log.id}>
                        <TimelineOppositeContent color="text.secondary">
                          <Typography variant="caption">
                            {dayjs(log.loggedAt).format('MMM DD, YYYY')}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {dayjs(log.loggedAt).format('h:mm A')}
                          </Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot
                            sx={{
                              bgcolor: getIntensityColor(log.intensity),
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>
                              {getActivityEmoji(log.activityType)}
                            </span>
                          </TimelineDot>
                          {index < filteredLogs.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" component="span">
                              {log.activityType}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={`${log.durationMinutes} min`}
                                size="small"
                                color="primary"
                              />
                              <Chip
                                label={log.intensity}
                                size="small"
                                sx={{
                                  bgcolor: getIntensityColor(log.intensity),
                                  color: 'white',
                                }}
                              />
                              {log.moodAfter && (
                                <Chip
                                  label={getMoodEmoji(log.moodAfter)}
                                  size="small"
                                />
                              )}
                            </Box>
                            {log.notes && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {log.notes}
                              </Typography>
                            )}
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(log)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setLogToDelete(log.id);
                                  setDeleteDialogOpen(true);
                                }}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Paper>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Log FAB */}
        <Zoom in={lastActivity !== null && !editingLog}>
          <MuiTooltip title="Repeat Last Activity" placement="left">
            <Fab
              color="primary"
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
              }}
              onClick={handleQuickLog}
            >
              <ReplayIcon />
            </Fab>
          </MuiTooltip>
        </Zoom>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Exercise Log</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this exercise log? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default ExerciseLog;
