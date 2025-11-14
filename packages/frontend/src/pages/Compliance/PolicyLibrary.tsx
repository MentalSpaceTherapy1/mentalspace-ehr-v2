import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Tooltip,
  Stack,
  alpha
} from '@mui/material';
import {
  Search,
  FilterList,
  Description,
  Visibility,
  CheckCircle,
  Schedule,
  Archive,
  NewReleases,
  History,
  Category
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { usePolicy, Policy } from '../../hooks/usePolicy';

const categoryColors: Record<string, string> = {
  'HIPAA': '#9333EA',
  'Clinical': '#0EA5E9',
  'Safety': '#F59E0B',
  'HR': '#10B981',
  'Financial': '#EF4444',
  'IT Security': '#6366F1',
  'Training': '#EC4899',
  'Other': '#64748B'
};

const statusConfig = {
  ACTIVE: { color: 'success', icon: CheckCircle, label: 'Active' },
  DRAFT: { color: 'warning', icon: Schedule, label: 'Draft' },
  ARCHIVED: { color: 'default', icon: Archive, label: 'Archived' }
};

export default function PolicyLibrary() {
  const navigate = useNavigate();
  const { policies, loading, fetchPolicies } = usePolicy();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPolicies({
      search,
      category: categoryFilter,
      status: statusFilter
    });
  }, [search, categoryFilter, statusFilter]);

  const categories = Array.from(new Set(policies.map(p => p.category)));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            animation: 'pulse 3s ease-in-out infinite'
          }}
        />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Policy Library
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Access, review, and acknowledge organizational policies
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                placeholder="Search policies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <Tooltip title="Advanced Filters">
                <IconButton
                  sx={{
                    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764BA2 0%, #667EEA 100%)'
                    }
                  }}
                >
                  <FilterList />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Policy Grid */}
      <Grid container spacing={3}>
        {policies.map((policy) => {
          const statusCfg = statusConfig[policy.status];
          const StatusIcon = statusCfg.icon;
          const categoryColor = categoryColors[policy.category] || categoryColors.Other;

          return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={policy.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    background: `linear-gradient(90deg, ${categoryColor}, ${alpha(categoryColor, 0.6)})`
                  }
                }}
              >
                <CardContent sx={{ pt: 3 }}>
                  {/* Category Badge */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip
                      icon={<Category />}
                      label={policy.category}
                      size="small"
                      sx={{
                        background: `linear-gradient(135deg, ${categoryColor}, ${alpha(categoryColor, 0.7)})`,
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                    <Chip
                      icon={<StatusIcon />}
                      label={statusCfg.label}
                      size="small"
                      color={statusCfg.color as any}
                      variant="outlined"
                    />
                  </Box>

                  {/* Title */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      minHeight: 64,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {policy.title}
                  </Typography>

                  {/* Version & Date */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      icon={<History />}
                      label={`v${policy.version}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Schedule />}
                      label={new Date(policy.effectiveDate).toLocaleDateString()}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  {/* Content Preview */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 3,
                      minHeight: 48,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {policy.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </Typography>

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/compliance/policies/${policy.id}`)}
                      sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                        borderRadius: 2,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764BA2 0%, #667EEA 100%)'
                        }
                      }}
                    >
                      View
                    </Button>
                    {policy.status === 'ACTIVE' && (
                      <Button
                        variant="outlined"
                        startIcon={<CheckCircle />}
                        onClick={() => navigate(`/compliance/policies/${policy.id}/acknowledge`)}
                        sx={{
                          flex: 1,
                          borderRadius: 2,
                          borderWidth: 2,
                          '&:hover': {
                            borderWidth: 2
                          }
                        }}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Empty State */}
      {policies.length === 0 && !loading && (
        <Card
          sx={{
            borderRadius: 3,
            p: 8,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
          }}
        >
          <Description sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            No Policies Found
          </Typography>
          <Typography color="text.secondary">
            Try adjusting your search or filter criteria
          </Typography>
        </Card>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.1; }
            50% { transform: scale(1.1); opacity: 0.2; }
          }
        `}
      </style>
    </Box>
  );
}
