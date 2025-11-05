import { useState } from 'react';
import { Chip, Tooltip, ChipProps } from '@mui/material';
import { Warning, Info, CheckCircle } from '@mui/icons-material';
import RiskDetailsDialog from './RiskDetailsDialog';

interface RiskBadgeProps {
  riskLevel?: string; // LOW, MEDIUM, HIGH
  riskScore?: number; // 0.0 to 1.0
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

export default function RiskBadge({
  riskLevel,
  riskScore,
  riskFactors,
  appointmentId,
  clientHistory,
}: RiskBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!riskLevel || !riskScore) {
    return null;
  }

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'HIGH':
        return <Warning />;
      case 'MEDIUM':
        return <Info />;
      case 'LOW':
        return <CheckCircle />;
      default:
        return <Info />;
    }
  };

  const getRiskColor = (): ChipProps['color'] => {
    switch (riskLevel) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRiskLabel = () => {
    const percentage = Math.round(riskScore * 100);
    return `${riskLevel} (${percentage}%)`;
  };

  const getTooltipText = () => {
    const percentage = Math.round(riskScore * 100);
    let text = `No-show risk: ${percentage}%`;

    if (riskFactors && riskFactors.length > 0) {
      text += `\nFactors: ${riskFactors.slice(0, 2).join(', ')}`;
      if (riskFactors.length > 2) {
        text += ` (+${riskFactors.length - 2} more)`;
      }
    }

    text += '\n\nClick for details';
    return text;
  };

  return (
    <>
      <Tooltip title={getTooltipText()} arrow>
        <Chip
          icon={getRiskIcon()}
          label={getRiskLabel()}
          size="small"
          color={getRiskColor()}
          onClick={() => setDialogOpen(true)}
          sx={{ cursor: 'pointer' }}
        />
      </Tooltip>

      <RiskDetailsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        riskLevel={riskLevel}
        riskScore={riskScore}
        riskFactors={riskFactors}
        appointmentId={appointmentId}
        clientHistory={clientHistory}
      />
    </>
  );
}
