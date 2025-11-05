import { Chip, Tooltip, Stack } from '@mui/material';
import {
  CheckCircle,
  Pending,
  Error,
  Sms,
  Email,
} from '@mui/icons-material';

interface AppointmentReminder {
  id: string;
  reminderType: string; // SMS, EMAIL, VOICE, PORTAL
  deliveryStatus: string; // PENDING, SENT, DELIVERED, FAILED, BOUNCED
  responseReceived: boolean;
  responseType?: string; // CONFIRMED, CANCELLED, RESCHEDULED, NO_RESPONSE
  sentAt?: Date;
}

interface ReminderStatusBadgeProps {
  reminders: AppointmentReminder[];
}

export default function ReminderStatusBadge({ reminders }: ReminderStatusBadgeProps) {
  if (!reminders || reminders.length === 0) {
    return null;
  }

  const smsReminders = reminders.filter((r) => r.reminderType === 'SMS');
  const emailReminders = reminders.filter((r) => r.reminderType === 'EMAIL');

  const getStatusIcon = (status: string, responseReceived: boolean) => {
    if (responseReceived) return <CheckCircle />;
    if (status === 'DELIVERED') return <CheckCircle />;
    if (status === 'FAILED' || status === 'BOUNCED') return <Error />;
    return <Pending />;
  };

  const getStatusColor = (status: string, responseReceived: boolean): 'success' | 'error' | 'default' | 'info' => {
    if (responseReceived) return 'success';
    if (status === 'DELIVERED') return 'info';
    if (status === 'FAILED' || status === 'BOUNCED') return 'error';
    return 'default';
  };

  const getTooltipText = (reminders: AppointmentReminder[], type: string) => {
    const delivered = reminders.filter(r => r.deliveryStatus === 'DELIVERED').length;
    const failed = reminders.filter(r => r.deliveryStatus === 'FAILED' || r.deliveryStatus === 'BOUNCED').length;
    const pending = reminders.filter(r => r.deliveryStatus === 'PENDING').length;
    const confirmed = reminders.filter(r => r.responseReceived && r.responseType === 'CONFIRMED').length;

    let text = `${type} Reminders: ${reminders.length} total`;
    if (delivered > 0) text += `, ${delivered} delivered`;
    if (failed > 0) text += `, ${failed} failed`;
    if (pending > 0) text += `, ${pending} pending`;
    if (confirmed > 0) text += ` (${confirmed} confirmed)`;

    return text;
  };

  const getMostRecentStatus = (reminders: AppointmentReminder[]) => {
    if (reminders.length === 0) return { status: 'PENDING', responseReceived: false };

    // Sort by sentAt date (most recent first)
    const sorted = [...reminders].sort((a, b) => {
      if (!a.sentAt) return 1;
      if (!b.sentAt) return -1;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });

    return {
      status: sorted[0].deliveryStatus,
      responseReceived: sorted[0].responseReceived
    };
  };

  return (
    <Stack direction="row" spacing={1}>
      {smsReminders.length > 0 && (
        <Tooltip title={getTooltipText(smsReminders, 'SMS')} arrow>
          <Chip
            icon={<Sms />}
            label={smsReminders.length}
            size="small"
            color={getStatusColor(
              getMostRecentStatus(smsReminders).status,
              getMostRecentStatus(smsReminders).responseReceived
            )}
          />
        </Tooltip>
      )}
      {emailReminders.length > 0 && (
        <Tooltip title={getTooltipText(emailReminders, 'Email')} arrow>
          <Chip
            icon={<Email />}
            label={emailReminders.length}
            size="small"
            color={getStatusColor(
              getMostRecentStatus(emailReminders).status,
              getMostRecentStatus(emailReminders).responseReceived
            )}
          />
        </Tooltip>
      )}
    </Stack>
  );
}
