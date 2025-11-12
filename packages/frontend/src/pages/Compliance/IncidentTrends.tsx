import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  alpha
} from '@mui/material';
import {
  TrendingUp,
  Download,
  CalendarToday,
  Assessment,
  LocationOn
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useIncident } from '../../hooks/useIncident';

const COLORS = ['#667EEA', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

export default function IncidentTrends() {
  const { getIncidentStats } = useIncident();
  const [timeRange, setTimeRange] = useState('6months');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    const data = await getIncidentStats();
    setStats(data);
  };

  // Trend Data
  const trendData = [
    { month: 'Jul', incidents: 12, resolved: 10 },
    { month: 'Aug', incidents: 15, resolved: 13 },
    { month: 'Sep', incidents: 8, resolved: 8 },
    { month: 'Oct', incidents: 18, resolved: 15 },
    { month: 'Nov', incidents: 14, resolved: 11 },
    { month: 'Dec', incidents: 10, resolved: 9 }
  ];

  // Type Distribution
  const typeData = [
    { name: 'Safety', value: 45, color: '#F59E0B' },
    { name: 'Clinical', value: 32, color: '#EF4444' },
    { name: 'Equipment', value: 18, color: '#6366F1' },
    { name: 'Security', value: 12, color: '#8B5CF6' },
    { name: 'Other', value: 8, color: '#64748B' }
  ];

  // Location Heatmap Data
  const locationData = [
    { location: 'Emergency Room', count: 23, severity: 'high' },
    { location: 'Intensive Care', count: 18, severity: 'critical' },
    { location: 'Surgery', count: 15, severity: 'medium' },
    { location: 'Radiology', count: 12, severity: 'medium' },
    { location: 'Laboratory', count: 9, severity: 'low' },
    { location: 'Outpatient', count: 7, severity: 'low' }
  ];

  // Resolution Time Data
  const resolutionData = [
    { range: '0-2 days', count: 45 },
    { range: '3-5 days', count: 32 },
    { range: '6-10 days', count: 18 },
    { range: '11-15 days', count: 8 },
    { range: '15+ days', count: 5 }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#64748B';
    }
  };

  const insightCards = [
    {
      title: 'Most Common Type',
      value: 'Safety Incidents',
      percentage: '39%',
      trend: '+5%',
      color: '#F59E0B'
    },
    {
      title: 'Peak Time',
      value: 'October 2024',
      percentage: '18 incidents',
      trend: '+12%',
      color: '#EF4444'
    },
    {
      title: 'Avg Resolution',
      value: '4.2 days',
      percentage: 'Improved',
      trend: '-1.3 days',
      color: '#10B981'
    },
    {
      title: 'Repeat Locations',
      value: 'Emergency Room',
      percentage: '23 incidents',
      trend: '+8%',
      color: '#6366F1'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          borderRadius: 3,
          mb: 3,
          color: 'white',
          boxShadow: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Incident Trends & Analytics
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Comprehensive analysis of incident patterns and metrics
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 150 }}>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  sx={{
                    color: 'white',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '.MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  <MenuItem value="3months">Last 3 Months</MenuItem>
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                  <MenuItem value="12months">Last 12 Months</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<Download />}
                sx={{
                  bgcolor: 'white',
                  color: '#667EEA',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                Export Report
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Insight Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {insightCards.map((card, idx) => (
          <Grid item xs={12} sm={6} lg={3} key={idx}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                border: '2px solid',
                borderColor: alpha(card.color, 0.2),
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  borderColor: card.color
                }
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: card.color }}>
                  {card.value}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={card.percentage}
                    size="small"
                    sx={{
                      bgcolor: alpha(card.color, 0.1),
                      color: card.color,
                      fontWeight: 600
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {card.trend}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Trend Over Time */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Incident Trends Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667EEA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#667EEA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="#667EEA"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorIncidents)"
                    name="Total Incidents"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorResolved)"
                    name="Resolved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Breakdown by Type */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Breakdown by Type
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Heat Map by Location */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Heat Map by Location
              </Typography>
              <Stack spacing={2}>
                {locationData.map((loc) => (
                  <Paper
                    key={loc.location}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: alpha(getSeverityColor(loc.severity), 0.2),
                      bgcolor: alpha(getSeverityColor(loc.severity), 0.05)
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <LocationOn sx={{ color: getSeverityColor(loc.severity), fontSize: 28 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {loc.location}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {loc.count} incidents
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: `${(loc.count / 23) * 200}px`,
                          height: 8,
                          borderRadius: 4,
                          background: `linear-gradient(90deg, ${getSeverityColor(loc.severity)}, ${alpha(getSeverityColor(loc.severity), 0.5)})`
                        }}
                      />
                      <Chip
                        label={loc.severity.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: alpha(getSeverityColor(loc.severity), 0.1),
                          color: getSeverityColor(loc.severity),
                          fontWeight: 700
                        }}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Resolution Time Metrics */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Resolution Time Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolutionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#667EEA" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Analysis Insights */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 3,
              background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Assessment sx={{ fontSize: 32, color: '#667EEA' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Trend Analysis Insights
                </Typography>
              </Stack>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#10B981' }}>
                      Positive Trends
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        • Resolution time has improved by 1.3 days over the last quarter
                      </Typography>
                      <Typography variant="body2">
                        • Critical incidents decreased by 15% month-over-month
                      </Typography>
                      <Typography variant="body2">
                        • Equipment failure incidents reduced by 22% after maintenance program
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'white' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#F59E0B' }}>
                      Areas for Improvement
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        • Emergency Room continues to have the highest incident rate
                      </Typography>
                      <Typography variant="body2">
                        • Safety incidents increased by 8% - requires additional training
                      </Typography>
                      <Typography variant="body2">
                        • Weekend shifts show 25% higher incident rates
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
