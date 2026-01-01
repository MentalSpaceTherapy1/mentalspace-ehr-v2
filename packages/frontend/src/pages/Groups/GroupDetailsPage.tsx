import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  PersonAdd,
  CalendarMonth,
} from '@mui/icons-material';
import api from '../../lib/api';
import GroupMembersList from '../../components/Groups/GroupMembersList';
import AddMemberDialog from '../../components/Groups/AddMemberDialog';

interface GroupSession {
  id: string;
  groupName: string;
  description?: string;
  facilitatorId: string;
  coFacilitatorId?: string;
  maxCapacity: number;
  currentEnrollment: number;
  groupType: string;
  isOpenEnrollment: boolean;
  requiresScreening: boolean;
  recurringPattern?: string;
  dayOfWeek?: number;
  startTime?: string;
  duration?: number;
  billingType: string;
  ratePerMember?: number;
  status: string;
  startDate: string;
  endDate?: string;
  facilitator?: any;
  coFacilitator?: any;
  appointmentType?: any;
  members?: any[];
  sessions?: any[];
  _count?: {
    members: number;
    sessions: number;
  };
}

// Helper to format date string without timezone conversion
const formatLocalDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Take just the date portion (YYYY-MM-DD) and format as MM/DD/YYYY
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
};

export default function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadGroup();
    }
  }, [id]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/group-sessions/${id}`);
      setGroup(response.data.data);
    } catch (error: any) {
      setErrorMessage('Failed to load group session details');
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberAdded = () => {
    setAddMemberOpen(false);
    setSuccessMessage('Member enrolled successfully');
    loadGroup();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleMemberUpdated = () => {
    setSuccessMessage('Member updated successfully');
    loadGroup();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const dayOfWeekOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'FULL':
        return 'warning';
      case 'CLOSED':
        return 'error';
      case 'ARCHIVED':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!group) {
    return (
      <Box>
        <Alert severity="error">Group session not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/groups')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight="bold">
            {group.groupName}
          </Typography>
          <Typography color="text.secondary">
            {group.facilitator
              ? `Facilitated by ${group.facilitator.firstName} ${group.facilitator.lastName}`
              : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate('/groups', { state: { editGroupId: group.id } })}
          >
            Edit Group
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setAddMemberOpen(true)}
            disabled={group.status !== 'ACTIVE'}
          >
            Add Member
          </Button>
        </Stack>
      </Box>

      {/* Alerts */}
      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Group Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography>{group.description || 'No description provided'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={group.status}
                size="small"
                color={getStatusColor(group.status)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Enrollment
              </Typography>
              <Typography>
                {group.currentEnrollment} / {group.maxCapacity} members
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Group Type
              </Typography>
              <Typography>{group.groupType}</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Schedule
              </Typography>
              <Typography>
                {group.recurringPattern && group.dayOfWeek !== undefined
                  ? `${group.recurringPattern === 'WEEKLY' ? 'Weekly' : 'Bi-weekly'} on ${dayOfWeekOptions[group.dayOfWeek]}`
                  : 'Not scheduled'}
              </Typography>
              {group.startTime && (
                <Typography variant="body2" color="text.secondary">
                  {group.startTime} ({group.duration} min)
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Billing
              </Typography>
              <Typography>
                {group.billingType === 'PER_MEMBER' ? 'Per Member' : 'Flat Rate'}
                {group.ratePerMember ? ` - $${group.ratePerMember}` : ''}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Facilitators
              </Typography>
              <Typography>
                {group.facilitator
                  ? `${group.facilitator.firstName} ${group.facilitator.lastName}`
                  : 'N/A'}
              </Typography>
              {group.coFacilitator && (
                <Typography variant="body2" color="text.secondary">
                  Co-fac: {group.coFacilitator.firstName} {group.coFacilitator.lastName}
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Dates
              </Typography>
              <Typography>
                {formatLocalDate(group.startDate)}
                {group.endDate && ` - ${formatLocalDate(group.endDate)}`}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Open Enrollment
              </Typography>
              <Typography>{group.isOpenEnrollment ? 'Yes' : 'No'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Requires Screening
              </Typography>
              <Typography>{group.requiresScreening ? 'Yes' : 'No'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`Members (${group.members?.length || 0})`} />
          <Tab label={`Sessions (${group.sessions?.length || 0})`} />
        </Tabs>

        <CardContent>
          {activeTab === 0 && (
            <GroupMembersList
              groupId={group.id}
              members={group.members || []}
              onMemberUpdated={handleMemberUpdated}
            />
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Session history will be displayed here
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addMemberOpen}
        groupId={group.id}
        requiresScreening={group.requiresScreening}
        onClose={() => setAddMemberOpen(false)}
        onSuccess={handleMemberAdded}
      />
    </Box>
  );
}
