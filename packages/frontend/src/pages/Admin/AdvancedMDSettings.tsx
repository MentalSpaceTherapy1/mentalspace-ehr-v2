/**
 * AdvancedMD Settings Page
 *
 * Admin interface for configuring AdvancedMD integration settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  Settings,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useAdvancedMD } from '../../components/AdvancedMD';

/**
 * AdvancedMD Settings Component
 */
export default function AdvancedMDSettings() {
  const { config, isLoadingConfig, refreshConfig, testConnection } = useAdvancedMD();

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  // Local settings state (for future enhancement - currently read-only)
  const [settings, setSettings] = useState({
    autoSyncEnabled: false,
    syncFrequency: 'manual' as 'realtime' | 'hourly' | 'daily' | 'manual',
    autoSyncNewAppointments: false,
    autoSyncStatusUpdates: false,
  });

  /**
   * Load config on mount
   */
  useEffect(() => {
    refreshConfig();
  }, []);

  /**
   * Handle connection test
   */
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const connected = await testConnection();
      setConnectionTestResult({
        success: connected,
        message: connected
          ? 'Successfully connected to AdvancedMD'
          : 'Failed to connect to AdvancedMD',
      });
      if (connected) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
      toast.error('Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  /**
   * Handle settings save (placeholder for future enhancement)
   */
  const handleSaveSettings = () => {
    toast('Settings saved (demonstration only - backend not yet implemented)');
  };

  if (isLoadingConfig) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        {/* Modern Gradient Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            boxShadow: '0 8px 32px 0 rgba(102, 126, 234, 0.37)',
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                p: 1.5,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="600">
                AdvancedMD Integration Settings
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Configure your AdvancedMD connection and synchronization settings
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Connection Settings Card */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 3,
            boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Connection Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {config && (
              <Stack spacing={3}>
                <Box display="flex" gap={3} flexWrap="wrap">
                  <Box flex="1" minWidth="300px">
                    <TextField
                      fullWidth
                      label="Office Key"
                      value={showCredentials ? '162882' : config.officeKey}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <Button
                            size="small"
                            onClick={() => setShowCredentials(!showCredentials)}
                            startIcon={showCredentials ? <VisibilityOff /> : <Visibility />}
                          >
                            {showCredentials ? 'Hide' : 'Show'}
                          </Button>
                        ),
                      }}
                      helperText="AdvancedMD office/practice key"
                    />
                  </Box>

                  <Box flex="1" minWidth="300px">
                    <TextField
                      fullWidth
                      label="Username"
                      value={showCredentials ? 'JOSEPH' : config.username}
                      InputProps={{
                        readOnly: true,
                      }}
                      helperText="AdvancedMD API username"
                    />
                  </Box>
                </Box>

                <Box display="flex" gap={3} flexWrap="wrap">
                  <Box flex="1" minWidth="300px">
                    <TextField
                      fullWidth
                      label="Environment"
                      value={config.environment.toUpperCase()}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <Chip
                            label={config.environment}
                            color={config.environment === 'production' ? 'error' : 'warning'}
                            size="small"
                          />
                        ),
                      }}
                      helperText="API environment (sandbox or production)"
                    />
                  </Box>

                  <Box flex="1" minWidth="300px">
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Connection Status
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        {config.connectionStatus === 'connected' ? (
                          <>
                            <CheckCircle color="success" />
                            <Typography variant="body1" color="success.main">
                              Connected
                            </Typography>
                          </>
                        ) : config.connectionStatus === 'disconnected' ? (
                          <>
                            <ErrorIcon color="error" />
                            <Typography variant="body1" color="error.main">
                              Disconnected
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body1" color="text.secondary">
                              Unknown
                            </Typography>
                          </>
                        )}
                      </Box>
                      {config.lastConnectionTest && (
                        <Typography variant="caption" color="text.secondary">
                          Last tested: {new Date(config.lastConnectionTest).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Button
                    variant="outlined"
                    startIcon={isTestingConnection ? <CircularProgress size={20} /> : <Refresh />}
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? 'Testing Connection...' : 'Test Connection'}
                  </Button>
                </Box>

                {connectionTestResult && (
                  <Box>
                    <Alert severity={connectionTestResult.success ? 'success' : 'error'}>
                      {connectionTestResult.message}
                    </Alert>
                  </Box>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Sync Settings Card */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 3,
            boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sync Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Alert severity="info" sx={{ mb: 3 }}>
              These settings are for demonstration purposes. Full configuration will be implemented in a future update.
            </Alert>

            <Stack spacing={3}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoSyncEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, autoSyncEnabled: e.target.checked })
                      }
                    />
                  }
                  label="Enable Automatic Sync"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Automatically sync data between MentalSpace EHR and AdvancedMD
                </Typography>
              </Box>

              <Box maxWidth="500px">
                <FormControl fullWidth disabled={!settings.autoSyncEnabled}>
                  <InputLabel>Sync Frequency</InputLabel>
                  <Select
                    value={settings.syncFrequency}
                    label="Sync Frequency"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        syncFrequency: e.target.value as any,
                      })
                    }
                  >
                    <MenuItem value="realtime">Real-time (immediate)</MenuItem>
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="daily">Daily (midnight)</MenuItem>
                    <MenuItem value="manual">Manual Only</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoSyncNewAppointments}
                      onChange={(e) =>
                        setSettings({ ...settings, autoSyncNewAppointments: e.target.checked })
                      }
                      disabled={!settings.autoSyncEnabled}
                    />
                  }
                  label="Auto-sync New Appointments"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Automatically sync newly created appointments to AdvancedMD
                </Typography>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoSyncStatusUpdates}
                      onChange={(e) =>
                        setSettings({ ...settings, autoSyncStatusUpdates: e.target.checked })
                      }
                      disabled={!settings.autoSyncEnabled}
                    />
                  }
                  label="Auto-sync Status Updates"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Automatically sync appointment status changes (Check In, Complete, etc.)
                </Typography>
              </Box>

              <Box>
                <Button variant="contained" onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Help & Documentation Card */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Help & Documentation
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Typography variant="body2" paragraph>
              The AdvancedMD integration allows you to sync patient demographics, appointments, and billing
              information between MentalSpace EHR and AdvancedMD.
            </Typography>

            <Typography variant="subtitle2" gutterBottom>
              Key Features:
            </Typography>
            <ul>
              <li>
                <Typography variant="body2">
                  Sync patient demographics to AdvancedMD
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Sync appointments and create visits in AdvancedMD
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Update appointment status across both systems
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  View sync history and error logs
                </Typography>
              </li>
            </ul>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> Ensure that the AdvancedMD API user (JOSEPH) has the necessary
                permissions to view and modify patient and visit data.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
