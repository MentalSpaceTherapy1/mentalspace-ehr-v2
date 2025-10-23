import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Divider,
  Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, Check, Edit } from '@mui/icons-material';
import api from '../../lib/api';

export const SignatureSettings: React.FC = () => {
  const [hasPin, setHasPin] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPin, setEditingPin] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newSignaturePassword, setNewSignaturePassword] = useState('');
  const [confirmSignaturePassword, setConfirmSignaturePassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showSignaturePassword, setShowSignaturePassword] = useState(false);

  // Message state
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSignatureStatus();
  }, []);

  const fetchSignatureStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/signature-status');
      setHasPin(response.data.data.hasPinConfigured);
      setHasPassword(response.data.data.hasPasswordConfigured);
    } catch (err) {
      console.error('Failed to fetch signature status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // Validate PIN
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      setErrorMessage('PIN must be 4-6 digits');
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Please enter your current password');
      return;
    }

    try {
      await api.post('/users/signature-pin', {
        pin: newPin,
        currentPassword,
      });

      setSuccessMessage('Signature PIN set successfully');
      setHasPin(true);
      setEditingPin(false);
      setCurrentPassword('');
      setNewPin('');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to set signature PIN');
    }
  };

  const handleSetPassword = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // Validate password
    if (!newSignaturePassword || newSignaturePassword.length < 8) {
      setErrorMessage('Signature password must be at least 8 characters');
      return;
    }

    if (newSignaturePassword !== confirmSignaturePassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Please enter your current password');
      return;
    }

    try {
      await api.post('/users/signature-password', {
        signaturePassword: newSignaturePassword,
        currentPassword,
      });

      setSuccessMessage('Signature password set successfully');
      setHasPassword(true);
      setEditingPassword(false);
      setCurrentPassword('');
      setNewSignaturePassword('');
      setConfirmSignaturePassword('');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to set signature password');
    }
  };

  const handleCancelPin = () => {
    setEditingPin(false);
    setCurrentPassword('');
    setNewPin('');
    setErrorMessage('');
  };

  const handleCancelPassword = () => {
    setEditingPassword(false);
    setCurrentPassword('');
    setNewSignaturePassword('');
    setConfirmSignaturePassword('');
    setErrorMessage('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Signature Authentication Settings
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Configure your signature PIN or password for signing clinical notes. This is separate from
        your login password and provides an additional layer of security.
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Signature PIN Card */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Signature PIN</Typography>
                {hasPin && !editingPin && (
                  <IconButton size="small" onClick={() => setEditingPin(true)}>
                    <Edit />
                  </IconButton>
                )}
              </Box>

              {hasPin && !editingPin ? (
                <Box>
                  <Alert severity="success" icon={<Check />}>
                    Signature PIN is configured
                  </Alert>
                  <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                    Click the edit icon to update your PIN
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {hasPin ? 'Update your signature PIN' : 'Set up a 4-6 digit PIN for quick signature authentication'}
                  </Typography>

                  <TextField
                    fullWidth
                    label="Current Login Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge="end"
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="New Signature PIN"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    margin="normal"
                    required
                    placeholder="4-6 digits"
                    inputProps={{
                      maxLength: 6,
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    }}
                  />

                  <Box mt={2} display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSetPin}
                      fullWidth
                    >
                      {hasPin ? 'Update PIN' : 'Set PIN'}
                    </Button>
                    {editingPin && (
                      <Button variant="outlined" onClick={handleCancelPin} fullWidth>
                        Cancel
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Signature Password Card */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Signature Password</Typography>
                {hasPassword && !editingPassword && (
                  <IconButton size="small" onClick={() => setEditingPassword(true)}>
                    <Edit />
                  </IconButton>
                )}
              </Box>

              {hasPassword && !editingPassword ? (
                <Box>
                  <Alert severity="success" icon={<Check />}>
                    Signature password is configured
                  </Alert>
                  <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                    Click the edit icon to update your password
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {hasPassword ? 'Update your signature password' : 'Set up a password for signature authentication (minimum 8 characters)'}
                  </Typography>

                  <TextField
                    fullWidth
                    label="Current Login Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge="end"
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="New Signature Password"
                    type={showSignaturePassword ? 'text' : 'password'}
                    value={newSignaturePassword}
                    onChange={(e) => setNewSignaturePassword(e.target.value)}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowSignaturePassword(!showSignaturePassword)}
                            edge="end"
                          >
                            {showSignaturePassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Signature Password"
                    type={showSignaturePassword ? 'text' : 'password'}
                    value={confirmSignaturePassword}
                    onChange={(e) => setConfirmSignaturePassword(e.target.value)}
                    margin="normal"
                    required
                  />

                  <Box mt={2} display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSetPassword}
                      fullWidth
                    >
                      {hasPassword ? 'Update Password' : 'Set Password'}
                    </Button>
                    {editingPassword && (
                      <Button variant="outlined" onClick={handleCancelPassword} fullWidth>
                        Cancel
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Alert severity="info">
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Important Notes:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
          <li>Your signature authentication is separate from your login credentials</li>
          <li>You must configure at least one method (PIN or password) before signing notes</li>
          <li>You can configure both methods and choose which to use when signing</li>
          <li>Keep your signature credentials secure - they legally bind you to clinical documentation</li>
        </Typography>
      </Alert>
    </Box>
  );
};
