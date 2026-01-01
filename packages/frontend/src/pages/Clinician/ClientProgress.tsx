import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Autocomplete,
  Avatar,
  Chip,
  CircularProgress,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Alert,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  LocalFireDepartment,
  Warning,
  FileDownload,
  Save,
  SentimentVerySatisfied,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  SentimentVeryDissatisfied,
  NightsStay,
  FitnessCenter,
  Psychology,
  Assessment,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import {
  SymptomTrendChart,
  SleepQualityChart,
  ExerciseActivityChart,
  MoodCorrelationChart,
  CalendarHeatmap,
} from '../../components/charts';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

// Types
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  avatar?: string;
}

interface HealthScore {
  overallScore: number;
  symptomScore: number;
  sleepScore: number;
  exerciseScore: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendChange: number;
}

interface EngagementMetrics {
  engagementRate: number;
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  totalDays: number;
}

interface Alert {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  detectedAt: string;
  acknowledged: boolean;
}

interface SymptomLog {
  id: string;
  logDate: string;
  symptoms: string[];
  averageSeverity: number;
  mood: string;
  triggers: string[];
  notes?: string;
}

interface SymptomTrend {
  date: string;
  averageSeverity: number;
  logCount: number;
}

interface SymptomSummary {
  totalLogs: number;
  averageSeverity: number;
  mostCommonSymptoms: Array<{
    symptom: string;
    count: number;
    percentage: number;
  }>;
  moodDistribution: {
    [key: string]: number;
  };
  commonTriggers: Array<{
    trigger: string;
    count: number;
  }>;
}

interface SleepLog {
  id: string;
  logDate: string;
  bedtime: string;
  wakeTime: string;
  hoursSlept: number;
  quality: number;
  disturbances: string[];
  notes?: string;
}

interface SleepMetrics {
  averageHours7Day: number;
  averageHours30Day: number;
  averageQuality7Day: number;
  averageQuality30Day: number;
  consistencyScore: number;
  sleepDebt: number;
  commonDisturbances: Array<{
    disturbance: string;
    count: number;
    percentage: number;
  }>;
}

interface ExerciseLog {
  id: string;
  logDate: string;
  activityType: string;
  durationMinutes: number;
  intensity: string;
  moodAfter: string;
  notes?: string;
}

