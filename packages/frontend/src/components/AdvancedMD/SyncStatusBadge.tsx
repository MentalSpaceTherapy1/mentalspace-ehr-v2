/**
 * SyncStatusBadge Component
 *
 * Displays a badge indicating the sync status of a patient or appointment
 */

import { Chip, ChipProps } from '@mui/material';
import {
  CheckCircle,
  Pending,
  Error,
  Sync,
} from '@mui/icons-material';
import type { SyncStatus } from '../../types/advancedmd.types';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  size?: ChipProps['size'];
  showIcon?: boolean;
  onClick?: () => void;
}

/**
 * Badge component for displaying sync status
 */
export default function SyncStatusBadge({
  status,
  size = 'small',
  showIcon = true,
  onClick,
}: SyncStatusBadgeProps) {
  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'synced':
        return {
          label: 'Synced',
          color: 'success' as const,
          icon: <CheckCircle />,
        };
      case 'pending':
        return {
          label: 'Pending',
          color: 'default' as const,
          icon: <Pending />,
        };
      case 'syncing':
        return {
          label: 'Syncing',
          color: 'info' as const,
          icon: <Sync />,
        };
      case 'error':
        return {
          label: 'Error',
          color: 'error' as const,
          icon: <Error />,
        };
      default:
        return {
          label: 'Unknown',
          color: 'default' as const,
          icon: <Pending />,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      icon={showIcon ? config.icon : undefined}
      label={config.label}
      size={size}
      color={config.color}
      onClick={onClick}
      clickable={!!onClick}
    />
  );
}
