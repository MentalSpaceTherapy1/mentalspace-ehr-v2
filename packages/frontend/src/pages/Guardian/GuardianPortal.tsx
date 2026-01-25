import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from '@mui/material';
import {
  Person,
  CheckCircle,
  Cancel,
  Event,
  Message,
  Settings,
  VideoCall,
  Directions,
  Schedule,
  Chat,
  Description,
  Lock,
  AccessTime,
  CalendarToday,
  MailOutline,
  NotificationsActive,
  EventAvailable,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
// Phase 4.2: Use api instance for httpOnly cookie auth instead of raw axios with Bearer tokens
import api from '../../lib/api';

dayjs.extend(isBetween);
dayjs.extend(relativeTime);

interface Minor {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  profilePhoto?: string;
  medicalRecordNumber: string;
  relationship: {
    relationshipType: string;
    accessLevel: string;
    permissions: {
      canScheduleAppointments: boolean;
      canViewRecords: boolean;
      canCommunicateWithClinician: boolean;
    };
    verifiedAt: string;
  };
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    specialization?: string;
  };
  appointmentType: {
    name: string;
    duration: number;
    modality: 'IN_PERSON' | 'TELEHEALTH';
  };
  location?: string;
  telehealth?: {
    roomUrl: string;
  };
}

interface Message {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    firstName: string;
    lastName: string;
  };
}

