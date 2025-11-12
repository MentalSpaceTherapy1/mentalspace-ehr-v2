import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
  Stack,
  Avatar,
  Badge,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  BeachAccess as BeachAccessIcon,
  LocalHospital as LocalHospitalIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { usePTO, TeamPTOCalendar } from '../../hooks/usePTO';
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

interface PTOCalendarProps {
  departmentId?: string;
}

const PTO_TYPE_CONFIG = {
  VACATION: {
    label: 'Vacation',
    color: '#3498DB',
    icon: <BeachAccessIcon />,
  },
  SICK: {
    label: 'Sick Leave',
    color: '#E74C3C',
    icon: <LocalHospitalIcon />,
  },
  PERSONAL: {
    label: 'Personal Day',
    color: '#9B59B6',
    icon: <PersonIcon />,
  },
  BEREAVEMENT: {
    label: 'Bereavement',
    color: '#34495E',
    icon: <PersonIcon />,
  },
  JURY_DUTY: {
    label: 'Jury Duty',
    color: '#16A085',
    icon: <PersonIcon />,
  },
};

const PTOCalendar: React.FC<PTOCalendarProps> = ({ departmentId }) => {
  const { getTeamCalendar, loading } = usePTO();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<TeamPTOCalendar[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState(departmentId || '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth, selectedDepartment]);

  const loadCalendarData = async () => {
    try {
      const startDate = startOfMonth(currentMonth).toISOString();
      const endDate = endOfMonth(currentMonth).toISOString();

      const data = await getTeamCalendar(startDate, endDate, selectedDepartment || undefined);
      setCalendarData(data);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getPTOForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData.find((item) => item.date === dateStr);
  };

  const getTypeColor = (type: string) => {
    return PTO_TYPE_CONFIG[type as keyof typeof PTO_TYPE_CONFIG]?.color || '#95A5A6';
  };

  const getTypeLabel = (type: string) => {
    return PTO_TYPE_CONFIG[type as keyof typeof PTO_TYPE_CONFIG]?.label || type;
  };

  const hasConflict = (ptoData: TeamPTOCalendar) => {
    return ptoData.requests.filter((r) => r.status === 'APPROVED').length > 3;
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
        const ptoData = getPTOForDate(currentDay);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isToday(day);
        const hasRequests = ptoData && ptoData.requests.length > 0;
        const conflict = ptoData && hasConflict(ptoData);

        days.push(
          <Box
            key={day.toString()}
            onClick={() => hasRequests && setSelectedDate(currentDay)}
            sx={{
              minHeight: 120,
              border: '1px solid #E0E0E0',
              p: 1,
              cursor: hasRequests ? 'pointer' : 'default',
              backgroundColor: isCurrentMonth ? 'white' : '#F5F5F5',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': hasRequests
                ? {
                    backgroundColor: '#F0F0F0',
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }
                : {},
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
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
              {conflict && (
                <Tooltip title="High coverage impact">
                  <WarningIcon sx={{ fontSize: 18, color: '#E74C3C' }} />
                </Tooltip>
              )}
            </Box>

            {hasRequests && (
              <Box>
                <Stack spacing={0.5}>
                  {ptoData!.requests.slice(0, 3).map((request, index) => (
                    <Tooltip
                      key={index}
                      title={`${request.employeeName} - ${getTypeLabel(request.type)} (${request.status})`}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          p: 0.5,
                          backgroundColor: `${getTypeColor(request.type)}20`,
                          borderRadius: 1,
                          borderLeft: `3px solid ${getTypeColor(request.type)}`,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 20,
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: getTypeColor(request.type),
                          }}
                        >
                          {request.employeeName.charAt(0)}
                        </Avatar>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.65rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {request.employeeName}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                  {ptoData!.requests.length > 3 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        color: '#666',
                        textAlign: 'center',
                        fontWeight: 600,
                      }}
                    >
                      +{ptoData!.requests.length - 3} more
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <Grid container key={day.toString()}>
          {days.map((dayCell, index) => (
            <Grid item xs={12 / 7} key={index}>
              {dayCell}
            </Grid>
          ))}
        </Grid>
      );
      days = [];
    }

    return rows;
  };

  const selectedDateData = selectedDate ? getPTOForDate(selectedDate) : null;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
          Team PTO Calendar
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View team time off schedule and coverage
        </Typography>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Department"
              >
                <MenuItem value="">All Departments</MenuItem>
                <MenuItem value="clinical">Clinical</MenuItem>
                <MenuItem value="admin">Administration</MenuItem>
                <MenuItem value="it">IT</MenuItem>
                <MenuItem value="hr">Human Resources</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

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
            <Grid item xs={12 / 7} key={day}>
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
            PTO Types
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {Object.entries(PTO_TYPE_CONFIG).map(([key, config]) => (
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

      {/* Selected Date Details */}
      {selectedDate && selectedDateData && (
        <Paper elevation={3} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
            {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
          </Typography>

          {selectedDateData.requests.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No PTO requests for this date
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {selectedDateData.requests.map((request, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card
                    sx={{
                      border: `2px solid ${getTypeColor(request.type)}40`,
                      backgroundColor: `${getTypeColor(request.type)}10`,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            backgroundColor: getTypeColor(request.type),
                            fontSize: '1.2rem',
                            fontWeight: 700,
                          }}
                        >
                          {request.employeeName.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {request.employeeName}
                          </Typography>
                          <Chip
                            label={getTypeLabel(request.type)}
                            size="small"
                            sx={{
                              backgroundColor: getTypeColor(request.type),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                        <Chip
                          label={request.status}
                          size="small"
                          sx={{
                            backgroundColor:
                              request.status === 'APPROVED'
                                ? '#2ECC71'
                                : request.status === 'PENDING'
                                ? '#F39C12'
                                : '#95A5A6',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {hasConflict(selectedDateData) && (
            <Box sx={{ mt: 3 }}>
              <Card sx={{ border: '2px solid #E74C3C40', backgroundColor: '#E74C3C10' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <WarningIcon sx={{ color: '#E74C3C', fontSize: 32 }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#E74C3C' }}>
                        High Coverage Impact
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Multiple team members are scheduled off on this date. Ensure adequate staffing
                        levels.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default PTOCalendar;
