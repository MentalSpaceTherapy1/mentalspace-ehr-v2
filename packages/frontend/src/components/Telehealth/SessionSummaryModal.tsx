import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Rating,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  CheckCircle,
  NoteAdd,
  Event,
  Schedule,
  Star,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface SessionSummaryModalProps {
  open: boolean;
  onClose: () => void;
  sessionData: {
    id: string;
    clientName: string;
    startTime: Date;
    endTime: Date;
    duration: number; // in minutes
  };
  userRole: 'clinician' | 'client';
}

export default function SessionSummaryModal({
  open,
  onClose,
  sessionData,
  userRole,
}: SessionSummaryModalProps) {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate session duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const handleCreateNote = () => {
    onClose();
    navigate(`/clinical-notes/new?sessionId=${sessionData.id}`);
  };

  const handleScheduleNext = () => {
    onClose();
    navigate(`/appointments/new?clientName=${encodeURIComponent(sessionData.clientName)}`);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Save client rating if provided (clients only)
      if (userRole === 'client' && rating) {
        await api.post(`/telehealth/sessions/${sessionData.id}/rating`, {
          rating,
          comments: comments.trim() || null,
        });
        console.log('✅ Session rating saved:', { rating, comments });
      }

      // Save clinician rating if provided (clinicians only)
      if (userRole === 'clinician' && rating) {
        // TODO: Save clinician self-rating if needed
        console.log('Clinician session rating:', rating);
      }

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      onClose();
      navigate('/appointments');
    } catch (err) {
      console.error('❌ Failed to save rating:', err);
      setError('Failed to save your feedback. You can still close this window.');
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
    navigate('/appointments');
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: '4px solid #10b981',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#f0fdf4',
          color: '#047857',
        }}
      >
        <CheckCircle sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" component="div" fontWeight="bold">
            Session Completed
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(sessionData.endTime).toLocaleString()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        {/* Session Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule fontSize="small" /> Session Summary
          </Typography>
          <Box sx={{ pl: 4, py: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Client:</strong> {sessionData.clientName}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Duration:</strong> {formatDuration(sessionData.duration)}
            </Typography>
            <Typography variant="body2">
              <strong>Time:</strong> {new Date(sessionData.startTime).toLocaleTimeString()} - {new Date(sessionData.endTime).toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Session Rating (Clinician only) */}
        {userRole === 'clinician' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Star fontSize="small" /> Session Quality
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              How would you rate this session?
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Rating
                name="session-rating"
                value={rating}
                onChange={(event, newValue) => {
                  setRating(newValue);
                }}
                size="large"
              />
              {rating && (
                <Typography variant="body2" color="text.secondary">
                  {rating === 5 ? 'Excellent' :
                   rating === 4 ? 'Good' :
                   rating === 3 ? 'Average' :
                   rating === 2 ? 'Below Average' :
                   'Needs Improvement'}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Quick Actions */}
        {userRole === 'clinician' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Next Steps
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<NoteAdd />}
                  onClick={handleCreateNote}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Create Clinical Note
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Event />}
                  onClick={handleScheduleNext}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Schedule Follow-Up Appointment
                </Button>
              </Box>
            </Box>
          </>
        )}

        {/* Client Rating (Optional) */}
        {userRole === 'client' && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star fontSize="small" /> How was your session?
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Your feedback is optional and helps us improve our services. Only administrators can view your rating.
              </Typography>

              {/* Rating Stars */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Rating
                  name="client-session-rating"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue);
                  }}
                  size="large"
                />
                {rating && (
                  <Typography variant="body2" color="text.secondary">
                    {rating === 5 ? 'Excellent' :
                     rating === 4 ? 'Good' :
                     rating === 3 ? 'Average' :
                     rating === 2 ? 'Below Average' :
                     'Needs Improvement'}
                  </Typography>
                )}
              </Box>

              {/* Comments (Optional) */}
              {rating && (
                <TextField
                  label="Additional Comments (Optional)"
                  multiline
                  rows={3}
                  fullWidth
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share any thoughts about your session..."
                  variant="outlined"
                  sx={{ mt: 1 }}
                  inputProps={{ maxLength: 500 }}
                  helperText={`${comments.length}/500 characters`}
                />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Alert severity="success">
              Your session has ended. Your clinician may send you follow-up materials or homework assignments.
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, flexDirection: 'column', alignItems: 'stretch' }}>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 1 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          {/* Skip button for clients (only if no rating provided) */}
          {userRole === 'client' && !rating && (
            <Button
              onClick={handleSkip}
              variant="outlined"
              color="inherit"
              disabled={submitting}
              sx={{ flex: 1 }}
            >
              Skip Feedback
            </Button>
          )}

          {/* Submit/Finish button */}
          <Button
            onClick={handleFinish}
            variant="contained"
            color="primary"
            disabled={submitting}
            sx={{ flex: 1, minWidth: 120 }}
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              userRole === 'client' && rating ? 'Submit Feedback & Close' : 'Return to Appointments'
            )}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