interface Activity {
  id: string;
  type: 'appointment' | 'message' | 'document';
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

const GuardianPortal: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [minors, setMinors] = useState<Minor[]>([]);
  const [selectedMinorId, setSelectedMinorId] = useState<string>('');
  const [selectedMinor, setSelectedMinor] = useState<Minor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string>('');
  const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });

  useEffect(() => {
    fetchMinors();
  }, []);

  useEffect(() => {
    if (selectedMinorId) {
      fetchMinorData(selectedMinorId);
    }
  }, [selectedMinorId]);

  const fetchMinors = async () => {
    try {
      setLoading(true);
      // Phase 4.2: Use api instance with httpOnly cookies - no manual auth header needed
      const response = await api.get('/guardian/my-minors');

      if (response.data.success) {
        const minorsData = response.data.data.map((item: any) => ({
          id: item.minor.id,
          firstName: item.minor.firstName,
          lastName: item.minor.lastName,
          dateOfBirth: item.minor.dateOfBirth,
          profilePhoto: item.minor.profilePhoto,
          medicalRecordNumber: item.minor.medicalRecordNumber,
          relationship: {
            relationshipType: item.relationshipType,
            accessLevel: item.accessLevel,
            permissions: item.permissions,
            verifiedAt: item.startDate,
          },
        }));

        setMinors(minorsData);

        if (minorsData.length > 0) {
          setSelectedMinorId(minorsData[0].id);
          setSelectedMinor(minorsData[0]);
        }
      }

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load minors');
    } finally {
      setLoading(false);
    }
  };

  const fetchMinorData = async (minorId: string) => {
    try {
      // Phase 4.2: Use api instance with httpOnly cookies - no manual auth header needed
      const [appointmentsRes, messagesRes] = await Promise.all([
        api.get(`/guardian/minors/${minorId}/appointments`),
        api.get(`/guardian/minors/${minorId}/messages`),
      ]);

      if (appointmentsRes.data.success) {
        setAppointments(appointmentsRes.data.data || []);
      }

      if (messagesRes.data.success) {
        setMessages(messagesRes.data.data || []);
      }

      // Build activity feed
      const recentActivities = buildActivityFeed(
        appointmentsRes.data.data || [],
        messagesRes.data.data || []
      );
      setActivities(recentActivities);

      // Update selected minor
      const minor = minors.find((m) => m.id === minorId);
      if (minor) {
        setSelectedMinor(minor);
      }
    } catch (err: any) {
      console.error('Error fetching minor data:', err);
    }
  };

  const buildActivityFeed = (appts: Appointment[], msgs: Message[]): Activity[] => {
    const activities: Activity[] = [];

    // Add appointments
    appts.slice(0, 3).forEach((appt) => {
      activities.push({
        id: `appt-${appt.id}`,
        type: 'appointment',
        description: `${appt.appointmentType.name} with Dr. ${appt.clinician.lastName}`,
        timestamp: appt.startTime,
        icon: <Event color="primary" />,
      });
    });

    // Add messages
    msgs.slice(0, 2).forEach((msg) => {
      activities.push({
        id: `msg-${msg.id}`,
        type: 'message',
        description: `Message: ${msg.subject}`,
        timestamp: msg.createdAt,
        icon: <Message color="secondary" />,
      });
    });

    // Sort by timestamp
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };

  const handleMinorChange = (event: any) => {
    const minorId = event.target.value;
    setSelectedMinorId(minorId);
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const canJoinVideo = (appointment: Appointment): boolean => {
    if (appointment.appointmentType.modality !== 'TELEHEALTH') return false;
    const apptTime = new Date(appointment.startTime);
    const now = new Date();
    // Can join 15 min before or 5 min after
    return dayjs(now).isBetween(
      dayjs(apptTime).subtract(15, 'minute'),
      dayjs(apptTime).add(5, 'minute'),
      null,
      '[]'
    );
  };

  const handleCancelClick = (appointmentId: string) => {
    setCancelConfirm({ isOpen: true, id: appointmentId });
  };

  const confirmCancelAppointment = async () => {
    if (!cancelConfirm.id) return;

    try {
      // Phase 4.2: Use api instance with httpOnly cookies - no manual auth header needed
      const response = await api.delete(
        `/guardian/minors/${selectedMinorId}/appointments/${cancelConfirm.id}`
      );

      if (response.data.success) {
        toast.success('Appointment cancelled successfully');
        fetchMinorData(selectedMinorId);
      }
      setCancelConfirm({ isOpen: false, id: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const getNextAppointment = (): Appointment | null => {
    const upcoming = appointments
      .filter((appt) => new Date(appt.startTime) >= new Date() && appt.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return upcoming[0] || null;
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && minors.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (minors.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">
          You don't have access to any minor records yet.
          <Button
            variant="contained"
            sx={{ ml: 2 }}
            onClick={() => navigate('/guardian/request-access')}
          >
            Request Access
          </Button>
        </Alert>
      </Container>
    );
  }

  const nextAppointment = getNextAppointment();
  const permissions = selectedMinor?.relationship.permissions;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Guardian Portal
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and view your dependent's care
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Person />}
            onClick={() => navigate('/guardian/request-access')}
          >
            Request New Access
          </Button>
        </Stack>
      </Box>

      {/* Minor Selector */}
      {minors.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Minor</InputLabel>
            <Select value={selectedMinorId} onChange={handleMinorChange} label="Select Minor">
              {minors.map((minor) => (
                <MenuItem key={minor.id} value={minor.id}>
                  {minor.firstName} {minor.lastName} (Age {calculateAge(minor.dateOfBirth)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {selectedMinor && (
        <>
          {/* Top Summary Cards Row */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Profile Summary Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={selectedMinor.profilePhoto}
                      sx={{ width: 80, height: 80, mr: 2 }}
                    >
                      {selectedMinor.firstName[0]}
                      {selectedMinor.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {selectedMinor.firstName} {selectedMinor.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Age {calculateAge(selectedMinor.dateOfBirth)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        MRN: {selectedMinor.medicalRecordNumber}
                      </Typography>
                      <Chip
                        label={selectedMinor.relationship.relationshipType.replace('_', ' ')}
                        size="small"
                        color="primary"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Access Level
                    </Typography>
                    <Chip
                      label={selectedMinor.relationship.accessLevel}
                      size="small"
                      color={
                        selectedMinor.relationship.accessLevel === 'FULL'
                          ? 'success'
                          : selectedMinor.relationship.accessLevel === 'LIMITED'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Verified {dayjs(selectedMinor.relationship.verifiedAt).fromNow()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Permissions Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Your Permissions
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        {permissions?.canScheduleAppointments ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Tooltip title="Permission not granted">
                            <Lock color="disabled" />
                          </Tooltip>
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="Schedule Appointments"
                        primaryTypographyProps={{
                          color: permissions?.canScheduleAppointments ? 'text.primary' : 'text.disabled',
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {permissions?.canViewRecords ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Tooltip title="Permission not granted">
                            <Lock color="disabled" />
                          </Tooltip>
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="View Clinical Records"
                        primaryTypographyProps={{
                          color: permissions?.canViewRecords ? 'text.primary' : 'text.disabled',
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {permissions?.canCommunicateWithClinician ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Tooltip title="Permission not granted">
                            <Lock color="disabled" />
                          </Tooltip>
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="Communicate with Clinician"
                        primaryTypographyProps={{
                          color: permissions?.canCommunicateWithClinician ? 'text.primary' : 'text.disabled',
                        }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Next Appointment Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={3} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Next Appointment
                  </Typography>
                  {nextAppointment ? (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h5" fontWeight="bold">
                          {dayjs(nextAppointment.startTime).format('MMM DD, YYYY')}
                        </Typography>
                        <Typography variant="body1">
                          {dayjs(nextAppointment.startTime).format('h:mm A')}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {nextAppointment.appointmentType.name} with Dr. {nextAppointment.clinician.lastName}
                        </Typography>
                        <Chip
                          label={nextAppointment.appointmentType.modality}
                          size="small"
                          sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {nextAppointment.appointmentType.modality === 'TELEHEALTH' && canJoinVideo(nextAppointment) && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<VideoCall />}
                            sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: '#667eea' }}
                            onClick={() => window.open(nextAppointment.telehealth?.roomUrl, '_blank')}
                          >
                            Join Video
                          </Button>
                        )}
                        {nextAppointment.appointmentType.modality === 'IN_PERSON' && nextAppointment.location && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Directions />}
                            sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: '#667eea' }}
                            onClick={() => window.open(`https://maps.google.com/?q=${nextAppointment.location}`, '_blank')}
                          >
                            Directions
                          </Button>
                        )}
                        {permissions?.canScheduleAppointments && (
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ borderColor: 'white', color: 'white' }}
                            onClick={() => handleCancelClick(nextAppointment.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Event sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
                      <Typography variant="body2">No upcoming appointments</Typography>
                      {permissions?.canScheduleAppointments && (
                        <Button
                          variant="contained"
                          size="small"
                          sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.9)', color: '#667eea' }}
                          onClick={() => navigate(`/guardian/minors/${selectedMinorId}/schedule`)}
                        >
                          Schedule Now
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Schedule />}
                    disabled={!permissions?.canScheduleAppointments}
                    onClick={() => navigate(`/guardian/minors/${selectedMinorId}/schedule`)}
                    sx={{ py: 2 }}
                  >
                    Schedule Appointment
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Chat />}
                    disabled={!permissions?.canCommunicateWithClinician}
                    onClick={() => navigate(`/guardian/minors/${selectedMinorId}/messages`)}
                    sx={{ py: 2 }}
                  >
                    <Badge badgeContent={unreadCount} color="error">
                      <span>Message Clinician</span>
                    </Badge>
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Description />}
                    disabled={!permissions?.canViewRecords}
                    onClick={() => navigate(`/guardian/minors/${selectedMinorId}/profile`)}
                    sx={{ py: 2 }}
                  >
                    View Records
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Settings />}
                    onClick={() => navigate('/guardian/settings')}
                    sx={{ py: 2 }}
                  >
                    Settings
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <Grid container spacing={3}>
            {/* Upcoming Appointments */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Upcoming Appointments
                    </Typography>
                    {permissions?.canScheduleAppointments && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<EventAvailable />}
                        onClick={() => navigate(`/guardian/minors/${selectedMinorId}/schedule`)}
                      >
                        Schedule New
                      </Button>
                    )}
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Clinician</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {appointments
                          .filter((appt) => new Date(appt.startTime) >= new Date())
                          .slice(0, 5)
                          .map((appt) => (
                            <TableRow key={appt.id}>
                              <TableCell>{dayjs(appt.startTime).format('MMM DD, YYYY')}</TableCell>
                              <TableCell>{dayjs(appt.startTime).format('h:mm A')}</TableCell>
                              <TableCell>{appt.appointmentType.name}</TableCell>
                              <TableCell>Dr. {appt.clinician.lastName}</TableCell>
                              <TableCell>
                                <Chip label={appt.status} size="small" color="primary" />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="View Details">
                                  <IconButton size="small">
                                    <Event fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {appointments.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No upcoming appointments
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activity & Messages */}
            <Grid size={{ xs: 12, md: 4 }}>
              {/* Recent Activity Card */}
              <Card elevation={3} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Recent Activity
                  </Typography>
                  <List dense>
                    {activities.map((activity) => (
                      <React.Fragment key={activity.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon sx={{ minWidth: 40 }}>{activity.icon}</ListItemIcon>
                          <ListItemText
                            primary={activity.description}
                            secondary={dayjs(activity.timestamp).fromNow()}
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                  {activities.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No recent activity
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Messages Card */}
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Messages
                    </Typography>
                    <Badge badgeContent={unreadCount} color="error">
                      <MailOutline />
                    </Badge>
                  </Box>
                  <List dense>
                    {messages.slice(0, 3).map((msg) => (
                      <React.Fragment key={msg.id}>
                        <ListItem
                          component="button"
                          onClick={() => navigate(`/guardian/minors/${selectedMinorId}/messages/${msg.id}`)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                fontWeight={msg.isRead ? 'normal' : 'bold'}
                              >
                                {msg.subject}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="caption" color="text.secondary">
                                  {msg.body.substring(0, 50)}...
                                </Typography>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs(msg.createdAt).fromNow()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                  {messages.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No messages
                      </Typography>
                    </Box>
                  )}
                  {permissions?.canCommunicateWithClinician && (
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => navigate(`/guardian/minors/${selectedMinorId}/messages`)}
                    >
                      View All Messages
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelConfirm.isOpen}
        onClose={() => setCancelConfirm({ isOpen: false, id: '' })}
        onConfirm={confirmCancelAppointment}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment?"
        confirmText="Cancel Appointment"
        cancelText="Keep"
        icon="warning"
      />
    </Container>
  );
};

export default GuardianPortal;
