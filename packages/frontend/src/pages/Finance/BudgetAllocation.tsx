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
  Slider,
  Paper,
  Stack,
  Divider,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  AccountBalance as BudgetIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { createBudget } from '../../hooks/useBudget';

const BUDGET_CATEGORIES = [
  'Medical Supplies',
  'Pharmaceuticals',
  'IT Services',
  'Facilities',
  'Consulting',
  'Equipment',
  'Laboratory',
  'Staffing',
  'Training',
  'Other',
];

interface CategoryAllocation {
  category: string;
  percentage: number;
  amount: number;
}

const BudgetAllocation: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const [budgetName, setBudgetName] = useState('');
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [totalAmount, setTotalAmount] = useState(0);
  const [departmentId, setDepartmentId] = useState('');
  const [categories, setCategories] = useState<CategoryAllocation[]>([
    { category: 'Medical Supplies', percentage: 30, amount: 0 },
    { category: 'Pharmaceuticals', percentage: 25, amount: 0 },
    { category: 'IT Services', percentage: 15, amount: 0 },
    { category: 'Facilities', percentage: 20, amount: 0 },
    { category: 'Other', percentage: 10, amount: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate amounts based on percentages
  React.useEffect(() => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        amount: (totalAmount * cat.percentage) / 100,
      }))
    );
  }, [totalAmount]);

  const handlePercentageChange = (index: number, value: number) => {
    setCategories((prev) => {
      const newCategories = [...prev];
      newCategories[index].percentage = value;
      newCategories[index].amount = (totalAmount * value) / 100;
      return newCategories;
    });
  };

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { category: '', percentage: 0, amount: 0 },
    ]);
  };

  const removeCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);
  const isValid = totalPercentage === 100 && budgetName && totalAmount > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please ensure total percentage equals 100% and all fields are filled');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createBudget({
        name: budgetName,
        fiscalYear,
        totalAmount,
        departmentId: departmentId || undefined,
        categories: categories.map((cat) => ({
          category: cat.category,
          allocatedAmount: cat.amount,
          percentage: cat.percentage,
          spentAmount: 0,
        })) as any,
      });

      setSuccess('Budget created successfully!');
      setTimeout(() => {
        navigate('/budgets');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage <= 20) return '#4caf50';
    if (percentage <= 40) return '#2196f3';
    if (percentage <= 60) return '#ff9800';
    return '#f44336';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BudgetIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="primary">
          Budget Allocation
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
        {/* Budget Details Form */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Budget Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Budget Name"
                  required
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  placeholder="e.g., Annual Operating Budget"
                />

                <FormControl fullWidth>
                  <InputLabel>Fiscal Year</InputLabel>
                  <Select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value as number)}
                    label="Fiscal Year"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                      <MenuItem key={year} value={year}>
                        FY {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Total Budget Amount"
                  type="number"
                  required
                  value={totalAmount || ''}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />

                <TextField
                  fullWidth
                  label="Department (Optional)"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                />

                <Paper
                  sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                  }}
                >
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Budget
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ${totalAmount.toLocaleString()}
                  </Typography>
                </Paper>

                <Paper
                  sx={{
                    p: 2,
                    bgcolor: totalPercentage === 100 ? '#e8f5e9' : '#ffebee',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Total Allocation
                    </Typography>
                    <Chip
                      label={`${totalPercentage}%`}
                      color={totalPercentage === 100 ? 'success' : 'error'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(totalPercentage, 100)}
                    sx={{
                      mt: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: totalPercentage === 100 ? '#4caf50' : '#f44336',
                      },
                    }}
                  />
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Allocation */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Category Allocation
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addCategory}
                  size="small"
                >
                  Add Category
                </Button>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {categories.map((cat, index) => (
                  <Grid size={{ xs: 12 }} key={index}>
                    <Paper
                      sx={{
                        p: 3,
                        border: '2px solid',
                        borderColor: getPercentageColor(cat.percentage),
                        borderRadius: 2,
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                              value={cat.category}
                              onChange={(e) => {
                                const newCategories = [...categories];
                                newCategories[index].category = e.target.value;
                                setCategories(newCategories);
                              }}
                              label="Category"
                            >
                              {BUDGET_CATEGORIES.map((category) => (
                                <MenuItem key={category} value={category}>
                                  {category}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Allocation: {cat.percentage}%
                          </Typography>
                          <Slider
                            value={cat.percentage}
                            onChange={(e, value) =>
                              handlePercentageChange(index, value as number)
                            }
                            min={0}
                            max={100}
                            step={1}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 25, label: '25%' },
                              { value: 50, label: '50%' },
                              { value: 75, label: '75%' },
                              { value: 100, label: '100%' },
                            ]}
                            sx={{
                              color: getPercentageColor(cat.percentage),
                            }}
                          />
                        </Grid>

                        <Grid size={{ xs: 8, sm: 2 }}>
                          <Paper
                            sx={{
                              p: 1.5,
                              bgcolor: '#f3e5f5',
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Amount
                            </Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              ${cat.amount.toLocaleString()}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 4, sm: 1 }}>
                          <Button
                            color="error"
                            onClick={() => removeCategory(index)}
                            disabled={categories.length <= 1}
                          >
                            <DeleteIcon />
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Allocated vs Spent Comparison */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                  Budget Preview
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  {categories.map((cat) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.category}>
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Typography variant="body2" fontWeight="medium" gutterBottom>
                          {cat.category}
                        </Typography>
                        <Stack direction="row" justifyContent="space-between">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Allocated
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" color="primary">
                              ${cat.amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${cat.percentage}%`}
                            size="small"
                            sx={{
                              bgcolor: getPercentageColor(cat.percentage),
                              color: 'white',
                            }}
                          />
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={() => navigate('/budgets')}
          size="large"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={!isValid || loading}
          size="large"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            px: 4,
          }}
        >
          {loading ? 'Saving...' : 'Save Budget'}
        </Button>
      </Box>
    </Box>
  );
};

export default BudgetAllocation;
