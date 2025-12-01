import React, { useState, useEffect } from 'react';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
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
  Chip,
  Stack,
  IconButton,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha
} from '@mui/material';
import {
  Save,
  Preview,
  Publish,
  AttachFile,
  Delete,
  Add,
  ArrowBack,
  Category,
  Schedule,
  Description
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { usePolicy, Policy } from '../../hooks/usePolicy';
import TiptapEditor from '../../components/editor/TiptapEditor';

const categories = [
  'HIPAA',
  'Clinical',
  'Safety',
  'HR',
  'Financial',
  'IT Security',
  'Training',
  'Other'
];

const reviewSchedules = [
  { value: 6, label: '6 Months' },
  { value: 12, label: '1 Year' },
  { value: 24, label: '2 Years' },
  { value: 36, label: '3 Years' }
];

export default function PolicyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createPolicy, updatePolicy, fetchPolicyById } = usePolicy();
  const [activeTab, setActiveTab] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    category: string;
    content: string;
    effectiveDate: string;
    reviewSchedule: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    versionNotes: string;
  }>({
    title: '',
    category: '',
    content: '',
    effectiveDate: '',
    reviewSchedule: 12,
    status: 'DRAFT',
    versionNotes: ''
  });

  const [attachments, setAttachments] = useState<Array<{
    id: string;
    filename: string;
    url: string;
  }>>([]);

  useEffect(() => {
    if (id) {
      loadPolicy();
    }
  }, [id]);

  const loadPolicy = async () => {
    const data = await fetchPolicyById(id!);
    if (data) {
      setFormData({
        title: data.title,
        category: data.category,
        content: data.content,
        effectiveDate: data.effectiveDate,
        reviewSchedule: data.reviewSchedule || 12,
        status: data.status,
        versionNotes: ''
      });
      if (data.attachments) {
        setAttachments(data.attachments);
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (publish: boolean = false) => {
    const { versionNotes, ...policyFields } = formData;
    const status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' = publish ? 'ACTIVE' : formData.status;
    const policyData: Partial<Policy> = {
      ...policyFields,
      status
    };

    let success;
    if (id) {
      success = await updatePolicy(id, policyData);
    } else {
      success = await createPolicy(policyData);
    }

    if (success) {
      navigate('/compliance/policies');
    }
  };

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // In a real app, upload files to server
      Array.from(files).forEach(file => {
        setAttachments(prev => [...prev, {
          id: Math.random().toString(),
          filename: file.name,
          url: URL.createObjectURL(file)
        }]);
      });
    }
  };


  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          color: 'white',
          borderRadius: 3,
          mb: 3,
          boxShadow: 3
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton sx={{ color: 'white' }} onClick={() => navigate('/compliance/policies')}>
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {id ? 'Edit Policy' : 'Create New Policy'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {id ? 'Update existing policy' : 'Create a new organizational policy'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Preview />}
                onClick={() => setPreviewMode(!previewMode)}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={() => handleSave(false)}
                sx={{
                  bgcolor: 'white',
                  color: '#667EEA',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                Save Draft
              </Button>
              <Button
                variant="contained"
                startIcon={<Publish />}
                onClick={() => handleSave(true)}
                sx={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  }
                }}
              >
                Publish
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              minHeight: 64
            },
            '& .Mui-selected': {
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }
          }}
        >
          <Tab icon={<Description />} label="Policy Details" iconPosition="start" />
          <Tab icon={<Schedule />} label="Schedule & Review" iconPosition="start" />
          <Tab icon={<AttachFile />} label="Attachments" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && !previewMode && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Policy Title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    label="Category"
                    sx={{ borderRadius: 2 }}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        <Chip
                          icon={<Category />}
                          label={cat}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    label="Status"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="ARCHIVED">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Policy Content
                </Typography>
                <TiptapEditor
                  value={formData.content}
                  onChange={(value) => handleChange('content', value)}
                  minHeight={400}
                />
              </Grid>

              {id && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Version Notes"
                    multiline
                    rows={3}
                    value={formData.versionNotes}
                    onChange={(e) => handleChange('versionNotes', e.target.value)}
                    placeholder="Describe what changed in this version..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Effective Date"
                  value={formData.effectiveDate}
                  onChange={(e) => handleChange('effectiveDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Review Schedule</InputLabel>
                  <Select
                    value={formData.reviewSchedule}
                    onChange={(e) => handleChange('reviewSchedule', e.target.value)}
                    label="Review Schedule"
                    sx={{ borderRadius: 2 }}
                  >
                    {reviewSchedules.map((schedule) => (
                      <MenuItem key={schedule.value} value={schedule.value}>
                        {schedule.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Review Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This policy will be automatically scheduled for review {formData.reviewSchedule} months
                    after the effective date. Reviewers will be notified 30 days before the review date.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Add />}
                sx={{
                  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                  borderRadius: 2
                }}
              >
                Upload Attachment
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleAttachment}
                />
              </Button>
            </Box>

            <List>
              {attachments.map((att) => (
                <ListItem
                  key={att.id}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: alpha('#667EEA', 0.05),
                    '&:hover': {
                      bgcolor: alpha('#667EEA', 0.1)
                    }
                  }}
                >
                  <AttachFile sx={{ mr: 2, color: '#667EEA' }} />
                  <ListItemText
                    primary={att.filename}
                    secondary={`Uploaded ${new Date().toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {attachments.length === 0 && (
              <Box
                sx={{
                  p: 8,
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: 'divider'
                }}
              >
                <AttachFile sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  No Attachments
                </Typography>
                <Typography color="text.secondary">
                  Upload supporting documents, forms, or references
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Mode */}
      {previewMode && (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              {formData.title}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
              <Chip label={formData.category} color="primary" />
              <Chip label={formData.status} />
              <Chip label={`Effective: ${formData.effectiveDate}`} variant="outlined" />
            </Stack>
            <Box
              sx={{ lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content) }}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
