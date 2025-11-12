import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon
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

// Mock data
const credentialTrendsData = [
  { month: 'Jan', active: 45, expiring: 3, expired: 0 },
  { month: 'Feb', active: 46, expiring: 2, expired: 0 },
  { month: 'Mar', active: 47, expiring: 4, expired: 1 },
  { month: 'Apr', active: 48, expiring: 5, expired: 0 },
  { month: 'May', active: 47, expiring: 6, expired: 2 },
  { month: 'Jun', active: 49, expiring: 3, expired: 1 }
];

const trainingComplianceData = [
  { name: 'Safety Training', completed: 95, pending: 5 },
  { name: 'HIPAA', completed: 100, pending: 0 },
  { name: 'CPR', completed: 87, pending: 13 },
  { name: 'Crisis Intervention', completed: 92, pending: 8 },
  { name: 'Ethics', completed: 98, pending: 2 }
];

const incidentPatternsData = [
  { month: 'Jan', level1: 2, level2: 1, level3: 0 },
  { month: 'Feb', level1: 3, level2: 2, level3: 1 },
  { month: 'Mar', level1: 1, level2: 1, level3: 0 },
  { month: 'Apr', level1: 4, level2: 2, level3: 0 },
  { month: 'May', level1: 2, level2: 3, level3: 1 },
  { month: 'Jun', level1: 3, level2: 1, level3: 0 }
];

const budgetUtilizationData = [
  { category: 'Personnel', budget: 500000, actual: 475000, variance: -25000 },
  { category: 'Facilities', budget: 150000, actual: 155000, variance: 5000 },
  { category: 'Equipment', budget: 75000, actual: 68000, variance: -7000 },
  { category: 'Training', budget: 25000, actual: 22000, variance: -3000 },
  { category: 'Technology', budget: 100000, actual: 105000, variance: 5000 }
];

const departmentPerformanceData = [
  { department: 'Clinical', quality: 95, efficiency: 88, satisfaction: 92 },
  { department: 'Admin', quality: 92, efficiency: 95, satisfaction: 90 },
  { department: 'Support', quality: 90, efficiency: 87, satisfaction: 94 },
  { department: 'Training', quality: 97, efficiency: 92, satisfaction: 96 }
];

const vendorPerformanceData = [
  { name: 'Vendor A', value: 95 },
  { name: 'Vendor B', value: 88 },
  { name: 'Vendor C', value: 92 },
  { name: 'Vendor D', value: 85 },
  { name: 'Vendor E', value: 90 }
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

const AnalyticsCharts: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('6m');

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
              📈 Analytics & Trends
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Interactive data visualizations and insights
            </Typography>
          </Box>
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
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    95%
                  </Typography>
                  <Typography variant="body2">
                    Training Compliance
                  </Typography>
                </Box>
                <SchoolIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="caption">+5% from last month</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    8
                  </Typography>
                  <Typography variant="body2">
                    Incidents This Month
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <TrendingDownIcon fontSize="small" />
                <Typography variant="caption">-33% from last month</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    92%
                  </Typography>
                  <Typography variant="body2">
                    Budget Utilization
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="caption">On target</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    47
                  </Typography>
                  <Typography variant="body2">
                    Active Credentials
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="caption">+2 this quarter</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Charts */}
      <Grid container spacing={3}>
        {/* Credential Trends */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Credential Status Trends
            </Typography>
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
                <Area type="monotone" dataKey="active" stroke="#10B981" fillOpacity={1} fill="url(#colorActive)" />
                <Area type="monotone" dataKey="expiring" stroke="#F59E0B" fillOpacity={1} fill="url(#colorExpiring)" />
                <Area type="monotone" dataKey="expired" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpired)" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Training Compliance */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Training Compliance by Type
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trainingComplianceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" radius={[0, 8, 8, 0]} />
                <Bar dataKey="pending" fill="#F59E0B" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Incident Patterns */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Incident Patterns by Severity
            </Typography>
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
          </Paper>
        </Grid>

        {/* Vendor Performance */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Vendor Performance Score
            </Typography>
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
                  {vendorPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Budget Utilization */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Budget Utilization by Category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="budget" fill="#3B82F6" name="Budget" />
                <Bar dataKey="actual" fill="#10B981" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Department Performance Radar */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Department Performance
            </Typography>
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
          </Paper>
        </Grid>

        {/* Key Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Key Insights & Recommendations
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${alpha('#10B981', 0.1)} 0%, ${alpha('#10B981', 0.05)} 100%)`,
                    border: `2px solid ${alpha('#10B981', 0.3)}`
                  }}
                >
                  <CardContent>
                    <Chip label="Positive" size="small" sx={{ mb: 2, backgroundColor: '#10B981', color: 'white' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Training compliance up 5%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      All departments showing improvement in completion rates
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${alpha('#3B82F6', 0.1)} 0%, ${alpha('#3B82F6', 0.05)} 100%)`,
                    border: `2px solid ${alpha('#3B82F6', 0.3)}`
                  }}
                >
                  <CardContent>
                    <Chip label="Action Required" size="small" sx={{ mb: 2, backgroundColor: '#3B82F6', color: 'white' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      6 credentials expiring soon
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Schedule renewal meetings within next 30 days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${alpha('#F59E0B', 0.1)} 0%, ${alpha('#F59E0B', 0.05)} 100%)`,
                    border: `2px solid ${alpha('#F59E0B', 0.3)}`
                  }}
                >
                  <CardContent>
                    <Chip label="Warning" size="small" sx={{ mb: 2, backgroundColor: '#F59E0B', color: 'white' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Technology budget over 5%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Review and adjust remaining quarter spending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    background: `linear-gradient(135deg, ${alpha('#8B5CF6', 0.1)} 0%, ${alpha('#8B5CF6', 0.05)} 100%)`,
                    border: `2px solid ${alpha('#8B5CF6', 0.3)}`
                  }}
                >
                  <CardContent>
                    <Chip label="Improvement" size="small" sx={{ mb: 2, backgroundColor: '#8B5CF6', color: 'white' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Incidents trending down
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      33% reduction compared to last month
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsCharts;
