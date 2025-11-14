import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  alpha
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Description,
  Warning,
  CheckCircle,
  Schedule,
  Assignment
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { usePolicy } from '../../hooks/usePolicy';
import { useIncident } from '../../hooks/useIncident';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export default function ComplianceDashboard() {
  const { policies } = usePolicy();
  const { incidents, getIncidentStats } = useIncident();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getIncidentStats();
    setStats(data);
  };

  const acknowledgmentData = [
    { name: 'Acknowledged', value: 234, color: '#10B981' },
    { name: 'Pending', value: 45, color: '#F59E0B' },
    { name: 'Overdue', value: 12, color: '#EF4444' }
  ];

  const severityData = [
    { severity: 'Critical', count: 8, color: '#EF4444' },
    { severity: 'High', count: 23, color: '#F97316' },
    { severity: 'Medium', count: 45, color: '#F59E0B' },
    { severity: 'Low', count: 67, color: '#10B981' }
  ];

  const recentIncidents = [
    {
      id: '1',
      title: 'Equipment malfunction in Room 302',
      severity: 'HIGH',
      date: '2024-01-20',
      status: 'UNDER_INVESTIGATION'
    },
    {
      id: '2',
      title: 'Patient fall incident',
      severity: 'CRITICAL',
      date: '2024-01-19',
      status: 'CORRECTIVE_ACTION'
    },
    {
      id: '3',
      title: 'Documentation error',
      severity: 'MEDIUM',
      date: '2024-01-18',
      status: 'RESOLVED'
    }
  ];

  const pendingAcknowledgments = [
    { id: '1', policy: 'HIPAA Privacy Policy', dueDate: '2024-01-25', daysLeft: 5 },
    { id: '2', policy: 'Safety Procedures Update', dueDate: '2024-01-28', daysLeft: 8 },
    { id: '3', policy: 'IT Security Guidelines', dueDate: '2024-02-01', daysLeft: 12 }
  ];

  const statCards = [
    {
      title: 'Active Policies',
      value: policies.filter(p => p.status === 'ACTIVE').length,
      change: '+3',
      trend: 'up',
      icon: Description,
      color: '#667EEA',
      gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
    },
    {
      title: 'Open Incidents',
      value: incidents.filter(i => i.status !== 'CLOSED').length,
      change: '-5',
      trend: 'down',
      icon: Warning,
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
    },
    {
      title: 'Acknowledgment Rate',
      value: '84%',
      change: '+7%',
      trend: 'up',
      icon: CheckCircle,
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
    },
    {
      title: 'Avg Resolution Time',
      value: '4.2 days',
      change: '-1.3',
      trend: 'down',
      icon: Schedule,
      color: '#6366F1',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white'
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Compliance Dashboard
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Monitor policy compliance and incident management metrics
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <Grid size={{xs: 12, sm: 6, lg: 3}} key={stat.title}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: stat.gradient,
                    opacity: 0.1
                  }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        {stat.value}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TrendIcon
                          sx={{
                            fontSize: 16,
                            color: stat.trend === 'up' ? '#10B981' : '#EF4444'
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: stat.trend === 'up' ? '#10B981' : '#EF4444',
                            fontWeight: 600
                          }}
                        >
                          {stat.change}
                        </Typography>
                      </Stack>
                    </Box>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        background: stat.gradient
                      }}
                    >
                      <Icon sx={{ fontSize: 28 }} />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={3}>
        {/* Policy Acknowledgment Rate */}
        <Grid size={{xs: 12, md: 6}}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Policy Acknowledgment Rate
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={acknowledgmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {acknowledgmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                {acknowledgmentData.map((item) => (
                  <Stack key={item.name} direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 1,
                        bgcolor: item.color
                      }}
                    />
                    <Typography variant="body2">
                      {item.name}: {item.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Open Incidents by Severity */}
        <Grid size={{xs: 12, md: 6}}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Open Incidents by Severity
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="severity" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Incidents */}
        <Grid size={{xs: 12, md: 6}}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Recent Incidents
              </Typography>
              <List>
                {recentIncidents.map((incident) => (
                  <ListItem
                    key={incident.id}
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                      bgcolor: alpha('#667EEA', 0.03),
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: incident.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B'
                        }}
                      >
                        <Warning />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={incident.title}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip
                            label={incident.severity}
                            size="small"
                            sx={{
                              bgcolor: incident.severity === 'CRITICAL' ? alpha('#EF4444', 0.1) : alpha('#F59E0B', 0.1),
                              color: incident.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B'
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(incident.date).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Acknowledgments */}
        <Grid size={{xs: 12, md: 6}}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Pending Acknowledgments
              </Typography>
              <List>
                {pendingAcknowledgments.map((item) => (
                  <Paper
                    key={item.id}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: item.daysLeft <= 7 ? '#F59E0B' : 'divider'
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {item.policy}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={`${item.daysLeft} days left`}
                          size="small"
                          color={item.daysLeft <= 7 ? 'warning' : 'default'}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(0, 100 - (item.daysLeft / 14) * 100)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha('#667EEA', 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: item.daysLeft <= 7
                              ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                              : 'linear-gradient(90deg, #667EEA 0%, #764BA2 100%)'
                          }
                        }}
                      />
                    </Stack>
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
