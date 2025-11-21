/**
 * SyncStatusIndicator Component
 *
 * Displays detailed sync status information with timestamps and error messages
 */

import { Box, Typography, Alert, Tooltip, IconButton } from '@mui/material';
import { Refresh, OpenInNew } from '@mui/icons-material';
import { format } from 'date-fns';
import SyncStatusBadge from './SyncStatusBadge';
import type { SyncStatus } from '../../types/advancedmd.types';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSynced?: string | null;
  syncError?: string | null;
  amdEntityId?: string | null;
  entityType?: 'patient' | 'appointment';
  onResync?: () => void;
  onViewInAMD?: () => void;
  compact?: boolean;
}

/**
 * Detailed sync status indicator component
 */
export default function SyncStatusIndicator({
  status,
  lastSynced,
  syncError,
  amdEntityId,
  entityType = 'patient',
  onResync,
  onViewInAMD,
  compact = false,
}: SyncStatusIndicatorProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  const getEntityLabel = () => {
    return entityType === 'patient' ? 'Patient ID' : 'Visit ID';
  };

  if (compact) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <SyncStatusBadge status={status} />
        {amdEntityId && (
          <Typography variant="caption" color="text.secondary">
            {getEntityLabel()}: {amdEntityId}
          </Typography>
        )}
        {onResync && (
          <Tooltip title="Re-sync">
            <IconButton size="small" onClick={onResync}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <SyncStatusBadge status={status} />

        {amdEntityId && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              {getEntityLabel()}: <strong>{amdEntityId}</strong>
            </Typography>
            {onViewInAMD && (
              <Tooltip title="View in AdvancedMD">
                <IconButton size="small" onClick={onViewInAMD}>
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {onResync && status !== 'syncing' && (
          <Tooltip title="Re-sync to AdvancedMD">
            <IconButton size="small" onClick={onResync} color="primary">
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {lastSynced && (
        <Typography variant="caption" color="text.secondary" display="block">
          Last synced: {formatDate(lastSynced)}
        </Typography>
      )}

      {syncError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <Typography variant="body2">{syncError}</Typography>
        </Alert>
      )}

      {status === 'pending' && !amdEntityId && (
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="body2">
            This {entityType} has not been synced to AdvancedMD yet.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
