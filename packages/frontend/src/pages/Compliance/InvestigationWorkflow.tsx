import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControlLabel,
  Stack,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  alpha,
  Divider
} from '@mui/material';
import {
  Add,
  Delete,
  AttachFile,
  CheckCircle,
  ArrowBack,
  Save
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../../hooks/useIncident';

const investigationSteps = [
  'Initial Assessment',
  'Root Cause Analysis',
  'Corrective Actions',
  'Preventive Actions',
  'Sign-Off'
];

const checklistItems = [
  'Interview witnesses',
  'Review documentation',
  'Inspect physical evidence',
  'Analyze contributing factors',
  'Identify root cause',
  'Document findings'
];

export default function InvestigationWorkflow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateInvestigation } = useIncident();
  const [activeStep, setActiveStep] = useState(0);
  const [checklist, setChecklist] = useState(
    checklistItems.map((item, idx) => ({ id: idx, text: item, completed: false }))
  );
  const [rootCause, setRootCause] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState<Array<{
    id: string;
    action: string;
    responsible: string;
    dueDate: string;
  }>>([]);
  const [preventiveActions, setPreventiveActions] = useState<Array<{
    id: string;
    action: string;
    responsible: string;
    dueDate: string;
  }>>([]);
  const [evidence, setEvidence] = useState<string[]>([]);

  const handleChecklistToggle = (id: number) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const addCorrectiveAction = () => {
    setCorrectiveActions(prev => [
      ...prev,
      { id: String(Date.now()), action: '', responsible: '', dueDate: '' }
    ]);
  };

  const addPreventiveAction = () => {
    setPreventiveActions(prev => [
      ...prev,
      { id: String(Date.now()), action: '', responsible: '', dueDate: '' }
    ]);
  };

  const handleSave = async () => {
    if (id) {
      await updateInvestigation(id, {
        rootCause,
        correctiveActions: correctiveActions.map(ca => ({ ...ca, status: 'PENDING' as const })),
        preventiveActions: preventiveActions.map(pa => ({ ...pa, status: 'PENDING' as const }))
      });
      navigate(`/compliance/incidents/${id}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          color: 'white',
          borderRadius: 3,
          mb: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton sx={{ color: 'white' }} onClick={() => navigate(`/compliance/incidents/${id}`)}>
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Investigation Workflow
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              sx={{ bgcolor: 'white', color: '#8B5CF6' }}
            >
              Save Progress
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Stepper */}
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {investigationSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Investigation Checklist */}
      {activeStep === 0 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Investigation Checklist
            </Typography>
            <List>
              {checklist.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: item.completed ? alpha('#10B981', 0.1) : alpha('#667EEA', 0.05)
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={item.completed}
                        onChange={() => handleChecklistToggle(item.id)}
                      />
                    }
                    label={item.text}
                  />
                  {item.completed && <CheckCircle sx={{ color: '#10B981', ml: 'auto' }} />}
                </ListItem>
              ))}
            </List>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setActiveStep(1)}
              disabled={checklist.filter(c => c.completed).length < checklist.length * 0.7}
              sx={{
                mt: 3,
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
              }}
            >
              Continue to Root Cause Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Root Cause Analysis */}
      {activeStep === 1 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Root Cause Analysis
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Root Cause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Describe the root cause of the incident..."
              sx={{ mb: 3 }}
            />
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                disabled={!rootCause}
                sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' }}
              >
                Continue
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Corrective Actions */}
      {activeStep === 2 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Corrective Actions
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addCorrectiveAction}
              sx={{ mb: 3 }}
            >
              Add Action
            </Button>
            <Stack spacing={2}>
              {correctiveActions.map((action, idx) => (
                <Paper key={action.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Action"
                      value={action.action}
                      onChange={(e) => {
                        const updated = [...correctiveActions];
                        updated[idx].action = e.target.value;
                        setCorrectiveActions(updated);
                      }}
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        fullWidth
                        label="Responsible"
                        value={action.responsible}
                        onChange={(e) => {
                          const updated = [...correctiveActions];
                          updated[idx].responsible = e.target.value;
                          setCorrectiveActions(updated);
                        }}
                      />
                      <TextField
                        type="date"
                        label="Due Date"
                        value={action.dueDate}
                        onChange={(e) => {
                          const updated = [...correctiveActions];
                          updated[idx].dueDate = e.target.value;
                          setCorrectiveActions(updated);
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <IconButton
                        onClick={() =>
                          setCorrectiveActions(prev => prev.filter(a => a.id !== action.id))
                        }
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(3)}
                sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' }}
              >
                Continue
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Preventive Actions */}
      {activeStep === 3 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Preventive Actions
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addPreventiveAction}
              sx={{ mb: 3 }}
            >
              Add Action
            </Button>
            <Stack spacing={2}>
              {preventiveActions.map((action, idx) => (
                <Paper key={action.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Action"
                      value={action.action}
                      onChange={(e) => {
                        const updated = [...preventiveActions];
                        updated[idx].action = e.target.value;
                        setPreventiveActions(updated);
                      }}
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        fullWidth
                        label="Responsible"
                        value={action.responsible}
                        onChange={(e) => {
                          const updated = [...preventiveActions];
                          updated[idx].responsible = e.target.value;
                          setPreventiveActions(updated);
                        }}
                      />
                      <TextField
                        type="date"
                        label="Due Date"
                        value={action.dueDate}
                        onChange={(e) => {
                          const updated = [...preventiveActions];
                          updated[idx].dueDate = e.target.value;
                          setPreventiveActions(updated);
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <IconButton
                        onClick={() =>
                          setPreventiveActions(prev => prev.filter(a => a.id !== action.id))
                        }
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => setActiveStep(2)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(4)}
                sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' }}
              >
                Continue to Sign-Off
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Sign-Off */}
      {activeStep === 4 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Investigation Sign-Off
            </Typography>
            <Paper sx={{ p: 3, mb: 3, bgcolor: alpha('#10B981', 0.05) }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                By signing off, you confirm that the investigation is complete and all findings are accurate.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">Root Cause:</Typography>
                <Typography>{rootCause}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                  Corrective Actions: {correctiveActions.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Preventive Actions: {preventiveActions.length}
                </Typography>
              </Stack>
            </Paper>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => setActiveStep(3)}>
                Back
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleSave}
                sx={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                Sign-Off Investigation
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
