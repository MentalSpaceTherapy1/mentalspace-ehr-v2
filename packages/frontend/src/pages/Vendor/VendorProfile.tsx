import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Stack,
  Paper,
  Divider,
  Rating,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Description as ContractIcon,
  TrendingUp as TrendingIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useVendor } from '../../hooks/useVendor';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const VendorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { vendor, loading } = useVendor(id || '');
  const [currentTab, setCurrentTab] = useState(0);

  // Mock data for spending chart
  const spendingData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Spending',
        data: [12000, 15000, 8000, 22000, 18000, 25000],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Mock contracts data
  const contracts = [
    {
      id: '1',
      number: 'CNT-001',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      value: 120000,
      status: 'ACTIVE',
    },
    {
      id: '2',
      number: 'CNT-002',
      startDate: '2023-06-01',
      endDate: '2024-06-01',
      value: 50000,
      status: 'EXPIRED',
    },
  ];

  // Mock performance metrics
  const performanceMetrics = [
    { label: 'On-Time Delivery', value: 95, color: '#4caf50' },
    { label: 'Quality Score', value: 88, color: '#2196f3' },
    { label: 'Response Time', value: 92, color: '#ff9800' },
    { label: 'Customer Satisfaction', value: 90, color: '#9c27b0' },
  ];

  if (loading) {
    return <Typography>Loading vendor...</Typography>;
  }

  if (!vendor) {
    return <Typography>Vendor not found</Typography>;
  }

  const daysUntilExpiration = 45; // Mock calculation

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Card */}
      <Card
        sx={{
          mb: 3,
          boxShadow: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  fontSize: '2rem',
                }}
              >
                <BusinessIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {vendor.name}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    label={vendor.category}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip
                    label={vendor.status}
                    color={vendor.status === 'ACTIVE' ? 'success' : 'default'}
                  />
                </Stack>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Performance Rating
                  </Typography>
                  <Rating value={vendor.performanceRating} precision={0.5} readOnly />
                </Box>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/vendors/${id}/edit`)}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Deactivate
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Contact Information */}
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#e3f2fd', color: '#2196f3' }}>
                    <PhoneIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body2">{vendor.contactPhone}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#fce4ec', color: '#e91e63' }}>
                    <EmailIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2">{vendor.contactEmail}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: '#f3e5f5', color: '#9c27b0' }}>
                    <LocationIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body2">{vendor.address}</Typography>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tax ID (EIN)
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {vendor.taxId}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Payment Terms
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {vendor.paymentTerms}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <MoneyIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  ${vendor.totalSpent.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Spend
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <ContractIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {vendor.activeContracts}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Contracts
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <CalendarIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {daysUntilExpiration}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Days to Expiration
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <Card sx={{ mt: 3, boxShadow: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="fullWidth"
          >
            <Tab label="Overview" />
            <Tab label="Contracts" />
            <Tab label="Performance" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={currentTab} index={0}>
            {/* Spending Chart */}
            <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
              Spending Trend
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line
                data={spendingData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contract Number</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.number}</TableCell>
                      <TableCell>
                        {new Date(contract.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(contract.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        ${contract.value.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={contract.status}
                          color={contract.status === 'ACTIVE' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={3}>
              {performanceMetrics.map((metric) => (
                <Grid item xs={12} sm={6} key={metric.label}>
                  <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body1" fontWeight="medium">
                        {metric.label}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color={metric.color}>
                        {metric.value}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={metric.value}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: metric.color,
                        },
                      }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VendorProfile;
