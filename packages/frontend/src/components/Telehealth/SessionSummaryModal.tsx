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
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle,
  NoteAdd,
  Event,
  Schedule,
  Star,
  Description,
  AutoAwesome,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface SessionSummaryModalProps {
  open: boolean;
  onClose: () => void;
  sessionData: {
    id: string;
    clientName: string;
    clientId?: string; // Client ID for navigation
    appointmentId?: string; // Appointment ID for note creation
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
  const [shareWithTherapist, setShareWithTherapist] = useState(false);
  const [shareWithAdmin, setShareWithAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingAINote, setGeneratingAINote] = useState(false);
  const [aiNoteGenerated, setAiNoteGenerated] = useState(false);
  const [aiNoteError, setAiNoteError] = useState<string | null>(null);

  // Detect if we're in portal context
  const isPortalContext = window.location.pathname.startsWith('/portal/');

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
    // Navigate with clientId in path and include sessionId for transcript access
    if (sessionData.clientId && sessionData.appointmentId) {
      navigate(`/clients/${sessionData.clientId}/notes/create?appointmentId=${sessionData.appointmentId}&sessionId=${sessionData.id}&noteType=progress-note`);
    } else if (sessionData.clientId) {
      navigate(`/clients/${sessionData.clientId}/notes/create?sessionId=${sessionData.id}&noteType=progress-note`);
    } else {
      // Fallback to generic route with session ID
      navigate(`/clinical-notes/new?sessionId=${sessionData.id}`);
    }
  };

  const handleViewTranscript = async () => {
    try {
      const response = await api.get(`/telehealth/sessions/${sessionData.id}/transcription/export`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript-${sessionData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Failed to export transcript:', err);
      setError('No transcript available for this session');
    }
  };

  // Generate AI clinical note from session transcript (STAFF ONLY)
  const handleGenerateAINote = async () => {
    try {
      setGeneratingAINote(true);
      setAiNoteError(null);

      // First, fetch the transcript
      const transcriptResponse = await api.get(`/telehealth/sessions/${sessionData.id}/transcription`, {
        params: {
          includePartial: false,
          limit: 1000,
        },
      });

      const transcripts = transcriptResponse.data.data || [];

      if (transcripts.length === 0) {
        setAiNoteError('No transcript available. Please ensure transcription was enabled during the session.');
        return;
      }

      // Format transcript text
      const transcriptText = transcripts.map((t: any) =>
        `[${t.speakerLabel}]: ${t.text}`
      ).join('\n');

      // Get session metadata
      const sessionMetadata = {
        sessionDate: sessionData.startTime,
        sessionDuration: sessionData.duration,
        clientName: sessionData.clientName,
        sessionType: 'Individual Therapy',
      };

      // Generate AI note
      const response = await api.post(`/telehealth/sessions/${sessionData.id}/generate-note`, {
        transcriptText,
        sessionMetadata,
        noteType: 'PROGRESS_NOTE',
        includeTreatmentPlanUpdates: true,
      });

      console.log('✅ AI note generated:', response.data);
      setAiNoteGenerated(true);

      // Navigate to clinical note creation with AI note prefilled
      // IMPORTANT: Return early after navigation to prevent onClose() from triggering
      // a second navigation to /appointments (race condition fix)
      if (sessionData.clientId && sessionData.appointmentId) {
        navigate(`/clients/${sessionData.clientId}/notes/create?appointmentId=${sessionData.appointmentId}&sessionId=${sessionData.id}&noteType=progress-note&aiGenerated=true`);
        return; // Don't call onClose() - it would navigate to /appointments
      } else if (sessionData.clientId) {
        navigate(`/clients/${sessionData.clientId}/notes/create?sessionId=${sessionData.id}&noteType=progress-note&aiGenerated=true`);
        return; // Don't call onClose() - it would navigate to /appointments
      } else {
        // Handle missing clientId - show error instead of silently failing
        setAiNoteError('Cannot create note: client information is missing from this session.');
        return;
      }
    } catch (err: any) {
      console.error('Failed to generate AI note:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate AI note';

      if (errorMessage.includes('already exists')) {
        setAiNoteError('An AI note was already generated for this session. You can view it in the clinical notes.');
      } else if (errorMessage.includes('Transcript too short')) {
        setAiNoteError('The transcript is too short to generate a meaningful clinical note.');
      } else {
        setAiNoteError(errorMessage);
      }
    } finally {
      setGeneratingAINote(false);
    }
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
        // Use portal endpoint for portal users, staff endpoint otherwise
        const endpoint = isPortalContext
          ? `/portal/telehealth/session/${sessionData.id}/rate`
          : `/telehealth/sessions/${sessionData.id}/rating`;

        await api.post(endpoint, {
          rating,
          comments: comments.trim() || null,
          shareWithTherapist,
          shareWithAdmin,
        });
        console.log('✅ Session rating saved:', { rating, comments, shareWithTherapist, shareWithAdmin });
      }

      // Save clinician rating if provided (clinicians only)
      if (userRole === 'clinician' && rating) {
        await api.post(`/telehealth/sessions/${sessionData.id}/rating`, {
          rating,
          comments: comments.trim() || null,
        });
        console.log('✅ Clinician session rating saved:', { rating, comments });
      }

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      onClose();
      // Navigate to the appropriate page based on context
      navigate(isPortalContext ? '/portal/appointments' : '/appointments');
    } catch (err) {
      console.error('❌ Failed to save rating:', err);
      setError('Failed to save your feedback. You can still close this window.');
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
    navigate(isPortalContext ? '/portal/appointments' : '/appointments');
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
              {/* AI Note Error Display */}
              {aiNoteError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {aiNoteError}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {/* AI SCRIBE: Generate AI Clinical Note - PRIMARY ACTION */}
                <Button
                  variant="contained"
                  color="success"
                  startIcon={generatingAINote ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                  onClick={handleGenerateAINote}
                  disabled={generatingAINote || aiNoteGenerated}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1.5,
                    background: 'linear-gradient(45deg, #059669 30%, #10b981 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #047857 30%, #059669 90%)',
                    },
                  }}
                >
                  {generatingAINote ? 'Generating AI Note...' : aiNoteGenerated ? 'AI Note Generated!' : 'Generate AI Clinical Note'}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 1 }}>
                  Uses AI to automatically generate a clinical note from the session transcript
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<NoteAdd />}
                  onClick={handleCreateNote}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Create Manual Clinical Note
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Description />}
                  onClick={handleViewTranscript}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Export Session Transcript
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
                Your feedback is optional and helps us improve our services.
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

              {/* Sharing Preferences */}
              {rating && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#0369a1' }}>
                    Who can see your feedback?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose who you'd like to share your rating with:
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={shareWithTherapist}
                          onChange={(e) => setShareWithTherapist(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>Share with my therapist</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Your therapist will be able to see your rating and comments
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={shareWithAdmin}
                          onChange={(e) => setShareWithAdmin(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>Share with practice administrators</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Practice staff can view your feedback to improve services
                          </Typography>
                        </Box>
                      }
                    />
                  </FormGroup>
                </Box>
              )}

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