interface ExerciseStats {
  totalMinutesThisMonth: number;
  totalSessions: number;
  averageMinutesPerSession: number;
  activeDaysPercentage: number;
  currentStreak: number;
  longestStreak: number;
  favoriteActivities: Array<{
    activity: string;
    totalMinutes: number;
    count: number;
  }>;
  moodImpact?: {
    improvementPercentage: number;
    beforeAverage: number;
    afterAverage: number;
  };
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  dataPoints: number;
  clinicalSignificance: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Correlation {
  variable1: string;
  variable2: string;
  coefficient: number;
  strength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
}

interface ClinicianNote {
  id: string;
  content: string;
  createdAt: string;
  clinicianName: string;
}

// Helper functions
const getHealthScoreColor = (score: number): string => {
  if (score >= 81) return '#4caf50';
  if (score >= 61) return '#ffeb3b';
  if (score >= 31) return '#ff9800';
  return '#f44336';
};

const getMoodIcon = (mood: string) => {
  switch (mood.toLowerCase()) {
    case 'very_happy':
      return <SentimentVerySatisfied color="success" />;
    case 'happy':
      return <SentimentSatisfied color="success" />;
    case 'neutral':
      return <SentimentNeutral color="action" />;
    case 'sad':
      return <SentimentDissatisfied color="warning" />;
    case 'very_sad':
      return <SentimentVeryDissatisfied color="error" />;
    default:
      return <SentimentNeutral color="action" />;
  }
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (timeString: string): string => {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function ClientProgress() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'symptoms');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [noteContent, setNoteContent] = useState('');
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Get current user (clinician)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  // Fetch clients assigned to this clinician
  const { data: assignedClients, isLoading: loadingClients } = useQuery({
    queryKey: ['assignedClients', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(`/clients?therapistId=${currentUser.id}`);
      return response.data.data;
    },
    enabled: !!currentUser?.id,
  });

  // Calculate date range for API calls
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch combined analytics (includes healthScore, patterns, correlations)
  const { data: combinedAnalytics, isLoading: loadingHealthScore } = useQuery({
    queryKey: ['combinedAnalytics', selectedClient?.id, dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await api.get(
        `/tracking/analytics/${selectedClient!.id}/combined?startDate=${startDate}&endDate=${endDate}`
      );
      return response.data.data;
    },
    enabled: !!selectedClient?.id,
  });

  // Extract health score from combined analytics
  const healthScore: HealthScore | undefined = combinedAnalytics ? {
    overallScore: combinedAnalytics.healthScore || 0,
    symptomScore: combinedAnalytics.symptoms?.averageSeverity ? Math.max(0, 100 - combinedAnalytics.symptoms.averageSeverity * 10) : 0,
    sleepScore: combinedAnalytics.sleep?.averageQuality ? combinedAnalytics.sleep.averageQuality * 20 : 0,
    exerciseScore: combinedAnalytics.exercise?.totalMinutes ? Math.min(100, (combinedAnalytics.exercise.totalMinutes / 150) * 100) : 0,
    trend: 'STABLE' as const,
    trendChange: 0,
  } : undefined;

  // Fetch engagement metrics
  const { data: engagement, isLoading: loadingEngagement } = useQuery<EngagementMetrics>({
    queryKey: ['engagement', selectedClient?.id, dateRange],
    queryFn: async () => {
      const response = await api.get(
        `/tracking/reminders/${selectedClient!.id}/engagement?days=${dateRange}`
      );
      // Transform the response to match expected format
      const engagementScore = response.data.data?.engagementScore || 0;
      return {
        engagementRate: engagementScore,
        currentStreak: 0, // Not available from this endpoint
        longestStreak: 0,
        totalDaysLogged: Math.round(engagementScore * parseInt(dateRange) / 100),
        totalDays: parseInt(dateRange),
      };
    },
    enabled: !!selectedClient?.id,
  });

  // Alerts derived from combined analytics patterns (no separate endpoint)
  const alerts: Alert[] = combinedAnalytics?.patterns?.filter((p: any) => p.confidence >= 70).map((p: any, idx: number) => ({
    id: `pattern-${idx}`,
    type: p.type.includes('INCONSISTENT') || p.type.includes('POOR') ? 'WARNING' as const : 'INFO' as const,
    message: p.description,
    detectedAt: new Date().toISOString(),
    acknowledged: false,
  })) || [];

  // Fetch symptom data (lazy load on tab view)
  const { data: symptomLogs, isLoading: loadingSymptoms } = useQuery<SymptomLog[]>({
    queryKey: ['symptomLogs', selectedClient?.id, dateRange],
    queryFn: async () => {
      const response = await api.get(
        `/tracking/symptoms/${selectedClient!.id}?days=${dateRange}`
      );
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'symptoms',
  });

  const { data: symptomTrends } = useQuery<SymptomTrend[]>({
    queryKey: ['symptomTrends', selectedClient?.id, dateRange],
    queryFn: async () => {
      const response = await api.get(
        `/tracking/symptoms/${selectedClient!.id}/trends?days=${dateRange}`
      );
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'symptoms',
  });

  const { data: symptomSummary } = useQuery<SymptomSummary>({
    queryKey: ['symptomSummary', selectedClient?.id, dateRange],
    queryFn: async () => {
      const response = await api.get(
        `/tracking/symptoms/${selectedClient!.id}/summary?days=${dateRange}`
      );
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'symptoms',
  });

  // Fetch sleep data
  const { data: sleepLogs, isLoading: loadingSleep } = useQuery<SleepLog[]>({
    queryKey: ['sleepLogs', selectedClient?.id, dateRange],
    queryFn: async () => {
      const response = await api.get(
        `/tracking/sleep/${selectedClient!.id}?days=${dateRange}`
      );
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'sleep',
  });

  const { data: sleepMetrics } = useQuery<SleepMetrics>({
    queryKey: ['sleepMetrics', selectedClient?.id],
    queryFn: async () => {
      const response = await api.get(`/tracking/sleep/${selectedClient!.id}/metrics`);
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'sleep',
  });

  // Fetch exercise data
  const { data: exerciseLogs, isLoading: loadingExercise } = useQuery<ExerciseLog[]>({
    queryKey: ['exerciseLogs', selectedClient?.id, dateRange],
    queryFn: async () => {
      const response = await api.get(
        `/tracking/exercise/${selectedClient!.id}?days=${dateRange}`
      );
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'exercise',
  });

  const { data: exerciseStats } = useQuery<ExerciseStats>({
    queryKey: ['exerciseStats', selectedClient?.id],
    queryFn: async () => {
      const response = await api.get(`/tracking/exercise/${selectedClient!.id}/stats`);
      return response.data.data;
    },
    enabled: !!selectedClient?.id && activeTab === 'exercise',
  });

  // Patterns and correlations come from combined analytics
  const patterns: Pattern[] = combinedAnalytics?.patterns?.map((p: any) => ({
    id: p.type,
    name: p.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
    description: p.description,
    confidence: p.confidence >= 70 ? 'HIGH' : p.confidence >= 40 ? 'MEDIUM' : 'LOW',
    dataPoints: 0, // Not available from backend
    clinicalSignificance: p.confidence >= 70 ? 'HIGH' : p.confidence >= 40 ? 'MEDIUM' : 'LOW',
  })) || [];

  const correlations: Correlation[] = combinedAnalytics?.correlations?.map((c: any) => ({
    variable1: c.metric1,
    variable2: c.metric2,
    coefficient: c.correlation,
    strength: c.strength as 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE',
  })) || [];

  // Clinician notes - placeholder (no backend endpoint yet)
  // TODO: Implement /tracking/notes endpoint on backend
  const clinicianNotes: ClinicianNote[] = [];

  // Save clinician note mutation - disabled until backend endpoint is added
  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      // Backend endpoint not yet implemented
      console.warn('Clinician notes endpoint not yet implemented');
      throw new Error('Feature not yet available');
    },
    onSuccess: () => {
      toast.success('Note saved successfully');
      setNoteContent('');
      queryClient.invalidateQueries({ queryKey: ['clinicianNotes', selectedClient?.id] });
    },
    onError: () => {
      toast.error('Notes feature coming soon');
    },
  });

  // Export data
  const exportData = async (type: 'symptoms' | 'sleep' | 'exercise' | 'all') => {
    try {
      const { startDate, endDate } = getDateRange();
      const response = await api.get(
        `/tracking/export/${selectedClient!.id}/csv?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedClient!.firstName}_${type}_data.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Export full report
  const exportFullReport = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const response = await api.get(
        `/tracking/analytics/${selectedClient!.id}/report?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedClient!.firstName}_progress_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue });
  };

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      navigate(`/clinician/client-progress?clientId=${client.id}&tab=${activeTab}`);
    }
  };

  const handleSaveNote = () => {
    if (noteContent.trim()) {
      saveNoteMutation.mutate(noteContent);
    }
  };

  const criticalAlerts = alerts?.filter((a) => a.type === 'CRITICAL') || [];

  // Prepare chart data
  const symptomFrequencyData = useMemo(() => {
    if (!symptomSummary?.mostCommonSymptoms) return [];
    return symptomSummary.mostCommonSymptoms.map((s) => ({
      symptom: s.symptom,
      count: s.count,
      percentage: s.percentage,
    }));
  }, [symptomSummary]);

  const moodDistributionData = useMemo(() => {
    if (!symptomSummary?.moodDistribution) return [];
    return Object.entries(symptomSummary.moodDistribution).map(([mood, count]) => ({
      name: mood.replace('_', ' '),
      value: count,
    }));
  }, [symptomSummary]);

  const sleepChartData = useMemo(() => {
    if (!sleepLogs) return [];
    return sleepLogs.map((log) => ({
      date: formatDate(log.logDate),
      hours: log.hoursSlept,
      quality: log.quality,
    }));
  }, [sleepLogs]);

  const sleepHeatmapData = useMemo(() => {
    if (!sleepLogs) return [];
    return sleepLogs.map((log) => ({
      date: log.logDate,
      value: log.quality,
    }));
  }, [sleepLogs]);

  const exerciseChartData = useMemo(() => {
    if (!exerciseLogs) return [];
    const weeklyData: { [week: string]: { [intensity: string]: number } } = {};

    exerciseLogs.forEach((log) => {
      const date = new Date(log.logDate);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = formatDate(weekStart.toISOString());

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { LOW: 0, MODERATE: 0, HIGH: 0 };
      }
      weeklyData[weekKey][log.intensity] =
        (weeklyData[weekKey][log.intensity] || 0) + log.durationMinutes;
    });

    return Object.entries(weeklyData).map(([week, intensities]) => ({
      week,
      ...intensities,
    }));
  }, [exerciseLogs]);

