import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  Coffee as CoffeeIcon,
  PlayArrow as PlayArrowIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAttendance, TimeEntry } from '../../hooks/useAttendance';
import { format } from 'date-fns';

interface TimeClockInterfaceProps {
  employeeId: string;
  employeeName: string;
}

const TimeClockInterface: React.FC<TimeClockInterfaceProps> = ({
  employeeId,
  employeeName,
}) => {
  const { clockIn, clockOut, startBreak, endBreak, getCurrentStatus, getTimeEntries, loading } =
    useAttendance();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [todayHours, setTodayHours] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadCurrentStatus();
    loadRecentEntries();
  }, [employeeId]);

  const loadCurrentStatus = async () => {
    try {
      const status = await getCurrentStatus(employeeId);
      setCurrentEntry(status);
    } catch (error) {
      console.error('Failed to load current status:', error);
    }
  };

  const loadRecentEntries = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const entries = await getTimeEntries({
        employeeId,
        startDate: startOfDay,
        endDate: endOfDay,
      });

      setRecentEntries(entries);

      // Calculate today's total hours
      const total = entries.reduce((sum: number, entry: TimeEntry) => sum + (entry.totalHours || 0), 0);
      setTodayHours(total);
    } catch (error) {
      console.error('Failed to load recent entries:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      await clockIn(employeeId);
      loadCurrentStatus();
      loadRecentEntries();
    } catch (error) {
      console.error('Failed to clock in:', error);
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut(employeeId);
      loadCurrentStatus();
      loadRecentEntries();
    } catch (error) {
      console.error('Failed to clock out:', error);
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreak(employeeId);
      loadCurrentStatus();
    } catch (error) {
      console.error('Failed to start break:', error);
    }
  };

  const handleEndBreak = async () => {
    try {
      await endBreak(employeeId);
      loadCurrentStatus();
    } catch (error) {
      console.error('Failed to end break:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN':
        return '#2ECC71';
      case 'ON_BREAK':
        return '#F39C12';
      case 'CLOCKED_OUT':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN':
        return 'Working';
      case 'ON_BREAK':
        return 'On Break';
      case 'CLOCKED_OUT':
        return 'Clocked Out';
      default:
        return 'Not Clocked In';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
          Time Clock
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Track your work hours
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Clock Display */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2rem',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                }}
              >
                {employeeName.charAt(0)}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {employeeName}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
                {format(currentTime, 'hh:mm:ss a')}
              </Typography>
              <Typography variant="h5">
                {format(currentTime, 'EEEE, MMMM dd, yyyy')}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Chip
                label={getStatusLabel(currentEntry?.status || 'CLOCKED_OUT')}
                sx={{
                  backgroundColor: getStatusColor(currentEntry?.status || 'CLOCKED_OUT'),
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.2rem',
                  px: 3,
                  py: 2,
                  height: 'auto',
                }}
              />
            </Box>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              {!currentEntry || currentEntry.status === 'CLOCKED_OUT' ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={handleClockIn}
                  disabled={loading}
                  sx={{
                    backgroundColor: '#2ECC71',
                    color: 'white',
                    px: 4,
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#27AE60',
                    },
                  }}
                >
                  Clock In
                </Button>
              ) : (
                <>
                  {currentEntry.status === 'CLOCKED_IN' && (
                    <>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<CoffeeIcon />}
                        onClick={handleStartBreak}
                        disabled={loading}
                        sx={{
                          backgroundColor: '#F39C12',
                          color: 'white',
                          px: 3,
                          py: 2,
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: '#E67E22',
                          },
                        }}
                      >
                        Start Break
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<LogoutIcon />}
                        onClick={handleClockOut}
                        disabled={loading}
                        sx={{
                          backgroundColor: '#E74C3C',
                          color: 'white',
                          px: 3,
                          py: 2,
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: '#C0392B',
                          },
                        }}
                      >
                        Clock Out
                      </Button>
                    </>
                  )}
                  {currentEntry.status === 'ON_BREAK' && (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleEndBreak}
                      disabled={loading}
                      sx={{
                        backgroundColor: '#2ECC71',
                        color: 'white',
                        px: 4,
                        py: 2,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: '#27AE60',
                        },
                      }}
                    >
                      End Break
                    </Button>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Today's Summary */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {todayHours.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">Hours Today</Typography>
                  </Box>
                  <AccessTimeIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {recentEntries.length}
                    </Typography>
                    <Typography variant="body2">Punches Today</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>

            {currentEntry && currentEntry.status === 'CLOCKED_IN' && (
              <Card sx={{ border: '2px solid #2ECC7140', backgroundColor: '#2ECC7110' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#2ECC71', fontWeight: 600 }}>
                    Current Session
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Clocked in at: {format(new Date(currentEntry.clockIn), 'hh:mm a')}
                  </Typography>
                  {currentEntry.breakStart && !currentEntry.breakEnd && (
                    <Typography variant="body2" color="textSecondary">
                      Break started: {format(new Date(currentEntry.breakStart), 'hh:mm a')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Recent Punch History */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Today's Activity
            </Typography>

            {recentEntries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="textSecondary">
                  No activity recorded today
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Clock In</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Clock Out</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Break Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total Hours</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.clockIn ? format(new Date(entry.clockIn), 'hh:mm a') : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut ? format(new Date(entry.clockOut), 'hh:mm a') : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.breakStart && entry.breakEnd
                            ? `${format(new Date(entry.breakStart), 'hh:mm a')} - ${format(
                                new Date(entry.breakEnd),
                                'hh:mm a'
                              )}`
                            : entry.breakStart
                            ? 'In Progress'
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.totalHours ? `${entry.totalHours.toFixed(2)} hrs` : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(entry.status)}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(entry.status),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TimeClockInterface;
