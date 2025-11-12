import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Slider,
  Grid,
  Chip,
  Autocomplete,
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
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SymptomTrendChart } from '../../components/charts/SymptomTrendChart';
import api from '../../lib/api';
import dayjs from 'dayjs';

// Types
interface SymptomLog {
  id: string;
  clientId: string;
  symptoms: string[];
  severity: number;
  triggers?: string[];
  mood?: number;
  duration?: string;
  medicationsTaken?: string[];
  notes?: string;
  loggedAt: string;
  createdAt: string;
}

interface SymptomTrendData {
  date: string;
  averageSeverity: number;
  logCount?: number;
}

// Constants
const COMMON_SYMPTOMS = [
  'Anxiety',
  'Depression',
  'Panic',
  'Insomnia',
  'Fatigue',
  'Irritability',
  'Sadness',
  'Anger',
  'Fear',
  'Worry',
  'Racing thoughts',
  'Difficulty concentrating',
  'Restlessness',
  'Hopelessness',
  'Guilt',
];

const TRIGGERS = [
  'Stress',
  'Lack of sleep',
  'Conflict',
  'Work',
  'Family',
  'Social',
  'Financial',
  'Health',
  'Weather',
  'Medication change',
  'Other',
];

const DURATIONS = [
  '< 1 hour',
  '1-3 hours',
  '3-6 hours',
  '6-12 hours',
  '12-24 hours',
  '> 24 hours',
];

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Very Poor' },
  { value: 2, emoji: '🙁', label: 'Poor' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Very Good' },
];

