import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Devices,
  Computer,
  Smartphone,
  Tablet,
  DeleteForever,
  Logout,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [showTerminateAllDialog, setShowTerminateAllDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.get('/sessions');
      setSessions(response.data.data || []);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      setTerminatingId(sessionId);
      setErrorMessage('');
      setSuccessMessage('');

      await api.delete(`/sessions/${sessionId}`);

      setSuccessMessage('Session terminated successfully');

      // Refresh sessions list
      await fetchSessions();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to terminate session');
    } finally {
      setTerminatingId(null);
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      await api.delete('/sessions/all');

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Redirect to login
      navigate('/login', {
        state: {
          message: 'All sessions have been terminated. Please log in again.',
        },
      });
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to terminate all sessions');
      setLoading(false);
    }
    setShowTerminateAllDialog(false);
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Computer />;

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet />;
    }
    return <Computer />;
  };

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';

    const ua = userAgent;

    // Extract browser
    let browser = 'Unknown Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    // Extract OS
    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    // Explicitly use the user's detected timezone to ensure proper UTC to local conversion
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone,
    });
  };

  if (loading && sessions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Devices sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Active Sessions
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary">
          Manage your active sessions across all devices. You can terminate individual sessions or log out from all devices at once.
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {sessions.length > 1 && (
        <Box sx={{ mb: 3, textAlign: 'right' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForever />}
            onClick={() => setShowTerminateAllDialog(true)}
          >
            Logout All Devices
          </Button>
        </Box>
      )}

      <Stack spacing={2}>
        {sessions.length === 0 ? (
          <Alert severity="info">No active sessions found.</Alert>
        ) : (
          sessions.map((session) => (
            <Card
              key={session.id}
              sx={{
                border: session.isCurrent ? 2 : 1,
                borderColor: session.isCurrent ? 'primary.main' : 'divider',
                bgcolor: session.isCurrent ? 'action.selected' : 'background.paper',
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ color: 'primary.main' }}>
                        {getDeviceIcon(session.userAgent)}
                      </Box>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6">
                            {getDeviceInfo(session.userAgent)}
                          </Typography>
                          {session.isCurrent && (
                            <Chip
                              label="Current Session"
                              size="small"
                              color="primary"
                              icon={<CheckCircle />}
                            />
                          )}
                        </Stack>
                        {session.ipAddress && (
                          <Typography variant="body2" color="text.secondary">
                            IP Address: {session.ipAddress}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    {!session.isCurrent && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={terminatingId === session.id ? <CircularProgress size={16} /> : <Logout />}
                        onClick={() => handleTerminateSession(session.id)}
                        disabled={terminatingId === session.id}
                      >
                        Terminate
                      </Button>
                    )}
                  </Stack>

                  <Divider />

                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last Activity
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(session.lastActivity)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Created
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(session.createdAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Expires
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(session.expiresAt)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>Security Tip:</strong> If you see a session you don't recognize, terminate it immediately and change your password.
        </Typography>
      </Alert>

      {/* Terminate All Confirmation Dialog */}
      <Dialog open={showTerminateAllDialog} onClose={() => setShowTerminateAllDialog(false)}>
        <DialogTitle>Logout All Devices?</DialogTitle>
        <DialogContent>
          <Typography>
            This will terminate all active sessions and log you out from all devices, including this one.
            You will need to log in again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerminateAllDialog(false)}>Cancel</Button>
          <Button onClick={handleTerminateAllSessions} color="error" variant="contained">
            Logout All Devices
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
