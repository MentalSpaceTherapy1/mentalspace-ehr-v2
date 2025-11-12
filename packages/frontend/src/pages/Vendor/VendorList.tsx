import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  Avatar,
  Badge,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Description as ContractIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useVendors, Vendor } from '../../hooks/useVendor';
import { useNavigate } from 'react-router-dom';

const VENDOR_CATEGORIES = [
  'Medical Supplies',
  'IT Services',
  'Consulting',
  'Facilities',
  'Laboratory',
  'Pharmaceuticals',
  'Equipment',
  'Other',
];

const VendorList: React.FC = () => {
  const navigate = useNavigate();
  const { vendors, loading } = useVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contactName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || vendor.category === categoryFilter;
    const matchesStatus = !statusFilter || vendor.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalSpend = vendors.reduce((sum, v) => sum + v.totalSpent, 0);
  const activeVendors = vendors.filter((v) => v.status === 'ACTIVE').length;
  const totalContracts = vendors.reduce((sum, v) => sum + v.activeContracts, 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Medical Supplies': '#e91e63',
      'IT Services': '#2196f3',
      'Consulting': '#9c27b0',
      'Facilities': '#ff9800',
      'Laboratory': '#00bcd4',
      'Pharmaceuticals': '#4caf50',
      'Equipment': '#ff5722',
      'Other': '#607d8b',
    };
    return colors[category] || '#757575';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Vendor Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/vendors/new')}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            px: 3,
          }}
        >
          Add Vendor
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <MoneyIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  ${totalSpend.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Spend
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <BusinessIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {activeVendors}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Vendors
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <ContractIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {totalContracts}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Contracts
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              <IconButton
                color="primary"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                  setStatusFilter('');
                }}
              >
                <FilterIcon />
              </IconButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Vendor Cards Grid */}
      {loading ? (
        <Typography>Loading vendors...</Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredVendors.map((vendor) => (
            <Grid item xs={12} md={6} lg={4} key={vendor.id}>
              <Card
                sx={{
                  height: '100%',
                  boxShadow: 3,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        sx={{
                          bgcolor: getCategoryColor(vendor.category),
                          width: 48,
                          height: 48,
                        }}
                      >
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {vendor.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {vendor.contactName}
                        </Typography>
                      </Box>
                    </Box>
                    <Badge
                      badgeContent={vendor.status}
                      color={vendor.status === 'ACTIVE' ? 'success' : 'default'}
                    />
                  </Box>

                  {/* Category Badge */}
                  <Chip
                    label={vendor.category}
                    size="small"
                    sx={{
                      bgcolor: getCategoryColor(vendor.category),
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 2,
                    }}
                  />

                  <Divider sx={{ my: 2 }} />

                  {/* Performance Rating */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Performance Rating
                    </Typography>
                    <Rating value={vendor.performanceRating} precision={0.5} readOnly />
                  </Box>

                  {/* Quick Stats */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, bgcolor: '#f3e5f5', textAlign: 'center' }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          ${vendor.totalSpent.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Spend
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, bgcolor: '#e3f2fd', textAlign: 'center' }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {vendor.activeContracts}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Contracts
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Contact Info */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {vendor.contactEmail}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {vendor.contactPhone}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                      fullWidth
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
                      fullWidth
                    >
                      Edit
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredVendors.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No vendors found
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default VendorList;
