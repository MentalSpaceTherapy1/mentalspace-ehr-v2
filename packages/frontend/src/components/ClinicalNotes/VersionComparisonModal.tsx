import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { CompareArrows as CompareIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

interface Amendment {
  id: string;
  amendmentNumber: number;
  reason: string;
  changeSummary: string;
  previousVersionId: string;
  newVersionId: string;
  amendedAt: string;
  amendingUser: {
    firstName: string;
    lastName: string;
    credentials: string;
  };
}

interface VersionComparisonModalProps {
  open: boolean;
  onClose: () => void;
  amendment: Amendment;
}

interface FieldDifference {
  field: string;
  oldValue: any;
  newValue: any;
}

interface ComparisonResult {
  version1: {
    id: string;
    versionNumber: number;
    createdAt: string;
    creator: {
      firstName: string;
      lastName: string;
    };
  };
  version2: {
    id: string;
    versionNumber: number;
    createdAt: string;
    creator: {
      firstName: string;
      lastName: string;
    };
  };
  differences: FieldDifference[];
  changedFieldsCount: number;
}

export const VersionComparisonModal: React.FC<VersionComparisonModalProps> = ({
  open,
  onClose,
  amendment,
}) => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && amendment.previousVersionId && amendment.newVersionId) {
      fetchComparison();
    }
  }, [open, amendment]);

  const fetchComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/v1/versions/compare', {
        params: {
          version1: amendment.previousVersionId,
          version2: amendment.newVersionId,
        },
      });
      setComparison(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load version comparison');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const formatFieldName = (fieldName: string): string => {
    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const isValueChanged = (oldVal: any, newVal: any): boolean => {
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CompareIcon />
          Version Comparison - Amendment #{amendment.amendmentNumber}
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : comparison ? (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Reason:</strong> {amendment.reason}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Summary:</strong> {amendment.changeSummary}
              </Typography>
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Previous Version
                  </Typography>
                  <Typography variant="body2">
                    Version #{comparison.version1.versionNumber}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {format(new Date(comparison.version1.createdAt), 'PPpp')}
                  </Typography>
                  <Typography variant="caption" display="block" color="textSecondary">
                    by {comparison.version1.creator.firstName}{' '}
                    {comparison.version1.creator.lastName}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, backgroundColor: '#e8f5e9' }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    New Version
                  </Typography>
                  <Typography variant="body2">
                    Version #{comparison.version2.versionNumber}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {format(new Date(comparison.version2.createdAt), 'PPpp')}
                  </Typography>
                  <Typography variant="caption" display="block" color="textSecondary">
                    by {comparison.version2.creator.firstName}{' '}
                    {comparison.version2.creator.lastName}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <Chip
                label={`${comparison.changedFieldsCount} field${
                  comparison.changedFieldsCount !== 1 ? 's' : ''
                } changed`}
                color="primary"
                size="small"
              />
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Field</strong>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#fff3e0' }}>
                      <strong>Previous Value</strong>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#e8f5e9' }}>
                      <strong>New Value</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparison.differences.map((diff) => (
                    <TableRow key={diff.field}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatFieldName(diff.field)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#fff3e0' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: diff.oldValue && typeof diff.oldValue === 'object'
                              ? 'monospace'
                              : 'inherit',
                          }}
                        >
                          {formatValue(diff.oldValue)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#e8f5e9' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: diff.newValue && typeof diff.newValue === 'object'
                              ? 'monospace'
                              : 'inherit',
                          }}
                        >
                          {formatValue(diff.newValue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {comparison.differences.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No differences detected between versions.
              </Alert>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
