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
  Tabs,
  Tab,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  Email,
  CheckCircle,
  Warning,
  Add,
  Delete,
  Info,
  Settings as SettingsIcon,
  Person,
  Business,
} from '@mui/icons-material';
import api from '../../lib/api';

interface ReminderConfig {
  id?: string;
  configurationType: 'PRACTICE' | 'USER' | 'NOTE_TYPE';
  userId?: string;
  noteType?: string;
  enabled: boolean;
  reminderIntervals: number[];
  sendOverdueReminders: boolean;
  overdueReminderFrequency: number;
  maxOverdueReminders: number;
  enableSundayWarnings: boolean;
  sundayWarningTime: string;
  enableDailyDigest: boolean;
  digestTime: string;
  digestDays: string[];
  enableEscalation: boolean;
  escalationAfterHours: number;
  escalateTo: string[];
  escalationMessage?: string;
}

interface EmailStatus {
  isConfigured: boolean;
  message: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reminder-tabpanel-${index}`}
      aria-labelledby={`reminder-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ClinicalNoteReminderSettings() {
  // Get user from localStorage
  const [user, setUser] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);

  // State for different config types
  const [effectiveConfig, setEffectiveConfig] = useState<ReminderConfig | null>(null);
  const [userConfig, setUserConfig] = useState<ReminderConfig | null>(null);
  const [practiceConfig, setPracticeConfig] = useState<ReminderConfig | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({ isConfigured: false, message: '' });
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state for user config
  const [userFormData, setUserFormData] = useState<Partial<ReminderConfig>>({
    enabled: true,
    reminderIntervals: [72, 48, 24],
    sendOverdueReminders: true,
    overdueReminderFrequency: 24,
    maxOverdueReminders: 3,
    enableSundayWarnings: true,
    sundayWarningTime: '17:00',
    enableDailyDigest: false,
    digestTime: '09:00',
    digestDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    enableEscalation: true,
    escalationAfterHours: 48,
    escalateTo: [],
    escalationMessage: '',
  });

  // Form state for practice config
  const [practiceFormData, setPracticeFormData] = useState<Partial<ReminderConfig>>({
    enabled: true,
    reminderIntervals: [72, 48, 24],
    sendOverdueReminders: true,
    overdueReminderFrequency: 24,
    maxOverdueReminders: 3,
    enableSundayWarnings: true,
    sundayWarningTime: '17:00',
    enableDailyDigest: false,
    digestTime: '09:00',
    digestDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    enableEscalation: true,
    escalationAfterHours: 48,
    escalateTo: [],
    escalationMessage: '',
  });

