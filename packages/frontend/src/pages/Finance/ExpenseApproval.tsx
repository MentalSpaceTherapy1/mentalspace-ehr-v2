import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Paper,
  Stack,
  Chip,
  Avatar,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as DenyIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  AccountBalance as BudgetIcon,
} from '@mui/icons-material';
import { useExpenses, approveExpense, denyExpense } from '../../hooks/useExpense';
import { useBudget } from '../../hooks/useBudget';

const ExpenseApproval: React.FC = () => {
  const { expenses, loading, refetch } = useExpenses({ status: 'PENDING' });
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [denyNotes, setDenyNotes] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { budget } = useBudget(selectedExpense?.budgetId || '');

  const handleApprove = async () => {
    if (!selectedExpense) return;

    setProcessing(true);
    setError('');

    try {
      await approveExpense(selectedExpense.id, approvalNotes);
      setSuccess('Expense approved successfully!');
      setShowApproveDialog(false);
      setApprovalNotes('');
      setSelectedExpense(null);
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve expense');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedExpense || !denyNotes) {
      setError('Please provide a reason for denial');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await denyExpense(selectedExpense.id, denyNotes);
      setSuccess('Expense denied');
      setShowDenyDialog(false);
      setDenyNotes('');
      setSelectedExpense(null);
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deny expense');
    } finally {
      setProcessing(false);
    }
  };

  const budgetAvailable = budget && selectedExpense
    ? budget.remainingAmount >= selectedExpense.amount
    : true;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="primary">
          Expense Approval Queue
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              {expenses.length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Pending Approvals
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              ${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total Pending Amount
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              {expenses.filter((e) => e.budgetId).length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Budget Allocated
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Pending Expenses List */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Pending Expenses
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <Typography>Loading expenses...</Typography>
              ) : expenses.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <Typography color="text.secondary">
                    No pending expenses
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2} sx={{ maxHeight: 600, overflow: 'auto' }}>
                  {expenses.map((expense) => (
                    <Paper
                      key={expense.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor:
                          selectedExpense?.id === expense.id ? 'primary.main' : 'transparent',
                        '&:hover': { bgcolor: '#f9f9f9' },
                      }}
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {expense.description.substring(0, 40)}...
                          </Typography>
                          <Chip label={expense.category} size="small" color="primary" />
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            {expense.submittedByName}
                          </Typography>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            ${expense.amount.toLocaleString()}
                          </Typography>
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Expense Details */}
        <Grid size={{ xs: 12, md: 7 }}>
          {selectedExpense ? (
            <Stack spacing={3}>
              <Card sx={{ boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                    Expense Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <DescriptionIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Description
                          </Typography>
                        </Stack>
                        <Typography variant="body1">
                          {selectedExpense.description}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <MoneyIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Amount
                          </Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight="bold" color="primary">
                          ${selectedExpense.amount.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <CalendarIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Date
                          </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight="medium">
                          {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <PersonIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Submitted By
                          </Typography>
                        </Stack>
                        <Typography variant="body1">
                          {selectedExpense.submittedByName}
                        </Typography>
                      </Paper>
                    </Grid>

                    {selectedExpense.vendorName && (
                      <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 2, bgcolor: '#fce4ec' }}>
                          <Typography variant="caption" color="text.secondary">
                            Vendor
                          </Typography>
                          <Typography variant="body1">
                            {selectedExpense.vendorName}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}

                    {selectedExpense.receiptUrl && (
                      <Grid size={{ xs: 12 }}>
                        <Button
                          variant="outlined"
                          startIcon={<ReceiptIcon />}
                          fullWidth
                          onClick={() => window.open(selectedExpense.receiptUrl, '_blank')}
                        >
                          View Receipt
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Budget Availability */}
              {selectedExpense.budgetId && budget && (
                <Card
                  sx={{
                    boxShadow: 3,
                    bgcolor: budgetAvailable ? '#e8f5e9' : '#ffebee',
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      {budgetAvailable ? (
                        <BudgetIcon sx={{ color: '#4caf50', fontSize: 32 }} />
                      ) : (
                        <WarningIcon sx={{ color: '#f44336', fontSize: 32 }} />
                      )}
                      <Typography variant="h6" fontWeight="bold">
                        Budget Check
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Budget Name
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {budget.name}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Remaining
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          ${budget.remainingAmount.toLocaleString()}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <Chip
                          label={budgetAvailable ? 'Budget Available' : 'Insufficient Budget'}
                          color={budgetAvailable ? 'success' : 'error'}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => setShowApproveDialog(true)}
                  fullWidth
                  size="large"
                  sx={{ py: 1.5 }}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DenyIcon />}
                  onClick={() => setShowDenyDialog(true)}
                  fullWidth
                  size="large"
                  sx={{ py: 1.5 }}
                >
                  Deny
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Paper sx={{ p: 5, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select an expense to review
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)}>
        <DialogTitle>Approve Expense</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add optional approval notes:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Approval notes (optional)..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={processing}
          >
            {processing ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={showDenyDialog} onClose={() => setShowDenyDialog(false)}>
        <DialogTitle>Deny Expense</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for denial:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            required
            value={denyNotes}
            onChange={(e) => setDenyNotes(e.target.value)}
            placeholder="Reason for denial..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDenyDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeny}
            disabled={processing || !denyNotes}
          >
            {processing ? 'Denying...' : 'Deny'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseApproval;
