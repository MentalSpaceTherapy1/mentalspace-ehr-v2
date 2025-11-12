import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAttendance, AttendanceStats } from '../../hooks/useAttendance';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface AttendanceReportProps {
  employeeId: string;
  employeeName: string;
}

const STATUS_COLORS = {
  PRESENT: '#2ECC71',
  ABSENT: '#E74C3C',
  LATE: '#F39C12',
  PTO: '#3498DB',
  HOLIDAY: '#9B59B6',
};

const AttendanceReport: React.FC<AttendanceReportProps> = ({
  employeeId,
  employeeName,
}) => {
  const { getAttendanceStats, getAttendanceRecords, exportAttendance, loading } = useAttendance();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [absencePatterns, setAbsencePatterns] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadTrendsData();
  }, [employeeId, dateRange]);

  const loadStats = async () => {
    try {
      const data = await getAttendanceStats(employeeId, dateRange.startDate, dateRange.endDate);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTrendsData = async () => {
    try {
      const records = await getAttendanceRecords({
        employeeId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      // Group by week for trends
      const weeklyData: { [key: string]: { hours: number; overtime: number } } = {};
      records.forEach((record: any) => {
        const weekKey = format(new Date(record.date), 'MMM dd');
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { hours: 0, overtime: 0 };
        }
        weeklyData[weekKey].hours += record.hoursWorked;
        weeklyData[weekKey].overtime += record.overtime;
      });

      const trends = Object.entries(weeklyData).map(([week, data]) => ({
        week,
        hours: parseFloat(data.hours.toFixed(2)),
        overtime: parseFloat(data.overtime.toFixed(2)),
      }));

      setTrendsData(trends);

      // Analyze absence patterns (by day of week)
      const dayPatterns: { [key: string]: number } = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
      };

      records.forEach((record: any) => {
        if (record.status === 'ABSENT') {
          const dayName = format(new Date(record.date), 'EEEE');
          dayPatterns[dayName]++;
        }
      });

      const patterns = Object.entries(dayPatterns).map(([day, count]) => ({
        day,
        absences: count,
      }));

      setAbsencePatterns(patterns);
    } catch (error) {
      console.error('Failed to load trends data:', error);
    }
  };

  const handleExport = async (exportFormat: 'csv' | 'excel' | 'pdf') => {
    try {
      const blob = await exportAttendance({
        employeeId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: exportFormat,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.${
        exportFormat === 'excel' ? 'xlsx' : exportFormat
      }`;
      link.click();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const pieData = stats
    ? [
        { name: 'Present', value: stats.presentDays, color: STATUS_COLORS.PRESENT },
        { name: 'Absent', value: stats.absentDays, color: STATUS_COLORS.ABSENT },
        { name: 'Late', value: stats.lateDays, color: STATUS_COLORS.LATE },
        { name: 'PTO', value: stats.ptoDays, color: STATUS_COLORS.PTO },
      ]
    : [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
            Attendance Report
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {employeeName}'s attendance analytics
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('csv')}
            disabled={loading}
            size="small"
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('excel')}
            disabled={loading}
            size="small"
            sx={{ borderColor: '#2ECC71', color: '#2ECC71' }}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('pdf')}
            disabled={loading}
            size="small"
            sx={{ borderColor: '#E74C3C', color: '#E74C3C' }}
          >
            PDF
          </Button>
        </Stack>
      </Box>

      {/* Date Range Selector */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Quick Select</InputLabel>
              <Select
                label="Quick Select"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'thisMonth') {
                    setDateRange({
                      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                    });
                  } else if (value === 'lastMonth') {
                    setDateRange({
                      startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
                      endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
                    });
                  } else if (value === 'last3Months') {
                    setDateRange({
                      startDate: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
                      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                    });
                  }
                }}
              >
                <MenuItem value="thisMonth">This Month</MenuItem>
                <MenuItem value="lastMonth">Last Month</MenuItem>
                <MenuItem value="last3Months">Last 3 Months</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Summary */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.attendanceRate}%
                    </Typography>
                    <Typography variant="body2">Attendance Rate</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.totalHours.toFixed(0)}
                    </Typography>
                    <Typography variant="body2">Total Hours</Typography>
                  </Box>
                  <AccessTimeIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #E67E22 0%, #D35400 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.overtimeHours.toFixed(0)}
                    </Typography>
                    <Typography variant="body2">Overtime Hours</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.averageHoursPerDay.toFixed(1)}
                    </Typography>
                    <Typography variant="body2">Avg Hours/Day</Typography>
                  </Box>
                  <AccessTimeIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Attendance Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Attendance Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Hours Worked Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Hours Worked Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="week" tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis tick={{ fill: '#666' }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#667EEA"
                  strokeWidth={3}
                  name="Regular Hours"
                  dot={{ fill: '#667EEA', r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="overtime"
                  stroke="#E67E22"
                  strokeWidth={3}
                  name="Overtime"
                  dot={{ fill: '#E67E22', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Absence Patterns */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Absence Patterns by Day of Week
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={absencePatterns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="day" tick={{ fill: '#666' }} />
                <YAxis tick={{ fill: '#666' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="absences" fill="#E74C3C" name="Absences" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Insights */}
      {stats && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
            Insights & Recommendations
          </Typography>
          <Grid container spacing={2}>
            {stats.attendanceRate < 90 && (
              <Grid item xs={12}>
                <Card sx={{ border: '2px solid #E74C3C20', backgroundColor: '#E74C3C10' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                      <WarningIcon sx={{ color: '#E74C3C', fontSize: 32 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#E74C3C' }}>
                          Low Attendance Rate
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          The attendance rate is below 90%. Consider reviewing absence patterns and
                          addressing any underlying issues.
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {stats.overtimeHours > 40 && (
              <Grid item xs={12}>
                <Card sx={{ border: '2px solid #E67E2220', backgroundColor: '#E67E2210' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                      <WarningIcon sx={{ color: '#E67E22', fontSize: 32 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#E67E22' }}>
                          High Overtime Hours
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Employee has accumulated {stats.overtimeHours.toFixed(0)} hours of overtime.
                          Consider workload balancing or additional support.
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {stats.attendanceRate >= 95 && (
              <Grid item xs={12}>
                <Card sx={{ border: '2px solid #2ECC7120', backgroundColor: '#2ECC7110' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2ECC71', fontSize: 32 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2ECC71' }}>
                          Excellent Attendance
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Employee maintains an excellent attendance rate of {stats.attendanceRate}%.
                          Keep up the great work!
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default AttendanceReport;
