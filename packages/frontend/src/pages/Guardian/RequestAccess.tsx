import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  RadioGroup,
  Radio,
  LinearProgress,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  CheckCircle,
  Delete,
  Info,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
// Phase 4.2: Use api instance for httpOnly cookie auth instead of raw axios with Bearer tokens
import api from '../../lib/api';

const RELATIONSHIP_TYPES = [
  { value: 'PARENT', label: 'Parent', requiredDocs: ['Birth certificate OR court order'] },
  { value: 'LEGAL_GUARDIAN', label: 'Legal Guardian', requiredDocs: ['Court-appointed guardianship papers'] },
  { value: 'HEALTHCARE_PROXY', label: 'Healthcare Proxy', requiredDocs: ['Signed healthcare proxy form'] },
];

const ACCESS_LEVELS = [
  {
    value: 'FULL',
    label: 'Full Access',
    description: 'All permissions enabled - Schedule and cancel appointments, view all clinical records, and communicate with clinician',
  },
  {
    value: 'LIMITED',
    label: 'Limited Access',
    description: 'View and communicate only - View appointments and records, communicate with clinician (cannot schedule/cancel)',
  },
  {
    value: 'VIEW_ONLY',
    label: 'View Only',
    description: 'Read-only access - View appointments and basic profile information only (no scheduling, no messaging)',
  },
];

interface UploadedFile {
  file: File;
  id: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

const RequestAccess: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    minorId: '',
    minorFirstName: '',
    minorLastName: '',
    minorDateOfBirth: '',
    relationshipType: 'PARENT',
    accessLevel: 'FULL',
    permissions: {
      canScheduleAppointments: true,
      canViewRecords: true,
      canCommunicateWithClinician: true,
    },
    explanation: '',
    contactPhone: '',
    contactEmail: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [legalAcknowledgments, setLegalAcknowledgments] = useState({
    certifyLegal: false,
    understandFalsification: false,
    agreeTerms: false,
  });

  const steps = ['Minor Information', 'Request Access Level', 'Upload Documents', 'Review & Submit'];

  // Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.minorFirstName || !formData.minorLastName || !formData.minorDateOfBirth) {
          setError('Please fill in all required fields');
          return false;
        }
        // Check if minor is under 18
        const birthDate = new Date(formData.minorDateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 18 && formData.relationshipType !== 'HEALTHCARE_PROXY') {
          setError('Minor must be under 18 years old (or healthcare proxy for 18+)');
          return false;
        }
        return true;
      case 1:
        return true;
      case 2:
        if (uploadedFiles.length === 0) {
          setError('Please upload at least one verification document');
          return false;
        }
        return true;
      case 3:
        if (formData.explanation.length < 50) {
          setError('Explanation must be at least 50 characters');
          return false;
        }
        if (!legalAcknowledgments.certifyLegal || !legalAcknowledgments.understandFalsification || !legalAcknowledgments.agreeTerms) {
          setError('Please agree to all legal acknowledgments');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    setError(null);
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });

    // Update permissions based on access level
    if (name === 'accessLevel') {
      if (value === 'FULL') {
        setFormData((prev) => ({
          ...prev,
          permissions: {
            canScheduleAppointments: true,
            canViewRecords: true,
            canCommunicateWithClinician: true,
          },
        }));
      } else if (value === 'LIMITED') {
        setFormData((prev) => ({
          ...prev,
          permissions: {
            canScheduleAppointments: false,
            canViewRecords: true,
            canCommunicateWithClinician: true,
          },
        }));
      } else if (value === 'VIEW_ONLY') {
        setFormData((prev) => ({
          ...prev,
          permissions: {
            canScheduleAppointments: false,
            canViewRecords: false,
            canCommunicateWithClinician: false,
          },
        }));
      }
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: value,
      },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      uploading: false,
      progress: 0,
    }));

    // Validate file size (max 10 MB)
    for (const uploadedFile of newFiles) {
      if (uploadedFile.file.size > 10 * 1024 * 1024) {
        setError(`File ${uploadedFile.file.name} exceeds 10 MB limit`);
        return;
      }
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  const uploadDocuments = async (relationshipId: string): Promise<boolean> => {
    try {
      for (const uploadedFile of uploadedFiles) {
        const formDataUpload = new FormData();
        formDataUpload.append('document', uploadedFile.file);
        formDataUpload.append('documentType', 'VERIFICATION');
        formDataUpload.append('relationshipId', relationshipId);

        // Phase 4.2: Use api instance with httpOnly cookies - no manual auth header needed
        await api.post('/guardian/documents/upload', formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      return true;
    } catch (err: any) {
      console.error('Document upload error:', err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setLoading(true);
      setError(null);

      // Submit guardian relationship request
      // Phase 4.2: Use api instance with httpOnly cookies - no manual auth header needed
      const response = await api.post('/guardian/relationship', {
        minorId: formData.minorId || undefined,
        minorFirstName: formData.minorFirstName,
        minorLastName: formData.minorLastName,
        minorDateOfBirth: formData.minorDateOfBirth,
        relationshipType: formData.relationshipType,
        accessLevel: formData.accessLevel,
        permissions: formData.permissions,
        notes: formData.explanation,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
      });

      if (response.data.success) {
        const relationshipId = response.data.data.id;

        // Upload documents
        const uploadSuccess = await uploadDocuments(relationshipId);

        if (uploadSuccess) {
          setSuccess(true);
        } else {
          setError('Request created but document upload failed. Please contact support.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Minor's Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Provide information about the minor you wish to access
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Minor's Client ID (Optional)"
                  name="minorId"
                  value={formData.minorId}
                  onChange={handleInputChange}
                  helperText="If you know the minor's client ID, entering it will speed up verification"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="minorFirstName"
                  value={formData.minorFirstName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="minorLastName"
                  value={formData.minorLastName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth"
                  name="minorDateOfBirth"
                  value={formData.minorDateOfBirth}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Your Relationship to Minor</InputLabel>
                  <Select
                    value={formData.relationshipType}
                    onChange={(e) => handleSelectChange('relationshipType', e.target.value)}
                    label="Your Relationship to Minor"
                  >
                    {RELATIONSHIP_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Request Access Level
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose the level of access you need to the minor's records
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={formData.accessLevel}
                onChange={(e) => handleSelectChange('accessLevel', e.target.value)}
              >
                {ACCESS_LEVELS.map((level) => (
                  <Card
                    key={level.value}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      border: formData.accessLevel === level.value ? 2 : 1,
                      borderColor: formData.accessLevel === level.value ? 'primary.main' : 'divider',
                    }}
                  >
                    <CardContent>
                      <FormControlLabel
                        value={level.value}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {level.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {level.description}
                            </Typography>
                          </Box>
                        }
                      />
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Granular Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Customize specific permissions (for FULL or LIMITED access)
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.permissions.canScheduleAppointments}
                      onChange={(e) => handlePermissionChange('canScheduleAppointments', e.target.checked)}
                      disabled={formData.accessLevel === 'VIEW_ONLY'}
                    />
                  }
                  label="Schedule and cancel appointments"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.permissions.canViewRecords}
                      onChange={(e) => handlePermissionChange('canViewRecords', e.target.checked)}
                      disabled={formData.accessLevel === 'VIEW_ONLY'}
                    />
                  }
                  label="View clinical records"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.permissions.canCommunicateWithClinician}
                      onChange={(e) => handlePermissionChange('canCommunicateWithClinician', e.target.checked)}
                      disabled={formData.accessLevel === 'VIEW_ONLY'}
                    />
                  }
                  label="Communicate with clinician"
                />
              </FormGroup>
            </Box>
          </Box>
        );

      case 2:
        const selectedRelationship = RELATIONSHIP_TYPES.find((t) => t.value === formData.relationshipType);
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Verification Documents
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
              <Typography variant="subtitle2" fontWeight="bold">
                Required documents for {selectedRelationship?.label}:
              </Typography>
              <List dense>
                {selectedRelationship?.requiredDocs.map((doc, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Description fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={doc} />
                  </ListItem>
                ))}
              </List>
            </Alert>

            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                bgcolor: 'background.default',
                mb: 3,
              }}
            >
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag and drop files here
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                or
              </Typography>
              <Button variant="contained" component="label" startIcon={<CloudUpload />}>
                Browse Files
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
                  onChange={handleFileUpload}
                />
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                Supported formats: PDF, JPEG, PNG, TIFF, DOC, DOCX (Max 10 MB per file)
              </Typography>
            </Paper>

            {uploadedFiles.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Uploaded Files ({uploadedFiles.length})
                </Typography>
                <List>
                  {uploadedFiles.map((uploadedFile) => (
                    <ListItem
                      key={uploadedFile.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveFile(uploadedFile.id)}>
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={uploadedFile.file.name}
                        secondary={`${(uploadedFile.file.size / 1024).toFixed(2)} KB`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review and Submit
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Minor Information
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formData.minorFirstName} {formData.minorLastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date of Birth: {new Date(formData.minorDateOfBirth).toLocaleDateString()}
                    </Typography>
                    {formData.minorId && (
                      <Typography variant="body2" color="text.secondary">
                        Client ID: {formData.minorId}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Relationship Details
                    </Typography>
                    <Typography variant="body1">
                      Type:{' '}
                      <Chip
                        label={RELATIONSHIP_TYPES.find((t) => t.value === formData.relationshipType)?.label}
                        size="small"
                      />
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      Access Level:{' '}
                      <Chip
                        label={formData.accessLevel}
                        size="small"
                        color={
                          formData.accessLevel === 'FULL'
                            ? 'success'
                            : formData.accessLevel === 'LIMITED'
                            ? 'warning'
                            : 'default'
                        }
                      />
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Permissions Requested
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {formData.permissions.canScheduleAppointments && (
                        <Chip label="Schedule Appointments" color="success" size="small" icon={<CheckCircle />} />
                      )}
                      {formData.permissions.canViewRecords && (
                        <Chip label="View Records" color="success" size="small" icon={<CheckCircle />} />
                      )}
                      {formData.permissions.canCommunicateWithClinician && (
                        <Chip label="Communicate with Clinician" color="success" size="small" icon={<CheckCircle />} />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Documents Uploaded
                    </Typography>
                    <Typography variant="body1">{uploadedFiles.length} document(s) uploaded</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Contact Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Contact Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Explanation */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Explanation <span style={{ color: 'red' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Please explain why you are requesting access to this minor's records"
                name="explanation"
                value={formData.explanation}
                onChange={handleInputChange}
                required
                helperText={`${formData.explanation.length}/1000 characters (minimum 50)`}
                inputProps={{ maxLength: 1000 }}
              />
            </Box>

            {/* Legal Acknowledgments */}
            <Paper sx={{ p: 3, bgcolor: 'warning.light', mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Legal Acknowledgments
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={legalAcknowledgments.certifyLegal}
                      onChange={(e) =>
                        setLegalAcknowledgments({ ...legalAcknowledgments, certifyLegal: e.target.checked })
                      }
                    />
                  }
                  label="I certify that I am the legal parent/guardian of the minor named above"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={legalAcknowledgments.understandFalsification}
                      onChange={(e) =>
                        setLegalAcknowledgments({
                          ...legalAcknowledgments,
                          understandFalsification: e.target.checked,
                        })
                      }
                    />
                  }
                  label="I understand that falsifying this information is illegal and may result in prosecution"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={legalAcknowledgments.agreeTerms}
                      onChange={(e) =>
                        setLegalAcknowledgments({ ...legalAcknowledgments, agreeTerms: e.target.checked })
                      }
                    />
                  }
                  label="I agree to the terms and conditions of guardian access"
                />
              </FormGroup>
            </Paper>

            <Alert severity="info" icon={<Info />}>
              Your request will be reviewed by an administrator within 3-5 business days. You will be notified via
              email once your request has been processed.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Request Submitted Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your guardian access request has been submitted and is pending administrative verification.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Estimated verification time: 3-5 business days
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You will receive an email notification once your request is reviewed.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
              <Button variant="contained" onClick={() => navigate('/guardian/portal')}>
                Return to Dashboard
              </Button>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Submit Another Request
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Request Guardian Access
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Complete the form below to request access to a minor's health records. All requests require administrative
        verification.
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>
            <Box>
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default RequestAccess;
