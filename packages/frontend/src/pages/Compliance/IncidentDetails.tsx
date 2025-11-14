import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Stack,
  Avatar,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  alpha,
  Divider
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  ArrowBack,
  Person,
  LocationOn,
  CalendarToday,
  ExpandMore,
  Edit,
  Close as CloseIcon,
  Assignment,
  CheckCircle,
  PlayArrow
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident, Incident } from '../../hooks/useIncident';

const severityColors = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444'
};

const statusColors = {
  REPORTED: '#6366F1',
  UNDER_INVESTIGATION: '#F59E0B',
  CORRECTIVE_ACTION: '#8B5CF6',
  RESOLVED: '#10B981',
  CLOSED: '#64748B'
};

const mockInvestigators = [
  { id: 'inv1', name: 'Dr. Sarah Johnson' },
  { id: 'inv2', name: 'Michael Chen' },
  { id: 'inv3', name: 'Emily Davis' }
];

export default function IncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchIncidentById, assignInvestigator, updateIncident, closeIncident } = useIncident();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvestigator, setSelectedInvestigator] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closeDialog, setCloseDialog] = useState(false);

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    if (id) {
      const data = await fetchIncidentById(id);
      if (data) {
        setIncident(data);
        setSelectedInvestigator(data.assignedTo || '');
      }
    }
    setLoading(false);
  };

  const handleAssignInvestigator = async () => {
    if (selectedInvestigator && id) {
      await assignInvestigator(id, selectedInvestigator);
      loadIncident();
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (id) {
      await updateIncident(id, { status: newStatus as any });
      loadIncident();
    }
  };

  const handleCloseIncident = async () => {
    if (id) {
      await closeIncident(id, closureNotes);
      navigate('/compliance/incidents');
    }
  };

  if (loading || !incident) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${severityColors[incident.severity]} 0%, ${alpha(severityColors[incident.severity], 0.7)} 100%)`,
          color: 'white',
          borderRadius: 3,
          mb: 3,
          boxShadow: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/compliance/incidents')}
              sx={{ color: 'white' }}
            >
              Back
            </Button>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {incident.title}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Chip
                  label={incident.type}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
                <Chip
                  label={incident.severity}
                  sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 700 }}
                />
                <Chip
                  label={incident.status.replace(/_/g, ' ')}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Stack>
            </Box>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => navigate(`/compliance/incidents/${id}/investigate`)}
              sx={{
                bgcolor: 'white',
                color: severityColors[incident.severity],
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
              }}
            >
              Investigate
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid size={{xs: 12, md: 8}}>
          {/* Incident Summary */}
          <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Incident Summary
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{xs: 6}}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <CalendarToday sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Incident Date
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {new Date(incident.incidentDate).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{xs: 6}}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <LocationOn sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {incident.location}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{xs: 12}}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Description
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {incident.description}
                  </Typography>
                </Grid>

                {incident.immediateActions && (
                  <Grid size={{xs: 12}}>
                    <Paper sx={{ p: 2, bgcolor: alpha('#10B981', 0.05), borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Immediate Actions Taken
                      </Typography>
                      <Typography variant="body2">
                        {incident.immediateActions}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* People Involved */}
          {incident.peopleInvolved && incident.peopleInvolved.length > 0 && (
            <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                  People Involved
                </Typography>
                <Stack spacing={2}>
                  {incident.peopleInvolved.map((person) => (
                    <Paper
                      key={person.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: '#667EEA' }}>
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {person.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {person.role}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Activity Timeline
              </Typography>

              <Timeline>
                {incident.timeline?.map((event, idx) => (
                  <TimelineItem key={event.id}>
                    <TimelineOppositeContent color="text.secondary">
                      {new Date(event.performedAt).toLocaleString()}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot
                        sx={{
                          bgcolor: '#667EEA'
                        }}
                      />
                      {idx < (incident.timeline?.length || 0) - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {event.action}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        by {event.performedBy}
                      </Typography>
                      {event.notes && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {event.notes}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}

                <TimelineItem>
                  <TimelineOppositeContent color="text.secondary">
                    {new Date(incident.reportedAt).toLocaleString()}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="primary" />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Incident Reported
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {incident.reportedBy}
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              </Timeline>
            </CardContent>
          </Card>

          {/* Investigation Notes */}
          <Accordion sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Investigation Notes
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Add investigation notes..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button
                variant="contained"
                sx={{
                  mt: 2,
                  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
                }}
              >
                Save Notes
              </Button>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Right Column */}
        <Grid size={{xs: 12, md: 4}}>
          {/* Assign Investigator */}
          <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Assign Investigator
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Investigator</InputLabel>
                <Select
                  value={selectedInvestigator}
                  onChange={(e) => setSelectedInvestigator(e.target.value)}
                  label="Investigator"
                  sx={{ borderRadius: 2 }}
                >
                  {mockInvestigators.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Assignment />}
                onClick={handleAssignInvestigator}
                disabled={!selectedInvestigator || selectedInvestigator === incident.assignedTo}
                sx={{
                  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                  borderRadius: 2
                }}
              >
                Assign
              </Button>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Update Status
              </Typography>
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => handleUpdateStatus('UNDER_INVESTIGATION')}
                  disabled={incident.status === 'UNDER_INVESTIGATION'}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Start Investigation
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => handleUpdateStatus('CORRECTIVE_ACTION')}
                  disabled={incident.status === 'CORRECTIVE_ACTION'}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Corrective Action
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CheckCircle />}
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  disabled={incident.status === 'RESOLVED'}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Mark Resolved
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Close Incident */}
          {incident.status === 'RESOLVED' && (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                border: '2px solid',
                borderColor: '#10B981'
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Close Incident
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Closure notes..."
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CloseIcon />}
                  onClick={handleCloseIncident}
                  sx={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    borderRadius: 2
                  }}
                >
                  Close Incident
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
