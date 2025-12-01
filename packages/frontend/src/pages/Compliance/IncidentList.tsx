import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
  Menu,
  MenuItem,
  Badge,
  alpha
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Visibility,
  FileDownload,
  MoreVert,
  Warning,
  CheckCircle,
  Schedule,
  Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useIncident } from '../../hooks/useIncident';

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

const statusLabels = {
  REPORTED: 'Reported',
  UNDER_INVESTIGATION: 'Investigating',
  CORRECTIVE_ACTION: 'Corrective Action',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};

export default function IncidentList() {
  const navigate = useNavigate();
  const { incidents, fetchIncidents, exportIncidents } = useIncident();
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<string>('incidentDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    loadIncidents();
  }, [selectedFilter]);

  const loadIncidents = () => {
    const filters: any = {};

    if (selectedFilter === 'my') {
      filters.assignedTo = 'current-user'; // Replace with actual user ID
    } else if (selectedFilter === 'unassigned') {
      filters.assignedTo = 'none';
    } else if (selectedFilter === 'high') {
      filters.severity = 'HIGH,CRITICAL';
    }

    fetchIncidents(filters);
  };

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleExport = async () => {
    const blob = await exportIncidents();
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents-${new Date().toISOString()}.xlsx`;
      a.click();
    }
  };

  const filteredIncidents = incidents
    .filter(inc =>
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.type.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[orderBy as keyof typeof a];
      const bValue = b[orderBy as keyof typeof b];

      if (aValue === undefined || bValue === undefined) return 0;

      if (order === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          borderRadius: 3,
          mb: 3,
          color: 'white',
          boxShadow: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Incident Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Track and manage organizational incidents
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => navigate('/compliance/incidents/new')}
              sx={{
                bgcolor: 'white',
                color: '#D97706',
                fontWeight: 700,
                px: 4,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)'
                }
              }}
            >
              Report Incident
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Quick Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant={selectedFilter === 'all' ? 'contained' : 'outlined'}
          onClick={() => setSelectedFilter('all')}
          sx={{
            borderRadius: 2,
            ...(selectedFilter === 'all' && {
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
            })
          }}
        >
          All Incidents
        </Button>
        <Button
          variant={selectedFilter === 'my' ? 'contained' : 'outlined'}
          onClick={() => setSelectedFilter('my')}
          sx={{
            borderRadius: 2,
            ...(selectedFilter === 'my' && {
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
            })
          }}
        >
          My Incidents
        </Button>
        <Button
          variant={selectedFilter === 'unassigned' ? 'contained' : 'outlined'}
          onClick={() => setSelectedFilter('unassigned')}
          sx={{
            borderRadius: 2,
            ...(selectedFilter === 'unassigned' && {
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
            })
          }}
        >
          Unassigned
        </Button>
        <Badge badgeContent={incidents.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length} color="error">
          <Button
            variant={selectedFilter === 'high' ? 'contained' : 'outlined'}
            onClick={() => setSelectedFilter('high')}
            sx={{
              borderRadius: 2,
              ...(selectedFilter === 'high' && {
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
              })
            }}
          >
            High Severity
          </Button>
        </Badge>
      </Stack>

      {/* Search & Actions */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <IconButton
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              sx={{
                bgcolor: alpha('#667EEA', 0.1),
                '&:hover': { bgcolor: alpha('#667EEA', 0.2) }
              }}
            >
              <FilterList />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExport}
              sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
            >
              Export
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: alpha('#667EEA', 0.05) }}>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'id'}
                    direction={orderBy === 'id' ? order : 'asc'}
                    onClick={() => handleSort('id')}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      ID
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'title'}
                    direction={orderBy === 'title' ? order : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Title
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Type
                  </Typography>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'severity'}
                    direction={orderBy === 'severity' ? order : 'asc'}
                    onClick={() => handleSort('severity')}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Severity
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Status
                  </Typography>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'incidentDate'}
                    direction={orderBy === 'incidentDate' ? order : 'asc'}
                    onClick={() => handleSort('incidentDate')}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Date
                    </Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Location
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredIncidents.map((incident) => (
                <TableRow
                  key={incident.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha('#667EEA', 0.02)
                    }
                  }}
                  onClick={() => navigate(`/compliance/incidents/${incident.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      #{incident.id.substring(0, 8)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {incident.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={incident.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={incident.severity}
                      size="small"
                      sx={{
                        bgcolor: alpha(severityColors[incident.severity], 0.1),
                        color: severityColors[incident.severity],
                        fontWeight: 700,
                        border: '2px solid',
                        borderColor: severityColors[incident.severity]
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[incident.status]}
                      size="small"
                      sx={{
                        bgcolor: alpha(statusColors[incident.status], 0.1),
                        color: statusColors[incident.status],
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(incident.incidentDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {incident.location}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/compliance/incidents/${incident.id}`);
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredIncidents.length === 0 && (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Warning sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              No Incidents Found
            </Typography>
            <Typography color="text.secondary">
              No incidents match your current filters
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
