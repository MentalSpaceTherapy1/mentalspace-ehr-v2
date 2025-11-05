import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Chip,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Warning,
  Info,
  CheckCircle,
  Close,
  TrendingUp,
  TrendingDown,
  Person,
  Event,
  Schedule,
} from '@mui/icons-material';

interface RiskDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  riskLevel?: string;
  riskScore?: number;
  riskFactors?: string[];
  appointmentId?: string;
  clientHistory?: {
    totalAppointments: number;
    noShowCount: number;
    cancellationCount: number;
    noShowRate: number;
    cancellationRate: number;
  };
}

export default function RiskDetailsDialog({
  open,
  onClose,
  riskLevel,
  riskScore,
  riskFactors,
  appointmentId,
  clientHistory,
}: RiskDetailsDialogProps) {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'HIGH':
        return 'error.main';
      case 'MEDIUM':
        return 'warning.main';
      case 'LOW':
        return 'success.main';
      default:
        return 'grey.500';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'HIGH':
        return <Warning color="error" sx={{ fontSize: 40 }} />;
      case 'MEDIUM':
        return <Info color="warning" sx={{ fontSize: 40 }} />;
      case 'LOW':
        return <CheckCircle color="success" sx={{ fontSize: 40 }} />;
      default:
        return <Info sx={{ fontSize: 40 }} />;
    }
  };

  const getRiskFactorLabel = (factor: string) => {
    const factorLabels: Record<string, string> = {
      high_noshow_history: 'High no-show history',
      new_client: 'New client (no history)',
      far_future_booking: 'Appointment booked far in advance',
      not_confirmed: 'Appointment not confirmed',
      late_booking: 'Last-minute booking',
      high_cancellation_rate: 'High cancellation rate',
      monday_appointment: 'Monday appointment',
      early_morning: 'Early morning appointment',
      late_evening: 'Late evening appointment',
      weather_risk: 'Weather-related risk',
    };
    return factorLabels[factor] || factor;
  };

  const getMitigationStrategies = () => {
    switch (riskLevel) {
      case 'HIGH':
        return [
          'Send additional reminder 4 hours before appointment',
          'Request phone confirmation from client',
          'Consider requiring deposit or pre-payment',
          'Follow up with personal phone call',
          'Discuss barriers to attendance with client',
        ];
      case 'MEDIUM':
        return [
          'Send standard reminders via SMS and email',
          'Request appointment confirmation',
          'Provide clear directions and parking information',
          'Offer telehealth alternative if appropriate',
        ];
      case 'LOW':
        return [
          'Standard reminder protocols are sufficient',
          'Client has good attendance history',
          'Continue current engagement practices',
        ];
      default:
        return [];
    }
  };

  if (!riskLevel || riskScore === undefined) {
    return null;
  }

  const percentage = Math.round(riskScore * 100);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          {getRiskIcon()}
          <Box>
            <Typography variant="h6">No-Show Risk Analysis</Typography>
            <Typography variant="body2" color="text.secondary">
              Detailed risk assessment and mitigation strategies
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Risk Score */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Risk Level
            </Typography>
            <Chip
              label={riskLevel}
              color={
                riskLevel === 'HIGH' ? 'error' : riskLevel === 'MEDIUM' ? 'warning' : 'success'
              }
              size="small"
            />
          </Stack>
          <Box sx={{ mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: getRiskColor(),
                },
              }}
            />
          </Box>
          <Typography variant="h4" fontWeight="bold" color={getRiskColor()}>
            {percentage}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Probability of no-show
          </Typography>
        </Paper>

        {/* Client History */}
        {clientHistory && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Client Appointment History
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Appointments
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {clientHistory.totalAppointments}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  No-Show Rate
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="medium"
                  color={clientHistory.noShowRate > 0.2 ? 'error.main' : 'text.primary'}
                >
                  {Math.round(clientHistory.noShowRate * 100)}% ({clientHistory.noShowCount}{' '}
                  no-shows)
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Cancellation Rate
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {Math.round(clientHistory.cancellationRate * 100)}% (
                  {clientHistory.cancellationCount} cancellations)
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Risk Factors */}
        {riskFactors && riskFactors.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Contributing Risk Factors
            </Typography>
            <List dense>
              {riskFactors.map((factor, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Warning color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={getRiskFactorLabel(factor)}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Mitigation Strategies */}
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Recommended Mitigation Strategies
          </Typography>
          <List dense>
            {getMitigationStrategies().map((strategy, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircle color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={strategy}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<Close />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
