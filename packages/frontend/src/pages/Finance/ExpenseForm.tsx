import React, { useState } from 'react';
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
  Paper,
  Stack,
  Divider,
  Alert,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { createExpense, uploadReceipt } from '../../hooks/useExpense';
import { useVendors } from '../../hooks/useVendor';
import { useBudgets } from '../../hooks/useBudget';

const EXPENSE_CATEGORIES = [
  'Medical Supplies',
  'Pharmaceuticals',
  'IT Services',
  'Facilities',
  'Consulting',
  'Equipment',
  'Laboratory',
  'Staffing',
  'Training',
  'Travel',
  'Office Supplies',
  'Other',
];

const ExpenseForm: React.FC = () => {
  const navigate = useNavigate();
  const { vendors } = useVendors();
  const { budgets } = useBudgets(new Date().getFullYear());

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    vendorId: '',
    budgetId: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedBudget = budgets.find((b) => b.id === formData.budgetId);
  const budgetAvailable = selectedBudget
    ? selectedBudget.remainingAmount >= formData.amount
    : true;

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
      setReceiptFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const expense = await createExpense(formData);

      // Upload receipt if provided
      if (receiptFile) {
        await uploadReceipt(expense.id, receiptFile);
      }

      setSuccess('Expense submitted for approval!');
      setTimeout(() => {
        navigate('/expenses');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="primary">
          Submit Expense
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
        {/* Expense Details Form */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Expense Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Description"
                    required
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the expense..."
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    required
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MoneyIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Expense Date"
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
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
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Vendor (Optional)</InputLabel>
                    <Select
                      value={formData.vendorId}
                      onChange={(e) => handleInputChange('vendorId', e.target.value)}
                      label="Vendor (Optional)"
                    >
                      <MenuItem value="">None</MenuItem>
                      {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Budget (Optional)</InputLabel>
                    <Select
                      value={formData.budgetId}
                      onChange={(e) => handleInputChange('budgetId', e.target.value)}
                      label="Budget (Optional)"
                    >
                      <MenuItem value="">None</MenuItem>
                      {budgets.map((budget) => (
                        <MenuItem key={budget.id} value={budget.id}>
                          {budget.name} (${budget.remainingAmount.toLocaleString()} remaining)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {/* Receipt Upload */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Receipt Upload
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
                  Upload Receipt
                  <input
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                  />
                </Button>

                {receiptFileName && (
                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ReceiptIcon />
                      <Typography variant="body2" noWrap>
                        {receiptFileName}
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* Budget Check */}
            {formData.budgetId && (
              <Card
                sx={{
                  boxShadow: 3,
                  bgcolor: budgetAvailable ? '#e8f5e9' : '#ffebee',
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    {budgetAvailable ? (
                      <CheckIcon sx={{ color: '#4caf50', fontSize: 32 }} />
                    ) : (
                      <WarningIcon sx={{ color: '#f44336', fontSize: 32 }} />
                    )}
                    <Typography variant="h6" fontWeight="bold">
                      Budget Check
                    </Typography>
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  {selectedBudget && (
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Budget Name
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedBudget.name}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Remaining Budget
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          ${selectedBudget.remainingAmount.toLocaleString()}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          This Expense
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          ${formData.amount.toLocaleString()}
                        </Typography>
                      </Box>

                      <Chip
                        label={
                          budgetAvailable
                            ? 'Budget Available'
                            : 'Insufficient Budget'
                        }
                        color={budgetAvailable ? 'success' : 'error'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Expense Summary */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Expense Summary
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Amount
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      ${formData.amount.toLocaleString()}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Category
                    </Typography>
                    <Typography variant="body1">
                      {formData.category || 'Not selected'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Status
                    </Typography>
                    <Chip
                      label="Pending Approval"
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  </Box>
                </Stack>
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
          onClick={() => navigate('/expenses')}
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
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      </Box>
    </Box>
  );
};

export default ExpenseForm;
