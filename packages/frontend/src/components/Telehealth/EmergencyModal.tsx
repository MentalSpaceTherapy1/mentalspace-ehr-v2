import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  Alert,
  AlertTitle,
  Box,
  Typography,
  Divider,
  Link,
  CircularProgress,
} from '@mui/material';
import {
  Emergency as EmergencyIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface EmergencyModalProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  sessionId: string;
  emergencyContact?: EmergencyContact;
  onEmergencyResolved: (data: {
    emergencyNotes: string;
    emergencyResolution: 'CONTINUED' | 'ENDED_IMMEDIATELY' | 'FALSE_ALARM';
    emergencyContactNotified: boolean;
  }) => Promise<void>;
}

export default function EmergencyModal({
  open,
  onClose,
  clientName,
  sessionId,
  emergencyContact,
  onEmergencyResolved,
}: EmergencyModalProps) {
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [contactNotified, setContactNotified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatedTime] = useState(new Date());

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setEmergencyNotes('');
      setContactNotified(false);
      setError(null);
    }
  }, [open]);

  const handleResolve = async (resolution: 'CONTINUED' | 'ENDED_IMMEDIATELY' | 'FALSE_ALARM') => {
    if (!emergencyNotes.trim() && resolution !== 'FALSE_ALARM') {
      setError('Please document the emergency situation before continuing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onEmergencyResolved({
        emergencyNotes: emergencyNotes.trim(),
        emergencyResolution: resolution,
        emergencyContactNotified: contactNotified,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to document emergency. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number as clickable tel: link
    const cleaned = phone.replace(/\D/g, '');
    return `tel:+1${cleaned}`;
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: '4px solid #d32f2f',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: '#ffebee',
          color: '#d32f2f',
        }}
      >
        <EmergencyIcon sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" component="div" fontWeight="bold">
            Emergency Protocol Activated
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Activated at {activatedTime.toLocaleTimeString()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Client Info */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Session Information</AlertTitle>
          <Typography variant="body2">
            <strong>Client:</strong> {clientName}
          </Typography>
          <Typography variant="body2">
            <strong>Session ID:</strong> {sessionId}
          </Typography>
        </Alert>

        {/* Emergency Contact */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon /> Client Emergency Contact
          </Typography>
          {emergencyContact ? (
            <Box
              sx={{
                p: 2,
                border: '2px solid #1976d2',
                borderRadius: 1,
                bgcolor: '#e3f2fd',
              }}
            >
              <Typography variant="body1" fontWeight="bold">
                {emergencyContact.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Relationship: {emergencyContact.relationship}
              </Typography>
              <Link
                href={formatPhoneNumber(emergencyContact.phone)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  mt: 1,
                }}
              >
                <PhoneIcon fontSize="small" />
                {emergencyContact.phone}
              </Link>
            </Box>
          ) : (
            <Alert severity="warning">
              <AlertTitle>No Emergency Contact on File</AlertTitle>
              Proceed with standard crisis protocols. Update client record after session.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Crisis Hotlines */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmergencyIcon /> National Crisis Resources
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Link href="tel:988" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
              988 - Suicide & Crisis Lifeline
            </Link>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                <MessageIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Crisis Text Line
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Text HOME to 741741
              </Typography>
            </Box>
            <Link href="tel:18002738255" sx={{ fontSize: '1rem' }}>
              <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
              1-800-273-8255 (Press 1) - Veterans Crisis Line
            </Link>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Incident Documentation */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Document Incident *
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            placeholder="Document the nature of the emergency, actions taken, client's current state, and any immediate safety concerns..."
            required
            error={!!error}
            helperText={error || 'Required for compliance and continuity of care'}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type="checkbox"
              id="contactNotified"
              checked={contactNotified}
              onChange={(e) => setContactNotified(e.target.checked)}
            />
            <label htmlFor="contactNotified">
              <Typography variant="body2">
                Emergency contact was notified
              </Typography>
            </label>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button
          onClick={() => handleResolve('FALSE_ALARM')}
          disabled={loading}
          variant="outlined"
          color="inherit"
          startIcon={<CloseIcon />}
        >
          False Alarm
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={() => handleResolve('CONTINUED')}
          disabled={loading}
          variant="contained"
          color="primary"
          sx={{ minWidth: 180 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Document & Continue Session'}
        </Button>
        <Button
          onClick={() => handleResolve('ENDED_IMMEDIATELY')}
          disabled={loading}
          variant="contained"
          color="error"
          sx={{ minWidth: 180 }}
        >
          {loading ? <CircularProgress size={24} /> : 'End Session Immediately'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
