import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  BeachAccess as BeachAccessIcon,
} from '@mui/icons-material';
import { useAttendance, AttendanceRecord } from '../../hooks/useAttendance';
import { useAuth } from '../../hooks/useAuth';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

interface AttendanceCalendarProps {
  employeeId?: string;
  employeeName?: string;
}

const STATUS_CONFIG = {
  PRESENT: {
    label: 'Present',
    color: '#2ECC71',
    icon: <CheckCircleIcon />,
  },
  ABSENT: {
    label: 'Absent',
    color: '#E74C3C',
    icon: <CancelIcon />,
  },
  LATE: {
    label: 'Late',
    color: '#F39C12',
    icon: <ScheduleIcon />,
  },
  PTO: {
    label: 'PTO',
    color: '#3498DB',
    icon: <BeachAccessIcon />,
  },
  HOLIDAY: {
    label: 'Holiday',
    color: '#9B59B6',
    icon: <BeachAccessIcon />,
  },
};

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  employeeId: propEmployeeId,
  employeeName: propEmployeeName,
}) => {
  const { user } = useAuth();
  const employeeId = propEmployeeId || user?.id || '';
  const employeeName = propEmployeeName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const { getAttendanceRecords, exportAttendance, loading } = useAttendance();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    loadAttendanceRecords();
  }, [currentMonth, employeeId]);

  const loadAttendanceRecords = async () => {
    try {
      const startDate = startOfMonth(currentMonth).toISOString();
      const endDate = endOfMonth(currentMonth).toISOString();

      const records = await getAttendanceRecords({
        employeeId,
        startDate,
        endDate,
      });

      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to load attendance records:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    const record = attendanceRecords.find((r) => isSameDay(new Date(r.date), date));
    if (record) {
      setSelectedDate(date);
      setSelectedRecord(record);
      setDetailsDialogOpen(true);
    }
  };

  const handleExport = async () => {
    try {
      const startDate = startOfMonth(currentMonth).toISOString();
      const endDate = endOfMonth(currentMonth).toISOString();

      const blob = await exportAttendance({
        employeeId,
        startDate,
        endDate,
        format: 'excel',
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${format(currentMonth, 'yyyy-MM')}.xlsx`;
      link.click();
    } catch (error) {
      console.error('Failed to export attendance:', error);
    }
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | undefined => {
    return attendanceRecords.find((r) => isSameDay(new Date(r.date), date));
  };

  const getStatusColor = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#95A5A6';
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const attendance = getAttendanceForDate(currentDay);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isToday(day);

        days.push(
          <Box
            key={day.toString()}
            onClick={() => isCurrentMonth && handleDateClick(currentDay)}
            sx={{
              minHeight: 100,
              border: '1px solid #E0E0E0',
              p: 1,
              cursor: isCurrentMonth ? 'pointer' : 'default',
              backgroundColor: isCurrentMonth
                ? attendance
                  ? `${getStatusColor(attendance.status)}15`
                  : 'white'
                : '#F5F5F5',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': isCurrentMonth
                ? {
                    backgroundColor: attendance
                      ? `${getStatusColor(attendance.status)}30`
                      : '#F0F0F0',
                    transform: 'scale(1.02)',
                  }
                : {},
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isCurrentDay ? 700 : 400,
                  backgroundColor: isCurrentDay ? '#667EEA' : 'transparent',
                  color: isCurrentDay ? 'white' : isCurrentMonth ? '#2C3E50' : '#BDC3C7',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {format(day, 'd')}
              </Typography>
              {attendance && (
                <Chip
                  size="small"
                  label={STATUS_CONFIG[attendance.status as keyof typeof STATUS_CONFIG]?.label}
                  sx={{
                    backgroundColor: getStatusColor(attendance.status),
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              )}
            </Box>
            {attendance && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
                  {attendance.hoursWorked > 0 && `${attendance.hoursWorked.toFixed(1)} hrs`}
                </Typography>
                {attendance.overtime > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#E67E22' }}>
                    OT: {attendance.overtime.toFixed(1)} hrs
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <Grid container key={day.toString()}>
          {days.map((dayCell, index) => (
            <Grid size={{ xs: 12 / 7 }} key={index}>
              {dayCell}
            </Grid>
          ))}
        </Grid>
      );
      days = [];
    }

    return rows;
  };

  const calculateStats = () => {
    const present = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const absent = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const late = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const pto = attendanceRecords.filter((r) => r.status === 'PTO').length;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + r.hoursWorked, 0);
    const overtimeHours = attendanceRecords.reduce((sum, r) => sum + r.overtime, 0);

    return { present, absent, late, pto, totalHours, overtimeHours };
  };

  const stats = calculateStats();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
            Attendance Calendar
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {employeeName}'s attendance record
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
          }}
        >
          Export to Excel
        </Button>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 2 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.present}
              </Typography>
              <Typography variant="body2">Present</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.absent}
              </Typography>
              <Typography variant="body2">Absent</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.late}
              </Typography>
              <Typography variant="body2">Late</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.pto}
              </Typography>
              <Typography variant="body2">PTO</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.totalHours.toFixed(0)}
              </Typography>
              <Typography variant="body2">Total Hours</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #E67E22 0%, #D35400 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.overtimeHours.toFixed(0)}
              </Typography>
              <Typography variant="body2">Overtime</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Calendar */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handlePreviousMonth} sx={{ color: '#667EEA' }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#2C3E50' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Typography>
          <IconButton onClick={handleNextMonth} sx={{ color: '#667EEA' }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* Day Headers */}
        <Grid container sx={{ mb: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Grid size={{ xs: 12 / 7 }} key={day}>
              <Typography
                variant="subtitle2"
                align="center"
                sx={{ fontWeight: 600, color: '#667EEA', py: 1 }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar Days */}
        {renderCalendar()}

        {/* Legend */}
        <Box sx={{ mt: 3, pt: 3, borderTop: '2px solid #E0E0E0' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Legend
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <Chip
                key={key}
                label={config.label}
                icon={config.icon}
                sx={{
                  backgroundColor: config.color,
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            ))}
          </Stack>
        </Box>
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Attendance Details - {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Chip
                    label={STATUS_CONFIG[selectedRecord.status as keyof typeof STATUS_CONFIG]?.label}
                    icon={STATUS_CONFIG[selectedRecord.status as keyof typeof STATUS_CONFIG]?.icon}
                    sx={{
                      backgroundColor: getStatusColor(selectedRecord.status),
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1rem',
                      px: 2,
                      py: 2.5,
                      height: 'auto',
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="textSecondary">
                    Hours Worked
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {selectedRecord.hoursWorked.toFixed(2)} hrs
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="textSecondary">
                    Overtime
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#E67E22' }}>
                    {selectedRecord.overtime.toFixed(2)} hrs
                  </Typography>
                </Grid>
                {selectedRecord.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Notes
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#F5F5F5' }}>
                      <Typography variant="body2">{selectedRecord.notes}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceCalendar;
