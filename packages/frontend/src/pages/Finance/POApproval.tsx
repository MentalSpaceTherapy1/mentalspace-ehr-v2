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
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ShoppingCart as POIcon,
  Business as VendorIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  AccountBalance as BudgetIcon,
} from '@mui/icons-material';
import {
  usePurchaseOrders,
  approvePurchaseOrder,
  rejectPurchaseOrder,
} from '../../hooks/usePurchaseOrder';
import { useBudget } from '../../hooks/useBudget';

const POApproval: React.FC = () => {
  const { purchaseOrders, loading, refetch } = usePurchaseOrders({ status: 'PENDING' });
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { budget } = useBudget(selectedPO?.budgetId || '');

  const handleApprove = async () => {
    if (!selectedPO) return;

    setProcessing(true);
    setError('');

    try {
      await approvePurchaseOrder(selectedPO.id, approvalNotes);
      setSuccess('Purchase Order approved successfully!');
      setShowApproveDialog(false);
      setApprovalNotes('');
      setSelectedPO(null);
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve purchase order');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPO || !rejectNotes) {
      setError('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await rejectPurchaseOrder(selectedPO.id, rejectNotes);
      setSuccess('Purchase Order rejected');
      setShowRejectDialog(false);
      setRejectNotes('');
      setSelectedPO(null);
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject purchase order');
    } finally {
      setProcessing(false);
    }
  };

  const budgetAvailable =
    budget && selectedPO ? budget.remainingAmount >= selectedPO.total : true;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <POIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="primary">
          Purchase Order Approval
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
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              {purchaseOrders.length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Pending Approvals
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              ${purchaseOrders.reduce((sum, po) => sum + po.total, 0).toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total Pending Value
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold">
              {purchaseOrders.filter((po) => po.budgetId).length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Budget Allocated
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Pending POs List */}
        <Grid item xs={12} md={5}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Pending Purchase Orders
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <Typography>Loading purchase orders...</Typography>
              ) : purchaseOrders.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <Typography color="text.secondary">No pending purchase orders</Typography>
                </Paper>
              ) : (
                <Stack spacing={2} sx={{ maxHeight: 600, overflow: 'auto' }}>
                  {purchaseOrders.map((po) => (
                    <Paper
                      key={po.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: selectedPO?.id === po.id ? 'primary.main' : 'transparent',
                        '&:hover': { bgcolor: '#f9f9f9' },
                      }}
                      onClick={() => setSelectedPO(po)}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body1" fontWeight="bold">
                            {po.poNumber}
                          </Typography>
                          <Chip label={po.vendorName} size="small" color="primary" />
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            {po.lineItems.length} items
                          </Typography>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            ${po.total.toLocaleString()}
                          </Typography>
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          Order Date: {new Date(po.orderDate).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* PO Details */}
        <Grid item xs={12} md={7}>
          {selectedPO ? (
            <Stack spacing={3}>
              {/* PO Summary */}
              <Card sx={{ boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                    Purchase Order Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <POIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            PO Number
                          </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedPO.poNumber}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <VendorIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Vendor
                          </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedPO.vendorName}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <CalendarIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Order Date
                          </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight="medium">
                          {new Date(selectedPO.orderDate).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <MoneyIcon color="primary" />
                          <Typography variant="caption" color="text.secondary">
                            Total Amount
                          </Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight="bold" color="primary">
                          ${selectedPO.total.toLocaleString()}
                        </Typography>
                      </Paper>
                    </Grid>

                    {selectedPO.shippingAddress && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: '#fce4ec' }}>
                          <Typography variant="caption" color="text.secondary">
                            Shipping Address
                          </Typography>
                          <Typography variant="body2">
                            {selectedPO.shippingAddress}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}

                    {selectedPO.notes && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: '#f1f8e9' }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <DescriptionIcon color="primary" />
                            <Typography variant="caption" color="text.secondary">
                              Notes
                            </Typography>
                          </Stack>
                          <Typography variant="body2">{selectedPO.notes}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card sx={{ boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                    Line Items
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell>Description</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPO.lineItems.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                              <Chip label={item.category} size="small" />
                            </TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">
                              ${item.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight="bold">
                                ${item.total.toFixed(2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={4} align="right">
                            <Typography fontWeight="bold">Subtotal:</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              ${selectedPO.subtotal.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={4} align="right">
                            <Typography fontWeight="bold">Tax:</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              ${selectedPO.tax.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={4} align="right">
                            <Typography variant="h6" fontWeight="bold">
                              Total:
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              ${selectedPO.total.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Budget Check */}
              {selectedPO.budgetId && budget && (
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
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Budget Name
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {budget.name}
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Remaining Budget
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          ${budget.remainingAmount.toLocaleString()}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
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
                  Approve Purchase Order
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => setShowRejectDialog(true)}
                  fullWidth
                  size="large"
                  sx={{ py: 1.5 }}
                >
                  Reject
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Paper sx={{ p: 5, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <POIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select a purchase order to review
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)}>
        <DialogTitle>Approve Purchase Order</DialogTitle>
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

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogTitle>Reject Purchase Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejection:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            required
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={processing || !rejectNotes}
          >
            {processing ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POApproval;
