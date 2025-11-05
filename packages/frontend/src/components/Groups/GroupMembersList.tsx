import { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import { Edit, RemoveCircle, CheckCircle, Cancel } from '@mui/icons-material';
import api from '../../lib/api';

interface GroupMember {
  id: string;
  clientId: string;
  status: string;
  enrollmentDate: string;
  exitDate?: string;
  exitReason?: string;
  attendanceCount: number;
  absenceCount: number;
  lastAttendance?: string;
  approved: boolean;
  screenedBy?: string;
  screeningDate?: string;
  screeningNotes?: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    primaryPhone: string;
    medicalRecordNumber: string;
  };
}

interface Props {
  groupId: string;
  members: GroupMember[];
  onMemberUpdated: () => void;
}

export default function GroupMembersList({ groupId, members, onMemberUpdated }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [exitReason, setExitReason] = useState('');
  const [memberStatus, setMemberStatus] = useState('');

  const handleEdit = (member: GroupMember) => {
    setSelectedMember(member);
    setMemberStatus(member.status);
    setEditDialogOpen(true);
  };

  const handleRemove = (member: GroupMember) => {
    setSelectedMember(member);
    setExitReason('');
    setRemoveDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedMember) return;

    try {
      await api.put(`/group-sessions/members/${selectedMember.id}`, {
        status: memberStatus,
      });
      setEditDialogOpen(false);
      onMemberUpdated();
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const handleConfirmRemove = async () => {
    if (!selectedMember) return;

    try {
      await api.delete(`/group-sessions/members/${selectedMember.id}`, {
        data: { exitReason },
      });
      setRemoveDialogOpen(false);
      onMemberUpdated();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'ON_HOLD':
        return 'warning';
      case 'EXITED':
        return 'default';
      default:
        return 'default';
    }
  };

  const calculateAttendanceRate = (member: GroupMember) => {
    const total = member.attendanceCount + member.absenceCount;
    if (total === 0) return 'N/A';
    const rate = (member.attendanceCount / total) * 100;
    return `${rate.toFixed(0)}%`;
  };

  return (
    <Box>
      {members.length === 0 ? (
        <Typography color="text.secondary" align="center" py={3}>
          No members enrolled yet
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>MRN</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Attendance</TableCell>
                <TableCell>Enrolled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {member.client.firstName} {member.client.lastName}
                    </Typography>
                    {!member.approved && (
                      <Chip label="Pending Approval" size="small" color="warning" sx={{ mt: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>{member.client.medicalRecordNumber}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{member.client.primaryPhone}</Typography>
                    {member.client.email && (
                      <Typography variant="caption" color="text.secondary">
                        {member.client.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={member.status} size="small" color={getStatusColor(member.status)} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography>{calculateAttendanceRate(member)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.attendanceCount} / {member.attendanceCount + member.absenceCount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(member.enrollmentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(member)} title="Edit">
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleRemove(member)}
                      title="Remove"
                      disabled={member.status === 'EXITED'}
                    >
                      <RemoveCircle fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Status Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Update Member Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, minWidth: 300 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={memberStatus}
              onChange={(e) => setMemberStatus(e.target.value)}
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ON_HOLD">On Hold</MenuItem>
              <MenuItem value="EXITED">Exited</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateStatus} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
        <DialogTitle>Remove Member from Group</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, minWidth: 400 }}>
            <Typography mb={2}>
              Are you sure you want to remove{' '}
              <strong>
                {selectedMember?.client.firstName} {selectedMember?.client.lastName}
              </strong>{' '}
              from this group?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Exit Reason (Optional)"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="e.g., Completed program, relocated, no longer appropriate for group"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmRemove} color="error" variant="contained">
            Remove Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
