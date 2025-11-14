import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Rating,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Pagination,
  TextField,
  Button,
  Collapse,
  Avatar,
  LinearProgress,
  Autocomplete,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Star,
  TrendingUp,
  Assessment,
  Schedule,
  ExpandMore,
  ExpandLess,
  FilterList,
  Search,
  Clear,
  Person,
  CalendarToday,
  SentimentVeryDissatisfied,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../lib/api';

interface SessionRating {
  id: string;
  rating: number;
  comments: string | null;
  submittedAt: string;
  client: {
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
  session: {
    appointment: {
      clinician: {
        firstName: string;
        lastName: string;
      };
      appointmentDate: string;
    };
  };
}

interface RatingStats {
  totalRatings: number;
  averageRating: number;
  recentRatings: number;
  distribution: {
    stars: number;
    count: number;
    percentage: string;
  }[];
}

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
}

export default function SessionRatings() {
  const [ratings, setRatings] = useState<SessionRating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxRating, setMaxRating] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  // Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  // Filter Options
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Fetch clinicians for filter
  const fetchClinicians = async () => {
    try {
      const response = await api.get('/users', { params: { role: 'CLINICIAN' } });
      setClinicians(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch clinicians:', err);
    }
  };

  // Fetch clients for filter
  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get('/telehealth/admin/session-ratings/stats');
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch ratings
  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page, limit };
      if (minRating !== null) params.minRating = minRating;
      if (maxRating !== null) params.maxRating = maxRating;
      if (selectedClinician) params.clinicianId = selectedClinician.id;
      if (selectedClient) params.clientId = selectedClient.id;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await api.get('/telehealth/admin/session-ratings', { params });

      setRatings(response.data.data.ratings);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load session ratings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClinicians();
    fetchClients();
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [page, minRating, maxRating, selectedClinician, selectedClient, startDate, endDate, searchQuery]);

  const handleResetFilters = () => {
    setMinRating(null);
    setMaxRating(null);
    setSelectedClinician(null);
    setSelectedClient(null);
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
    setPage(1);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (minRating !== null) count++;
    if (maxRating !== null) count++;
    if (selectedClinician) count++;
    if (selectedClient) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (searchQuery.trim()) count++;
    return count;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'primary';
    if (rating >= 2.5) return 'warning';
    return 'error';
  };

  const getRatingChipColor = (rating: number): 'success' | 'primary' | 'warning' | 'error' => {
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'primary';
    if (rating >= 2.5) return 'warning';
    return 'error';
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Modern Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Star sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h3" component="h1" fontWeight="bold">
                Telehealth Session Ratings
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                Comprehensive analytics and client feedback for telehealth sessions
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Enhanced Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs: 12, md: 3}}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                      <Assessment sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.totalRatings}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Ratings
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, md: 3}}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                      <Star sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.averageRating.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Average Rating
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, md: 3}}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                      <TrendingUp sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.recentRatings}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Last 30 Days
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, md: 3}}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  color: 'white',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}
              >
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 2, fontWeight: 600 }}>
                    Rating Distribution
                  </Typography>
                  {stats.distribution.map((item) => (
                    <Box key={item.stars} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Rating value={item.stars} size="small" readOnly max={item.stars} sx={{ color: 'white' }} />
                        <Typography variant="caption" sx={{ minWidth: 60, fontWeight: 600 }}>
                          {item.count} ({item.percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={parseFloat(item.percentage)}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          '& .MuiLinearProgress-bar': { bgcolor: 'white' },
                        }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Advanced Filters */}
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge badgeContent={activeFilterCount} color="primary">
                  <FilterList />
                </Badge>
                <Typography variant="h6" fontWeight="bold">
                  Advanced Filters
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {activeFilterCount > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Clear />}
                    onClick={handleResetFilters}
                  >
                    Clear All
                  </Button>
                )}
                <IconButton onClick={() => setShowFilters(!showFilters)} size="small">
                  {showFilters ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
            </Box>

            <Collapse in={showFilters}>
              <Grid container spacing={2}>
                {/* Search in Comments */}
                <Grid size={{xs: 12, md: 6}}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search in Comments"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for keywords in feedback..."
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                {/* Clinician Filter */}
                <Grid size={{xs: 12, md: 6}}>
                  <Autocomplete
                    size="small"
                    options={clinicians}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                    value={selectedClinician}
                    onChange={(event, newValue) => setSelectedClinician(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Filter by Clinician"
                        placeholder="Select a clinician..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <Person sx={{ ml: 1, mr: 0.5, color: 'text.secondary' }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Client Filter */}
                <Grid size={{xs: 12, md: 6}}>
                  <Autocomplete
                    size="small"
                    options={clients}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName} (MRN: ${option.medicalRecordNumber})`}
                    value={selectedClient}
                    onChange={(event, newValue) => setSelectedClient(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Filter by Client"
                        placeholder="Select a client..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <Person sx={{ ml: 1, mr: 0.5, color: 'text.secondary' }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Min Rating */}
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <Autocomplete
                    size="small"
                    options={[1, 2, 3, 4, 5]}
                    getOptionLabel={(option) => `${option} Star${option > 1 ? 's' : ''}`}
                    value={minRating}
                    onChange={(event, newValue) => setMinRating(newValue)}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Rating value={option} size="small" readOnly sx={{ mr: 1 }} />
                        {option} Star{option > 1 ? 's' : ''}
                      </li>
                    )}
                    renderInput={(params) => <TextField {...params} label="Min Rating" />}
                  />
                </Grid>

                {/* Max Rating */}
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <Autocomplete
                    size="small"
                    options={[1, 2, 3, 4, 5]}
                    getOptionLabel={(option) => `${option} Star${option > 1 ? 's' : ''}`}
                    value={maxRating}
                    onChange={(event, newValue) => setMaxRating(newValue)}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Rating value={option} size="small" readOnly sx={{ mr: 1 }} />
                        {option} Star{option > 1 ? 's' : ''}
                      </li>
                    )}
                    renderInput={(params) => <TextField {...params} label="Max Rating" />}
                  />
                </Grid>

                {/* Start Date */}
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        InputProps: {
                          startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                        },
                      },
                    }}
                  />
                </Grid>

                {/* End Date */}
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        InputProps: {
                          startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                        },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>

        {/* Ratings Table */}
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={48} />
              </Box>
            ) : ratings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SentimentVeryDissatisfied sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No ratings found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeFilterCount > 0
                    ? 'Try adjusting your filters to see more results.'
                    : 'Session ratings will appear here once clients submit feedback.'}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f9fafb' }}>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Client</strong></TableCell>
                        <TableCell><strong>Clinician</strong></TableCell>
                        <TableCell><strong>Rating</strong></TableCell>
                        <TableCell><strong>Comments</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ratings.map((rating) => (
                        <TableRow
                          key={rating.id}
                          hover
                          sx={{
                            transition: 'background-color 0.2s',
                            '&:hover': { bgcolor: '#f9fafb' },
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Schedule fontSize="small" color="action" />
                              <Typography variant="body2">
                                {formatDate(rating.submittedAt)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: '#667eea',
                                  width: 36,
                                  height: 36,
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                }}
                              >
                                {getInitials(rating.client.firstName, rating.client.lastName)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="600">
                                  {rating.client.firstName} {rating.client.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  MRN: {rating.client.medicalRecordNumber}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: '#764ba2',
                                  width: 36,
                                  height: 36,
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                }}
                              >
                                {getInitials(
                                  rating.session.appointment.clinician.firstName,
                                  rating.session.appointment.clinician.lastName
                                )}
                              </Avatar>
                              <Typography variant="body2" fontWeight="600">
                                {rating.session.appointment.clinician.firstName}{' '}
                                {rating.session.appointment.clinician.lastName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Rating value={rating.rating} readOnly size="small" />
                              <Chip
                                label={rating.rating.toFixed(1)}
                                size="small"
                                color={getRatingChipColor(rating.rating)}
                                sx={{ fontWeight: 'bold' }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 400 }}>
                            {rating.comments ? (
                              <Tooltip title={rating.comments} arrow>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontStyle: 'italic',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  "{rating.comments}"
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No comments
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                    size="large"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </LocalizationProvider>
  );
}
