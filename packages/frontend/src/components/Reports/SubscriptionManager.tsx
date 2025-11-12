import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Switch,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  History as HistoryIcon
} from '@mui/icons-material';

interface Subscription {
  id: string;
  reportId: string;
  reportType: string;
  frequency: string;
  format: string;
  deliveryMethod: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionManagerProps {
  onSubscribe?: (reportId: string) => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onSubscribe }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; subscriptionId: string | null }>({
    open: false,
    subscriptionId: null
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/subscriptions');
      setSubscriptions(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const endpoint = currentStatus ? 'pause' : 'resume';
      await axios.post(`/api/v1/subscriptions/${id}/${endpoint}`);
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update subscription status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to unsubscribe from this report?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/subscriptions/${id}`);
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete subscription');
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      CUSTOM: 'Custom'
    };
    return labels[frequency] || frequency;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Report Subscriptions</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Report Type</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Format</TableCell>
              <TableCell>Delivery Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary">
                    No subscriptions found. Subscribe to reports from the Reports page.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>{subscription.reportType}</TableCell>
                  <TableCell>{getFrequencyLabel(subscription.frequency)}</TableCell>
                  <TableCell>
                    <Chip label={subscription.format} size="small" />
                  </TableCell>
                  <TableCell>{subscription.deliveryMethod}</TableCell>
                  <TableCell>
                    <Chip
                      label={subscription.isActive ? 'Active' : 'Paused'}
                      color={getStatusColor(subscription.isActive) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title={subscription.isActive ? 'Pause' : 'Resume'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(subscription.id, subscription.isActive)}
                        >
                          {subscription.isActive ? <PauseIcon /> : <PlayIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View History">
                        <IconButton
                          size="small"
                          onClick={() => setHistoryDialog({ open: true, subscriptionId: subscription.id })}
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(subscription.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
