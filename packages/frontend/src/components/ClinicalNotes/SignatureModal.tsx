import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSign: (authData: { pin?: string; password?: string }) => Promise<void>;
  noteType: string;
  signatureType: 'AUTHOR' | 'COSIGN' | 'AMENDMENT';
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  open,
  onClose,
  onSign,
  noteType,
  signatureType,
}) => {
  const [attestationText, setAttestationText] = useState<string>('');
  const [authMethod, setAuthMethod] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attestationLoading, setAttestationLoading] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Fetch attestation text when modal opens
  useEffect(() => {
    if (open) {
      fetchAttestationText();
      fetchSignatureStatus();
    }
  }, [open, noteType, signatureType]);

  const fetchAttestationText = async () => {
    setAttestationLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `/api/v1/signatures/attestation/${noteType}`,
        {
          params: { signatureType },
        }
      );
      setAttestationText(response.data.data.attestationText);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to load attestation text'
      );
    } finally {
      setAttestationLoading(false);
    }
  };

  const fetchSignatureStatus = async () => {
    try {
      const response = await axios.get('/api/v1/users/signature-status');
      setHasPin(response.data.data.hasPinConfigured);
      setHasPassword(response.data.data.hasPasswordConfigured);

      // Auto-select available method
      if (response.data.data.hasPinConfigured && !response.data.data.hasPasswordConfigured) {
        setAuthMethod('pin');
      } else if (!response.data.data.hasPinConfigured && response.data.data.hasPasswordConfigured) {
        setAuthMethod('password');
      }
    } catch (err) {
      console.error('Failed to fetch signature status:', err);
    }
  };

  const handleSign = async () => {
    setError('');

    // Validate input
    if (authMethod === 'pin') {
      if (!pin.trim()) {
        setError('Please enter your signature PIN');
        return;
      }
      if (!/^\d{4,6}$/.test(pin)) {
        setError('PIN must be 4-6 digits');
        return;
      }
    } else {
      if (!password.trim()) {
        setError('Please enter your signature password');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setLoading(true);

    try {
      const authData = authMethod === 'pin' ? { pin } : { password };
      await onSign(authData);

      // Success - reset and close
      setPin('');
      setPassword('');
      setError('');
      onClose();
    } catch (err: any) {
      if (err.response?.data?.errorCode === 'INVALID_SIGNATURE_AUTH') {
        setError(`Invalid signature ${authMethod === 'pin' ? 'PIN' : 'password'}`);
      } else {
        setError(err.response?.data?.message || 'Failed to sign note');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPin('');
    setPassword('');
    setError('');
    onClose();
  };

  const handleAuthMethodChange = (method: 'pin' | 'password') => {
    setAuthMethod(method);
    setError('');
    setPin('');
    setPassword('');
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        {signatureType === 'AUTHOR' ? 'Sign Clinical Note' : 'Co-Sign Clinical Note'}
      </DialogTitle>
      <DialogContent>
        {attestationLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {!hasPin && !hasPassword && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You have not configured a signature PIN or password. Please set one up in your
                settings before signing notes.
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Legal Attestation
            </Typography>

            <Box
              sx={{
                border: '1px solid #ddd',
                borderRadius: 1,
                p: 2,
                mb: 3,
                backgroundColor: '#f9f9f9',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  margin: 0,
                }}
              >
                {attestationText}
              </Typography>
            </Box>

            {(hasPin || hasPassword) && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Authentication Method</InputLabel>
                  <Select
                    value={authMethod}
                    onChange={(e) => handleAuthMethodChange(e.target.value as 'pin' | 'password')}
                    label="Authentication Method"
                  >
                    {hasPin && <MenuItem value="pin">PIN (4-6 digits)</MenuItem>}
                    {hasPassword && <MenuItem value="password">Password</MenuItem>}
                  </Select>
                </FormControl>

                {authMethod === 'pin' ? (
                  <TextField
                    fullWidth
                    label="Signature PIN"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4-6 digit PIN"
                    inputProps={{
                      maxLength: 6,
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    }}
                    autoFocus
                    disabled={loading}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Signature Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter signature password"
                    autoFocus
                    disabled={loading}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  By entering your signature {authMethod === 'pin' ? 'PIN' : 'password'}, you are
                  electronically signing this document and attesting to the statements above.
                </Typography>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSign}
          variant="contained"
          color="primary"
          disabled={loading || attestationLoading || (!hasPin && !hasPassword)}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Signing...' : 'Sign Document'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
