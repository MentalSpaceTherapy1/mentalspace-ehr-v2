import React, { useState } from 'react';
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
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Stack,
  Menu,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  CheckCircle as ReceiveIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  ShoppingCart as POIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  usePurchaseOrders,
  usePOStats,
  exportPurchaseOrders,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../../hooks/usePurchaseOrder';

const POList: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { purchaseOrders, loading, refetch } = usePurchaseOrders({
    status: statusFilter,
    vendorId: vendorFilter,
  });
  const { stats } = usePOStats();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPOId, setCancelPOId] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, poId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPO(poId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPO(null);
  };

  const handleExport = async () => {
    try {
      const blob = await exportPurchaseOrders({
        status: statusFilter,
        vendorId: vendorFilter,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    } catch (error) {
      console.error('Failed to export purchase orders:', error);
    }
  };

  const handleReceive = async (poId: string) => {
    try {
      await receivePurchaseOrder(poId);
      refetch();
      handleMenuClose();
    } catch (error) {
      console.error('Failed to receive purchase order:', error);
    }
  };

  const handleCancelClick = (poId: string) => {
    setCancelPOId(poId);
    setCancelReason('');
    setCancelDialogOpen(true);
    handleMenuClose();
  };

  const confirmCancel = async () => {
    if (!cancelPOId || !cancelReason.trim()) return;

    try {
      await cancelPurchaseOrder(cancelPOId, cancelReason.trim());
      refetch();
      setCancelDialogOpen(false);
      setCancelPOId(null);
      setCancelReason('');
    } catch (error) {
      console.error('Failed to cancel purchase order:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
      DRAFT: 'default',
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
      RECEIVED: 'info',
      CANCELLED: 'default',
    };
    return colors[status] || 'default';
  };

  const filteredPOs = purchaseOrders.filter((po) =>
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <POIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold" color="primary">
            Purchase Orders
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/purchase-orders/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            New PO
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Paper
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total POs
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Paper
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #ff9800 0%, #fb8c00 100%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.pending}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pending
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Paper
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.approved}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Approved
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Paper
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.received}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Received
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Paper
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #757575 0%, #616161 100%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {stats.cancelled}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Cancelled
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Paper
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h5" fontWeight="bold">
                ${stats.totalAmount.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Value
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Search by PO number or vendor..."
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

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="RECEIVED">Received</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setVendorFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* PO Table */}
      <Card sx={{ boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>
                  <Typography fontWeight="bold">PO Number</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Vendor</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Order Date</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Delivery Date</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">Total Amount</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Status</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">Actions</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading purchase orders...
                  </TableCell>
                </TableRow>
              ) : filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow
                    key={po.id}
                    sx={{
                      '&:hover': { bgcolor: '#f9f9f9' },
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell>
                      <Typography fontWeight="medium">{po.poNumber}</Typography>
                    </TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {po.deliveryDate
                        ? new Date(po.deliveryDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold">${po.total.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={po.status}
                        color={getStatusColor(po.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, po.id)}>
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            navigate(`/purchase-orders/${selectedPO}`);
            handleMenuClose();
          }}
        >
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPO) handleReceive(selectedPO);
          }}
        >
          <ReceiveIcon sx={{ mr: 1 }} fontSize="small" color="success" />
          Mark as Received
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPO) handleCancelClick(selectedPO);
          }}
        >
          <CancelIcon sx={{ mr: 1 }} fontSize="small" color="error" />
          Cancel Order
        </MenuItem>
      </Menu>

      {/* Cancel PO Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setCancelPOId(null);
          setCancelReason('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Purchase Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for cancelling this purchase order.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Reason for Cancellation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter reason for cancellation..."
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setCancelDialogOpen(false);
              setCancelPOId(null);
              setCancelReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmCancel}
            disabled={!cancelReason.trim()}
          >
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default POList;
