/**
 * Recording Consent Dialog Component
 *
 * Displays consent information and obtains explicit client consent before
 * starting telehealth session recording. HIPAA compliant with audit logging.
 *
 * @module RecordingConsentDialog
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  VideoCamera as VideoCameraIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface RecordingConsentDialogProps {
  open: boolean;
  onClose: () => void;
  onConsent: (consentData: ConsentData) => Promise<void>;
  clientName: string;
  sessionDate: Date;
  loading?: boolean;
}

export interface ConsentData {
  consentGiven: boolean;
  acknowledgedRecording: boolean;
  acknowledgedStorage: boolean;
  acknowledgedAccess: boolean;
  acknowledgedRetention: boolean;
  consentTimestamp: Date;
}

const RecordingConsentDialog: React.FC<RecordingConsentDialogProps> = ({
  open,
  onClose,
  onConsent,
  clientName,
  sessionDate,
  loading = false,
}) => {
  const [acknowledgedRecording, setAcknowledgedRecording] = useState(false);
  const [acknowledgedStorage, setAcknowledgedStorage] = useState(false);
  const [acknowledgedAccess, setAcknowledgedAccess] = useState(false);
  const [acknowledgedRetention, setAcknowledgedRetention] = useState(false);
  const [error, setError] = useState<string>('');

  const allAcknowledged =
    acknowledgedRecording && acknowledgedStorage && acknowledgedAccess && acknowledgedRetention;

  const handleConsent = async () => {
    if (!allAcknowledged) {
      setError('Please acknowledge all items before providing consent');
      return;
    }

    try {
      setError('');
      await onConsent({
        consentGiven: true,
        acknowledgedRecording,
        acknowledgedStorage,
        acknowledgedAccess,
        acknowledgedRetention,
        consentTimestamp: new Date(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to process consent');
    }
  };

  const handleDecline = () => {
    setAcknowledgedRecording(false);
    setAcknowledgedStorage(false);
    setAcknowledgedAccess(false);
    setAcknowledgedRetention(false);
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <VideoCameraIcon color="primary" />
          <Typography variant="h6">Telehealth Session Recording Consent</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            Your clinician would like to record this telehealth session. Please review the following
            information and provide your consent.
          </Typography>
        </Alert>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Client:</strong> {clientName}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Session Date:</strong> {sessionDate.toLocaleDateString()} at{' '}
            {sessionDate.toLocaleTimeString()}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Recording Information
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <VideoCameraIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Video & Audio Recording"
              secondary="This session will be recorded in its entirety, including video and audio of all participants. The recording will begin when you provide consent and end when the session concludes."
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CloudUploadIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Secure Storage"
              secondary="Recordings are securely stored with AES-256 encryption on HIPAA-compliant servers. Access is restricted to authorized clinical staff only."
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <LockIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Access Control"
              secondary="Only your clinician and authorized supervisory staff can access the recording. All access is logged for security purposes."
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <ScheduleIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Retention Policy"
              secondary="Recordings are retained for 7 years as required by Georgia law, after which they are securely deleted. You will receive notice 30 days before deletion."
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Purpose of Recording
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Session recordings may be used for:
        </Typography>
        <List dense>
          <ListItem sx={{ pl: 4 }}>
            <ListItemText primary="• Clinical documentation and review" />
          </ListItem>
          <ListItem sx={{ pl: 4 }}>
            <ListItemText primary="• Treatment planning and continuity of care" />
          </ListItem>
          <ListItem sx={{ pl: 4 }}>
            <ListItemText primary="• Clinical supervision and quality improvement" />
          </ListItem>
          <ListItem sx={{ pl: 4 }}>
            <ListItemText primary="• Compliance with professional standards" />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ my: 2 }}>
          <Typography variant="body2">
            <strong>Your Rights:</strong> You have the right to decline recording without affecting
            your treatment. If you consent, you may request access to the recording or request its
            deletion by contacting your clinician.
          </Typography>
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Consent Acknowledgments
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Please check all boxes to indicate you understand and consent:
        </Typography>

        <Box sx={{ pl: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledgedRecording}
                onChange={(e) => setAcknowledgedRecording(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I understand this session will be recorded (video and audio)
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledgedStorage}
                onChange={(e) => setAcknowledgedStorage(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I understand recordings are stored securely with encryption
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledgedAccess}
                onChange={(e) => setAcknowledgedAccess(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I understand only authorized clinical staff can access recordings
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledgedRetention}
                onChange={(e) => setAcknowledgedRetention(e.target.checked)}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I understand recordings are retained for 7 years per Georgia law
              </Typography>
            }
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDecline} disabled={loading} variant="outlined">
          Decline Recording
        </Button>
        <Button
          onClick={handleConsent}
          disabled={!allAcknowledged || loading}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {loading ? 'Starting Recording...' : 'I Consent to Recording'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecordingConsentDialog;
