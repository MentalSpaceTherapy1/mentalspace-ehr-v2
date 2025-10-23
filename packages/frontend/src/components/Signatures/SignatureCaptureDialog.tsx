import React, { useState } from 'react';
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
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import api from '../../lib/api';

interface SignatureCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onSign: (authData: SignatureAuthData) => Promise<void>;
  noteType: string;
  noteId?: string;
  signatureType: 'AUTHOR' | 'COSIGN' | 'AMENDMENT';
}

export interface SignatureAuthData {
  method: 'PIN' | 'PASSWORD';
  credential: string;
}

export const SignatureCaptureDialog: React.FC<SignatureCaptureDialogProps> = ({
  open,
  onClose,
  onSign,
  noteType,
  noteId,
  signatureType,
}) => {
  const [authMethod, setAuthMethod] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attestationText, setAttestationText] = useState('');
  const [attestationLoading, setAttestationLoading] = useState(false);

  // Load applicable attestation text when dialog opens
  React.useEffect(() => {
    if (open) {
      loadAttestation();
    } else {
      // Reset form when dialog closes
      setPin('');
      setPassword('');
      setError('');
      setAuthMethod('PIN');
    }
  }, [open, noteType, signatureType]);

  const loadAttestation = async () => {
    setAttestationLoading(true);
    try {
      const response = await api.get(`/signatures/attestation/${noteType}`, {
        params: { signatureType },
      });
      setAttestationText(response.data.data.attestationText);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load attestation text');
    } finally {
      setAttestationLoading(false);
    }
  };

  const handleSign = async () => {
    setError('');

    // Validate input
    if (authMethod === 'PIN') {
      if (!pin || !/^\d{4,6}$/.test(pin)) {
        setError('Please enter a valid 4-6 digit PIN');
        return;
      }
    } else {
      if (!password || password.length < 8) {
        setError('Please enter your signature password (minimum 8 characters)');
        return;
      }
    }

    setLoading(true);
    try {
      await onSign({
        method: authMethod,
        credential: authMethod === 'PIN' ? pin : password,
      });

      // Success - dialog will be closed by parent component
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signature failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'PIN' | 'PASSWORD') => {
    setAuthMethod(newValue);
    setError('');
    setPin('');
    setPassword('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 6,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircle color="primary" />
          <Typography variant="h6" component="span">
            Sign Clinical Note
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {signatureType === 'AUTHOR' && 'Author Signature'}
          {signatureType === 'COSIGN' && 'Supervisor Co-Signature'}
          {signatureType === 'AMENDMENT' && 'Amendment Signature'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Attestation Text */}
        {attestationLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : attestationText ? (
          <Alert severity="info" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Legal Attestation
            </Typography>
            {attestationText}
          </Alert>
        ) : null}

        {/* Authentication Method Tabs */}
        <Tabs
          value={authMethod}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Sign with PIN" value="PIN" />
          <Tab label="Sign with Password" value="PASSWORD" />
        </Tabs>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* PIN Authentication */}
        {authMethod === 'PIN' && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Enter your 4-6 digit signature PIN to authenticate this signature.
            </Typography>
            <TextField
              autoFocus
              label="Signature PIN"
              type="password"
              fullWidth
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter PIN"
              inputProps={{
                maxLength: 6,
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSign();
                }
              }}
            />
          </Box>
        )}

        {/* Password Authentication */}
        {authMethod === 'PASSWORD' && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Enter your signature password to authenticate this signature.
            </Typography>
            <TextField
              autoFocus
              label="Signature Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSign();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {/* Help Text */}
        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          This signature will be legally binding and create an immutable audit trail.
          Your signature cannot be removed, only amended.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSign}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Signing...' : 'Sign Note'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
