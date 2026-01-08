import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart
} from 'recharts';
import { api } from '../../lib/api';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

// Helper to calculate date range based on time filter
const getDateRange = (timeRange: string): { startDate: string; endDate: string } => {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: Date;

  switch (timeRange) {
    case '1m':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case '3m':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case '6m':
      startDate = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case '1y':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 6));
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate
  };
};

const AnalyticsCharts: React.FC = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('6m');

  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  // Fetch Credentialing Report
  const { data: credentialingData, isLoading: credentialingLoading, error: credentialingError, refetch: refetchCredentialing } = useQuery({
    queryKey: ['credentialing-report', dateRange],
    queryFn: async () => {
      const response = await api.get('/reports/module9/credentialing', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          includeExpiringSoon: true,
          daysUntilExpiration: 90
        }
      });
      return response.data;
    }
  });

  // Fetch Training Compliance Report
  const { data: trainingData, isLoading: trainingLoading, error: trainingError, refetch: refetchTraining } = useQuery({
    queryKey: ['training-compliance-report', dateRange],
    queryFn: async () => {
      const response = await api.get('/reports/module9/training-compliance', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      return response.data;
    }
  });

  // Fetch Incident Analysis Report
  const { data: incidentData, isLoading: incidentLoading, error: incidentError, refetch: refetchIncident } = useQuery({
    queryKey: ['incident-analysis-report', dateRange],
    queryFn: async () => {
      const response = await api.get('/reports/module9/incident-analysis', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      return response.data;
    }
  });

  // Fetch Financial Report
  const { data: financialData, isLoading: financialLoading, error: financialError, refetch: refetchFinancial } = useQuery({
    queryKey: ['financial-report', dateRange],
    queryFn: async () => {
      const response = await api.get('/reports/module9/financial', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      return response.data;
    }
  });

  // Fetch Vendor Report
  const { data: vendorData, isLoading: vendorLoading, error: vendorError, refetch: refetchVendor } = useQuery({
    queryKey: ['vendor-report', dateRange],
    queryFn: async () => {
      const response = await api.get('/reports/module9/vendor', {
        params: {
          includePerformance: true
        }
      });
      return response.data;
    }
  });

  // Fetch Performance Report
  const { data: performanceData, isLoading: performanceLoading, error: performanceError, refetch: refetchPerformance } = useQuery({
    queryKey: ['performance-report', dateRange],
    queryFn: async () => {
      const response = await api.get('/reports/module9/performance', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      return response.data;
    }
  });

  // Refresh all data
  const refetchAll = () => {
    refetchCredentialing();
    refetchTraining();
    refetchIncident();
    refetchFinancial();
    refetchVendor();
    refetchPerformance();
  };

  // Check if any data is loading
  const isAnyLoading = credentialingLoading || trainingLoading || incidentLoading || financialLoading || vendorLoading || performanceLoading;

  // Transform credential data for trend chart
  const credentialTrendsData = useMemo(() => {
    if (!credentialingData?.data?.monthlyTrends) {
      // If no monthly trends, create from summary
      if (credentialingData?.data?.summary) {
        const summary = credentialingData.data.summary;
        return [{
          month: 'Current',
          active: summary.verified || 0,
          expiring: summary.expiringSoon || 0,
          expired: summary.expired || 0
        }];
      }
      return [];
    }
    return credentialingData.data.monthlyTrends;
  }, [credentialingData]);

  // Transform training data for compliance chart
  const trainingComplianceData = useMemo(() => {
    if (!trainingData?.data?.complianceByCategory) {
      // If no category breakdown, use summary
      if (trainingData?.data?.summary) {
        const summary = trainingData.data.summary;
        return [{
          name: 'Overall',
          completed: summary.completedRate || 0,
          pending: 100 - (summary.completedRate || 0)
        }];
      }
      return [];
    }
    return trainingData.data.complianceByCategory.map((cat: any) => ({
      name: cat.category || cat.name || 'Unknown',
      completed: cat.completionRate || cat.completed || 0,
      pending: 100 - (cat.completionRate || cat.completed || 0)
    }));
  }, [trainingData]);

  // Transform incident data for patterns chart
  const incidentPatternsData = useMemo(() => {
    if (!incidentData?.data?.monthlyTrends) {
      // If no monthly trends, create from severity distribution
      if (incidentData?.data?.bySeverity) {
        const severity = incidentData.data.bySeverity;
        return [{
          month: 'Current',
          level1: severity.LOW || severity.level1 || 0,
          level2: severity.MEDIUM || severity.level2 || 0,
          level3: severity.HIGH || severity.CRITICAL || severity.level3 || 0
        }];
      }
      return [];
    }
    return incidentData.data.monthlyTrends;
  }, [incidentData]);

  // Transform budget data
  const budgetUtilizationData = useMemo(() => {
    if (!financialData?.data?.budgetByCategory) {
      // If no category breakdown, use summary
      if (financialData?.data?.summary) {
        const summary = financialData.data.summary;
        return [{
          category: 'Total',
          budget: summary.totalBudget || 0,
          actual: summary.totalSpent || summary.actualSpend || 0,
          variance: (summary.totalBudget || 0) - (summary.totalSpent || summary.actualSpend || 0)
        }];
      }
      return [];
    }
    return financialData.data.budgetByCategory.map((cat: any) => ({
      category: cat.category || cat.name || 'Unknown',
      budget: cat.budget || cat.allocated || 0,
      actual: cat.actual || cat.spent || 0,
      variance: (cat.budget || cat.allocated || 0) - (cat.actual || cat.spent || 0)
    }));
  }, [financialData]);

  // Transform vendor performance data
  const vendorPerformanceData = useMemo(() => {
    if (!vendorData?.data?.vendors && !vendorData?.data?.performanceScores) {
      return [];
    }
    const vendors = vendorData.data.vendors || vendorData.data.performanceScores || [];
    return vendors.slice(0, 5).map((v: any) => ({
      name: v.name || v.vendorName || 'Unknown',
      value: v.performanceScore || v.rating || v.score || 0
    }));
  }, [vendorData]);

  // Transform department performance data
  const departmentPerformanceData = useMemo(() => {
    if (!performanceData?.data?.byDepartment) {
      // If no department breakdown, use summary
      if (performanceData?.data?.summary) {
        return [{
          department: 'Overall',
          quality: performanceData.data.summary.avgQuality || 0,
          efficiency: performanceData.data.summary.avgEfficiency || 0,
          satisfaction: performanceData.data.summary.avgSatisfaction || 0
        }];
      }
      return [];
    }
    return performanceData.data.byDepartment.map((dept: any) => ({
      department: dept.department || dept.name || 'Unknown',
      quality: dept.qualityScore || dept.quality || 0,
      efficiency: dept.efficiencyScore || dept.efficiency || 0,
      satisfaction: dept.satisfactionScore || dept.satisfaction || 0
    }));
  }, [performanceData]);

  // Calculate summary metrics from real data
  const summaryMetrics = useMemo(() => {
    const trainingCompliance = trainingData?.data?.summary?.completedRate ||
                               trainingData?.data?.summary?.overallComplianceRate || 0;
    const incidentsThisMonth = incidentData?.data?.summary?.totalIncidents ||
                               incidentData?.data?.summary?.currentMonthCount || 0;
    const budgetUtil = financialData?.data?.summary?.utilizationRate ||
                       (financialData?.data?.summary?.totalSpent && financialData?.data?.summary?.totalBudget
                         ? Math.round((financialData.data.summary.totalSpent / financialData.data.summary.totalBudget) * 100)
                         : 0);
    const activeCredentials = credentialingData?.data?.summary?.verified ||
                              credentialingData?.data?.summary?.totalActive || 0;

    // Calculate trends if available
    const trainingTrend = trainingData?.data?.summary?.trend || 0;
    const incidentTrend = incidentData?.data?.summary?.trend || 0;
    const credentialTrend = credentialingData?.data?.summary?.newThisQuarter || 0;

    return {
      trainingCompliance: Math.round(trainingCompliance),
      incidentsThisMonth,
      budgetUtil: Math.round(budgetUtil),
      activeCredentials,
      trainingTrend,
      incidentTrend,
      credentialTrend
    };
  }, [trainingData, incidentData, financialData, credentialingData]);

  // Calculate insights from real data
  const insights = useMemo(() => {
    const result = [];

    // Training insight
    if (trainingData?.data?.summary) {
      const rate = trainingData.data.summary.completedRate || trainingData.data.summary.overallComplianceRate || 0;
      result.push({
        type: rate >= 90 ? 'Positive' : rate >= 70 ? 'Warning' : 'Action Required',
        color: rate >= 90 ? '#10B981' : rate >= 70 ? '#F59E0B' : '#EF4444',
        title: `Training compliance at ${Math.round(rate)}%`,
        description: rate >= 90
          ? 'All departments showing strong completion rates'
          : 'Some training programs need attention'
      });
    }

    // Credential insight
    if (credentialingData?.data?.summary) {
      const expiring = credentialingData.data.summary.expiringSoon || 0;
      if (expiring > 0) {
        result.push({
          type: 'Action Required',
          color: '#3B82F6',
          title: `${expiring} credentials expiring soon`,
          description: 'Schedule renewal meetings within next 30 days'
        });
      } else {
        result.push({
          type: 'Positive',
          color: '#10B981',
          title: 'All credentials up to date',
          description: 'No immediate renewals required'
        });
      }
    }

    // Budget insight
    if (financialData?.data?.summary) {
      const utilization = financialData.data.summary.utilizationRate ||
        (financialData.data.summary.totalSpent && financialData.data.summary.totalBudget
          ? (financialData.data.summary.totalSpent / financialData.data.summary.totalBudget) * 100
          : 0);
      const overBudget = utilization > 100;
      result.push({
        type: overBudget ? 'Warning' : 'Positive',
        color: overBudget ? '#F59E0B' : '#10B981',
        title: overBudget
          ? `Budget over by ${Math.round(utilization - 100)}%`
          : `Budget on track at ${Math.round(utilization)}%`,
        description: overBudget
          ? 'Review and adjust remaining quarter spending'
          : 'Spending within planned parameters'
      });
    }

    // Incident insight
    if (incidentData?.data?.summary) {
      const trend = incidentData.data.summary.trend || 0;
      result.push({
        type: trend <= 0 ? 'Improvement' : 'Warning',
        color: trend <= 0 ? '#8B5CF6' : '#F59E0B',
        title: trend <= 0
          ? 'Incidents trending down'
          : 'Incidents increased',
        description: trend <= 0
          ? `${Math.abs(Math.round(trend))}% reduction compared to last period`
          : `${Math.round(trend)}% increase - review safety protocols`
      });
    }

    return result;
  }, [trainingData, credentialingData, financialData, incidentData]);

  // Loading skeleton for charts
  const ChartSkeleton = () => (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={300} />
    </Box>
  );

  // Error display
  const hasAnyError = credentialingError || trainingError || incidentError || financialError || vendorError || performanceError;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/reports')}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Analytics & Trends
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Interactive data visualizations and insights from your practice data
            </Typography>
          </Box>
          <IconButton onClick={refetchAll} disabled={isAnyLoading} title="Refresh all data">
            <RefreshIcon className={isAnyLoading ? 'animate-spin' : ''} />
          </IconButton>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
              size="small"
            >
              <MenuItem value="1m">Last Month</MenuItem>
              <MenuItem value="3m">Last 3 Months</MenuItem>
              <MenuItem value="6m">Last 6 Months</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Error Alert */}
        {hasAnyError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Some data could not be loaded. Displaying available information.
          </Alert>
        )}
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  {trainingLoading ? (
                    <Skeleton variant="text" width={60} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryMetrics.trainingCompliance}%
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Training Compliance
                  </Typography>
                </Box>
                <SchoolIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                {summaryMetrics.trainingTrend >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                <Typography variant="caption">
                  {summaryMetrics.trainingTrend >= 0 ? '+' : ''}{summaryMetrics.trainingTrend}% from last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  {incidentLoading ? (
                    <Skeleton variant="text" width={60} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryMetrics.incidentsThisMonth}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Incidents This Period
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                {summaryMetrics.incidentTrend <= 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />}
                <Typography variant="caption">
                  {summaryMetrics.incidentTrend <= 0 ? '' : '+'}{summaryMetrics.incidentTrend}% from last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  {financialLoading ? (
                    <Skeleton variant="text" width={60} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryMetrics.budgetUtil}%
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Budget Utilization
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="caption">
                  {summaryMetrics.budgetUtil <= 100 ? 'On target' : 'Over budget'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  {credentialingLoading ? (
                    <Skeleton variant="text" width={60} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryMetrics.activeCredentials}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Active Credentials
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="caption">
                  +{summaryMetrics.credentialTrend} this quarter
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Charts */}
      <Grid container spacing={3}>
        {/* Credential Trends */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Credential Status Trends
            </Typography>
            {credentialingLoading ? (
              <ChartSkeleton />
            ) : credentialTrendsData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No credential data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={credentialTrendsData}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorExpiring" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorExpired" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="active" stroke="#10B981" fillOpacity={1} fill="url(#colorActive)" name="Active" />
                  <Area type="monotone" dataKey="expiring" stroke="#F59E0B" fillOpacity={1} fill="url(#colorExpiring)" name="Expiring Soon" />
                  <Area type="monotone" dataKey="expired" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpired)" name="Expired" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Training Compliance */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Training Compliance by Type
            </Typography>
            {trainingLoading ? (
              <ChartSkeleton />
            ) : trainingComplianceData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No training data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trainingComplianceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="completed" fill="#10B981" radius={[0, 8, 8, 0]} name="Completed %" />
                  <Bar dataKey="pending" fill="#F59E0B" radius={[0, 8, 8, 0]} name="Pending %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Incident Patterns */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Incident Patterns by Severity
            </Typography>
            {incidentLoading ? (
              <ChartSkeleton />
            ) : incidentPatternsData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No incident data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={incidentPatternsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="level1" fill="#10B981" name="Level 1 (Low)" />
                  <Bar dataKey="level2" fill="#F59E0B" name="Level 2 (Medium)" />
                  <Bar dataKey="level3" fill="#EF4444" name="Level 3 (High)" />
                  <Line type="monotone" dataKey="level1" stroke="#059669" strokeWidth={2} name="L1 Trend" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Vendor Performance */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Vendor Performance Score
            </Typography>
            {vendorLoading ? (
              <ChartSkeleton />
            ) : vendorPerformanceData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No vendor data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vendorPerformanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {vendorPerformanceData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Budget Utilization */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Budget Utilization by Category
            </Typography>
            {financialLoading ? (
              <ChartSkeleton />
            ) : budgetUtilizationData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No budget data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetUtilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="budget" fill="#3B82F6" name="Budget" />
                  <Bar dataKey="actual" fill="#10B981" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Department Performance Radar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Department Performance
            </Typography>
            {performanceLoading ? (
              <ChartSkeleton />
            ) : departmentPerformanceData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No performance data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={departmentPerformanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="department" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Quality" dataKey="quality" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Radar name="Efficiency" dataKey="efficiency" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Radar name="Satisfaction" dataKey="satisfaction" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Key Insights - Dynamically generated from real data */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Key Insights & Recommendations
            </Typography>
            {isAnyLoading ? (
              <Grid container spacing={2}>
                {[1, 2, 3, 4].map((i) => (
                  <Grid size={{ xs: 12, md: 6, lg: 3 }} key={i}>
                    <Skeleton variant="rectangular" height={120} />
                  </Grid>
                ))}
              </Grid>
            ) : insights.length === 0 ? (
              <Typography color="text.secondary" textAlign="center">
                Add data to see insights and recommendations
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {insights.map((insight, index) => (
                  <Grid size={{ xs: 12, md: 6, lg: 3 }} key={index}>
                    <Card
                      sx={{
                        background: `linear-gradient(135deg, ${alpha(insight.color, 0.1)} 0%, ${alpha(insight.color, 0.05)} 100%)`,
                        border: `2px solid ${alpha(insight.color, 0.3)}`
                      }}
                    >
                      <CardContent>
                        <Chip
                          label={insight.type}
                          size="small"
                          sx={{ mb: 2, backgroundColor: insight.color, color: 'white' }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          {insight.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {insight.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsCharts;
