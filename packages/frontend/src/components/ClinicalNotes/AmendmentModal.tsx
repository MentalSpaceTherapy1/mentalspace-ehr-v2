import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { SignatureModal } from './SignatureModal';

interface AmendmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  noteId: string;
  noteType: string;
  currentNoteData: any;
}

interface FieldChange {
  fieldName: string;
  displayName: string;
  oldValue: any;
  newValue: any;
}

const AMENDABLE_FIELDS = [
  { name: 'subjective', label: 'Subjective' },
  { name: 'objective', label: 'Objective' },
  { name: 'assessment', label: 'Assessment' },
  { name: 'plan', label: 'Plan' },
  { name: 'diagnosisCodes', label: 'Diagnosis Codes' },
  { name: 'interventionsUsed', label: 'Interventions Used' },
  { name: 'progressTowardGoals', label: 'Progress Toward Goals' },
  { name: 'nextSessionPlan', label: 'Next Session Plan' },
  { name: 'riskAssessmentDetails', label: 'Risk Assessment Details' },
];

export const AmendmentModal: React.FC<AmendmentModalProps> = ({
  open,
  onClose,
  onSuccess,
  noteId,
  noteType,
  currentNoteData,
}) => {
  const [step, setStep] = useState<'create' | 'sign'>('create');
  const [reason, setReason] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldChanges, setFieldChanges] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amendmentId, setAmendmentId] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const handleFieldToggle = (fieldName: string) => {
    if (selectedFields.includes(fieldName)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldName));
      const newChanges = { ...fieldChanges };
      delete newChanges[fieldName];
      setFieldChanges(newChanges);
    } else {
      setSelectedFields([...selectedFields, fieldName]);
      setFieldChanges({
        ...fieldChanges,
        [fieldName]: currentNoteData[fieldName] || '',
      });
    }
  };

  const handleFieldValueChange = (fieldName: string, value: any) => {
    setFieldChanges({
      ...fieldChanges,
      [fieldName]: value,
    });
  };

  const handleCreateAmendment = async () => {
    setError('');

    // Validation
    if (!reason.trim()) {
      setError('Reason for amendment is required');
      return;
    }
    if (reason.trim().length < 20) {
      setError('Reason must be at least 20 characters');
      return;
    }
    if (!changeSummary.trim()) {
      setError('Summary of changes is required');
      return;
    }
    if (selectedFields.length === 0) {
      setError('Please select at least one field to amend');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`/clinical-notes/${noteId}/amend`, {
        reason: reason.trim(),
        fieldsChanged: selectedFields,
        changeSummary: changeSummary.trim(),
        newNoteData: fieldChanges,
      });

      setAmendmentId(response.data.data.amendment.id);
      setStep('sign');
      setShowSignatureModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create amendment');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!amendmentId) return;

    await axios.post(`/amendments/${amendmentId}/sign`, {
      signatureType: 'AMENDMENT',
    });

    // Success
    setShowSignatureModal(false);
    handleReset();
    onSuccess();
  };

  const handleReset = () => {
    setStep('create');
    setReason('');
    setChangeSummary('');
    setSelectedFields([]);
    setFieldChanges({});
    setError('');
    setAmendmentId(null);
    onClose();
  };

  const getFieldValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (value === null || value === undefined) {
      return '(empty)';
    }
    return String(value);
  };

  return (
    <>
      <Dialog open={open && !showSignatureModal} onClose={handleReset} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon />
            Amend Clinical Note
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Amendments to signed clinical notes create a permanent
              audit trail. You will need to sign the amendment after creation.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              1. Reason for Amendment
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Why is this amendment needed?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Example: Incorrect diagnosis code was entered. Need to update from F41.1 to F33.1 based on client's symptom presentation..."
              helperText={`${reason.length}/20 characters minimum`}
              error={reason.length > 0 && reason.length < 20}
              disabled={loading}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              2. Select Fields to Amend
            </Typography>
            <FormGroup>
              <Grid container spacing={2}>
                {AMENDABLE_FIELDS.map((field) => (
                  <Grid size={{xs: 12, sm: 6, md: 4}} key={field.name}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedFields.includes(field.name)}
                          onChange={() => handleFieldToggle(field.name)}
                          disabled={loading}
                        />
                      }
                      label={field.label}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </Box>

          {selectedFields.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                3. Update Field Values
              </Typography>
              {selectedFields.map((fieldName) => {
                const field = AMENDABLE_FIELDS.find((f) => f.name === fieldName);
                if (!field) return null;

                const oldValue = currentNoteData[fieldName];
                const newValue = fieldChanges[fieldName];

                return (
                  <Paper key={fieldName} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      {field.label}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{xs: 12, md: 6}}>
                        <Typography variant="caption" color="textSecondary">
                          Current Value:
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            backgroundColor: '#fff3e0',
                            borderRadius: 1,
                            border: '1px solid #ffb74d',
                            minHeight: '60px',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          <Typography variant="body2">{getFieldValue(oldValue)}</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{xs: 12, md: 6}}>
                        <Typography variant="caption" color="textSecondary">
                          New Value:
                        </Typography>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          value={newValue}
                          onChange={(e) => handleFieldValueChange(fieldName, e.target.value)}
                          disabled={loading}
                          sx={{ backgroundColor: '#e8f5e9' }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Box>
          )}

          {selectedFields.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                4. Summary of Changes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Briefly summarize what changed"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Example: Updated diagnosis from Generalized Anxiety Disorder to Major Depressive Disorder. Modified assessment to reflect depressive symptoms. Adjusted treatment plan accordingly."
                disabled={loading}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReset} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAmendment}
            variant="contained"
            color="primary"
            disabled={
              loading ||
              !reason.trim() ||
              reason.length < 20 ||
              !changeSummary.trim() ||
              selectedFields.length === 0
            }
            startIcon={loading && <CircularProgress size={16} />}
          >
            {loading ? 'Creating Amendment...' : 'Create & Sign Amendment'}
          </Button>
        </DialogActions>
      </Dialog>

      {showSignatureModal && amendmentId && (
        <SignatureModal
          open={showSignatureModal}
          onClose={() => {
            setShowSignatureModal(false);
            handleReset();
          }}
          onSign={handleSign}
          noteType={noteType}
          signatureType="AMENDMENT"
        />
      )}
    </>
  );
};
