import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Paper,
  Stack,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Upload as UploadIcon,
  Description as DocumentIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { createVendor, updateVendor, useVendor, uploadW9, Vendor } from '../../hooks/useVendor';

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

const PAYMENT_TERMS = [
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Due on Receipt',
  'COD',
];

const VendorForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { vendor, loading: vendorLoading } = useVendor(id || '');

  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    category: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    taxId: '',
    paymentTerms: 'Net 30',
    status: 'ACTIVE',
  });

  const [w9File, setW9File] = useState<File | null>(null);
  const [w9FileName, setW9FileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        category: vendor.category,
        contactName: vendor.contactName,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        address: vendor.address,
        taxId: vendor.taxId,
        paymentTerms: vendor.paymentTerms,
        status: vendor.status,
      });
      if (vendor.w9Document) {
        setW9FileName(vendor.w9Document);
      }
    }
  }, [vendor]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleW9Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setW9File(e.target.files[0]);
      setW9FileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let vendorId: string;

      if (id) {
        await updateVendor(id, formData);
        vendorId = id;
        setSuccess('Vendor updated successfully!');
      } else {
        const newVendor = await createVendor(formData);
        vendorId = newVendor.id;
        setSuccess('Vendor created successfully!');
      }

      // Upload W-9 if provided
      if (w9File) {
        await uploadW9(vendorId, w9File);
      }

      setTimeout(() => {
        navigate('/vendors');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  if (id && vendorLoading) {
    return <Typography>Loading vendor...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="primary">
          {id ? 'Edit Vendor' : 'Add New Vendor'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight="bold"
                color="primary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <BusinessIcon /> Vendor Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Vendor Name"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': { borderColor: 'primary.main' },
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      label="Category"
                    >
                      {VENDOR_CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card sx={{ boxShadow: 3, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Contact Name"
                    required
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Contact Email"
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Financial & Tax Info */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {/* Tax Information */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Tax Information
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                <TextField
                  fullWidth
                  label="Tax ID (EIN)"
                  required
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&:hover fieldset': { borderColor: 'white' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                  }}
                />
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Payment Terms
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Payment Terms
                  </InputLabel>
                  <Select
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    label="Payment Terms"
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'white',
                      },
                      '& .MuiSvgIcon-root': { color: 'white' },
                    }}
                  >
                    {PAYMENT_TERMS.map((term) => (
                      <MenuItem key={term} value={term}>
                        {term}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            {/* W-9 Upload */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  W-9 Document
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<UploadIcon />}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                    mb: 2,
                  }}
                >
                  Upload W-9
                  <input type="file" hidden accept=".pdf" onChange={handleW9Upload} />
                </Button>

                {w9FileName && (
                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <DocumentIcon />
                      <Typography variant="body2" noWrap>
                        {w9FileName}
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={() => navigate('/vendors')}
          size="large"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={loading}
          size="large"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            px: 4,
          }}
        >
          {loading ? 'Saving...' : 'Save Vendor'}
        </Button>
      </Box>
    </Box>
  );
};

export default VendorForm;