const SymptomDiary: React.FC = () => {
  // Get clientId from portal authentication
  const portalClient = JSON.parse(localStorage.getItem('portalClient') || '{}');
  const clientId = portalClient.id;

  // Form state
  const [formExpanded, setFormExpanded] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(5);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [duration, setDuration] = useState<string>('');
  const [medicationsTaken, setMedicationsTaken] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [medicationInput, setMedicationInput] = useState<string>('');

  // Data state
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [trendData, setTrendData] = useState<SymptomTrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // UI state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [editingLog, setEditingLog] = useState<SymptomLog | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs();
    fetchTrends();
  }, [startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setDataLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      params.append('limit', '100');

      const response = await api.get(`/tracking/symptoms/${clientId}?${params.toString()}`);
      
      // Convert mood enum strings to numbers for frontend display
      const moodEnumToNumber: { [key: string]: number } = {
        'VERY_POOR': 1,
        'POOR': 2,
        'NEUTRAL': 3,
        'GOOD': 4,
        'VERY_GOOD': 5,
      };
      
      const logs = (response.data.data || []).map((log: any) => ({
        ...log,
        mood: log.mood ? moodEnumToNumber[log.mood] || null : null,
      }));
      
      setLogs(logs);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      showSnackbar('Failed to load symptom logs', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      // Calculate date range for last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await api.get(
        `/tracking/symptoms/${clientId}/trends?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      // Backend returns { daily: [...], weekly: [...], direction: ..., totalLogs: ... }
      // Extract the daily trends array for the chart
      setTrendData(response.data.data?.daily || []);
    } catch (error: any) {
      console.error('Error fetching trends:', error);
    }
  };

  const handleSubmit = async () => {
    if (symptoms.length === 0) {
      showSnackbar('Please select at least one symptom', 'error');
      return;
    }

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
      
      const data = {
        symptoms,
        severity,
        triggers: triggers.length > 0 ? triggers : undefined,
        mood: mood ? moodMap[mood] : undefined,
        duration: duration || undefined,
        medicationsTaken: medicationsTaken.length > 0 ? medicationsTaken : undefined,
        notes: notes || undefined,
      };

      if (editingLog) {
        await api.put(`/tracking/symptoms/log/${editingLog.id}`, data);
        showSnackbar('Symptom log updated successfully', 'success');
      } else {
        await api.post(`/tracking/symptoms/${clientId}`, data);
        showSnackbar('Symptom logged successfully', 'success');
      }

      // Reset form
      resetForm();
      // Refresh data
      fetchLogs();
      fetchTrends();
    } catch (error: any) {
      console.error('Error submitting log:', error);
      // Log full error response for debugging
      if (error.response) {
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
        console.error('Error Response Headers:', error.response.headers);
      }
      showSnackbar(error.response?.data?.message || 'Failed to save symptom log', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;

    try {
      await api.delete(`/tracking/symptoms/log/${logToDelete}`);
      showSnackbar('Symptom log deleted', 'success');
      setLogs(logs.filter(log => log.id !== logToDelete));
      setDeleteDialogOpen(false);
      setLogToDelete(null);
      fetchTrends();
    } catch (error: any) {
      console.error('Error deleting log:', error);
      showSnackbar('Failed to delete log', 'error');
    }
  };

  const handleEdit = (log: SymptomLog) => {
    setEditingLog(log);
    setSymptoms(log.symptoms);
    setSeverity(log.severity);
    setTriggers(log.triggers || []);
    setMood(log.mood || null);
    setDuration(log.duration || '');
    setMedicationsTaken(log.medicationsTaken || []);
    setNotes(log.notes || '');
    setFormExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setSymptoms([]);
    setSeverity(5);
    setTriggers([]);
    setMood(null);
    setDuration('');
    setMedicationsTaken([]);
    setNotes('');
    setMedicationInput('');
    setEditingLog(null);
    setFormExpanded(false);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getSeverityColor = (severity: number): string => {
    if (severity <= 3) return '#4caf50'; // Green
    if (severity <= 6) return '#ffc107'; // Yellow
    if (severity <= 8) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getSeverityLabel = (severity: number): string => {
    if (severity <= 3) return 'Mild';
    if (severity <= 6) return 'Moderate';
    if (severity <= 8) return 'Severe';
    return 'Extreme';
  };

  const getMoodEmoji = (mood: number): string => {
    const moodOption = MOOD_OPTIONS.find(m => m.value === mood);
    return moodOption?.emoji || '😐';
  };

  // Analytics calculations
  const getSymptomFrequency = () => {
    const frequency: { [key: string]: number } = {};
    logs.forEach(log => {
      log.symptoms.forEach(symptom => {
        frequency[symptom] = (frequency[symptom] || 0) + 1;
      });
    });
    return Object.entries(frequency)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getMoodDistribution = () => {
    const distribution: { [key: number]: number } = {};
    logs.forEach(log => {
      if (log.mood) {
        distribution[log.mood] = (distribution[log.mood] || 0) + 1;
      }
    });
    return MOOD_OPTIONS.map(option => ({
      name: option.label,
      value: distribution[option.value] || 0,
    })).filter(item => item.value > 0);
  };

  const getTriggerAnalysis = () => {
    const frequency: { [key: string]: number } = {};
    logs.forEach(log => {
      if (log.triggers) {
        log.triggers.forEach(trigger => {
          frequency[trigger] = (frequency[trigger] || 0) + 1;
        });
      }
    });
    return Object.entries(frequency)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#c471ed'];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header - Modern Colorful Design */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(118, 75, 162, 0.3)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
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
                <AssessmentIcon sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h3" fontWeight="800" gutterBottom sx={{ mb: 0 }}>
                  Symptom Diary
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 300 }}>
                  Track, analyze, and understand your mental health journey
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
              <Chip
                icon={<TrendingUpIcon />}
                label={`${logs.length} Total Logs`}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.25)',
                  color: 'white',
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Chip
                label="Identify Patterns"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.25)',
                  color: 'white',
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Log Entry Form */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)',
            border: '1px solid',
            borderColor: 'rgba(102, 126, 234, 0.1)',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 2,
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="700">
                {editingLog ? '✏️ Edit Symptom Log' : '➕ Log New Symptom'}
              </Typography>
              <IconButton
                onClick={() => setFormExpanded(!formExpanded)}
                sx={{ color: 'white' }}
              >
                {formExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>
          <CardContent sx={{ pt: 3 }}>

            <Collapse in={formExpanded}>
              <Grid container spacing={3}>
                {/* Symptoms */}
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={COMMON_SYMPTOMS}
                    value={symptoms}
                    onChange={(_, newValue) => setSymptoms(newValue)}
                    freeSolo
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          {...getTagProps({ index })}
                          color="primary"
                          size="small"
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Symptoms *"
                        placeholder="Select or type symptoms"
                        helperText="Select from common symptoms or type your own"
                      />
                    )}
                  />
                </Grid>

                {/* Duration */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Duration</InputLabel>
                    <Select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      label="Duration"
                    >
                      <MenuItem value="">
                        <em>Select duration</em>
                      </MenuItem>
                      {DURATIONS.map((d) => (
                        <MenuItem key={d} value={d}>
                          {d}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Severity */}
                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${getSeverityColor(severity)}15 0%, ${getSeverityColor(severity)}30 100%)`,
                      border: '2px solid',
                      borderColor: getSeverityColor(severity),
                    }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        color: getSeverityColor(severity),
                        fontWeight: 700,
                        mb: 2,
                      }}
                    >
                      Severity: {severity} - {getSeverityLabel(severity)}
                    </Typography>
                    <Slider
                      value={severity}
                      onChange={(_, value) => setSeverity(value as number)}
                      min={1}
                      max={10}
                      step={1}
                      marks={[
                        { value: 1, label: '1 Mild' },
                        { value: 4, label: '4' },
                        { value: 7, label: '7 Severe' },
                        { value: 10, label: '10 Extreme' },
                      ]}
                      sx={{
                        height: 12,
                        '& .MuiSlider-track': {
                          background: `linear-gradient(90deg, #4caf50 0%, #ffc107 40%, #ff9800 70%, #f44336 100%)`,
                          border: 'none',
                        },
                        '& .MuiSlider-rail': {
                          background: 'linear-gradient(90deg, #e8f5e9 0%, #fff8e1 40%, #ffe0b2 70%, #ffebee 100%)',
                          opacity: 1,
                        },
                        '& .MuiSlider-thumb': {
                          width: 28,
                          height: 28,
                          backgroundColor: getSeverityColor(severity),
                          border: '4px solid white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0 0 0 8px ${getSeverityColor(severity)}30`,
                          },
                        },
                        '& .MuiSlider-mark': {
                          backgroundColor: 'white',
                          height: 8,
                          width: 8,
                          borderRadius: '50%',
                          border: '2px solid #bdbdbd',
                        },
                        '& .MuiSlider-markActive': {
                          backgroundColor: getSeverityColor(severity),
                          border: '2px solid white',
                        },
                        '& .MuiSlider-markLabel': {
                          color: 'text.secondary',
                          fontWeight: 600,
                        },
                      }}
                    />
                  </Box>
                </Grid>

                {/* Triggers */}
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={TRIGGERS}
                    value={triggers}
                    onChange={(_, newValue) => setTriggers(newValue)}
                    freeSolo
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          {...getTagProps({ index })}
                          color="secondary"
                          size="small"
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Triggers"
                        placeholder="What triggered these symptoms?"
                      />
                    )}
                  />
                </Grid>

                {/* Mood */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom fontWeight={600} color="text.secondary">
                    Overall Mood
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {MOOD_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={mood === option.value ? 'contained' : 'outlined'}
                        onClick={() => setMood(option.value)}
                        sx={{
                          minWidth: '75px',
                          fontSize: '32px',
                          flexDirection: 'column',
                          py: 1.5,
                          px: 2,
                          borderRadius: 3,
                          borderWidth: 2,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          ...(mood === option.value
                            ? {
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderColor: 'transparent',
                                transform: 'scale(1.05)',
                                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                              }
                            : {
                                borderColor: '#e0e0e0',
                                '&:hover': {
                                  borderColor: '#667eea',
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                                  bgcolor: 'rgba(102, 126, 234, 0.05)',
                                },
                              }),
                        }}
                      >
                        <span style={{ marginBottom: '4px' }}>{option.emoji}</span>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: mood === option.value ? 'white' : 'text.secondary',
                          }}
                        >
                          {option.label}
                        </Typography>
                      </Button>
                    ))}
                  </Box>
                </Grid>

                {/* Medications */}
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Medications Taken
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Add medication"
                        value={medicationInput}
                        onChange={(e) => setMedicationInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && medicationInput.trim()) {
                            setMedicationsTaken([...medicationsTaken, medicationInput.trim()]);
                            setMedicationInput('');
                          }
                        }}
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        onClick={() => {
                          if (medicationInput.trim()) {
                            setMedicationsTaken([...medicationsTaken, medicationInput.trim()]);
                            setMedicationInput('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {medicationsTaken.map((med, index) => (
                        <Chip
                          key={index}
                          label={med}
                          onDelete={() => {
                            setMedicationsTaken(medicationsTaken.filter((_, i) => i !== index));
                          }}
                          color="info"
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>

                {/* Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    placeholder="Any additional details about how you're feeling..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
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
                      disabled={submitting || symptoms.length === 0}
                      startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                      {submitting ? 'Saving...' : editingLog ? 'Update Log' : 'Log Symptom'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>

        {/* Recent Logs Table */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)',
            border: '1px solid',
            borderColor: 'rgba(76, 175, 80, 0.1)',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
              p: 2.5,
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight="700">
                📋 Recent Logs
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        bgcolor: 'white',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                        },
                      },
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        bgcolor: 'white',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
          <CardContent sx={{ pt: 3 }}>

            {dataLoading ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : logs.length === 0 ? (
              <Alert severity="info">No symptom logs found. Start by logging your first symptom!</Alert>
            ) : (
              <>
                <TableContainer sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.1) 100%)',
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: '#4caf50' }}>Date/Time</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#4caf50' }}>Symptoms</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#4caf50' }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#4caf50' }}>Mood</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#4caf50' }}>Duration</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#4caf50' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((log, idx) => (
                          <TableRow
                            key={log.id}
                            sx={{
                              '&:hover': {
                                bgcolor: 'rgba(102, 126, 234, 0.05)',
                                transform: 'scale(1.001)',
                                transition: 'all 0.2s ease',
                              },
                              bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {dayjs(log.loggedAt).format('MMM DD, YYYY')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(log.loggedAt).format('h:mm A')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {log.symptoms.map((symptom, index) => (
                                  <Chip
                                    key={index}
                                    label={symptom}
                                    size="small"
                                    sx={{
                                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                      color: 'white',
                                      fontWeight: 600,
                                    }}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${log.severity} - ${getSeverityLabel(log.severity)}`}
                                size="small"
                                sx={{
                                  bgcolor: getSeverityColor(log.severity),
                                  color: 'white',
                                  fontWeight: 700,
                                  boxShadow: `0 2px 8px ${getSeverityColor(log.severity)}40`,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {log.mood ? (
                                <Box
                                  sx={{
                                    fontSize: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                                  }}
                                >
                                  {getMoodEmoji(log.mood)}
                                </Box>
                              ) : (
                                <Typography color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.duration ? (
                                <Chip
                                  label={log.duration}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600 }}
                                />
                              ) : (
                                <Typography color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(log)}
                                sx={{
                                  color: '#667eea',
                                  '&:hover': {
                                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                                    transform: 'scale(1.1)',
                                  },
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setLogToDelete(log.id);
                                  setDeleteDialogOpen(true);
                                }}
                                sx={{
                                  color: '#f44336',
                                  '&:hover': {
                                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                                    transform: 'scale(1.1)',
                                  },
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={logs.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Trends Visualization */}
        <Card
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
            border: '1px solid',
            borderColor: 'rgba(255, 152, 0, 0.1)',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
              p: 2.5,
              color: 'white',
            }}
          >
            <Typography variant="h6" fontWeight="700">
              📊 Insights & Trends
            </Typography>
          </Box>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    minHeight: 64,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 152, 0, 0.05)',
                      transform: 'translateY(-2px)',
                    },
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.1) 100%)',
                      color: '#ff9800',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    background: 'linear-gradient(90deg, #ff9800 0%, #ff5722 100%)',
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                <Tab
                  icon={<TrendingUpIcon />}
                  label="Severity Trend"
                  iconPosition="start"
                />
                <Tab
                  icon={<AssessmentIcon />}
                  label="Symptom Frequency"
                  iconPosition="start"
                />
                <Tab label="Mood Distribution" />
                <Tab label="Trigger Analysis" />
              </Tabs>
            </Box>

            {/* Tab 1: Severity Trend */}
            {tabValue === 0 && (
              <Box>
                {trendData.length === 0 ? (
                  <Alert severity="info">Not enough data to show trends. Keep logging symptoms!</Alert>
                ) : (
                  <SymptomTrendChart
                    data={trendData}
                    title="30-Day Severity Trend"
                    height={400}
                    showArea
                  />
                )}
              </Box>
            )}

            {/* Tab 2: Symptom Frequency */}
            {tabValue === 1 && (
              <Box>
                {getSymptomFrequency().length === 0 ? (
                  <Alert severity="info">No symptom data available</Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getSymptomFrequency()}>
                      <defs>
                        <linearGradient id="symptomGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
                          <stop offset="100%" stopColor="#764ba2" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="symptom"
                        angle={-45}
                        textAnchor="end"
                        height={120}
                        tick={{ fill: '#666', fontWeight: 600 }}
                      />
                      <YAxis tick={{ fill: '#666', fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <Legend wrapperStyle={{ fontWeight: 600 }} />
                      <Bar
                        dataKey="count"
                        fill="url(#symptomGradient)"
                        name="Occurrences"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            )}

            {/* Tab 3: Mood Distribution */}
            {tabValue === 2 && (
              <Box>
                {getMoodDistribution().length === 0 ? (
                  <Alert severity="info">No mood data available</Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={getMoodDistribution()}
                        cx="50%"
                        cy="50%"
                        labelLine={{
                          stroke: '#666',
                          strokeWidth: 2,
                        }}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {getMoodDistribution().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="white"
                            strokeWidth={3}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '2px solid #667eea',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontWeight: 600 }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            )}

            {/* Tab 4: Trigger Analysis */}
            {tabValue === 3 && (
              <Box>
                {getTriggerAnalysis().length === 0 ? (
                  <Alert severity="info">No trigger data available</Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getTriggerAnalysis()} layout="vertical">
                      <defs>
                        <linearGradient id="triggerGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ff9800" stopOpacity={1} />
                          <stop offset="100%" stopColor="#ff5722" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fill: '#666', fontWeight: 600 }} />
                      <YAxis
                        dataKey="trigger"
                        type="category"
                        width={120}
                        tick={{ fill: '#666', fontWeight: 600 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <Legend wrapperStyle={{ fontWeight: 600 }} />
                      <Bar
                        dataKey="count"
                        fill="url(#triggerGradient)"
                        name="Occurrences"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Symptom Log</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this symptom log? This action cannot be undone.</Typography>
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

export default SymptomDiary;
