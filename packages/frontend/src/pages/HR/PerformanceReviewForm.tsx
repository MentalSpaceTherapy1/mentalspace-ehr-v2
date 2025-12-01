import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Slider,
  IconButton,
  Chip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Rating,
  Divider,
  Alert,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material';
import { usePerformance, CreateReviewInput } from '../../hooks/usePerformance';

const PERFORMANCE_CATEGORIES = [
  { name: 'Quality of Work', color: '#FF6B6B' },
  { name: 'Productivity', color: '#4ECDC4' },
  { name: 'Communication', color: '#45B7D1' },
  { name: 'Teamwork', color: '#96CEB4' },
  { name: 'Initiative', color: '#FFEAA7' },
  { name: 'Problem Solving', color: '#DDA15E' },
  { name: 'Reliability', color: '#BC6C25' },
  { name: 'Professionalism', color: '#9B59B6' },
];

const GOAL_STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started', icon: <RadioButtonUncheckedIcon />, color: '#95A5A6' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: <RadioButtonUncheckedIcon />, color: '#3498DB' },
  { value: 'COMPLETED', label: 'Completed', icon: <CheckCircleIcon />, color: '#2ECC71' },
];

interface PerformanceReviewFormProps {
  employeeId?: string;
  employeeName?: string;
  reviewId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PerformanceReviewForm: React.FC<PerformanceReviewFormProps> = ({
  employeeId,
  employeeName,
  reviewId,
  onSuccess,
  onCancel,
}) => {
  const { createReview, updateReview, getReview, uploadAttachment, loading } = usePerformance();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<CreateReviewInput>>({
    employeeId: employeeId || '',
    reviewPeriodStart: '',
    reviewPeriodEnd: '',
    categories: PERFORMANCE_CATEGORIES.map(cat => ({
      name: cat.name,
      rating: 3,
      comments: '',
    })),
    goals: [],
    achievements: [],
    areasForImprovement: [],
    managerComments: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const steps = ['Basic Info', 'Performance Ratings', 'Goals & Achievements', 'Summary & Submit'];

  useEffect(() => {
    if (reviewId) {
      loadReview();
    }
  }, [reviewId]);

  const loadReview = async () => {
    try {
      const review = await getReview(reviewId!);
      setFormData({
        employeeId: review.employeeId,
        reviewPeriodStart: review.reviewPeriodStart,
        reviewPeriodEnd: review.reviewPeriodEnd,
        categories: review.categories,
        goals: review.goals,
        achievements: review.achievements,
        areasForImprovement: review.areasForImprovement,
        managerComments: review.managerComments,
      });
    } catch (error) {
      console.error('Failed to load review:', error);
    }
  };

  const handleCategoryRatingChange = (index: number, rating: number) => {
    const newCategories = [...(formData.categories || [])];
    newCategories[index] = { ...newCategories[index], rating };
    setFormData({ ...formData, categories: newCategories });
  };

  const handleCategoryCommentsChange = (index: number, comments: string) => {
    const newCategories = [...(formData.categories || [])];
    newCategories[index] = { ...newCategories[index], comments };
    setFormData({ ...formData, categories: newCategories });
  };

  const addGoal = () => {
    setFormData({
      ...formData,
      goals: [
        ...(formData.goals || []),
        { description: '', status: 'NOT_STARTED', achievementLevel: 0 },
      ],
    });
  };

  const updateGoal = (index: number, field: string, value: any) => {
    const newGoals = [...(formData.goals || [])];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setFormData({ ...formData, goals: newGoals });
  };

  const removeGoal = (index: number) => {
    const newGoals = (formData.goals || []).filter((_, i) => i !== index);
    setFormData({ ...formData, goals: newGoals });
  };

  const addAchievement = () => {
    setFormData({
      ...formData,
      achievements: [...(formData.achievements || []), ''],
    });
  };

  const updateAchievement = (index: number, value: string) => {
    const newAchievements = [...(formData.achievements || [])];
    newAchievements[index] = value;
    setFormData({ ...formData, achievements: newAchievements });
  };

  const removeAchievement = (index: number) => {
    const newAchievements = (formData.achievements || []).filter((_, i) => i !== index);
    setFormData({ ...formData, achievements: newAchievements });
  };

  const addImprovement = () => {
    setFormData({
      ...formData,
      areasForImprovement: [...(formData.areasForImprovement || []), ''],
    });
  };

  const updateImprovement = (index: number, value: string) => {
    const newImprovements = [...(formData.areasForImprovement || [])];
    newImprovements[index] = value;
    setFormData({ ...formData, areasForImprovement: newImprovements });
  };

  const removeImprovement = (index: number) => {
    const newImprovements = (formData.areasForImprovement || []).filter((_, i) => i !== index);
    setFormData({ ...formData, areasForImprovement: newImprovements });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments([...attachments, ...Array.from(event.target.files)]);
    }
  };

  const handleSaveDraft = async () => {
    try {
      if (reviewId) {
        await updateReview(reviewId, formData as CreateReviewInput);
      } else {
        await createReview(formData as CreateReviewInput);
      }
      setSuccessMessage('Draft saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const review = reviewId
        ? await updateReview(reviewId, formData as CreateReviewInput)
        : await createReview(formData as CreateReviewInput);

      // Upload attachments
      for (const file of attachments) {
        await uploadAttachment(review.id, file);
      }

      setSuccessMessage('Review submitted successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const getProgressPercentage = () => {
    return ((activeStep + 1) / steps.length) * 100;
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600 }}>
          Review Period Information
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Employee Name"
          value={employeeName || ''}
          disabled
          variant="outlined"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Employee ID"
          value={formData.employeeId}
          disabled
          variant="outlined"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Review Period Start"
          type="date"
          value={formData.reviewPeriodStart}
          onChange={(e) => setFormData({ ...formData, reviewPeriodStart: e.target.value })}
          InputLabelProps={{ shrink: true }}
          variant="outlined"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Review Period End"
          type="date"
          value={formData.reviewPeriodEnd}
          onChange={(e) => setFormData({ ...formData, reviewPeriodEnd: e.target.value })}
          InputLabelProps={{ shrink: true }}
          variant="outlined"
        />
      </Grid>
    </Grid>
  );

  const renderPerformanceRatings = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600 }}>
          Performance Categories
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Rate each category from 1 (Needs Improvement) to 5 (Exceptional)
        </Typography>
      </Grid>
      {formData.categories?.map((category, index) => (
        <Grid size={{ xs: 12 }} key={index}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${PERFORMANCE_CATEGORIES[index]?.color}15 0%, ${PERFORMANCE_CATEGORIES[index]?.color}05 100%)`,
              border: `2px solid ${PERFORMANCE_CATEGORIES[index]?.color}40`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: PERFORMANCE_CATEGORIES[index]?.color }}>
                  {category.name}
                </Typography>
                <Rating
                  value={category.rating}
                  onChange={(_, value) => handleCategoryRatingChange(index, value || 0)}
                  max={5}
                  size="large"
                  icon={<StarIcon fontSize="inherit" />}
                  emptyIcon={<StarIcon fontSize="inherit" />}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: PERFORMANCE_CATEGORIES[index]?.color,
                    },
                  }}
                />
              </Box>
              <Box sx={{ px: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Needs Improvement</Typography>
                  <Typography variant="caption">Exceptional</Typography>
                </Box>
                <Slider
                  value={category.rating}
                  onChange={(_, value) => handleCategoryRatingChange(index, value as number)}
                  min={1}
                  max={5}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  sx={{
                    color: PERFORMANCE_CATEGORIES[index]?.color,
                    '& .MuiSlider-markLabel': {
                      fontSize: '0.7rem',
                    },
                  }}
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Add comments about this category..."
                value={category.comments}
                onChange={(e) => handleCategoryCommentsChange(index, e.target.value)}
                variant="outlined"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderGoalsAndAchievements = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#2C3E50', fontWeight: 600 }}>
            Goals
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addGoal}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
              color: 'white',
            }}
          >
            Add Goal
          </Button>
        </Box>
        {formData.goals?.map((goal, index) => (
          <Card key={index} sx={{ mb: 2, border: '2px solid #667EEA20' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#667EEA', fontWeight: 600 }}>
                  Goal {index + 1}
                </Typography>
                <IconButton onClick={() => removeGoal(index)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Describe the goal..."
                value={goal.description}
                onChange={(e) => updateGoal(index, 'description', e.target.value)}
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" gutterBottom>
                    Status
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {GOAL_STATUS_OPTIONS.map((option) => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        onClick={() => updateGoal(index, 'status', option.value)}
                        icon={option.icon}
                        sx={{
                          backgroundColor: goal.status === option.value ? option.color : '#E0E0E0',
                          color: goal.status === option.value ? 'white' : '#666',
                          fontWeight: goal.status === option.value ? 600 : 400,
                        }}
                      />
                    ))}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" gutterBottom>
                    Achievement Level: {goal.achievementLevel}%
                  </Typography>
                  <Slider
                    value={goal.achievementLevel}
                    onChange={(_, value) => updateGoal(index, 'achievementLevel', value)}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    sx={{ color: '#667EEA' }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#2C3E50', fontWeight: 600 }}>
            Achievements
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addAchievement}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
              color: 'white',
            }}
          >
            Add Achievement
          </Button>
        </Box>
        {formData.achievements?.map((achievement, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Describe an achievement..."
              value={achievement}
              onChange={(e) => updateAchievement(index, e.target.value)}
              variant="outlined"
              size="small"
            />
            <IconButton onClick={() => removeAchievement(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#2C3E50', fontWeight: 600 }}>
            Areas for Improvement
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addImprovement}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
              color: 'white',
            }}
          >
            Add Area
          </Button>
        </Box>
        {formData.areasForImprovement?.map((improvement, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Describe an area for improvement..."
              value={improvement}
              onChange={(e) => updateImprovement(index, e.target.value)}
              variant="outlined"
              size="small"
            />
            <IconButton onClick={() => removeImprovement(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
      </Grid>
    </Grid>
  );

  const renderSummary = () => {
    const averageRating =
      (formData.categories?.reduce((sum, cat) => sum + cat.rating, 0) ?? 0) /
      (formData.categories?.length || 1);

    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Review this summary before submitting. You can go back to make changes if needed.
          </Alert>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>
                {averageRating.toFixed(1)}
              </Typography>
              <Typography variant="body2" align="center">
                Overall Average Rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>
                {formData.goals?.filter((g) => g.status === 'COMPLETED').length || 0}
              </Typography>
              <Typography variant="body2" align="center">
                Goals Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Manager Comments"
            placeholder="Add your overall comments about this review period..."
            value={formData.managerComments}
            onChange={(e) => setFormData({ ...formData, managerComments: e.target.value })}
            variant="outlined"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Supporting Documents
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<AttachFileIcon />}
            sx={{ mb: 2 }}
          >
            Upload Files
            <input type="file" hidden multiple onChange={handleFileUpload} />
          </Button>
          {attachments.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {attachments.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => setAttachments(attachments.filter((_, i) => i !== index))}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
            Performance Review
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Complete this review to evaluate employee performance
          </Typography>
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <LinearProgress
            variant="determinate"
            value={getProgressPercentage()}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #667EEA 0%, #764BA2 100%)',
                borderRadius: 4,
              },
            }}
          />
          <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
            {getProgressPercentage().toFixed(0)}% Complete
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 4 }}>
          {activeStep === 0 && renderBasicInfo()}
          {activeStep === 1 && renderPerformanceRatings()}
          {activeStep === 2 && renderGoalsAndAchievements()}
          {activeStep === 3 && renderSummary()}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Box>
            {onCancel && (
              <Button
                onClick={onCancel}
                startIcon={<CancelIcon />}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
            )}
            {activeStep > 0 && (
              <Button onClick={handleBack}>
                Back
              </Button>
            )}
          </Box>

          <Box>
            <Button
              onClick={handleSaveDraft}
              startIcon={<SaveIcon />}
              variant="outlined"
              disabled={loading}
              sx={{ mr: 2 }}
            >
              Save Draft
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{
                  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={<SendIcon />}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                }}
              >
                Submit Review
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PerformanceReviewForm;
