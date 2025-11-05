import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
} from '@mui/material';
import { Save, Close, ExpandMore, ExpandLess } from '@mui/icons-material';
import api from '../../lib/api';

interface GroupMember {
  id: string;
  clientId: string;
  attendanceCount: number;
  absenceCount: number;
  client: {
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
}

interface AttendanceRecord {
  groupMemberId: string;
  attended: boolean;
  notes: string;
  expanded: boolean;
}

interface Props {
  open: boolean;
  appointmentId: string;
  groupId: string;
  appointmentDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GroupAttendanceSheet({
  open,
  appointmentId,
  groupId,
  appointmentDate,
  onClose,
  onSuccess,
}: Props) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open && groupId && appointmentId) {
      loadData();
    }
  }, [open, groupId, appointmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load group members
      const membersRes = await api.get(`/group-sessions/${groupId}/members`);
      const activeMembers = (membersRes.data.data || []).filter(
        (m: GroupMember) => m.status === 'ACTIVE'
      );
      setMembers(activeMembers);

      // Load existing attendance if any
      try {
        const attendanceRes = await api.get(
          `/group-sessions/appointments/${appointmentId}/attendance`
        );
        const existingAttendance = attendanceRes.data.data || [];

        // Build attendance map
        const attendanceMap: Record<string, AttendanceRecord> = {};
        activeMembers.forEach((member: GroupMember) => {
          const existing = existingAttendance.find(
            (a: any) => a.groupMemberId === member.id
          );
          attendanceMap[member.id] = {
            groupMemberId: member.id,
            attended: existing?.attended || false,
            notes: existing?.notes || '',
            expanded: false,
          };
        });
        setAttendance(attendanceMap);
      } catch (err) {
        // No existing attendance, initialize with defaults
        const attendanceMap: Record<string, AttendanceRecord> = {};
        activeMembers.forEach((member: GroupMember) => {
          attendanceMap[member.id] = {
            groupMemberId: member.id,
            attended: false,
            notes: '',
            expanded: false,
          };
        });
        setAttendance(attendanceMap);
      }
    } catch (error: any) {
      setError('Failed to load group members');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (memberId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        attended: !prev[memberId].attended,
      },
    }));
  };

  const handleToggleExpanded = (memberId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        expanded: !prev[memberId].expanded,
      },
    }));
  };

  const handleNotesChange = (memberId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        notes,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');

      // Build attendance array
      const attendanceArray = Object.values(attendance).map((record) => ({
        groupMemberId: record.groupMemberId,
        attended: record.attended,
        checkedInAt: record.attended ? new Date() : undefined,
        notes: record.notes || undefined,
      }));

      await api.post('/group-sessions/attendance/batch', {
        appointmentId,
        attendance: attendanceArray,
      });

      setSuccess('Attendance saved successfully');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save attendance');
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setAttendance({});
    setError('');
    setSuccess('');
    onClose();
  };

  const attendedCount = Object.values(attendance).filter((a) => a.attended).length;
  const totalCount = members.length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Mark Attendance
        <Typography variant="body2" color="text.secondary">
          {new Date(appointmentDate).toLocaleDateString()} - {attendedCount} / {totalCount}{' '}
          Present
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box>
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : members.length === 0 ? (
            <Typography color="text.secondary" align="center" py={4}>
              No active members in this group
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">Present</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell>MRN</TableCell>
                    <TableCell align="center">Previous</TableCell>
                    <TableCell align="right">Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <>
                      <TableRow key={member.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={attendance[member.id]?.attended || false}
                            onChange={() => handleToggleAttendance(member.id)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {member.client.firstName} {member.client.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>{member.client.medicalRecordNumber}</TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {member.attendanceCount} / {member.attendanceCount + member.absenceCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpanded(member.id)}
                          >
                            {attendance[member.id]?.expanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, borderBottom: 'none' }}>
                          <Collapse
                            in={attendance[member.id]?.expanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ py: 2 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                label="Attendance Notes"
                                value={attendance[member.id]?.notes || ''}
                                onChange={(e) =>
                                  handleNotesChange(member.id, e.target.value)
                                }
                                placeholder="Note any concerns, participation level, or observations"
                              />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<Close />} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          disabled={saving || members.length === 0 || success !== ''}
        >
          {saving ? 'Saving...' : 'Save Attendance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
