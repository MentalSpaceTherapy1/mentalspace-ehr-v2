import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Avatar,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Print as PrintIcon,
  FileDownload as FileDownloadIcon,
  Draw as DrawIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { usePerformance, PerformanceReview } from '../../hooks/usePerformance';
import { format } from 'date-fns';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import SignatureCanvas from 'react-signature-canvas';

interface ReviewViewerProps {
  reviewId?: string;
  onClose?: () => void;
}

const ReviewViewer: React.FC<ReviewViewerProps> = ({ reviewId: propReviewId, onClose }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reviewId = propReviewId || id || '';
  const handleClose = onClose || (() => navigate('/hr/performance'));
  const { getReview, signReview, loading } = usePerformance();
  const [review, setReview] = useState<PerformanceReview | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signatureRole, setSignatureRole] = useState<'employee' | 'manager'>('employee');
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    loadReview();
  }, [reviewId]);

  const loadReview = async () => {
    try {
      const data = await getReview(reviewId);
      setReview(data);
    } catch (error) {
      console.error('Failed to load review:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implementation for exporting to PDF
    console.log('Export to PDF');
  };

  const handleOpenSignDialog = (role: 'employee' | 'manager') => {
    setSignatureRole(role);
    setSignDialogOpen(true);
  };

  const handleSign = async () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      try {
        await signReview(reviewId, signatureData, signatureRole);
        setSignDialogOpen(false);
        loadReview();
      } catch (error) {
        console.error('Failed to sign review:', error);
      }
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  if (!review) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading review...</Typography>
      </Box>
    );
  }

  const radarData = review.categories.map((cat) => ({
    category: cat.name,
    rating: cat.rating,
  }));

  const completedGoals = review.goals?.filter((g) => g.status === 'COMPLETED').length || 0;
  const totalGoals = review.goals?.length || 0;
  const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ borderRadius: 3 }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
            color: 'white',
            p: 4,
            borderRadius: '12px 12px 0 0',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: '2rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                }}
              >
                {review.employeeName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  Performance Review
                </Typography>
                <Typography variant="h6">{review.employeeName}</Typography>
                <Typography variant="body2">
                  Review Period: {format(new Date(review.reviewPeriodStart), 'MMM dd, yyyy')} -{' '}
                  {format(new Date(review.reviewPeriodEnd), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h2" sx={{ fontWeight: 700 }}>
                {review.overallRating.toFixed(1)}
              </Typography>
              <Rating value={review.overallRating} readOnly precision={0.1} size="large" />
              <Typography variant="body2">Overall Rating</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 4 }}>
          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ borderColor: '#667EEA', color: '#667EEA' }}
            >
              Print
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              sx={{ borderColor: '#2ECC71', color: '#2ECC71' }}
            >
              Export PDF
            </Button>
            {!review.employeeSignature && (
              <Button
                variant="contained"
                startIcon={<DrawIcon />}
                onClick={() => handleOpenSignDialog('employee')}
                sx={{ background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)' }}
              >
                Employee Sign
              </Button>
            )}
            {!review.managerSignature && (
              <Button
                variant="contained"
                startIcon={<DrawIcon />}
                onClick={() => handleOpenSignDialog('manager')}
                sx={{ background: 'linear-gradient(135deg, #E67E22 0%, #D35400 100%)' }}
              >
                Manager Sign
              </Button>
            )}
            {onClose && (
              <Button onClick={onClose} variant="outlined">
                Close
              </Button>
            )}
          </Stack>

          {/* Performance Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%', border: '2px solid #667EEA20' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600 }}>
                    Performance Categories
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E0E0E0" />
                      <PolarAngleAxis dataKey="category" tick={{ fill: '#666', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#666' }} />
                      <Radar
                        name="Rating"
                        dataKey="rating"
                        stroke="#667EEA"
                        fill="#667EEA"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2} sx={{ height: '100%' }}>
                <Card sx={{ background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                          {completedGoals}/{totalGoals}
                        </Typography>
                        <Typography variant="body2">Goals Completed</Typography>
                      </Box>
                      <CheckCircleIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={goalCompletionRate}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'white',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                        {goalCompletionRate.toFixed(0)}% Completion Rate
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                          {review.achievements?.length || 0}
                        </Typography>
                        <Typography variant="body2">Key Achievements</Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ background: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                          {review.areasForImprovement?.length || 0}
                        </Typography>
                        <Typography variant="body2">Areas for Growth</Typography>
                      </Box>
                      <AssignmentIcon sx={{ fontSize: 64, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>

          {/* Detailed Ratings */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Detailed Category Ratings
            </Typography>
            <Grid container spacing={2}>
              {review.categories.map((category, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Card sx={{ border: '2px solid #E0E0E0' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {category.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ color: '#667EEA', fontWeight: 700 }}>
                            {category.rating.toFixed(1)}
                          </Typography>
                          <Rating value={category.rating} readOnly precision={0.1} />
                        </Box>
                      </Box>
                      {category.comments && (
                        <Typography variant="body2" color="textSecondary">
                          {category.comments}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Goals */}
          {review.goals && review.goals.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
                Goals & Achievements
              </Typography>
              {review.goals.map((goal, index) => (
                <Card key={index} sx={{ mb: 2, border: '2px solid #667EEA20' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                        {goal.description}
                      </Typography>
                      <Chip
                        label={goal.status.replace('_', ' ')}
                        sx={{
                          backgroundColor:
                            goal.status === 'COMPLETED'
                              ? '#2ECC71'
                              : goal.status === 'IN_PROGRESS'
                              ? '#3498DB'
                              : '#95A5A6',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" gutterBottom>
                        Achievement Level: {goal.achievementLevel}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={goal.achievementLevel}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #667EEA 0%, #764BA2 100%)',
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Achievements */}
          {review.achievements && review.achievements.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
                Key Achievements
              </Typography>
              <Card sx={{ border: '2px solid #2ECC7120', backgroundColor: '#2ECC7105' }}>
                <CardContent>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {review.achievements.map((achievement, index) => (
                      <li key={index}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {achievement}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Areas for Improvement */}
          {review.areasForImprovement && review.areasForImprovement.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
                Areas for Improvement
              </Typography>
              <Card sx={{ border: '2px solid #E74C3C20', backgroundColor: '#E74C3C05' }}>
                <CardContent>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {review.areasForImprovement.map((improvement, index) => (
                      <li key={index}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {improvement}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Comments */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Comments
            </Typography>
            <Grid container spacing={3}>
              {review.managerComments && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: '2px solid #667EEA20' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#667EEA' }}>
                        Manager Comments
                      </Typography>
                      <Typography variant="body2">{review.managerComments}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {review.employeeComments && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: '2px solid #2ECC7120' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#2ECC71' }}>
                        Employee Comments
                      </Typography>
                      <Typography variant="body2">{review.employeeComments}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Signatures */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#2C3E50', fontWeight: 600, mb: 3 }}>
              Digital Signatures
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ border: '2px solid #9B59B620', minHeight: 200 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#9B59B6' }}>
                      Employee Signature
                    </Typography>
                    {review.employeeSignature ? (
                      <Box>
                        <img
                          src={review.employeeSignature}
                          alt="Employee Signature"
                          style={{ maxWidth: '100%', border: '1px solid #E0E0E0', borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          Signed on {review.signedAt && format(new Date(review.signedAt), 'MMM dd, yyyy hh:mm a')}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Not signed yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ border: '2px solid #E67E2220', minHeight: 200 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#E67E22' }}>
                      Manager Signature
                    </Typography>
                    {review.managerSignature ? (
                      <Box>
                        <img
                          src={review.managerSignature}
                          alt="Manager Signature"
                          style={{ maxWidth: '100%', border: '1px solid #E0E0E0', borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          Signed on {review.signedAt && format(new Date(review.signedAt), 'MMM dd, yyyy hh:mm a')}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Not signed yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>

      {/* Signature Dialog */}
      <Dialog open={signDialogOpen} onClose={() => setSignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {signatureRole === 'employee' ? 'Employee' : 'Manager'} Signature
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: '2px solid #E0E0E0',
              borderRadius: 2,
              backgroundColor: '#F9F9F9',
              mt: 2,
            }}
          >
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                width: 500,
                height: 200,
                className: 'signature-canvas',
              }}
            />
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Sign above using your mouse or touchscreen
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearSignature}>Clear</Button>
          <Button onClick={() => setSignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSign}
            variant="contained"
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
            }}
          >
            Sign Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewViewer;
