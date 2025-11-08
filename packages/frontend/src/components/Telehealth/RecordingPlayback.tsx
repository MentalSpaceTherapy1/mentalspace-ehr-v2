/**
 * Recording Playback Component
 *
 * Provides a secure video player for telehealth session recordings with:
 * - HTML5 video player with controls
 * - Playback speed controls
 * - Download functionality
 * - Access logging
 * - Delete functionality with confirmation
 *
 * @module RecordingPlayback
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Slider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Fullscreen as FullscreenIcon,
  Speed as SpeedIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface RecordingPlaybackProps {
  sessionId: string;
  recordingId?: string;
  onDeleted?: () => void;
}

interface RecordingData {
  id: string;
  sessionId: string;
  status: string;
  recordingStartedAt: string;
  recordingEndedAt: string;
  recordingDuration: number; // seconds
  recordingSize: number; // bytes
  viewCount: number;
  downloadCount: number;
  retentionPolicy: string;
  scheduledDeletionAt: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb > 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
};

const RecordingPlayback: React.FC<RecordingPlaybackProps> = ({
  sessionId,
  recordingId,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string>('');

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [speedMenuAnchor, setSpeedMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchRecording();
  }, [sessionId, recordingId]);

  const fetchRecording = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch recording details
      const recordingResponse = await fetch(
        `/api/v1/telehealth/sessions/${sessionId}/recording${recordingId ? `?recordingId=${recordingId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!recordingResponse.ok) {
        throw new Error('Failed to fetch recording details');
      }

      const recordingData = await recordingResponse.json();
      const recordings = recordingData.recordings;

      if (!recordings || recordings.length === 0) {
        throw new Error('No recordings found for this session');
      }

      const rec = recordings[0];
      setRecording(rec);

      // Fetch playback URL (presigned, expires in 1 hour)
      const urlResponse = await fetch(
        `/api/v1/telehealth/sessions/${sessionId}/recording/playback-url${recordingId ? `?recordingId=${recordingId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!urlResponse.ok) {
        throw new Error('Failed to generate playback URL');
      }

      const urlData = await urlResponse.json();
      setPlaybackUrl(urlData.url);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load recording');
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (event: Event, value: number | number[]) => {
    if (!videoRef.current) return;
    const time = value as number;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (event: Event, value: number | number[]) => {
    if (!videoRef.current) return;
    const vol = (value as number) / 100;
    videoRef.current.volume = vol;
    setVolume(vol);
    setMuted(vol === 0);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setSpeedMenuAnchor(null);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `/api/v1/telehealth/sessions/${sessionId}/recording/download${recordingId ? `?recordingId=${recordingId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate download URL');
      }

      const data = await response.json();

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Failed to download recording');
    }
  };

  const handleDelete = async () => {
    if (!deletionReason.trim()) {
      setError('Please provide a reason for deletion');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/v1/telehealth/recordings/${recording!.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ reason: deletionReason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      setDeleteDialogOpen(false);
      onDeleted?.();
    } catch (err: any) {
      setError(err.message || 'Failed to delete recording');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !recording) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper elevation={3}>
        {/* Recording Info Header */}
        <Box p={2} bgcolor="grey.100" borderBottom={1} borderColor="grey.300">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">Session Recording</Typography>
              <Typography variant="body2" color="text.secondary">
                Recorded on {format(new Date(recording!.recordingStartedAt), 'PPpp')}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip
                label={`Duration: ${formatDuration(recording!.recordingDuration)}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Size: ${formatFileSize(recording!.recordingSize)}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Views: ${recording!.viewCount}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>

        {/* Video Player */}
        <Box position="relative" bgcolor="black">
          <video
            ref={videoRef}
            src={playbackUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlaying(false)}
            style={{
              width: '100%',
              maxHeight: '600px',
              display: 'block',
            }}
          />

          {/* Custom Controls Overlay */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            bgcolor="rgba(0,0,0,0.7)"
            p={2}
          >
            {/* Progress Bar */}
            <Slider
              value={currentTime}
              max={duration}
              onChange={handleSeek}
              size="small"
              sx={{ color: 'white', mb: 1 }}
            />

            {/* Controls */}
            <Box display="flex" alignItems="center" gap={1}>
              {/* Play/Pause */}
              <IconButton onClick={handlePlayPause} sx={{ color: 'white' }}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </IconButton>

              {/* Time Display */}
              <Typography variant="body2" sx={{ color: 'white', minWidth: 100 }}>
                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
              </Typography>

              {/* Volume */}
              <IconButton onClick={handleMuteToggle} sx={{ color: 'white' }}>
                {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
              <Slider
                value={volume * 100}
                onChange={handleVolumeChange}
                sx={{ color: 'white', width: 100 }}
                size="small"
              />

              <Box flex={1} />

              {/* Playback Speed */}
              <Tooltip title="Playback Speed">
                <IconButton
                  onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
                  sx={{ color: 'white' }}
                >
                  <SpeedIcon />
                  <Typography variant="caption" ml={0.5}>
                    {playbackRate}x
                  </Typography>
                </IconButton>
              </Tooltip>

              {/* Fullscreen */}
              <Tooltip title="Fullscreen">
                <IconButton onClick={handleFullscreen} sx={{ color: 'white' }}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" gap={1}>
            <Tooltip title="Recording details including retention policy">
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" color="text.secondary" alignSelf="center">
              Retention: {recording!.retentionPolicy} |
              Scheduled deletion: {format(new Date(recording!.scheduledDeletionAt), 'PP')}
            </Typography>
          </Box>

          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Playback Speed Menu */}
      <Menu
        anchorEl={speedMenuAnchor}
        open={Boolean(speedMenuAnchor)}
        onClose={() => setSpeedMenuAnchor(null)}
      >
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
          <MenuItem
            key={rate}
            onClick={() => handlePlaybackRateChange(rate)}
            selected={playbackRate === rate}
          >
            {rate}x {rate === 1 && '(Normal)'}
          </MenuItem>
        ))}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Recording</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The recording will be permanently deleted from secure storage.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Deletion *"
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            disabled={deleting}
            placeholder="Required: Explain why this recording is being deleted..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting || !deletionReason.trim()}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Recording'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordingPlayback;
