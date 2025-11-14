import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Rating,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Draw as DrawIcon,
  FilterList as FilterListIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { usePerformance, PerformanceReview, ReviewStats } from '../../hooks/usePerformance';
import { format } from 'date-fns';

interface ReviewListProps {
  onViewReview?: (reviewId: string) => void;
  onEditReview?: (reviewId: string) => void;
  onSignReview?: (reviewId: string) => void;
}

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    color: '#95A5A6',
    icon: <HourglassEmptyIcon />,
  },
  PENDING: {
    label: 'Pending',
    color: '#F39C12',
    icon: <ScheduleIcon />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#3498DB',
    icon: <HourglassEmptyIcon />,
  },
  COMPLETED: {
    label: 'Completed',
    color: '#2ECC71',
    icon: <CheckCircleIcon />,
  },
  SIGNED: {
    label: 'Signed',
    color: '#9B59B6',
    icon: <DrawIcon />,
  },
};

const ReviewList: React.FC<ReviewListProps> = ({
  onViewReview,
  onEditReview,
  onSignReview,
}) => {
  const { getReviews, getReviewStats, loading } = usePerformance();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [filters, setFilters] = useState({
    employeeId: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [filters]);

  const loadReviews = async () => {
    try {
      const response = await getReviews(filters);
      // Extract the reviews array from the response wrapper
      setReviews(Array.isArray(response) ? response : (response?.data || []));
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setReviews([]); // Set empty array on error to prevent filter issues
    }
  };

  const loadStats = async () => {
    try {
      const response = await getReviewStats();
      // Extract the stats from the response wrapper
      setStats(response?.data || response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = review.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#95A5A6';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status;
  };

  const getStatusIcon = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.icon || <HourglassEmptyIcon />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
          Performance Reviews
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View and manage employee performance reviews
        </Typography>
      </Box>

      {/* Quick Stats */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.averageRating?.toFixed(1) ?? '0.0'}
                    </Typography>
                    <Typography variant="body2">Average Rating</Typography>
                  </Box>
                  <Rating value={stats.averageRating ?? 0} readOnly precision={0.1} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.completionRate}%
                    </Typography>
                    <Typography variant="body2">Completion Rate</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.pendingReviews}
                    </Typography>
                    <Typography variant="body2">Pending Reviews</Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {stats.totalReviews}
                    </Typography>
                    <Typography variant="body2">Total Reviews</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1, color: '#667EEA' }} />
          <Typography variant="h6" sx={{ color: '#2C3E50', fontWeight: 600 }}>
            Filters
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Search Employee"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="SIGNED">Signed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Timeline View */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
          Review Timeline
        </Typography>

        {filteredReviews.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="textSecondary">
              No reviews found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Try adjusting your filters
            </Typography>
          </Box>
        ) : (
          <Timeline>
            {filteredReviews.map((review, index) => (
              <TimelineItem key={review.id}>
                <TimelineOppositeContent color="textSecondary" sx={{ flex: 0.3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption">
                    {format(new Date(review.createdAt), 'hh:mm a')}
                  </Typography>
                </TimelineOppositeContent>

                <TimelineSeparator>
                  <TimelineDot
                    sx={{
                      backgroundColor: getStatusColor(review.status),
                      color: 'white',
                      width: 48,
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getStatusIcon(review.status)}
                  </TimelineDot>
                  {index < filteredReviews.length - 1 && (
                    <TimelineConnector sx={{ backgroundColor: '#E0E0E0' }} />
                  )}
                </TimelineSeparator>

                <TimelineContent>
                  <Card
                    sx={{
                      border: `2px solid ${getStatusColor(review.status)}30`,
                      '&:hover': {
                        boxShadow: `0 4px 20px ${getStatusColor(review.status)}40`,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease',
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              width: 56,
                              height: 56,
                              background: `linear-gradient(135deg, ${getStatusColor(review.status)} 0%, ${getStatusColor(review.status)}CC 100%)`,
                              fontSize: '1.5rem',
                              fontWeight: 700,
                            }}
                          >
                            {review.employeeName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {review.employeeName}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Reviewed by {review.reviewerName}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={getStatusLabel(review.status)}
                          sx={{
                            backgroundColor: getStatusColor(review.status),
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: '#667EEA', fontWeight: 700 }}>
                              {review.overallRating?.toFixed(1) ?? '0.0'}
                            </Typography>
                            <Rating value={review.overallRating ?? 0} readOnly precision={0.1} />
                            <Typography variant="caption" color="textSecondary">
                              Overall Rating
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: '#2ECC71', fontWeight: 700 }}>
                              {review.goals?.filter((g) => g.status === 'COMPLETED').length || 0}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Goals Completed
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: '#F39C12', fontWeight: 700 }}>
                              {review.categories?.length || 0}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Categories Rated
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Review Period: {format(new Date(review.reviewPeriodStart), 'MMM dd, yyyy')} -{' '}
                        {format(new Date(review.reviewPeriodEnd), 'MMM dd, yyyy')}
                      </Typography>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => onViewReview?.(review.id)}
                          sx={{
                            borderColor: '#667EEA',
                            color: '#667EEA',
                            '&:hover': {
                              borderColor: '#667EEA',
                              backgroundColor: '#667EEA10',
                            },
                          }}
                        >
                          View
                        </Button>
                        {review.status !== 'SIGNED' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => onEditReview?.(review.id)}
                            sx={{
                              borderColor: '#3498DB',
                              color: '#3498DB',
                              '&:hover': {
                                borderColor: '#3498DB',
                                backgroundColor: '#3498DB10',
                              },
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {review.status === 'COMPLETED' && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<DrawIcon />}
                            onClick={() => onSignReview?.(review.id)}
                            sx={{
                              background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
                              color: 'white',
                            }}
                          >
                            Sign
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Paper>
    </Box>
  );
};

export default ReviewList;
