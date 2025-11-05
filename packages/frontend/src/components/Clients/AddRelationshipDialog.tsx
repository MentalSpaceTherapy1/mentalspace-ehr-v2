import { useState, useEffect } from 'react';
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
  Autocomplete,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import api from '../../lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  dateOfBirth: string;
}

interface AddRelationshipDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

const relationshipTypes = [
  { value: 'PARENT', label: 'Parent' },
  { value: 'CHILD', label: 'Child' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'GUARDIAN', label: 'Legal Guardian' },
  { value: 'EMERGENCY_CONTACT', label: 'Emergency Contact' },
];

export default function AddRelationshipDialog({ open, onClose, clientId, onSuccess }: AddRelationshipDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [relationshipType, setRelationshipType] = useState('');
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [canScheduleAppointments, setCanScheduleAppointments] = useState(false);
  const [canAccessPortal, setCanAccessPortal] = useState(false);
  const [canViewRecords, setCanViewRecords] = useState(false);
  const [canSignConsent, setCanSignConsent] = useState(false);
  const [hasROIConsent, setHasROIConsent] = useState(false);
  const [roiExpirationDate, setRoiExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  // Search clients
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['clients-search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await api.get(`/clients?search=${searchQuery}&limit=10`);
      // Filter out the current client
      return response.data.data.filter((c: Client) => c.id !== clientId);
    },
    enabled: searchQuery.length >= 2,
  });

  // Create relationship mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/client-relationships', data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
  });

  const resetForm = () => {
    setSearchQuery('');
    setSelectedClient(null);
    setRelationshipType('');
    setIsEmergencyContact(false);
    setCanScheduleAppointments(false);
    setCanAccessPortal(false);
    setCanViewRecords(false);
    setCanSignConsent(false);
    setHasROIConsent(false);
    setRoiExpirationDate('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedClient || !relationshipType) return;

    createMutation.mutate({
      clientId,
      relatedClientId: selectedClient.id,
      relationshipType,
      isEmergencyContact,
      canScheduleAppointments,
      canAccessPortal,
      canViewRecords,
      canSignConsent,
      hasROIConsent,
      roiExpirationDate: roiExpirationDate || undefined,
      notes: notes || undefined,
    });
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
        Add Family Relationship
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Client Search */}
          <Autocomplete
            options={searchResults || []}
            loading={searchLoading}
            value={selectedClient}
            onChange={(_, newValue) => setSelectedClient(newValue)}
            inputValue={searchQuery}
            onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
            getOptionLabel={(option) =>
              `${option.firstName} ${option.lastName} (MRN: ${option.medicalRecordNumber})`
            }
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Box sx={{ fontWeight: 'bold' }}>
                    {option.firstName} {option.lastName}
                  </Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    MRN: {option.medicalRecordNumber} | Age: {calculateAge(option.dateOfBirth)}
                  </Box>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search for Client to Link"
                placeholder="Type name or MRN..."
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {/* Relationship Type */}
          <FormControl fullWidth required>
            <InputLabel>Relationship Type</InputLabel>
            <Select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              label="Relationship Type"
            >
              {relationshipTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Permissions */}
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
            <Box sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
              Permissions & Access
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                  />
                }
                label="Emergency Contact"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canScheduleAppointments}
                    onChange={(e) => setCanScheduleAppointments(e.target.checked)}
                  />
                }
                label="Can Schedule Appointments"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canAccessPortal}
                    onChange={(e) => setCanAccessPortal(e.target.checked)}
                  />
                }
                label="Can Access Client Portal"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canViewRecords}
                    onChange={(e) => setCanViewRecords(e.target.checked)}
                  />
                }
                label="Can View Medical Records"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canSignConsent}
                    onChange={(e) => setCanSignConsent(e.target.checked)}
                  />
                }
                label="Can Sign Consent Forms"
              />
            </Box>
          </Box>

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

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information about this relationship..."
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
          disabled={!selectedClient || !relationshipType || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Creating...
            </>
          ) : (
            'Add Relationship'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
