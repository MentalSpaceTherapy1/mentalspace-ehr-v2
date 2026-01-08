import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  alpha,
  Skeleton,
  Alert
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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePolicy } from '../../hooks/usePolicy';
import { useIncident } from '../../hooks/useIncident';
import { api } from '../../lib/api';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export default function ComplianceDashboard() {
  const { policies, fetchPolicies, loading: policiesLoading } = usePolicy();
  const { incidents, fetchIncidents, getIncidentStats, loading: incidentsLoading } = useIncident();
  const [incidentStats, setIncidentStats] = useState<any>(null);

  // Fetch acknowledgment statistics from API
  const { data: acknowledgmentStats, isLoading: ackLoading } = useQuery({
    queryKey: ['acknowledgment-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/policies/acknowledgments/stats');
        return response.data;
      } catch (error) {
        // If endpoint doesn't exist yet, return null
        console.warn('Acknowledgment stats endpoint not available');
        return null;
      }
    }
  });

  // Fetch pending acknowledgments for current user
  const { data: pendingAcknowledgments, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-acknowledgments'],
    queryFn: async () => {
      try {
        const response = await api.get('/policies/pending-acknowledgments');
        return response.data || [];
      } catch (error) {
        console.warn('Pending acknowledgments endpoint not available');
        return [];
      }
    }
  });

  // Load data on mount
  useEffect(() => {
    fetchPolicies();
    fetchIncidents();
    loadIncidentStats();
  }, []);

  const loadIncidentStats = async () => {
    const data = await getIncidentStats();
    setIncidentStats(data);
  };

  // Calculate acknowledgment pie chart data from real stats or policies
  const acknowledgmentData = useMemo(() => {
    if (acknowledgmentStats) {
      return [
        { name: 'Acknowledged', value: acknowledgmentStats.acknowledged || 0, color: '#10B981' },
        { name: 'Pending', value: acknowledgmentStats.pending || 0, color: '#F59E0B' },
        { name: 'Overdue', value: acknowledgmentStats.overdue || 0, color: '#EF4444' }
      ];
    }
    // If no stats endpoint, calculate from policies (basic calculation)
    const activePolicies = policies.filter(p => p.status === 'ACTIVE').length;
    return [
      { name: 'Acknowledged', value: activePolicies > 0 ? activePolicies : 0, color: '#10B981' },
      { name: 'Pending', value: 0, color: '#F59E0B' },
      { name: 'Overdue', value: 0, color: '#EF4444' }
    ];
  }, [acknowledgmentStats, policies]);

  // Calculate severity data from real incident stats
  const severityData = useMemo(() => {
    if (incidentStats?.bySeverity) {
      return [
        { severity: 'Critical', count: incidentStats.bySeverity.CRITICAL || 0, color: '#EF4444' },
        { severity: 'High', count: incidentStats.bySeverity.HIGH || 0, color: '#F97316' },
        { severity: 'Medium', count: incidentStats.bySeverity.MEDIUM || 0, color: '#F59E0B' },
        { severity: 'Low', count: incidentStats.bySeverity.LOW || 0, color: '#10B981' }
      ];
    }
    // Calculate from incidents array if stats not available
    const severityCounts = incidents.reduce((acc: any, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {});
    return [
      { severity: 'Critical', count: severityCounts.CRITICAL || 0, color: '#EF4444' },
      { severity: 'High', count: severityCounts.HIGH || 0, color: '#F97316' },
      { severity: 'Medium', count: severityCounts.MEDIUM || 0, color: '#F59E0B' },
      { severity: 'Low', count: severityCounts.LOW || 0, color: '#10B981' }
    ];
  }, [incidentStats, incidents]);

  // Get recent incidents from real data (sorted by date, top 5)
  const recentIncidents = useMemo(() => {
    return [...incidents]
      .filter(i => i.status !== 'CLOSED')
      .sort((a, b) => new Date(b.incidentDate || b.reportedAt).getTime() - new Date(a.incidentDate || a.reportedAt).getTime())
      .slice(0, 5)
      .map(incident => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        date: incident.incidentDate || incident.reportedAt,
        status: incident.status
      }));
  }, [incidents]);

  // Calculate acknowledgment rate
  const acknowledgmentRate = useMemo(() => {
    if (acknowledgmentStats) {
      const total = (acknowledgmentStats.acknowledged || 0) + (acknowledgmentStats.pending || 0) + (acknowledgmentStats.overdue || 0);
      if (total === 0) return 0;
      return Math.round((acknowledgmentStats.acknowledged / total) * 100);
    }
    return 0;
  }, [acknowledgmentStats]);

  // Calculate average resolution time
  const avgResolutionTime = useMemo(() => {
    if (incidentStats?.averageResolutionTime) {
      return `${incidentStats.averageResolutionTime.toFixed(1)} days`;
    }
    return 'N/A';
  }, [incidentStats]);

  // Calculate stat cards with real data
  const statCards = useMemo(() => [
    {
      title: 'Active Policies',
      value: policies.filter(p => p.status === 'ACTIVE').length,
      change: '',
      trend: 'up',
      icon: Description,
      color: '#667EEA',
      gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      loading: policiesLoading
    },
    {
      title: 'Open Incidents',
      value: incidentStats?.openIncidents ?? incidents.filter(i => i.status !== 'CLOSED').length,
      change: '',
      trend: 'down',
      icon: Warning,
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      loading: incidentsLoading
    },
    {
      title: 'Acknowledgment Rate',
      value: acknowledgmentRate > 0 ? `${acknowledgmentRate}%` : 'N/A',
      change: '',
      trend: 'up',
      icon: CheckCircle,
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      loading: ackLoading
    },
    {
      title: 'Avg Resolution Time',
      value: avgResolutionTime,
      change: '',
      trend: 'down',
      icon: Schedule,
      color: '#6366F1',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      loading: incidentsLoading
    }
  ], [policies, incidents, incidentStats, acknowledgmentRate, avgResolutionTime, policiesLoading, incidentsLoading, ackLoading]);

  // Format pending acknowledgments for display
  const formattedPendingAcknowledgments = useMemo(() => {
    if (!pendingAcknowledgments || !Array.isArray(pendingAcknowledgments)) return [];
    return pendingAcknowledgments.slice(0, 5).map((item: any) => {
      const dueDate = new Date(item.dueDate || item.reviewDate);
      const now = new Date();
      const diffTime = dueDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: item.id,
        policy: item.title || item.policyTitle || 'Unknown Policy',
        dueDate: item.dueDate || item.reviewDate,
        daysLeft: daysLeft > 0 ? daysLeft : 0
      };
    });
  }, [pendingAcknowledgments]);

  const isLoading = policiesLoading || incidentsLoading;

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
                      {stat.loading ? (
                        <Skeleton variant="text" width={80} height={48} />
                      ) : (
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                          {stat.value}
                        </Typography>
                      )}
                      {stat.change && (
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
                      )}
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
              {ackLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Skeleton variant="circular" width={200} height={200} />
                </Box>
              ) : acknowledgmentData.every(d => d.value === 0) ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography color="text.secondary">No acknowledgment data available</Typography>
                </Box>
              ) : (
                <>
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
                </>
              )}
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
              {incidentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Skeleton variant="rectangular" width="100%" height={250} />
                </Box>
              ) : severityData.every(d => d.count === 0) ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography color="text.secondary">No incident data available</Typography>
                </Box>
              ) : (
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
              )}
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
              {incidentsLoading ? (
                <Stack spacing={2}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : recentIncidents.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography color="text.secondary">No recent incidents</Typography>
                </Box>
              ) : (
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
                            bgcolor: incident.severity === 'CRITICAL' ? '#EF4444' :
                                     incident.severity === 'HIGH' ? '#F97316' :
                                     incident.severity === 'MEDIUM' ? '#F59E0B' : '#10B981'
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
                                bgcolor: incident.severity === 'CRITICAL' ? alpha('#EF4444', 0.1) :
                                         incident.severity === 'HIGH' ? alpha('#F97316', 0.1) :
                                         incident.severity === 'MEDIUM' ? alpha('#F59E0B', 0.1) : alpha('#10B981', 0.1),
                                color: incident.severity === 'CRITICAL' ? '#EF4444' :
                                       incident.severity === 'HIGH' ? '#F97316' :
                                       incident.severity === 'MEDIUM' ? '#F59E0B' : '#10B981'
                              }}
                            />
                            <Chip
                              label={incident.status.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                              {new Date(incident.date).toLocaleDateString()}
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
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
              {pendingLoading ? (
                <Stack spacing={2}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : formattedPendingAcknowledgments.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Alert severity="success" sx={{ width: '100%' }}>
                    All policies have been acknowledged!
                  </Alert>
                </Box>
              ) : (
                <List>
                  {formattedPendingAcknowledgments.map((item) => (
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
                            label={item.daysLeft <= 0 ? 'Overdue' : `${item.daysLeft} days left`}
                            size="small"
                            color={item.daysLeft <= 0 ? 'error' : item.daysLeft <= 7 ? 'warning' : 'default'}
                          />
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(100, 100 - (item.daysLeft / 14) * 100))}
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
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