  const [newInterval, setNewInterval] = useState<string>('');
  const [newEscalationEmail, setNewEscalationEmail] = useState<string>('');

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadConfigurations();
    checkEmailStatus();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);

      // Load effective config (what's currently being used)
      const effectiveResponse = await api.get('/reminder-config/effective');
      if (effectiveResponse.data.data) {
        setEffectiveConfig(effectiveResponse.data.data);
      }

      // Load user-specific config if it exists
      if (user?.id) {
        try {
          const userResponse = await api.get(`/reminder-config/user/${user.id}`);
          if (userResponse.data.data) {
            setUserConfig(userResponse.data.data);
            setUserFormData(userResponse.data.data);
          }
        } catch (err: any) {
          // User config doesn't exist yet, that's okay
          if (err.response?.status !== 404) {
            console.error('Error loading user config:', err);
          }
        }
      }

      // Load practice config (admin only, but we'll try to load it)
      try {
        const practiceResponse = await api.get('/reminder-config/practice');
        if (practiceResponse.data.data) {
          setPracticeConfig(practiceResponse.data.data);
          setPracticeFormData(practiceResponse.data.data);
        }
      } catch (err: any) {
        // Practice config might not exist or user might not have permission
        if (err.response?.status !== 404 && err.response?.status !== 403) {
          console.error('Error loading practice config:', err);
        }
      }
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      setErrorMessage('Failed to load reminder configurations');
    } finally {
      setLoading(false);
    }
  };

  const checkEmailStatus = async () => {
    try {
      const response = await api.get('/reminder-config/email-status');
      if (response.data.data) {
        setEmailStatus(response.data.data);
      }
    } catch (error: any) {
      console.error('Error checking email status:', error);
    }
  };

  const handleSaveUserConfig = async () => {
    try {
      setSaving(true);

      const configData = {
        configurationType: 'USER',
        userId: user!.id,
        ...userFormData,
      };

      if (userConfig?.id) {
        // Update existing config
        await api.put(`/reminder-config/${userConfig.id}`, configData);
        setSuccessMessage('Your personal reminder settings have been updated successfully');
      } else {
        // Create new config
        await api.post('/reminder-config', configData);
        setSuccessMessage('Your personal reminder settings have been created successfully');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
      loadConfigurations();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save user settings');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePracticeConfig = async () => {
    try {
      setSaving(true);

      const configData = {
        configurationType: 'PRACTICE',
        ...practiceFormData,
      };

      if (practiceConfig?.id) {
        // Update existing config
        await api.put(`/reminder-config/${practiceConfig.id}`, configData);
        setSuccessMessage('Practice-wide reminder settings have been updated successfully');
      } else {
        // Create new config
        await api.post('/reminder-config', configData);
        setSuccessMessage('Practice-wide reminder settings have been created successfully');
      }

      setTimeout(() => setSuccessMessage(''), 5000);
      loadConfigurations();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save practice settings');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setSaving(true);
      await api.post('/reminder-config/initialize');
      setSuccessMessage('Default practice configuration has been initialized');
      setTimeout(() => setSuccessMessage(''), 5000);
      loadConfigurations();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to initialize defaults');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setSendingTestEmail(true);
      const response = await api.post('/reminder-config/test-email');
      setSuccessMessage(response.data.message || 'Test email sent successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to send test email');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const addInterval = (isUserForm: boolean) => {
    const hours = parseInt(newInterval);
    if (isNaN(hours) || hours <= 0) {
      setErrorMessage('Please enter a valid number of hours');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (isUserForm) {
      const intervals = [...(userFormData.reminderIntervals || []), hours].sort((a, b) => b - a);
      setUserFormData({ ...userFormData, reminderIntervals: intervals });
    } else {
      const intervals = [...(practiceFormData.reminderIntervals || []), hours].sort((a, b) => b - a);
      setPracticeFormData({ ...practiceFormData, reminderIntervals: intervals });
    }
    setNewInterval('');
  };

  const removeInterval = (index: number, isUserForm: boolean) => {
    if (isUserForm) {
      const intervals = [...(userFormData.reminderIntervals || [])];
      intervals.splice(index, 1);
      setUserFormData({ ...userFormData, reminderIntervals: intervals });
    } else {
      const intervals = [...(practiceFormData.reminderIntervals || [])];
      intervals.splice(index, 1);
      setPracticeFormData({ ...practiceFormData, reminderIntervals: intervals });
    }
  };

  const addEscalationEmail = (isUserForm: boolean) => {
    const email = newEscalationEmail.trim();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (isUserForm) {
      const emails = [...(userFormData.escalateTo || []), email];
      setUserFormData({ ...userFormData, escalateTo: emails });
    } else {
      const emails = [...(practiceFormData.escalateTo || []), email];
      setPracticeFormData({ ...practiceFormData, escalateTo: emails });
    }
    setNewEscalationEmail('');
  };

  const removeEscalationEmail = (index: number, isUserForm: boolean) => {
    if (isUserForm) {
      const emails = [...(userFormData.escalateTo || [])];
      emails.splice(index, 1);
      setUserFormData({ ...userFormData, escalateTo: emails });
    } else {
      const emails = [...(practiceFormData.escalateTo || [])];
      emails.splice(index, 1);
      setPracticeFormData({ ...practiceFormData, escalateTo: emails });
    }
  };

  const getConfigSourceBadge = (config: ReminderConfig | null) => {
    if (!config) return null;

    switch (config.configurationType) {
      case 'USER':
        return <Chip icon={<Person />} label="Personal" color="primary" size="small" />;
      case 'NOTE_TYPE':
        return <Chip icon={<SettingsIcon />} label="Note Type" color="secondary" size="small" />;
      case 'PRACTICE':
        return <Chip icon={<Business />} label="Practice-Wide" color="default" size="small" />;
      default:
        return null;
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
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Email sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Clinical Note Reminder Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure email reminders for completing clinical documentation within 72 hours
          </Typography>
        </Box>
      </Stack>

      {/* Email Status Alert */}
      <Alert
        severity={emailStatus.isConfigured ? 'success' : 'warning'}
        icon={emailStatus.isConfigured ? <CheckCircle /> : <Warning />}
        action={
          emailStatus.isConfigured && (
            <Button
              color="inherit"
              size="small"
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail}
            >
              {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
            </Button>
          )
        }
        sx={{ mb: 3 }}
      >
        {emailStatus.message}
      </Alert>

      {/* Success/Error Messages */}
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Current Settings" icon={<Info />} iconPosition="start" />
          <Tab label="My Preferences" icon={<Person />} iconPosition="start" />
          {user?.role === 'ADMIN' && (
            <Tab label="Practice Defaults" icon={<Business />} iconPosition="start" />
          )}
        </Tabs>
      </Box>

      {/* Tab 1: Current Settings (Read-only view of effective config) */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Typography variant="h6">Active Configuration</Typography>
              {getConfigSourceBadge(effectiveConfig)}
            </Stack>

            {effectiveConfig ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  This is the configuration currently being used for your reminders. It follows a hierarchy:
                  Personal settings override practice defaults.
                </Typography>

                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Status</Typography>
                    <Chip
                      label={effectiveConfig.enabled ? 'Enabled' : 'Disabled'}
                      color={effectiveConfig.enabled ? 'success' : 'default'}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Reminder Intervals (hours before due)</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {effectiveConfig.reminderIntervals.map((hours, idx) => (
                        <Chip key={idx} label={`${hours}h`} />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Overdue Reminders</Typography>
                    <Typography variant="body2">
                      {effectiveConfig.sendOverdueReminders
                        ? `Enabled - Every ${effectiveConfig.overdueReminderFrequency} hours (max ${effectiveConfig.maxOverdueReminders})`
                        : 'Disabled'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Sunday Warnings</Typography>
                    <Typography variant="body2">
                      {effectiveConfig.enableSundayWarnings
                        ? `Enabled - Sent on Fridays at ${effectiveConfig.sundayWarningTime}`
                        : 'Disabled'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Daily Digest</Typography>
                    <Typography variant="body2">
                      {effectiveConfig.enableDailyDigest
                        ? `Enabled - Sent at ${effectiveConfig.digestTime} on ${effectiveConfig.digestDays.join(', ')}`
                        : 'Disabled'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Escalation</Typography>
                    <Typography variant="body2">
                      {effectiveConfig.enableEscalation
                        ? `Enabled - After ${effectiveConfig.escalationAfterHours} hours, notify ${effectiveConfig.escalateTo.length} recipient(s)`
                        : 'Disabled'}
                    </Typography>
                  </Box>
                </Stack>
              </>
            ) : (
              <Alert severity="info">
                No reminder configuration found. Practice defaults will be used once initialized.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: My Preferences (User config form) */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Personal Reminder Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              These settings will override the practice defaults for your account only.
            </Typography>

            <Stack spacing={3}>
              {/* Enable/Disable */}
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.enabled ?? true}
                    onChange={(e) => setUserFormData({ ...userFormData, enabled: e.target.checked })}
                  />
                }
                label="Enable reminders for me"
              />

              <Divider />

              {/* Reminder Intervals */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Reminder Intervals (hours before due date)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  You'll receive reminders at these intervals before notes are due (e.g., 72 = 3 days)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  {(userFormData.reminderIntervals || []).map((hours, idx) => (
                    <Chip
                      key={idx}
                      label={`${hours}h`}
                      onDelete={() => removeInterval(idx, true)}
                      deleteIcon={<Delete />}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    type="number"
                    label="Hours"
                    value={newInterval}
                    onChange={(e) => setNewInterval(e.target.value)}
                    sx={{ width: 120 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => addInterval(true)}
                  >
                    Add Interval
                  </Button>
                </Stack>
              </Box>

              <Divider />

              {/* Overdue Reminders */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Overdue Reminders
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.sendOverdueReminders ?? true}
                      onChange={(e) => setUserFormData({ ...userFormData, sendOverdueReminders: e.target.checked })}
                    />
                  }
                  label="Send reminders for overdue notes"
                />
                {userFormData.sendOverdueReminders && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      type="number"
                      label="Frequency (hours)"
                      value={userFormData.overdueReminderFrequency ?? 24}
                      onChange={(e) => setUserFormData({ ...userFormData, overdueReminderFrequency: parseInt(e.target.value) })}
                      fullWidth
                      helperText="How often to send reminders for overdue notes"
                    />
                    <TextField
                      type="number"
                      label="Max reminders"
                      value={userFormData.maxOverdueReminders ?? 3}
                      onChange={(e) => setUserFormData({ ...userFormData, maxOverdueReminders: parseInt(e.target.value) })}
                      fullWidth
                      helperText="Maximum number of overdue reminders to send"
                    />
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Sunday Warnings */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Sunday Lockout Warnings
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Notes lock automatically on Sunday midnight. Get warned on Friday.
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.enableSundayWarnings ?? true}
                      onChange={(e) => setUserFormData({ ...userFormData, enableSundayWarnings: e.target.checked })}
                    />
                  }
                  label="Enable Sunday lockout warnings"
                />
                {userFormData.enableSundayWarnings && (
                  <TextField
                    type="time"
                    label="Warning time (Friday)"
                    value={userFormData.sundayWarningTime ?? '17:00'}
                    onChange={(e) => setUserFormData({ ...userFormData, sundayWarningTime: e.target.value })}
                    fullWidth
                    sx={{ mt: 2 }}
                    helperText="Time to send warning on Fridays (e.g., 17:00 for 5 PM)"
                  />
                )}
              </Box>

              <Divider />

              {/* Daily Digest */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Daily Digest Email
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Receive a summary of all pending notes once per day
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.enableDailyDigest ?? false}
                      onChange={(e) => setUserFormData({ ...userFormData, enableDailyDigest: e.target.checked })}
                    />
                  }
                  label="Enable daily digest"
                />
                {userFormData.enableDailyDigest && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      type="time"
                      label="Digest time"
                      value={userFormData.digestTime ?? '09:00'}
                      onChange={(e) => setUserFormData({ ...userFormData, digestTime: e.target.value })}
                      fullWidth
                      helperText="Time to send daily digest (e.g., 09:00 for 9 AM)"
                    />
                    <FormControl fullWidth>
                      <InputLabel>Digest days</InputLabel>
                      <Select
                        multiple
                        value={userFormData.digestDays ?? []}
                        onChange={(e) => setUserFormData({ ...userFormData, digestDays: e.target.value as string[] })}
                        renderValue={(selected) => (selected as string[]).join(', ')}
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <MenuItem key={day} value={day}>
                            <Checkbox checked={(userFormData.digestDays || []).includes(day)} />
                            <ListItemText primary={day} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Escalation */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Escalation Settings
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Notify supervisors/admins when notes remain incomplete for too long
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.enableEscalation ?? true}
                      onChange={(e) => setUserFormData({ ...userFormData, enableEscalation: e.target.checked })}
                    />
                  }
                  label="Enable escalation notifications"
                />
                {userFormData.enableEscalation && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      type="number"
                      label="Escalate after (hours)"
                      value={userFormData.escalationAfterHours ?? 48}
                      onChange={(e) => setUserFormData({ ...userFormData, escalationAfterHours: parseInt(e.target.value) })}
                      fullWidth
                      helperText="Hours past due date before escalating"
                    />

                    <Box>
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        Escalate to (email addresses)
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                        {(userFormData.escalateTo || []).map((email, idx) => (
                          <Chip
                            key={idx}
                            label={email}
                            onDelete={() => removeEscalationEmail(idx, true)}
                            deleteIcon={<Delete />}
                          />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          type="email"
                          label="Email address"
                          value={newEscalationEmail}
                          onChange={(e) => setNewEscalationEmail(e.target.value)}
                          sx={{ flexGrow: 1 }}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => addEscalationEmail(true)}
                        >
                          Add
                        </Button>
                      </Stack>
                    </Box>

                    <TextField
                      multiline
                      rows={3}
                      label="Escalation message (optional)"
                      value={userFormData.escalationMessage ?? ''}
                      onChange={(e) => setUserFormData({ ...userFormData, escalationMessage: e.target.value })}
                      fullWidth
                      helperText="Additional message to include in escalation emails"
                    />
                  </Stack>
                )}
              </Box>
            </Stack>

            <Button
              variant="contained"
              size="large"
              onClick={handleSaveUserConfig}
              disabled={saving}
              fullWidth
              sx={{ mt: 4 }}
            >
              {saving ? 'Saving...' : 'Save My Preferences'}
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: Practice Defaults (Admin only) */}
      {user?.role === 'ADMIN' && (
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Practice-Wide Default Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                These settings apply to all clinicians unless they've set personal preferences.
              </Typography>

              {!practiceConfig && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No practice configuration exists yet. Click "Initialize Defaults" to create one.
                </Alert>
              )}

              <Stack spacing={3}>
                {/* Enable/Disable */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={practiceFormData.enabled ?? true}
                      onChange={(e) => setPracticeFormData({ ...practiceFormData, enabled: e.target.checked })}
                    />
                  }
                  label="Enable reminders practice-wide"
                />

                <Divider />

                {/* Reminder Intervals */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Reminder Intervals (hours before due date)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Default intervals for reminder notifications (e.g., 72 = 3 days)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                    {(practiceFormData.reminderIntervals || []).map((hours, idx) => (
                      <Chip
                        key={idx}
                        label={`${hours}h`}
                        onDelete={() => removeInterval(idx, false)}
                        deleteIcon={<Delete />}
                      />
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      type="number"
                      label="Hours"
                      value={newInterval}
                      onChange={(e) => setNewInterval(e.target.value)}
                      sx={{ width: 120 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => addInterval(false)}
                    >
                      Add Interval
                    </Button>
                  </Stack>
                </Box>

                <Divider />

                {/* Overdue Reminders */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Overdue Reminders
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={practiceFormData.sendOverdueReminders ?? true}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, sendOverdueReminders: e.target.checked })}
                      />
                    }
                    label="Send reminders for overdue notes"
                  />
                  {practiceFormData.sendOverdueReminders && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Frequency (hours)"
                        value={practiceFormData.overdueReminderFrequency ?? 24}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, overdueReminderFrequency: parseInt(e.target.value) })}
                        fullWidth
                        helperText="How often to send reminders for overdue notes"
                      />
                      <TextField
                        type="number"
                        label="Max reminders"
                        value={practiceFormData.maxOverdueReminders ?? 3}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, maxOverdueReminders: parseInt(e.target.value) })}
                        fullWidth
                        helperText="Maximum number of overdue reminders to send"
                      />
                    </Stack>
                  )}
                </Box>

                <Divider />

                {/* Sunday Warnings */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Sunday Lockout Warnings
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Notes lock automatically on Sunday midnight. Warn staff on Friday.
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={practiceFormData.enableSundayWarnings ?? true}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, enableSundayWarnings: e.target.checked })}
                      />
                    }
                    label="Enable Sunday lockout warnings"
                  />
                  {practiceFormData.enableSundayWarnings && (
                    <TextField
                      type="time"
                      label="Warning time (Friday)"
                      value={practiceFormData.sundayWarningTime ?? '17:00'}
                      onChange={(e) => setPracticeFormData({ ...practiceFormData, sundayWarningTime: e.target.value })}
                      fullWidth
                      sx={{ mt: 2 }}
                      helperText="Time to send warning on Fridays (e.g., 17:00 for 5 PM)"
                    />
                  )}
                </Box>

                <Divider />

                {/* Daily Digest */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Daily Digest Email
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Send a daily summary of pending notes to all clinicians
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={practiceFormData.enableDailyDigest ?? false}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, enableDailyDigest: e.target.checked })}
                      />
                    }
                    label="Enable daily digest"
                  />
                  {practiceFormData.enableDailyDigest && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="time"
                        label="Digest time"
                        value={practiceFormData.digestTime ?? '09:00'}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, digestTime: e.target.value })}
                        fullWidth
                        helperText="Time to send daily digest (e.g., 09:00 for 9 AM)"
                      />
                      <FormControl fullWidth>
                        <InputLabel>Digest days</InputLabel>
                        <Select
                          multiple
                          value={practiceFormData.digestDays ?? []}
                          onChange={(e) => setPracticeFormData({ ...practiceFormData, digestDays: e.target.value as string[] })}
                          renderValue={(selected) => (selected as string[]).join(', ')}
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <MenuItem key={day} value={day}>
                              <Checkbox checked={(practiceFormData.digestDays || []).includes(day)} />
                              <ListItemText primary={day} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </Box>

                <Divider />

                {/* Escalation */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Escalation Settings
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Notify supervisors/admins when notes remain incomplete for too long
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={practiceFormData.enableEscalation ?? true}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, enableEscalation: e.target.checked })}
                      />
                    }
                    label="Enable escalation notifications"
                  />
                  {practiceFormData.enableEscalation && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <TextField
                        type="number"
                        label="Escalate after (hours)"
                        value={practiceFormData.escalationAfterHours ?? 48}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, escalationAfterHours: parseInt(e.target.value) })}
                        fullWidth
                        helperText="Hours past due date before escalating"
                      />

                      <Box>
                        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                          Escalate to (email addresses)
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                          {(practiceFormData.escalateTo || []).map((email, idx) => (
                            <Chip
                              key={idx}
                              label={email}
                              onDelete={() => removeEscalationEmail(idx, false)}
                              deleteIcon={<Delete />}
                            />
                          ))}
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            size="small"
                            type="email"
                            label="Email address"
                            value={newEscalationEmail}
                            onChange={(e) => setNewEscalationEmail(e.target.value)}
                            sx={{ flexGrow: 1 }}
                          />
                          <Button
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={() => addEscalationEmail(false)}
                          >
                            Add
                          </Button>
                        </Stack>
                      </Box>

                      <TextField
                        multiline
                        rows={3}
                        label="Escalation message (optional)"
                        value={practiceFormData.escalationMessage ?? ''}
                        onChange={(e) => setPracticeFormData({ ...practiceFormData, escalationMessage: e.target.value })}
                        fullWidth
                        helperText="Additional message to include in escalation emails"
                      />
                    </Stack>
                  )}
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                {!practiceConfig && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleInitializeDefaults}
                    disabled={saving}
                    fullWidth
                  >
                    {saving ? 'Initializing...' : 'Initialize Defaults'}
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSavePracticeConfig}
                  disabled={saving || !practiceConfig}
                  fullWidth
                >
                  {saving ? 'Saving...' : 'Save Practice Settings'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </TabPanel>
      )}
    </Box>
  );
}
