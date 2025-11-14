import React, { useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  Chip,
  IconButton,
  Grid
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface ScheduleReportDialogProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  reportType: string;
  onScheduleCreated?: () => void;
}

export const ScheduleReportDialog: React.FC<ScheduleReportDialogProps> = ({
  open,
  onClose,
  reportId,
  reportType,
  onScheduleCreated
}) => {
  const [frequency, setFrequency] = useState('DAILY');
  const [format, setFormat] = useState('PDF');
  const [timezone, setTimezone] = useState('America/New_York');
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distributionType, setDistributionType] = useState('ALWAYS');
  const [threshold, setThreshold] = useState('');

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, value: string) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  const handleAddCc = () => {
    setCcRecipients([...ccRecipients, '']);
  };

  const handleRemoveCc = (index: number) => {
    setCcRecipients(ccRecipients.filter((_, i) => i !== index));
  };

  const handleCcChange = (index: number, value: string) => {
    const updated = [...ccRecipients];
    updated[index] = value;
    setCcRecipients(updated);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async () => {
    // Validate recipients
    const validRecipients = recipients.filter(email => email && validateEmail(email));
    if (validRecipients.length === 0) {
      setError('At least one valid recipient email is required');
      return;
    }

    const validCc = ccRecipients.filter(email => email && validateEmail(email));

    try {
      setLoading(true);
      setError(null);

      const distributionCondition =
        distributionType !== 'ALWAYS'
          ? {
              type: distributionType,
              ...(distributionType === 'THRESHOLD' && threshold && { threshold: parseFloat(threshold) })
            }
          : undefined;

      await axios.post('/api/v1/report-schedules', {
        reportId,
        reportType,
        frequency,
        timezone,
        format,
        recipients: {
          to: validRecipients,
          cc: validCc,
          bcc: []
        },
        distributionCondition
      });

      if (onScheduleCreated) {
        onScheduleCreated();
      }
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFrequency('DAILY');
    setFormat('PDF');
    setTimezone('America/New_York');
    setRecipients(['']);
    setCcRecipients([]);
    setDistributionType('ALWAYS');
    setThreshold('');
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Schedule Report: {reportType}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{xs: 12, sm: 6}}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select value={frequency} onChange={(e) => setFrequency(e.target.value)} label="Frequency">
                  <MenuItem value="DAILY">Daily</MenuItem>
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs: 12, sm: 6}}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select value={format} onChange={(e) => setFormat(e.target.value)} label="Format">
                  <MenuItem value="PDF">PDF</MenuItem>
                  <MenuItem value="EXCEL">Excel</MenuItem>
                  <MenuItem value="CSV">CSV</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs: 12}}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} label="Timezone">
                  <MenuItem value="America/New_York">Eastern Time</MenuItem>
                  <MenuItem value="America/Chicago">Central Time</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                  <MenuItem value="UTC">UTC</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{xs: 12}}>
              <Typography variant="subtitle2" gutterBottom>
                Recipients (To)
              </Typography>
              {recipients.map((email, index) => (
                <Box key={index} display="flex" gap={1} mb={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    error={email !== '' && !validateEmail(email)}
                    helperText={email !== '' && !validateEmail(email) ? 'Invalid email format' : ''}
                  />
                  {recipients.length > 1 && (
                    <IconButton size="small" onClick={() => handleRemoveRecipient(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddRecipient} size="small">
                Add Recipient
              </Button>
            </Grid>

            <Grid size={{xs: 12}}>
              <Typography variant="subtitle2" gutterBottom>
                CC Recipients (Optional)
              </Typography>
              {ccRecipients.map((email, index) => (
                <Box key={index} display="flex" gap={1} mb={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => handleCcChange(index, e.target.value)}
                    error={email !== '' && !validateEmail(email)}
                    helperText={email !== '' && !validateEmail(email) ? 'Invalid email format' : ''}
                  />
                  <IconButton size="small" onClick={() => handleRemoveCc(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddCc} size="small">
                Add CC
              </Button>
            </Grid>

            <Grid size={{xs: 12}}>
              <FormControl fullWidth>
                <InputLabel>Distribution Condition</InputLabel>
                <Select
                  value={distributionType}
                  onChange={(e) => setDistributionType(e.target.value)}
                  label="Distribution Condition"
                >
                  <MenuItem value="ALWAYS">Always Send</MenuItem>
                  <MenuItem value="THRESHOLD">Only if Threshold Met</MenuItem>
                  <MenuItem value="CHANGE_DETECTION">Only if Data Changed</MenuItem>
                  <MenuItem value="EXCEPTION">Only if Exceptions Detected</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {distributionType === 'THRESHOLD' && (
              <Grid size={{xs: 12}}>
                <TextField
                  fullWidth
                  label="Threshold Value"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  helperText="Report will only be sent if metrics exceed this value"
                />
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Create Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
