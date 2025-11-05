import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import api from '../../lib/api';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email?: string;
  phone?: string;
}

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

const providerRoles = [
  { value: 'PRIMARY_CARE', label: 'Primary Care Physician' },
  { value: 'PSYCHIATRIST', label: 'Psychiatrist' },
  { value: 'THERAPIST', label: 'Therapist' },
  { value: 'CASE_MANAGER', label: 'Case Manager' },
  { value: 'SPECIALIST', label: 'Specialist' },
  { value: 'OTHER', label: 'Other' },
];

const contactMethods = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'FAX', label: 'Fax' },
  { value: 'MAIL', label: 'Mail' },
];

export default function AddProviderDialog({ open, onClose, clientId, onSuccess }: AddProviderDialogProps) {
  const [providerType, setProviderType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [role, setRole] = useState('');

  // External provider fields
  const [externalProviderName, setExternalProviderName] = useState('');
  const [externalProviderNPI, setExternalProviderNPI] = useState('');
  const [externalProviderPhone, setExternalProviderPhone] = useState('');
  const [externalProviderFax, setExternalProviderFax] = useState('');
  const [externalProviderEmail, setExternalProviderEmail] = useState('');

  // Common fields
  const [hasROIConsent, setHasROIConsent] = useState(false);
  const [roiExpirationDate, setRoiExpirationDate] = useState('');
  const [canReceiveReports, setCanReceiveReports] = useState(false);
  const [canReceiveUpdates, setCanReceiveUpdates] = useState(false);
  const [preferredContactMethod, setPreferredContactMethod] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch providers (for internal)
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['providers', providerSearchQuery],
    queryFn: async () => {
      if (providerSearchQuery.length < 2) return [];
      const response = await api.get(`/users?role=THERAPIST&search=${providerSearchQuery}&limit=10`);
      return response.data.data;
    },
    enabled: providerType === 'INTERNAL' && providerSearchQuery.length >= 2,
  });

  // Create provider mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/client-relationships/providers', data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
  });

  const resetForm = () => {
    setProviderType('INTERNAL');
    setSelectedProvider(null);
    setProviderSearchQuery('');
    setRole('');
    setExternalProviderName('');
    setExternalProviderNPI('');
    setExternalProviderPhone('');
    setExternalProviderFax('');
    setExternalProviderEmail('');
    setHasROIConsent(false);
    setRoiExpirationDate('');
    setCanReceiveReports(false);
    setCanReceiveUpdates(false);
    setPreferredContactMethod('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!role) return;
    if (providerType === 'INTERNAL' && !selectedProvider) return;
    if (providerType === 'EXTERNAL' && !externalProviderName) return;

    const data: any = {
      clientId,
      providerType,
      role,
      hasROIConsent,
      roiExpirationDate: roiExpirationDate || undefined,
      canReceiveReports,
      canReceiveUpdates,
      preferredContactMethod: preferredContactMethod || undefined,
      notes: notes || undefined,
    };

    if (providerType === 'INTERNAL') {
      data.providerId = selectedProvider!.id;
    } else {
      data.externalProviderName = externalProviderName;
      data.externalProviderNPI = externalProviderNPI || undefined;
      data.externalProviderPhone = externalProviderPhone || undefined;
      data.externalProviderFax = externalProviderFax || undefined;
      data.externalProviderEmail = externalProviderEmail || undefined;
    }

    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
        Add Care Team Provider
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Provider Type Toggle */}
          <Box>
            <Box sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
              Provider Type
            </Box>
            <ToggleButtonGroup
              value={providerType}
              exclusive
              onChange={(_, newValue) => {
                if (newValue) {
                  setProviderType(newValue);
                  setSelectedProvider(null);
                  setProviderSearchQuery('');
                }
              }}
              fullWidth
            >
              <ToggleButton value="INTERNAL" sx={{ py: 1.5, fontWeight: 'bold' }}>
                Internal Provider
              </ToggleButton>
              <ToggleButton value="EXTERNAL" sx={{ py: 1.5, fontWeight: 'bold' }}>
                External Provider
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Internal Provider Selection */}
          {providerType === 'INTERNAL' && (
            <Autocomplete
              options={providers || []}
              loading={providersLoading}
              value={selectedProvider}
              onChange={(_, newValue) => setSelectedProvider(newValue)}
              inputValue={providerSearchQuery}
              onInputChange={(_, newInputValue) => setProviderSearchQuery(newInputValue)}
              getOptionLabel={(option) =>
                `${option.firstName} ${option.lastName}, ${option.title}`
              }
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Box sx={{ fontWeight: 'bold' }}>
                      {option.firstName} {option.lastName}
                    </Box>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      {option.title}
                      {option.email && ` | ${option.email}`}
                    </Box>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Internal Provider"
                  placeholder="Type name to search..."
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {providersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          )}

          {/* External Provider Fields */}
          {providerType === 'EXTERNAL' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                required
                label="Provider Name"
                value={externalProviderName}
                onChange={(e) => setExternalProviderName(e.target.value)}
                placeholder="Dr. Jane Smith"
              />
              <TextField
                fullWidth
                label="NPI Number"
                value={externalProviderNPI}
                onChange={(e) => setExternalProviderNPI(e.target.value)}
                placeholder="1234567890"
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={externalProviderPhone}
                  onChange={(e) => setExternalProviderPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
                <TextField
                  fullWidth
                  label="Fax"
                  value={externalProviderFax}
                  onChange={(e) => setExternalProviderFax(e.target.value)}
                  placeholder="(555) 123-4568"
                />
              </Box>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={externalProviderEmail}
                onChange={(e) => setExternalProviderEmail(e.target.value)}
                placeholder="provider@example.com"
              />
            </Box>
          )}

          {/* Provider Role */}
          <FormControl fullWidth required>
            <InputLabel>Provider Role</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              label="Provider Role"
            >
              {providerRoles.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ROI Consent */}
          <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasROIConsent}
                  onChange={(e) => setHasROIConsent(e.target.checked)}
                />
              }
              label="Release of Information (ROI) Consent"
            />
            {hasROIConsent && (
              <TextField
                fullWidth
                type="date"
                label="ROI Expiration Date"
                value={roiExpirationDate}
                onChange={(e) => setRoiExpirationDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Communication Permissions */}
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
            <Box sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
              Communication Permissions
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canReceiveReports}
                    onChange={(e) => setCanReceiveReports(e.target.checked)}
                  />
                }
                label="Can Receive Clinical Reports"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canReceiveUpdates}
                    onChange={(e) => setCanReceiveUpdates(e.target.checked)}
                  />
                }
                label="Can Receive Status Updates"
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Preferred Contact Method</InputLabel>
              <Select
                value={preferredContactMethod}
                onChange={(e) => setPreferredContactMethod(e.target.value)}
                label="Preferred Contact Method"
              >
                {contactMethods.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information about this care team member..."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Button onClick={handleClose} variant="outlined" size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="large"
          disabled={
            !role ||
            (providerType === 'INTERNAL' && !selectedProvider) ||
            (providerType === 'EXTERNAL' && !externalProviderName) ||
            createMutation.isPending
          }
        >
          {createMutation.isPending ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Adding...
            </>
          ) : (
            'Add Provider'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
