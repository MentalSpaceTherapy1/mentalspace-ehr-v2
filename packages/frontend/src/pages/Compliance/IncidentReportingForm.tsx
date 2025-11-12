import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  Avatar,
  Paper,
  Autocomplete,
  alpha
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  Send,
  Warning,
  LocationOn,
  People,
  Description,
  Photo,
  CheckCircle,
  Error,
  Emergency,
  LocalHospital,
  Security,
  Build,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useIncident } from '../../hooks/useIncident';

const incidentTypes = [
  { value: 'SAFETY', label: 'Safety Incident', icon: Warning, color: '#F59E0B' },
  { value: 'CLINICAL', label: 'Clinical Event', icon: LocalHospital, color: '#EF4444' },
  { value: 'SECURITY', label: 'Security Breach', icon: Security, color: '#8B5CF6' },
  { value: 'EQUIPMENT', label: 'Equipment Failure', icon: Build, color: '#6366F1' },
  { value: 'EMERGENCY', label: 'Emergency', icon: Emergency, color: '#DC2626' },
  { value: 'OTHER', label: 'Other', icon: Error, color: '#64748B' }
];

const severityLevels = [
  { value: 'LOW', label: 'Low', color: '#10B981', description: 'Minor issue, no harm' },
  { value: 'MEDIUM', label: 'Medium', color: '#F59E0B', description: 'Moderate impact' },
  { value: 'HIGH', label: 'High', color: '#F97316', description: 'Significant impact' },
  { value: 'CRITICAL', label: 'Critical', color: '#EF4444', description: 'Severe harm or risk' }
];

const mockPeople = [
  { id: '1', name: 'Dr. Sarah Johnson', role: 'Clinician' },
  { id: '2', name: 'Michael Chen', role: 'Nurse' },
  { id: '3', name: 'Emily Davis', role: 'Patient' }
];

const steps = [
  'Incident Type',
  'Details',
  'People Involved',
  'Actions & Evidence',
  'Review & Submit'
];

