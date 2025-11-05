import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Divider,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  Sms,
  Email,
  Phone,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../lib/api';

interface ReminderConfig {
  id?: string;
  practiceSettingsId?: string;
  enableInitialConfirmation: boolean;
  enableOneWeekReminder: boolean;
  enableTwoDayReminder: boolean;
  enableOneDayReminder: boolean;
  enableDayOfReminder: boolean;
  enablePostAppointmentFollowup: boolean;
  oneWeekOffset: number;
  twoDayOffset: number;
  oneDayOffset: number;
  dayOfOffset: number;
  defaultChannels: string[];
  smsEnabled: boolean;
  emailEnabled: boolean;
  voiceEnabled: boolean;
  portalEnabled: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  smsTemplateInitial?: string;
  smsTemplateReminder?: string;
  sesRegion?: string;
  sesFromEmail?: string;
  sesFromName?: string;
  emailTemplateSubject?: string;
  emailTemplateBody?: string;
  includeIcsAttachment: boolean;
  voiceScriptUrl?: string;
  voiceFromNumber?: string;
  maxRetries: number;
  retryDelayMinutes: number;
  sendStartHour: number;
  sendEndHour: number;
  sendOnWeekends: boolean;
}

export default function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig>({
    enableInitialConfirmation: true,
    enableOneWeekReminder: true,
    enableTwoDayReminder: true,
    enableOneDayReminder: true,
    enableDayOfReminder: true,
    enablePostAppointmentFollowup: false,
    oneWeekOffset: 168,
    twoDayOffset: 48,
    oneDayOffset: 24,
    dayOfOffset: 2,
    defaultChannels: ['SMS', 'EMAIL'],
    smsEnabled: false,
    emailEnabled: true,
    voiceEnabled: false,
    portalEnabled: true,
    includeIcsAttachment: true,
    maxRetries: 2,
    retryDelayMinutes: 60,
    sendStartHour: 9,
    sendEndHour: 20,
    sendOnWeekends: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/reminders/config');
      if (response.data.data) {
        setConfig(response.data.data);
      }
    } catch (error: any) {
      setErrorMessage('Failed to load reminder configuration');
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/reminders/config', config);
      setSuccessMessage('Reminder settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save settings');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!config.twilioPhoneNumber) {
      setErrorMessage('Please configure Twilio phone number first');
      return;
    }

    try {
      setTestingConnection(true);
      await api.post('/reminders/test-sms', {
        phoneNumber: config.twilioPhoneNumber,
        from: config.twilioPhoneNumber,
      });
      setSuccessMessage('Test SMS sent successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to send test SMS');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Notifications sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Appointment Reminder Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure automated reminders to reduce no-shows
          </Typography>
        </Box>
      </Stack>

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

      {/* Reminder Schedule */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reminder Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose when to send reminders before appointments
          </Typography>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableInitialConfirmation}
                  onChange={(e) =>
                    setConfig({ ...config, enableInitialConfirmation: e.target.checked })
                  }
                />
              }
              label="Initial confirmation (immediately after booking)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableOneWeekReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableOneWeekReminder: e.target.checked })
                  }
                />
              }
              label="One week before reminder"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableTwoDayReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableTwoDayReminder: e.target.checked })
                  }
                />
              }
              label="48-hour reminder"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableOneDayReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableOneDayReminder: e.target.checked })
                  }
                />
              }
              label="24-hour reminder"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.enableDayOfReminder}
                  onChange={(e) =>
                    setConfig({ ...config, enableDayOfReminder: e.target.checked })
                  }
                />
              }
              label="Day-of reminder (2 hours before)"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* SMS Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Sms color="primary" />
            <Typography variant="h6">SMS Configuration (Twilio)</Typography>
            {config.smsEnabled && (
              <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
            )}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={config.smsEnabled}
                onChange={(e) => setConfig({ ...config, smsEnabled: e.target.checked })}
              />
            }
            label="Enable SMS reminders"
          />

          {config.smsEnabled && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Twilio Account SID"
                value={config.twilioAccountSid || ''}
                onChange={(e) =>
                  setConfig({ ...config, twilioAccountSid: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="Twilio Auth Token"
                type="password"
                value={config.twilioAuthToken || ''}
                onChange={(e) =>
                  setConfig({ ...config, twilioAuthToken: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="Twilio Phone Number"
                value={config.twilioPhoneNumber || ''}
                onChange={(e) =>
                  setConfig({ ...config, twilioPhoneNumber: e.target.value })
                }
                helperText="Format: +1234567890"
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="SMS Template"
                value={config.smsTemplateReminder || ''}
                onChange={(e) =>
                  setConfig({ ...config, smsTemplateReminder: e.target.value })
                }
                helperText="Use {{clientName}}, {{clinicianName}}, {{date}}, {{time}}"
              />
              <Button
                variant="outlined"
                onClick={handleTestSms}
                disabled={testingConnection}
              >
                {testingConnection ? 'Sending...' : 'Send Test SMS'}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Email color="primary" />
            <Typography variant="h6">Email Configuration (AWS SES)</Typography>
            {config.emailEnabled && (
              <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
            )}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={config.emailEnabled}
                onChange={(e) => setConfig({ ...config, emailEnabled: e.target.checked })}
              />
            }
            label="Enable email reminders"
          />

          {config.emailEnabled && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="From Email"
                value={config.sesFromEmail || ''}
                onChange={(e) => setConfig({ ...config, sesFromEmail: e.target.value })}
              />
              <TextField
                fullWidth
                label="From Name"
                value={config.sesFromName || ''}
                onChange={(e) => setConfig({ ...config, sesFromName: e.target.value })}
              />
              <TextField
                fullWidth
                label="Email Subject Template"
                value={config.emailTemplateSubject || ''}
                onChange={(e) => setConfig({ ...config, emailTemplateSubject: e.target.value })}
                helperText="Use {{clientName}}, {{clinicianName}}, {{date}}, {{time}}"
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Email Body Template"
                value={config.emailTemplateBody || ''}
                onChange={(e) => setConfig({ ...config, emailTemplateBody: e.target.value })}
                helperText="HTML supported. Use {{clientName}}, {{clinicianName}}, {{date}}, {{time}}"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.includeIcsAttachment}
                    onChange={(e) =>
                      setConfig({ ...config, includeIcsAttachment: e.target.checked })
                    }
                  />
                }
                label="Include calendar .ics attachment"
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Voice Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Phone color="primary" />
            <Typography variant="h6">Voice Call Configuration (Twilio)</Typography>
            {config.voiceEnabled && (
              <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
            )}
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={config.voiceEnabled}
                onChange={(e) => setConfig({ ...config, voiceEnabled: e.target.checked })}
              />
            }
            label="Enable voice call reminders"
          />

          {config.voiceEnabled && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Voice Script URL (TwiML)"
                value={config.voiceScriptUrl || ''}
                onChange={(e) => setConfig({ ...config, voiceScriptUrl: e.target.value })}
                helperText="URL to your TwiML script"
              />
              <TextField
                fullWidth
                label="Voice From Number"
                value={config.voiceFromNumber || ''}
                onChange={(e) => setConfig({ ...config, voiceFromNumber: e.target.value })}
                helperText="Format: +1234567890"
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        variant="contained"
        size="large"
        onClick={handleSave}
        disabled={saving}
        fullWidth
        sx={{ mb: 2 }}
      >
        {saving ? 'Saving...' : 'Save Reminder Settings'}
      </Button>
    </Box>
  );
}