  const activityTypeData = useMemo(() => {
    if (!exerciseStats?.favoriteActivities) return [];
    return exerciseStats.favoriteActivities.map((activity) => ({
      name: activity.activity,
      value: activity.totalMinutes,
    }));
  }, [exerciseStats]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!selectedClient) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Client Progress Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Select a client to view their self-tracking progress
          </Typography>
          <Autocomplete<Client>
            sx={{ maxWidth: 500, mx: 'auto' }}
            options={assignedClients || []}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
            loading={loadingClients}
            onChange={(_, value) => handleClientSelect(value as Client | null)}
            renderInput={(params) => (
              <TextField {...params} label="Search Clients" placeholder="Type to search..." />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar sx={{ mr: 2 }}>{option.firstName[0]}</Avatar>
                <Box>
                  <Typography variant="body1">
                    {option.firstName} {option.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header with client selector */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Avatar sx={{ width: 56, height: 56 }}>
            {selectedClient.firstName[0]}
            {selectedClient.lastName[0]}
          </Avatar>
          <Box sx={{ flex: 1, maxWidth: 400 }}>
            <Autocomplete
              value={selectedClient}
              options={assignedClients || []}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              loading={loadingClients}
              onChange={(_, value) => handleClientSelect(value)}
              renderInput={(params) => (
                <TextField {...params} label="Client" size="small" />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar sx={{ mr: 2 }}>{option.firstName[0]}</Avatar>
                  <Box>
                    <Typography variant="body2">
                      {option.firstName} {option.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {option.id}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          </Box>
        </Box>
        <ToggleButtonGroup
          value={dateRange}
          exclusive
          onChange={(_, value) => value && setDateRange(value)}
          size="small"
        >
          <ToggleButton value="7">7 Days</ToggleButton>
          <ToggleButton value="30">30 Days</ToggleButton>
          <ToggleButton value="90">90 Days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Overall Health Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {loadingHealthScore ? (
                  <Skeleton variant="circular" width={60} height={60} />
                ) : (
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: getHealthScoreColor(healthScore?.overallScore || 0),
                      color: 'white',
                      fontSize: 24,
                      fontWeight: 'bold',
                    }}
                  >
                    {healthScore?.overallScore || 0}
                  </Box>
                )}
                <Box>
                  {healthScore?.trend === 'UP' && <TrendingUp color="success" />}
                  {healthScore?.trend === 'DOWN' && <TrendingDown color="error" />}
                  <Typography variant="caption" color="text.secondary">
                    {healthScore?.trend === 'STABLE' ? 'Stable' : `${healthScore?.trendChange}%`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Last {dateRange} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Engagement Score
              </Typography>
              {loadingEngagement ? (
                <Skeleton variant="rectangular" height={60} />
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h3" component="div">
                      {Math.round(engagement?.engagementRate || 0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={engagement?.engagementRate || 0}
                    sx={{ mb: 1, height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Target: {'>'}60% ({engagement?.totalDaysLogged}/{engagement?.totalDays} days)
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Current Streak
              </Typography>
              {loadingEngagement ? (
                <Skeleton variant="rectangular" height={60} />
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocalFireDepartment sx={{ fontSize: 40, color: '#ff6b6b' }} />
                    <Typography variant="h3" component="div">
                      {engagement?.currentStreak || 0}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Longest: {engagement?.longestStreak || 0} days
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs: 12, sm: 6, md: 3}}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Alerts
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Warning
                  sx={{ fontSize: 40, color: criticalAlerts.length > 0 ? '#f44336' : '#9e9e9e' }}
                />
                <Typography variant="h3" component="div">
                  {alerts?.length || 0}
                </Typography>
              </Box>
              {criticalAlerts.length > 0 && (
                <Chip label={`${criticalAlerts.length} Critical`} color="error" size="small" />
              )}
              <Typography variant="caption" color="text.secondary">
                Concerning patterns detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<Psychology />} label="Symptoms" value="symptoms" />
          <Tab icon={<NightsStay />} label="Sleep" value="sleep" />
          <Tab icon={<FitnessCenter />} label="Exercise" value="exercise" />
          <Tab icon={<Assessment />} label="Analytics" value="analytics" />
        </Tabs>
      </Paper>

      {/* Symptoms Tab */}
      {activeTab === 'symptoms' && (
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 8}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              {loadingSymptoms ? (
                <Skeleton variant="rectangular" height={300} />
              ) : symptomTrends && symptomTrends.length > 0 ? (
                <SymptomTrendChart data={symptomTrends} height={300} />
              ) : (
                <Alert severity="info">No symptom data available for this period</Alert>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Symptom Frequency
              </Typography>
              {symptomFrequencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={symptomFrequencyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="symptom" width={150} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No symptom frequency data available</Alert>
              )}
            </Paper>
          </Grid>

          <Grid size={{xs: 12, md: 4}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Key Insights
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Most Common Symptoms
              </Typography>
              {symptomSummary?.mostCommonSymptoms.slice(0, 3).map((symptom, idx) => (
                <Box key={idx} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{symptom.symptom}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {symptom.count} ({symptom.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={symptom.percentage}
                    sx={{ height: 4, borderRadius: 1, mb: 1 }}
                  />
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Average Severity
              </Typography>
              <Typography variant="h4" gutterBottom>
                {symptomSummary?.averageSeverity.toFixed(1)} / 10
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Most Common Triggers
              </Typography>
              {symptomSummary?.commonTriggers.slice(0, 3).map((trigger, idx) => (
                <Chip key={idx} label={`${trigger.trigger} (${trigger.count})`} sx={{ mr: 1, mb: 1 }} />
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Mood Distribution
              </Typography>
              {moodDistributionData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={moodDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {moodDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => exportData('symptoms')}
            >
              Export Symptom Data
            </Button>
          </Grid>

          <Grid size={{xs: 12}}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Symptom Logs
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Symptoms</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Mood</TableCell>
                      <TableCell>Triggers</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {symptomLogs?.slice(0, 10).map((log) => (
                      <TableRow
                        key={log.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedLogDetails(log);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <TableCell>{formatDate(log.logDate)}</TableCell>
                        <TableCell>
                          {log.symptoms.map((s, idx) => (
                            <Chip key={idx} label={s} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.averageSeverity.toFixed(1)}
                            size="small"
                            color={log.averageSeverity > 7 ? 'error' : log.averageSeverity > 4 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell>{getMoodIcon(log.mood)}</TableCell>
                        <TableCell>
                          {log.triggers.slice(0, 2).map((t, idx) => (
                            <Chip key={idx} label={t} size="small" variant="outlined" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Sleep Tab */}
      {activeTab === 'sleep' && (
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 8}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              {loadingSleep ? (
                <Skeleton variant="rectangular" height={300} />
              ) : sleepChartData.length > 0 ? (
                <SleepQualityChart data={sleepChartData} height={300} />
              ) : (
                <Alert severity="info">No sleep data available for this period</Alert>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Sleep Calendar Heatmap
              </Typography>
              {sleepHeatmapData.length > 0 ? (
                <CalendarHeatmap data={sleepHeatmapData} />
              ) : (
                <Alert severity="info">No sleep heatmap data available</Alert>
              )}
            </Paper>
          </Grid>

          <Grid size={{xs: 12, md: 4}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Sleep Metrics
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Average Hours
              </Typography>
              <Typography variant="body2" color="text.secondary">
                7-day: {sleepMetrics?.averageHours7Day.toFixed(1)} hrs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                30-day: {sleepMetrics?.averageHours30Day.toFixed(1)} hrs
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Average Quality
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Box
                    key={star}
                    sx={{
                      fontSize: 24,
                      color: star <= (sleepMetrics?.averageQuality30Day || 0) ? '#ffc107' : '#e0e0e0',
                    }}
                  >
                    ★
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Consistency Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={sleepMetrics?.consistencyScore || 0}
                  sx={{ flex: 1, height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" fontWeight="bold">
                  {sleepMetrics?.consistencyScore || 0}%
                </Typography>
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Sleep Debt
              </Typography>
              <Typography
                variant="h5"
                color={
                  (sleepMetrics?.sleepDebt || 0) > 0 ? 'error.main' : 'success.main'
                }
                sx={{ mb: 2 }}
              >
                {(sleepMetrics?.sleepDebt ?? 0) > 0 ? '+' : ''}
                {(sleepMetrics?.sleepDebt ?? 0).toFixed(1)} hrs
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Common Disturbances
              </Typography>
              {sleepMetrics?.commonDisturbances.slice(0, 3).map((disturbance, idx) => (
                <Box key={idx} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {disturbance.disturbance} ({disturbance.percentage}%)
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Recommendations
              </Typography>
              {sleepMetrics && sleepMetrics.averageHours30Day < 7 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Consider earlier bedtime (avg {sleepMetrics.averageHours30Day.toFixed(1)} hrs)
                </Alert>
              )}
              {sleepMetrics && sleepMetrics.consistencyScore > 80 && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  Sleep consistency is excellent!
                </Alert>
              )}
            </Paper>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => exportData('sleep')}
            >
              Export Sleep Data
            </Button>
          </Grid>

          <Grid size={{xs: 12}}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Sleep Logs
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Bedtime</TableCell>
                      <TableCell>Wake Time</TableCell>
                      <TableCell>Hours</TableCell>
                      <TableCell>Quality</TableCell>
                      <TableCell>Disturbances</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sleepLogs?.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.logDate)}</TableCell>
                        <TableCell>{formatTime(log.bedtime)}</TableCell>
                        <TableCell>{formatTime(log.wakeTime)}</TableCell>
                        <TableCell>{log.hoursSlept.toFixed(1)} hrs</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Box
                                key={star}
                                sx={{
                                  fontSize: 16,
                                  color: star <= log.quality ? '#ffc107' : '#e0e0e0',
                                }}
                              >
                                ★
                              </Box>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {log.disturbances.map((d, idx) => (
                            <Chip key={idx} label={d} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Exercise Tab */}
      {activeTab === 'exercise' && (
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 8}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Weekly Activity
              </Typography>
              {loadingExercise ? (
                <Skeleton variant="rectangular" height={300} />
              ) : exerciseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={exerciseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="LOW" stackId="a" fill="#4caf50" name="Low" />
                    <Bar dataKey="MODERATE" stackId="a" fill="#ff9800" name="Moderate" />
                    <Bar dataKey="HIGH" stackId="a" fill="#f44336" name="High" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No exercise data available for this period</Alert>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Type Breakdown
              </Typography>
              {activityTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value} min`}
                    >
                      {activityTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No activity breakdown data available</Alert>
              )}
            </Paper>
          </Grid>

          <Grid size={{xs: 12, md: 4}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Exercise Stats
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                This Month
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {exerciseStats?.totalMinutesThisMonth || 0} minutes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sessions: {exerciseStats?.totalSessions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Avg/session: {exerciseStats?.averageMinutesPerSession.toFixed(1) || 0} min
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Progress to Goal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Weekly target: 150 min (WHO)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((exerciseStats?.totalMinutesThisMonth || 0) / 6, 100)}
                  sx={{ flex: 1, height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" fontWeight="bold">
                  {Math.round((exerciseStats?.totalMinutesThisMonth || 0) / 6)}%
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Streaks
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocalFireDepartment sx={{ color: '#ff6b6b' }} />
                <Typography variant="body2">
                  Current: {exerciseStats?.currentStreak || 0} days
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Longest: {exerciseStats?.longestStreak || 0} days
              </Typography>

              <Divider sx={{ my: 2 }} />

              {exerciseStats?.moodImpact && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Mood Impact
                  </Typography>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Exercise improves mood by {exerciseStats.moodImpact.improvementPercentage}%
                  </Alert>
                </>
              )}

              <Typography variant="subtitle2" gutterBottom>
                Favorite Activities
              </Typography>
              {exerciseStats?.favoriteActivities.slice(0, 3).map((activity, idx) => (
                <Box key={idx} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {activity.activity}: {activity.totalMinutes} min ({activity.count} sessions)
                  </Typography>
                </Box>
              ))}
            </Paper>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => exportData('exercise')}
            >
              Export Exercise Data
            </Button>
          </Grid>

          <Grid size={{xs: 12}}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Exercise Logs
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Intensity</TableCell>
                      <TableCell>Mood After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exerciseLogs?.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.logDate)}</TableCell>
                        <TableCell>{log.activityType}</TableCell>
                        <TableCell>{log.durationMinutes} min</TableCell>
                        <TableCell>
                          <Chip
                            label={log.intensity}
                            size="small"
                            color={
                              log.intensity === 'HIGH'
                                ? 'error'
                                : log.intensity === 'MODERATE'
                                ? 'warning'
                                : 'success'
                            }
                          />
                        </TableCell>
                        <TableCell>{getMoodIcon(log.moodAfter)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Detected Patterns
              </Typography>
              {patterns && patterns.length > 0 ? (
                patterns.map((pattern) => (
                  <Card key={pattern.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {pattern.name}
                        </Typography>
                        <Chip
                          label={pattern.confidence}
                          size="small"
                          color={
                            pattern.confidence === 'HIGH'
                              ? 'success'
                              : pattern.confidence === 'MEDIUM'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {pattern.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">
                          Data points: {pattern.dataPoints}
                        </Typography>
                        <Chip
                          label={`${pattern.clinicalSignificance} significance`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert severity="info">No patterns detected yet. More data needed.</Alert>
              )}
            </Paper>
          </Grid>

          <Grid size={{xs: 12, md: 6}}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Correlation Matrix
              </Typography>
              {correlations && correlations.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Variables</TableCell>
                        <TableCell align="right">Coefficient</TableCell>
                        <TableCell align="right">Strength</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {correlations.map((corr, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {corr.variable1} vs {corr.variable2}
                          </TableCell>
                          <TableCell align="right">{corr.coefficient.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={corr.strength}
                              size="small"
                              color={
                                corr.strength === 'STRONG'
                                  ? 'success'
                                  : corr.strength === 'MODERATE'
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No correlations detected yet. More data needed.</Alert>
              )}
            </Paper>
          </Grid>

          <Grid size={{xs: 12}}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Health Score Breakdown
              </Typography>
              {healthScore && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Symptoms', value: healthScore.symptomScore },
                        { name: 'Sleep', value: healthScore.sleepScore },
                        { name: 'Exercise', value: healthScore.exerciseScore },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Clinical Notes Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Clinical Notes
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Add clinical observations about this client's progress..."
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSaveNote}
          disabled={!noteContent.trim() || saveNoteMutation.isPending}
        >
          Save Note
        </Button>

        {clinicianNotes && clinicianNotes.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Previous Notes
            </Typography>
            {clinicianNotes.map((note) => (
              <Card key={note.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">{note.clinicianName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(note.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{note.content}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Export Full Report */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<FileDownload />}
          onClick={exportFullReport}
        >
          Export Full Report (PDF)
        </Button>
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Log Details</DialogTitle>
        <DialogContent>
          {selectedLogDetails && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date: {formatDate(selectedLogDetails.logDate)}
              </Typography>
              {selectedLogDetails.symptoms && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Symptoms:</Typography>
                  {selectedLogDetails.symptoms.map((s: string, idx: number) => (
                    <Chip key={idx} label={s} sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              )}
              {selectedLogDetails.notes && (
                <Box>
                  <Typography variant="subtitle2">Notes:</Typography>
                  <Typography variant="body2">{selectedLogDetails.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
