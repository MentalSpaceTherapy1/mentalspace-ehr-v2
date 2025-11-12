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
  FormControlLabel,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  Rating,
  FormGroup,
  Tooltip,
  Badge,
  Skeleton,
  Divider,
  Switch,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Bedtime as BedtimeIcon,
  WbSunny as WbSunnyIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  AccessTime as AccessTimeIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { SleepQualityChart } from '../../components/charts/SleepQualityChart';
import api from '../../lib/api';
import dayjs from 'dayjs';

// Types
interface SleepLog {
  id: string;
  clientId: string;
  logDate: string;
  bedtime: string;
  wakeTime: string;
  hoursSlept: number;
  quality: number;
  disturbances?: string[];
  notes?: string;
  createdAt: string;
}

interface SleepMetrics {
  averageHoursSlept7Day: number;
  averageHoursSlept30Day: number;
  averageQuality7Day: number;
  averageQuality30Day: number;
  consistencyScore: number;
  sleepDebt: number;
  commonDisturbances: string[];
  recommendedBedtime: string;
}

// Constants
const DISTURBANCES = [
  'Nightmares',
  'Insomnia (trouble falling asleep)',
  'Woke frequently',
  'Early awakening',
  'Sleep apnea symptoms',
  'Restless legs',
  'Pain/discomfort',
  'Environmental (noise, light, temperature)',
  'Other',
];

