import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import api from '../../lib/api';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attestationLoading, setAttestationLoading] = useState(false);

  // Fetch attestation text when modal opens
  useEffect(() => {
    if (open) {
      fetchAttestationText();
    }
  }, [open, noteType, signatureType]);

  const fetchAttestationText = async () => {
    setAttestationLoading(true);
    setError('');
    try {
      const response = await api.get(
        `/signatures/attestation/${noteType}`,
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

  const handleSign = async () => {
    setError('');
    setLoading(true);

    try {
      await onSign();

      // Success - reset and close
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign note');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
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

            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              By clicking "Sign Document", you are electronically signing this document
              and attesting to the statements above.
            </Typography>
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
          disabled={loading || attestationLoading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Signing...' : 'Sign Document'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
