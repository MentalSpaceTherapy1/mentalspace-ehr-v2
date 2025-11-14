import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { VersionComparisonModal } from './VersionComparisonModal';

interface Amendment {
  id: string;
  amendmentNumber: number;
  reason: string;
  amendedBy: string;
  amendedAt: string;
  fieldsChanged: string[];
  changeSummary: string;
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  previousVersionId: string;
  newVersionId: string;
  amendingUser: {
    id: string;
    firstName: string;
    lastName: string;
    credentials: string;
  };
  signatureEvent?: {
    id: string;
    signedAt: string;
    user: {
      firstName: string;
      lastName: string;
      credentials: string;
    };
  };
}

interface AmendmentHistoryTabProps {
  noteId: string;
}

export const AmendmentHistoryTab: React.FC<AmendmentHistoryTabProps> = ({ noteId }) => {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetchAmendments();
  }, [noteId]);

  const fetchAmendments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/v1/clinical-notes/${noteId}/amendments`);
      setAmendments(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load amendment history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChanges = (amendment: Amendment) => {
    setSelectedAmendment(amendment);
    setShowComparison(true);
  };

  const getStatusColor = (status: string): 'inherit' | 'grey' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'SIGNED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'error';
      default:
        return 'grey';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return <CheckCircleIcon />;
      case 'PENDING':
        return <PendingIcon />;
      default:
        return <EditIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (amendments.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          This clinical note has not been amended. Amendments create a permanent audit trail when
          signed notes need to be modified.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Amendment History ({amendments.length} amendment{amendments.length !== 1 ? 's' : ''})
        </Typography>
      </Box>

      <Timeline position="right">
        {amendments.map((amendment, index) => (
          <TimelineItem key={amendment.id}>
            <TimelineOppositeContent color="textSecondary" sx={{ maxWidth: '150px' }}>
              <Typography variant="caption" display="block">
                {format(new Date(amendment.amendedAt), 'MMM dd, yyyy')}
              </Typography>
              <Typography variant="caption" display="block">
                {format(new Date(amendment.amendedAt), 'hh:mm a')}
              </Typography>
            </TimelineOppositeContent>

            <TimelineSeparator>
              <TimelineDot color={getStatusColor(amendment.status)} variant="outlined">
                {getStatusIcon(amendment.status)}
              </TimelineDot>
              {index < amendments.length - 1 && <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Amendment #{amendment.amendmentNumber}
                      </Typography>
                      <Chip
                        label={amendment.status}
                        color={getStatusColor(amendment.status) as any}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewChanges(amendment)}
                    >
                      View Changes
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{xs: 12}}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Amended By:
                      </Typography>
                      <Typography variant="body2">
                        {amendment.amendingUser.firstName} {amendment.amendingUser.lastName},{' '}
                        {amendment.amendingUser.credentials}
                      </Typography>
                    </Grid>

                    <Grid size={{xs: 12}}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Reason:
                      </Typography>
                      <Typography variant="body2">{amendment.reason}</Typography>
                    </Grid>

                    <Grid size={{xs: 12}}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Summary of Changes:
                      </Typography>
                      <Typography variant="body2">{amendment.changeSummary}</Typography>
                    </Grid>

                    <Grid size={{xs: 12}}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Fields Modified:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                        {amendment.fieldsChanged.map((field) => (
                          <Chip key={field} label={field} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Grid>

                    {amendment.signatureEvent && (
                      <>
                        <Grid size={{xs: 12}}>
                          <Divider />
                        </Grid>
                        <Grid size={{xs: 12}}>
                          <Typography variant="subtitle2" color="textSecondary">
                            Signed By:
                          </Typography>
                          <Typography variant="body2">
                            {amendment.signatureEvent.user.firstName}{' '}
                            {amendment.signatureEvent.user.lastName},{' '}
                            {amendment.signatureEvent.user.credentials}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Signed on {format(new Date(amendment.signatureEvent.signedAt), 'PPpp')}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

      {showComparison && selectedAmendment && (
        <VersionComparisonModal
          open={showComparison}
          onClose={() => {
            setShowComparison(false);
            setSelectedAmendment(null);
          }}
          amendment={selectedAmendment}
        />
      )}
    </Box>
  );
};
