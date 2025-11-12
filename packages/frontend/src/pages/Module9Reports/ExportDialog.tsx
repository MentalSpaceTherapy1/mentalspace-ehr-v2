import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  alpha
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Email as EmailIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useModule9Reports } from '../../hooks/useModule9Reports';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, reportId, reportTitle }) => {
  const { exportReport } = useModule9Reports();
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatOptions = [
    {
      value: 'pdf',
      label: 'PDF Document',
      icon: <PdfIcon sx={{ fontSize: 40, color: '#EF4444' }} />,
      description: 'Professional report with charts and formatting',
      color: '#EF4444'
    },
    {
      value: 'excel',
      label: 'Excel Workbook',
      icon: <ExcelIcon sx={{ fontSize: 40, color: '#10B981' }} />,
      description: 'Spreadsheet format for data analysis',
      color: '#10B981'
    },
    {
      value: 'csv',
      label: 'CSV File',
      icon: <CsvIcon sx={{ fontSize: 40, color: '#3B82F6' }} />,
      description: 'Plain text format for maximum compatibility',
      color: '#3B82F6'
    }
  ];

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const options: any = {
        includeCharts,
        includeRawData
      };

      if (format === 'pdf') {
        options.orientation = orientation;
      }

      if (sendEmail) {
        if (!emailAddress) {
          setError('Please enter an email address');
          setLoading(false);
          return;
        }
        options.emailTo = emailAddress;
      }

      const blob = await exportReport(reportId, format, options);

      if (!sendEmail) {
        // Download the file
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportTitle}.${format === 'excel' ? 'xlsx' : format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormat('pdf');
    setOrientation('portrait');
    setIncludeCharts(true);
    setIncludeRawData(true);
    setSendEmail(false);
    setEmailAddress('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      resetForm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Export Report
          </Typography>
          <Button onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {reportTitle}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {sendEmail ? 'Report sent via email!' : 'Report downloaded successfully!'}
          </Alert>
        )}

        {/* Format Selection */}
        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
            Export Format
          </FormLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formatOptions.map((option) => (
              <Paper
                key={option.value}
                onClick={() => setFormat(option.value as any)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: format === option.value ? `3px solid ${option.color}` : '2px solid transparent',
                  borderRadius: 2,
                  transition: 'all 0.3s',
                  background: format === option.value
                    ? `linear-gradient(135deg, ${alpha(option.color, 0.1)} 0%, ${alpha(option.color, 0.05)} 100%)`
                    : 'white',
                  '&:hover': {
                    transform: 'translateX(8px)',
                    boxShadow: 3,
                    border: `3px solid ${option.color}`
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {option.icon}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {option.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                  {format === option.value && (
                    <Chip label="Selected" color="primary" size="small" />
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </FormControl>

        {/* PDF Options */}
        {format === 'pdf' && (
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              Page Orientation
            </FormLabel>
            <RadioGroup
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as any)}
              row
            >
              <FormControlLabel
                value="portrait"
                control={<Radio />}
                label="Portrait"
              />
              <FormControlLabel
                value="landscape"
                control={<Radio />}
                label="Landscape"
              />
            </RadioGroup>
          </FormControl>
        )}

        {/* Include Options */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Include in Export
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              />
            }
            label="Include Charts and Visualizations"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeRawData}
                onChange={(e) => setIncludeRawData(e.target.checked)}
              />
            }
            label="Include Raw Data Table"
            sx={{ display: 'block' }}
          />
        </Box>

        {/* Email Option */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            border: sendEmail ? '2px solid #3B82F6' : '1px solid',
            borderColor: sendEmail ? '#3B82F6' : 'divider',
            background: sendEmail
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
              : 'transparent'
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                icon={<EmailIcon />}
                checkedIcon={<EmailIcon color="primary" />}
              />
            }
            label={
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Email Report
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Send the exported report via email instead of downloading
                </Typography>
              </Box>
            }
          />

          {sendEmail && (
            <TextField
              fullWidth
              size="small"
              label="Email Address"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="recipient@example.com"
              sx={{ mt: 2 }}
            />
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={loading}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : sendEmail ? <EmailIcon /> : <DownloadIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
            }
          }}
        >
          {loading ? 'Processing...' : sendEmail ? 'Send Email' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