const SleepDiary: React.FC = () => {
  // Get clientId from portal authentication
  const portalClient = JSON.parse(localStorage.getItem('portalClient') || '{}');
  const clientId = portalClient.id;

  // Form state
  const [date, setDate] = useState<any>(dayjs().subtract(1, 'day'));
  const [bedtime, setBedtime] = useState<any>(null);
  const [wakeTime, setWakeTime] = useState<any>(null);
  const [hoursSlept, setHoursSlept] = useState<number>(0);
  const [quality, setQuality] = useState<number>(3);
  const [disturbances, setDisturbances] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [bedtimeReminder, setBedtimeReminder] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);

  // Data state
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [metrics, setMetrics] = useState<SleepMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(30);

  // UI state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SleepLog | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [currentMonth, setCurrentMonth] = useState<any>(dayjs());

  // Auto-calculate hours slept
  useEffect(() => {
    if (bedtime && wakeTime) {
      let hours = dayjs(wakeTime).diff(dayjs(bedtime), 'hour', true);
      // Handle case where wake time is next day
      if (hours < 0) {
        hours += 24;
      }
      // Convert to decimal (e.g., 7.5 hours)
      setHoursSlept(Math.round(hours * 10) / 10);
    }
  }, [bedtime, wakeTime]);

  // Fetch data on mount
  useEffect(() => {
    fetchLogs();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [chartDays]);

  const fetchLogs = async () => {
    try {
      setDataLoading(true);
      const response = await api.get(`/tracking/sleep/${clientId}?limit=90`);
      setLogs(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      showSnackbar('Failed to load sleep logs', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Get metrics for the last 30 days by default
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(30, 'days').format('YYYY-MM-DD');

      const response = await api.get(`/tracking/sleep/${clientId}/metrics?startDate=${startDate}&endDate=${endDate}`);
      setMetrics(response.data.data);
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      // Calculate date range based on chartDays (7, 30, or 90 days)
      const endDate = dayjs();
      const startDate = dayjs().subtract(chartDays, 'days');

      const response = await api.get(
        `/tracking/sleep/${clientId}/trends?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      // Backend returns { daily: [...], weekly: [...], monthly: [...], ... }
      // Extract the daily trends array for the chart
      setChartData(response.data.data?.daily || []);
    } catch (error: any) {
      console.error('Error fetching chart data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!bedtime || !wakeTime || hoursSlept <= 0) {
      showSnackbar('Please fill in bedtime and wake time', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        logDate: dayjs(date).toISOString(),
        bedtime: dayjs(bedtime).toISOString(),
        wakeTime: dayjs(wakeTime).toISOString(),
        hoursSlept,
        quality,
        disturbances: disturbances.length > 0 ? disturbances : undefined,
        notes: notes || undefined,
      };

      if (editingLog) {
        await api.put(`/tracking/sleep/log/${editingLog.id}`, data);
        showSnackbar('Sleep log updated successfully', 'success');
      } else {
        await api.post(`/tracking/sleep/${clientId}`, data);
        showSnackbar('Sleep logged successfully', 'success');
      }

      resetForm();
      fetchLogs();
      fetchMetrics();
      fetchChartData();
    } catch (error: any) {
      console.error('Error submitting log:', error);
      showSnackbar(error.response?.data?.message || 'Failed to save sleep log', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;

    try {
      await api.delete(`/tracking/sleep/log/${logToDelete}`);
      showSnackbar('Sleep log deleted', 'success');
      setLogs(logs.filter(log => log.id !== logToDelete));
      setDeleteDialogOpen(false);
      setLogToDelete(null);
      fetchMetrics();
      fetchChartData();
    } catch (error: any) {
      console.error('Error deleting log:', error);
      showSnackbar('Failed to delete log', 'error');
    }
  };

  const handleEdit = (log: SleepLog) => {
    setEditingLog(log);
    setDate(dayjs(log.logDate));

    // Parse bedtime and wake time from ISO timestamps
    setBedtime(dayjs(log.bedtime));
    setWakeTime(dayjs(log.wakeTime));

    setHoursSlept(log.hoursSlept);
    setQuality(log.quality);
    setDisturbances(log.disturbances || []);
    setNotes(log.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setDate(dayjs().subtract(1, 'day'));
    setBedtime(null);
    setWakeTime(null);
    setHoursSlept(0);
    setQuality(3);
    setDisturbances([]);
    setNotes('');
    setEditingLog(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getQualityColor = (quality: number): string => {
    if (quality >= 4) return '#4caf50';
    if (quality >= 3) return '#ff9800';
    return '#f44336';
  };

  const getQualityLabel = (quality: number): string => {
    if (quality === 5) return 'Excellent';
    if (quality === 4) return 'Good';
    if (quality === 3) return 'Fair';
    if (quality === 2) return 'Poor';
    return 'Very Poor';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Bedtime', 'Wake Time', 'Hours Slept', 'Quality', 'Disturbances', 'Notes'];
    const rows = logs.map(log => [
      log.logDate,
      log.bedtime,
      log.wakeTime,
      log.hoursSlept,
      log.quality,
      log.disturbances?.join('; ') || '',
      log.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sleep-diary-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calendar rendering
  const renderCalendar = () => {
    const monthStart = dayjs(currentMonth).startOf('month');
    const monthEnd = dayjs(currentMonth).endOf('month');
    const daysCount = monthEnd.diff(monthStart, 'day') + 1;
    const days = Array.from({ length: daysCount }, (_, i) => monthStart.add(i, 'day'));

    const logsByDate: { [key: string]: SleepLog } = {};
    logs.forEach(log => {
      // Extract just the date part (YYYY-MM-DD) from the ISO timestamp
      const dateOnly = dayjs(log.logDate).format('YYYY-MM-DD');
      logsByDate[dateOnly] = log;
    });

    return (
      <Box>
        {/* Day headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 1,
            mb: 1,
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box key={day} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" fontWeight="bold">
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 1,
          }}
        >
          {/* Empty cells for days before month starts */}
          {Array.from({ length: monthStart.day() }).map((_, i) => (
            <Box key={`empty-${i}`} sx={{ height: 90 }} />
          ))}

          {/* Calendar days */}
          {days.map(day => {
            const dateStr = dayjs(day).format('YYYY-MM-DD');
            const log = logsByDate[dateStr];

            return (
              <Paper
                key={dateStr}
                elevation={log ? 4 : 1}
                sx={{
                  p: 1.5,
                  height: 90,
                  cursor: log ? 'pointer' : 'default',
                  background: log
                    ? `linear-gradient(135deg, ${getQualityColor(log.quality)}90 0%, ${getQualityColor(log.quality)} 100%)`
                    : 'background.paper',
                  color: log ? 'white' : 'text.primary',
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: log ? getQualityColor(log.quality) : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: log ? 'translateY(-4px) scale(1.02)' : 'none',
                    boxShadow: log ? `0 8px 24px ${getQualityColor(log.quality)}60` : 'none',
                    borderColor: log ? getQualityColor(log.quality) : 'divider',
                  },
                  '&::before': log ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 60%)',
                  } : {},
                }}
                onClick={() => {
                  if (log) {
                    setSelectedLog(log);
                    setDetailDialogOpen(true);
                  }
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: '0.95rem',
                  }}
                >
                  {dayjs(day).format('D')}
                </Typography>
                {log && (
                  <Box sx={{ mt: 0.5, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption" fontWeight="700" fontSize="0.7rem">
                        {log.hoursSlept.toFixed(1)}h
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Rating
                        value={log.quality}
                        readOnly
                        size="small"
                        max={5}
                        sx={{
                          fontSize: '0.9rem',
                          '& .MuiRating-iconFilled': {
                            color: 'white',
                          },
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      </Box>
    );
  };

  const getSleepTips = () => {
    if (!metrics) return [];

    const tips = [];

    if ((metrics.averageHoursSlept30Day ?? 0) < 7) {
      tips.push({
        title: 'Increase Sleep Duration',
        description: 'You\'re averaging less than 7 hours. Try going to bed 30 minutes earlier.',
        icon: '🛌',
      });
    }

    if ((metrics.consistencyScore ?? 0) < 70) {
      tips.push({
        title: 'Improve Sleep Consistency',
        description: 'Try to maintain a regular sleep schedule, even on weekends.',
        icon: '⏰',
      });
    }

    if ((metrics.averageQuality30Day ?? 0) < 3.5) {
      tips.push({
        title: 'Enhance Sleep Quality',
        description: 'Consider reducing screen time before bed and creating a relaxing bedtime routine.',
        icon: '✨',
      });
    }

    if ((metrics.commonDisturbances ?? []).length > 0) {
      tips.push({
        title: 'Address Disturbances',
        description: `Your most common disturbance is "${metrics.commonDisturbances[0]}". Consider strategies to address this.`,
        icon: '🔕',
      });
    }

    return tips;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header - Night Sky Theme */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #7e22ce 75%, #a855f7 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(30, 60, 114, 0.4)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
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
                <BedtimeIcon sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h3" fontWeight="800" gutterBottom sx={{ mb: 0 }}>
                  Sleep Diary 🌙
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 300 }}>
                  Track your sleep patterns and improve your sleep quality
                </Typography>
              </Box>
            </Box>
            {metrics && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`${(metrics.averageHoursSlept7Day ?? 0).toFixed(1)}h avg`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Chip
                  icon={<StarIcon />}
                  label={`Quality: ${(metrics.averageQuality7Day ?? 0).toFixed(1)}/5`}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Chip
                  label={`${logs.length} Total Logs`}
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

        <Grid container spacing={3}>
          {/* Log Entry Form */}
          <Grid item xs={12} lg={6}>
            <Card
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(30, 60, 114, 0.15)',
                border: '1px solid',
                borderColor: 'rgba(30, 60, 114, 0.1)',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  p: 2,
                  color: 'white',
                }}
              >
                <Typography variant="h6" fontWeight="700">
                  {editingLog ? '✏️ Edit Sleep Log' : '🌙 Log Sleep'}
                </Typography>
              </Box>
              <CardContent sx={{ pt: 3 }}>

                <Grid container spacing={2}>
                  {/* Date */}
                  <Grid item xs={12}>
                    <DatePicker
                      label="Sleep Date"
                      value={date}
                      onChange={(newValue) => newValue && setDate(newValue)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>

                  {/* Bedtime */}
                  <Grid item xs={12} sm={6}>
                    <TimePicker
                      label="Bedtime"
                      value={bedtime}
                      onChange={(newValue) => setBedtime(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          InputProps: {
                            startAdornment: <BedtimeIcon sx={{ mr: 1, color: 'action.active' }} />,
                          },
                        },
                      }}
                    />
                  </Grid>

                  {/* Wake Time */}
                  <Grid item xs={12} sm={6}>
                    <TimePicker
                      label="Wake Time"
                      value={wakeTime}
                      onChange={(newValue) => setWakeTime(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          InputProps: {
                            startAdornment: <WbSunnyIcon sx={{ mr: 1, color: 'action.active' }} />,
                          },
                        },
                      }}
                    />
                  </Grid>

                  {/* Hours Slept */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Hours Slept"
                      type="number"
                      value={hoursSlept}
                      onChange={(e) => setHoursSlept(parseFloat(e.target.value))}
                      inputProps={{ min: 0, max: 24, step: 0.5 }}
                      helperText="Auto-calculated from bedtime and wake time"
                      InputProps={{
                        startAdornment: <AccessTimeIcon sx={{ mr: 1, color: 'action.active' }} />,
                      }}
                    />
                  </Grid>

                  {/* Quality */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${getQualityColor(quality)}15 0%, ${getQualityColor(quality)}30 100%)`,
                        border: '2px solid',
                        borderColor: getQualityColor(quality),
                      }}
                    >
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          color: getQualityColor(quality),
                          fontWeight: 700,
                          mb: 2,
                        }}
                      >
                        Sleep Quality
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Rating
                          value={quality}
                          onChange={(_, newValue) => setQuality(newValue || 3)}
                          max={5}
                          size="large"
                          icon={<StarIcon fontSize="inherit" />}
                          sx={{
                            '& .MuiRating-iconFilled': {
                              color: getQualityColor(quality),
                            },
                            '& .MuiRating-iconHover': {
                              color: getQualityColor(quality),
                            },
                          }}
                        />
                        <Chip
                          label={getQualityLabel(quality)}
                          sx={{
                            bgcolor: getQualityColor(quality),
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            px: 1,
                            boxShadow: `0 2px 8px ${getQualityColor(quality)}40`,
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>

                  {/* Disturbances */}
                  <Grid item xs={12}>
                    <Typography gutterBottom>Sleep Disturbances</Typography>
                    <FormGroup>
                      <Grid container spacing={1}>
                        {DISTURBANCES.map((disturbance) => (
                          <Grid item xs={12} sm={6} key={disturbance}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={disturbances.includes(disturbance)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDisturbances([...disturbances, disturbance]);
                                    } else {
                                      setDisturbances(disturbances.filter(d => d !== disturbance));
                                    }
                                  }}
                                  size="small"
                                />
                              }
                              label={<Typography variant="body2">{disturbance}</Typography>}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </FormGroup>
                  </Grid>

                  {/* Notes */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Notes"
                      placeholder="How did you feel when you woke up?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Grid>

                  {/* Bedtime Reminder */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bedtimeReminder}
                          onChange={(e) => setBedtimeReminder(e.target.checked)}
                        />
                      }
                      label="Enable bedtime reminder"
                    />
                    {bedtimeReminder && (
                      <TimePicker
                        label="Reminder Time"
                        value={reminderTime}
                        onChange={(newValue) => setReminderTime(newValue)}
                        slotProps={{ textField: { fullWidth: true, size: 'small', sx: { mt: 1 } } }}
                      />
                    )}
                  </Grid>

                  {/* Actions */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      {editingLog && (
                        <Button variant="outlined" onClick={resetForm}>
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting || !bedtime || !wakeTime}
                        startIcon={submitting ? <CircularProgress size={20} /> : undefined}
                      >
                        {submitting ? 'Saving...' : editingLog ? 'Update Log' : 'Log Sleep'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Sleep Metrics Dashboard */}
          <Grid item xs={12} lg={6}>
            <Grid container spacing={2}>
              {dataLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))
              ) : metrics ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            7-Day Average
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          {(metrics.averageHoursSlept7Day ?? 0).toFixed(1)}h
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Sleep Duration
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(240, 147, 251, 0.3)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(240, 147, 251, 0.4)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <TrendingUpIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            30-Day Average
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          {(metrics.averageHoursSlept30Day ?? 0).toFixed(1)}h
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Sleep Duration
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(79, 172, 254, 0.3)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(79, 172, 254, 0.4)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <StarIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Sleep Quality
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                            {(metrics.averageQuality7Day ?? 0).toFixed(1)}
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>/5</Typography>
                        </Box>
                        <Rating value={metrics.averageQuality7Day ?? 0} readOnly size="small" sx={{ mt: 0.5, '& .MuiRating-iconFilled': { color: 'white' } }} />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(67, 233, 123, 0.3)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(67, 233, 123, 0.4)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <TrendingUpIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Consistency
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          {metrics.consistencyScore ?? 0}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Score out of 100
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(250, 112, 154, 0.3)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(250, 112, 154, 0.4)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <InfoIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Sleep Debt
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          {(metrics.sleepDebt ?? 0).toFixed(1)}h
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Cumulative deficit
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(48, 207, 208, 0.3)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(48, 207, 208, 0.4)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <BedtimeIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Best Bedtime
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          {metrics.recommendedBedtime ?? 'N/A'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Recommended
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {(metrics.commonDisturbances ?? []).length > 0 && (
                    <Grid item xs={12}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                          color: 'white',
                          boxShadow: '0 8px 24px rgba(255, 107, 107, 0.3)',
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <InfoIcon sx={{ fontSize: 20 }} />
                            <Typography variant="subtitle1" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Common Sleep Disturbances
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {(metrics.commonDisturbances ?? []).slice(0, 3).map((disturbance, index) => (
                              <Chip
                                key={index}
                                label={disturbance}
                                sx={{
                                  bgcolor: 'rgba(255, 255, 255, 0.25)',
                                  color: 'white',
                                  fontWeight: 600,
                                  backdropFilter: 'blur(10px)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                }}
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </>
              ) : null}
            </Grid>
          </Grid>

          {/* Sleep Calendar */}
          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(30, 60, 114, 0.15)',
                border: '1px solid',
                borderColor: 'rgba(30, 60, 114, 0.1)',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  p: 3,
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BedtimeIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="700">
                      Sleep Calendar
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setCurrentMonth(dayjs(currentMonth).subtract(1, 'month'))}
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                        fontWeight: 600,
                      }}
                    >
                      Previous
                    </Button>
                    <Typography variant="h6" fontWeight="700" sx={{ mx: 2, minWidth: '150px', textAlign: 'center' }}>
                      {dayjs(currentMonth).format('MMMM YYYY')}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setCurrentMonth(dayjs(currentMonth).add(1, 'month'))}
                      disabled={dayjs(currentMonth).month() === dayjs().month()}
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                        '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.5)' },
                        fontWeight: 600,
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>

              <CardContent sx={{ p: 3 }}>
                {dataLoading ? (
                  <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
                ) : (
                  renderCalendar()
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sleep Analytics */}
          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(30, 60, 114, 0.15)',
                border: '1px solid',
                borderColor: 'rgba(30, 60, 114, 0.1)',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  p: 3,
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUpIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="700">
                      Sleep Analytics
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={chartDays === 7 ? 'contained' : 'outlined'}
                      onClick={() => setChartDays(7)}
                      sx={{
                        bgcolor: chartDays === 7 ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.7)' },
                      }}
                    >
                      7 Days
                    </Button>
                    <Button
                      size="small"
                      variant={chartDays === 30 ? 'contained' : 'outlined'}
                      onClick={() => setChartDays(30)}
                      sx={{
                        bgcolor: chartDays === 30 ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.7)' },
                      }}
                    >
                      30 Days
                    </Button>
                    <Button
                      size="small"
                      variant={chartDays === 90 ? 'contained' : 'outlined'}
                      onClick={() => setChartDays(90)}
                      sx={{
                        bgcolor: chartDays === 90 ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.7)' },
                      }}
                    >
                      90 Days
                    </Button>
                  </Box>
                </Box>
              </Box>

              <CardContent sx={{ p: 3 }}>
                {chartData.length === 0 ? (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2,
                      '& .MuiAlert-icon': { fontSize: 28 },
                    }}
                  >
                    Not enough data to show trends. Keep logging your sleep to see beautiful analytics!
                  </Alert>
                ) : (
                  <SleepQualityChart
                    data={chartData}
                    title=""
                    height={400}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sleep Tips */}
          {getSleepTips().length > 0 && (
            <Grid item xs={12}>
              <Card
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(30, 60, 114, 0.15)',
                  border: '1px solid',
                  borderColor: 'rgba(30, 60, 114, 0.1)',
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    p: 3,
                    color: 'white',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InfoIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="700">
                      Personalized Sleep Tips
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                    Based on your sleep patterns and data
                  </Typography>
                </Box>

                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    {getSleepTips().map((tip, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper
                          sx={{
                            p: 3,
                            textAlign: 'center',
                            height: '100%',
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)',
                            border: '2px solid',
                            borderColor: 'rgba(79, 172, 254, 0.2)',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 12px 24px rgba(79, 172, 254, 0.2)',
                              borderColor: 'rgba(79, 172, 254, 0.4)',
                            },
                          }}
                        >
                          <Typography variant="h3" gutterBottom sx={{ fontSize: '3rem' }}>
                            {tip.icon}
                          </Typography>
                          <Typography variant="h6" gutterBottom fontWeight="700" color="primary">
                            {tip.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {tip.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Export Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={logs.length === 0}
                sx={{
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a4193 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                  },
                }}
              >
                Export Sleep Data (CSV)
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Detail Dialog */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
            },
          }}
        >
          <Box
            sx={{
              background: `linear-gradient(135deg, ${selectedLog ? getQualityColor(selectedLog.quality) : '#667eea'} 0%, ${selectedLog ? getQualityColor(selectedLog.quality) : '#764ba2'}90 100%)`,
              p: 3,
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <BedtimeIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" fontWeight="700">
                  Sleep Log Details
                </Typography>
                {selectedLog && (
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    {dayjs(selectedLog.logDate).format('dddd, MMMM DD, YYYY')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            {selectedLog && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        border: '1px solid',
                        borderColor: 'rgba(102, 126, 234, 0.2)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <BedtimeIcon color="primary" />
                        <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">
                          Bedtime
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="700">
                        {dayjs(selectedLog.bedtime).format('h:mm A')}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(255, 183, 77, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)',
                        border: '1px solid',
                        borderColor: 'rgba(255, 183, 77, 0.2)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WbSunnyIcon color="warning" />
                        <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">
                          Wake Time
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="700">
                        {dayjs(selectedLog.wakeTime).format('h:mm A')}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)',
                        border: '1px solid',
                        borderColor: 'rgba(79, 172, 254, 0.2)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AccessTimeIcon color="info" />
                        <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">
                          Hours Slept
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="700">
                        {selectedLog.hoursSlept.toFixed(1)} hours
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${getQualityColor(selectedLog.quality)}15 0%, ${getQualityColor(selectedLog.quality)}25 100%)`,
                        border: '2px solid',
                        borderColor: getQualityColor(selectedLog.quality),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <StarIcon sx={{ color: getQualityColor(selectedLog.quality) }} />
                        <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">
                          Quality
                        </Typography>
                      </Box>
                      <Rating
                        value={selectedLog.quality}
                        readOnly
                        size="small"
                        sx={{
                          '& .MuiRating-iconFilled': {
                            color: getQualityColor(selectedLog.quality),
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight="700" sx={{ color: getQualityColor(selectedLog.quality), display: 'block', mt: 0.5 }}>
                        {getQualityLabel(selectedLog.quality)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {selectedLog.disturbances && selectedLog.disturbances.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight="700" color="text.secondary" gutterBottom textTransform="uppercase">
                      Sleep Disturbances
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedLog.disturbances.map((d, i) => (
                        <Chip
                          key={i}
                          label={d}
                          size="medium"
                          sx={{
                            bgcolor: 'rgba(255, 152, 0, 0.1)',
                            color: 'warning.main',
                            border: '1px solid',
                            borderColor: 'rgba(255, 152, 0, 0.3)',
                            fontWeight: 600,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {selectedLog.notes && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight="700" color="text.secondary" gutterBottom textTransform="uppercase">
                      Notes
                    </Typography>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {selectedLog.notes}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button
              onClick={() => setDetailDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedLog) {
                  handleEdit(selectedLog);
                  setDetailDialogOpen(false);
                }
              }}
              variant="contained"
              startIcon={<EditIcon />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a4193 100%)',
                },
              }}
            >
              Edit
            </Button>
            <Button
              onClick={() => {
                if (selectedLog) {
                  setLogToDelete(selectedLog.id);
                  setDeleteDialogOpen(true);
                  setDetailDialogOpen(false);
                }
              }}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              maxWidth: '400px',
            },
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
              p: 3,
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DeleteIcon sx={{ fontSize: 40 }} />
              <Typography variant="h5" fontWeight="700">
                Delete Sleep Log?
              </Typography>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            <Alert
              severity="warning"
              sx={{
                borderRadius: 2,
                '& .MuiAlert-icon': { fontSize: 28 },
              }}
            >
              This action cannot be undone. Your sleep data will be permanently deleted.
            </Alert>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Delete Permanently
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

export default SleepDiary;
