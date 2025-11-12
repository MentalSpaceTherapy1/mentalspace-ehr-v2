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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart as POIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { createPurchaseOrder } from '../../hooks/usePurchaseOrder';
import { useVendors } from '../../hooks/useVendor';
import { useBudgets } from '../../hooks/useBudget';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { vendors } = useVendors();
  const { budgets } = useBudgets(new Date().getFullYear());

  const [formData, setFormData] = useState({
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    shippingAddress: '',
    budgetId: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, category: '' },
  ]);

  const [taxRate, setTaxRate] = useState(0.08); // 8% tax
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setLineItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, category: '' },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (!formData.vendorId || lineItems.length === 0) {
      setError('Please select a vendor and add at least one line item');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createPurchaseOrder({
        ...formData,
        lineItems: lineItems.map((item) => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })) as any,
        subtotal,
        tax,
        total,
        status: 'PENDING',
      });

      setSuccess('Purchase Order created successfully!');
      setTimeout(() => {
        navigate('/purchase-orders');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <POIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="primary">
          Create Purchase Order
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
        {/* PO Header */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ boxShadow: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                Purchase Order Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Vendor</InputLabel>
                    <Select
                      value={formData.vendorId}
                      onChange={(e) => handleInputChange('vendorId', e.target.value)}
                      label="Vendor"
                    >
                      {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
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
                          {budget.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Order Date"
                    type="date"
                    required
                    value={formData.orderDate}
                    onChange={(e) => handleInputChange('orderDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Delivery Date"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Shipping Address"
                    multiline
                    rows={2}
                    value={formData.shippingAddress}
                    onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Line Items
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addLineItem}
                  size="small"
                >
                  Add Item
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell width={100}>Quantity</TableCell>
                      <TableCell width={120}>Unit Price</TableCell>
                      <TableCell width={120}>Total</TableCell>
                      <TableCell width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) =>
                              handleLineItemChange(index, 'description', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Category"
                            value={item.category}
                            onChange={(e) =>
                              handleLineItemChange(index, 'category', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={item.quantity}
                            onChange={(e) =>
                              handleLineItemChange(index, 'quantity', Number(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleLineItemChange(index, 'unitPrice', Number(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="bold">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Totals Card */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Order Summary
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Subtotal
                    </Typography>
                    <Typography variant="h6" fontWeight="medium">
                      ${subtotal.toFixed(2)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Tax ({(taxRate * 100).toFixed(0)}%)
                    </Typography>
                    <Typography variant="h6" fontWeight="medium">
                      ${tax.toFixed(2)}
                    </Typography>
                  </Stack>

                  <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />

                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6" fontWeight="bold">
                      Total
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      ${total.toFixed(2)}
                    </Typography>
                  </Stack>

                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <Typography variant="caption">
                      {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
                    </Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>

            {/* Tax Rate Selector */}
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                  Tax Settings
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <TextField
                  fullWidth
                  label="Tax Rate (%)"
                  type="number"
                  value={(taxRate * 100).toFixed(2)}
                  onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
                  inputProps={{ step: 0.1, min: 0, max: 100 }}
                />
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card
              sx={{
                boxShadow: 3,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Status
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Current Status
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      PENDING APPROVAL
                    </Typography>
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
          onClick={() => navigate('/purchase-orders')}
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
          {loading ? 'Submitting...' : 'Submit Purchase Order'}
        </Button>
      </Box>
    </Box>
  );
};

export default PurchaseOrderForm;