export default function IncidentReportingForm() {
  const navigate = useNavigate();
  const { createIncident } = useIncident();
  const [activeStep, setActiveStep] = useState(0);

  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    title: '',
    description: '',
    location: '',
    incidentDate: '',
    incidentTime: '',
    peopleInvolved: [] as any[],
    immediateActions: '',
    photos: [] as string[]
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }
  };

  const handleSubmit = async () => {
    const incident = await createIncident({
      ...formData,
      incidentDate: `${formData.incidentDate}T${formData.incidentTime}`,
      peopleInvolved: formData.peopleInvolved.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
      }))
    });

    if (incident) {
      navigate(`/compliance/incidents/${incident.id}`);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              What type of incident are you reporting?
            </Typography>
            <Grid container spacing={2}>
              {incidentTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <Grid item xs={12} sm={6} md={4} key={type.value}>
                    <Card
                      onClick={() => handleChange('type', type.value)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: isSelected ? type.color : 'divider',
                        bgcolor: isSelected ? alpha(type.color, 0.1) : 'transparent',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                          borderColor: type.color
                        }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            mx: 'auto',
                            mb: 2,
                            bgcolor: type.color
                          }}
                        >
                          <Icon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {type.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {formData.type && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Incident Severity
                </Typography>
                <Grid container spacing={2}>
                  {severityLevels.map((level) => {
                    const isSelected = formData.severity === level.value;
                    return (
                      <Grid item xs={12} sm={6} md={3} key={level.value}>
                        <Paper
                          onClick={() => handleChange('severity', level.value)}
                          sx={{
                            p: 3,
                            cursor: 'pointer',
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: isSelected ? level.color : 'divider',
                            bgcolor: isSelected ? alpha(level.color, 0.1) : 'transparent',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              borderColor: level.color,
                              transform: 'scale(1.02)'
                            }
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: level.color,
                              mb: 1
                            }}
                          >
                            {level.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {level.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Incident Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Incident Title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Brief summary of the incident"
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={formData.incidentDate}
                  onChange={(e) => handleChange('incidentDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="Time"
                  value={formData.incidentTime}
                  onChange={(e) => handleChange('incidentTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Where did this occur?"
                  InputProps={{
                    startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe what happened in detail..."
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              People Involved
            </Typography>
            <Autocomplete
              multiple
              options={mockPeople}
              getOptionLabel={(option) => `${option.name} (${option.role})`}
              value={formData.peopleInvolved}
              onChange={(e, value) => handleChange('peopleInvolved', value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select people involved"
                  placeholder="Search..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    icon={<People />}
                    label={`${option.name} (${option.role})`}
                    {...getTagProps({ index })}
                    sx={{
                      background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                      color: 'white'
                    }}
                  />
                ))
              }
            />

            <Box sx={{ mt: 4 }}>
              {formData.peopleInvolved.length > 0 && (
                <Stack spacing={2}>
                  {formData.peopleInvolved.map((person, idx) => (
                    <Paper
                      key={person.id}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: '#667EEA' }}>
                          {person.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {person.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {person.role}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Immediate Actions & Evidence
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Immediate Actions Taken"
              value={formData.immediateActions}
              onChange={(e) => handleChange('immediateActions', e.target.value)}
              placeholder="What actions were taken immediately after the incident?"
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Upload Photos/Evidence
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Photo />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              Upload Photos
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </Button>

            {formData.photos.length > 0 && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {formData.photos.map((photo, idx) => (
                  <Grid item xs={6} sm={4} md={3} key={idx}>
                    <Box
                      sx={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '2px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <img
                        src={photo}
                        alt={`Evidence ${idx + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 4:
        const selectedType = incidentTypes.find(t => t.value === formData.type);
        const selectedSeverity = severityLevels.find(s => s.value === formData.severity);
        const TypeIcon = selectedType?.icon || Error;

        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Review & Submit
            </Typography>

            <Card
              sx={{
                borderRadius: 3,
                border: '2px solid',
                borderColor: selectedSeverity?.color || 'divider',
                mb: 3
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: selectedType?.color || '#64748B'
                    }}
                  >
                    <TypeIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {formData.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip label={selectedType?.label} size="small" />
                      <Chip
                        label={selectedSeverity?.label}
                        size="small"
                        sx={{
                          bgcolor: alpha(selectedSeverity?.color || '#64748B', 0.2),
                          color: selectedSeverity?.color,
                          fontWeight: 700
                        }}
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Date & Time
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(`${formData.incidentDate}T${formData.incidentTime}`).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formData.location}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      People Involved
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formData.peopleInvolved.length} person(s)
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {formData.description}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha('#0EA5E9', 0.1),
                border: '1px solid',
                borderColor: '#0EA5E9'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                By submitting this report, you confirm that the information provided is accurate to the
                best of your knowledge. The appropriate personnel will be notified and an investigation
                may be initiated.
              </Typography>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return formData.type && formData.severity;
      case 1:
        return formData.title && formData.incidentDate && formData.incidentTime &&
               formData.location && formData.description;
      case 2:
        return true; // Optional
      case 3:
        return true; // Optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: 'white',
          borderRadius: 3,
          mb: 3,
          boxShadow: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton sx={{ color: 'white' }} onClick={() => navigate('/compliance/incidents')}>
              <ArrowBack />
            </IconButton>
            <Warning sx={{ fontSize: 48 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Report an Incident
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Complete the form below to report an incident
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Stepper */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
        <CardContent sx={{ p: 4, minHeight: 400 }}>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          startIcon={<NavigateBefore />}
          onClick={handleBack}
          disabled={activeStep === 0}
          sx={{ borderRadius: 2, px: 4 }}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<Send />}
            onClick={handleSubmit}
            disabled={!isStepValid()}
            sx={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              px: 4,
              borderRadius: 2
            }}
          >
            Submit Report
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<NavigateNext />}
            onClick={handleNext}
            disabled={!isStepValid()}
            sx={{
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
              px: 4,
              borderRadius: 2
            }}
          >
            Next
          </Button>
        )}
      </Stack>
    </Box>
  );
}
