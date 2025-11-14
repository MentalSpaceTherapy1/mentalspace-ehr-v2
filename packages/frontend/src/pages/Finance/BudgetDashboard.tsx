import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Stack,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingIcon,
  AccountBalance as BudgetIcon,
  Warning as WarningIcon,
  CheckCircle as HealthyIcon,
  Error as CriticalIcon,
} from '@mui/icons-material';
import { useBudgetUtilization, exportBudgetReport } from '../../hooks/useBudget';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BudgetDashboard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const { utilization, loading } = useBudgetUtilization(fiscalYear);

  const handleExport = async () => {
    try {
      const blob = await exportBudgetReport(fiscalYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-report-${fiscalYear}.xlsx`;
      a.click();
    } catch (error) {
      console.error('Failed to export budget report:', error);
    }
  };

  if (loading || !utilization) {
    return <Typography>Loading budget data...</Typography>;
  }

  const utilizationPercentage = (utilization.spent / utilization.total) * 100;

  // Circular progress data
  const doughnutData = {
    labels: ['Spent', 'Remaining'],
    datasets: [
      {
        data: [utilization.spent, utilization.remaining],
        backgroundColor: [
          utilization.status === 'HEALTHY'
            ? '#4caf50'
            : utilization.status === 'WARNING'
            ? '#ff9800'
            : '#f44336',
          '#e0e0e0',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Category breakdown data
  const barData = {
    labels: utilization.byCategory.map((cat) => cat.category),
    datasets: [
      {
        label: 'Allocated',
        data: utilization.byCategory.map((cat) => cat.allocated),
        backgroundColor: '#667eea',
      },
      {
        label: 'Spent',
        data: utilization.byCategory.map((cat) => cat.spent),
        backgroundColor: '#764ba2',
      },
    ],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <HealthyIcon sx={{ color: '#4caf50', fontSize: 40 }} />;
      case 'WARNING':
        return <WarningIcon sx={{ color: '#ff9800', fontSize: 40 }} />;
      case 'CRITICAL':
        return <CriticalIcon sx={{ color: '#f44336', fontSize: 40 }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return '#4caf50';
      case 'WARNING':
        return '#ff9800';
      case 'CRITICAL':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <BudgetIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold" color="primary">
            Budget Dashboard
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Fiscal Year</InputLabel>
            <Select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value as number)}
              label="Fiscal Year"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <MenuItem key={year} value={year}>
                  FY {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Export Report
          </Button>
        </Stack>
      </Box>

      {/* Budget Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              ${utilization.total.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total Budget
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              ${utilization.spent.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Spent
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              ${utilization.remaining.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Remaining
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight="bold" color="primary">
              {utilizationPercentage.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Utilization
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Budget Utilization (Circular Progress) */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Budget Utilization
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <Box sx={{ position: 'relative', width: 250, height: 250 }}>
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '70%',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              return `${context.label}: $${context.parsed.toLocaleString()}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    {getStatusIcon(utilization.status)}
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {utilizationPercentage.toFixed(0)}%
                    </Typography>
                    <Chip
                      label={utilization.status}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(utilization.status),
                        color: 'white',
                        fontWeight: 'bold',
                        mt: 1,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Paper sx={{ p: 2, bgcolor: '#f3e5f5', textAlign: 'center' }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      ${utilization.spent.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Spent
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Paper sx={{ p: 2, bgcolor: '#e3f2fd', textAlign: 'center' }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      ${utilization.remaining.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Remaining
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown (Bar Chart) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Budget by Category
              </Typography>

              <Box sx={{ height: 300, mt: 2 }}>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `$${value.toLocaleString()}`,
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Details */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Category Details
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {utilization.byCategory.map((category) => (
                  <Grid size={{ xs: 12, md: 6 }} key={category.category}>
                    <Paper sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <Typography variant="body1" fontWeight="medium">
                          {category.category}
                        </Typography>
                        <Chip
                          label={`${category.percentage.toFixed(0)}%`}
                          size="small"
                          color="primary"
                        />
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={category.percentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          mb: 1,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor:
                              category.percentage > 90
                                ? '#f44336'
                                : category.percentage > 75
                                ? '#ff9800'
                                : '#4caf50',
                          },
                        }}
                      />

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Allocated: ${category.allocated.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Spent: ${category.spent.toLocaleString()}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BudgetDashboard;
