import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Paper,
  Radio,
  RadioGroup,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Description,
  Edit,
  Print,
  Download
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { usePolicy } from '../../hooks/usePolicy';
import SignatureCanvas from 'react-signature-canvas';

const quizQuestions = [
  {
    id: 'q1',
    question: 'What is the primary purpose of this policy?',
    options: [
      'To provide guidelines for compliance',
      'To restrict employee activities',
      'To reduce organizational liability',
      'To meet regulatory requirements'
    ],
    correctAnswer: 0
  },
  {
    id: 'q2',
    question: 'Who is responsible for enforcing this policy?',
    options: [
      'All employees',
      'Department managers only',
      'Compliance officers',
      'Senior leadership'
    ],
    correctAnswer: 0
  },
  {
    id: 'q3',
    question: 'How often should this policy be reviewed?',
    options: [
      'Monthly',
      'Quarterly',
      'Annually',
      'Every 2 years'
    ],
    correctAnswer: 2
  }
];

export default function AcknowledgmentForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchPolicyById, acknowledgePolicy } = usePolicy();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasRead, setHasRead] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizPassed, setQuizPassed] = useState(false);
  const [showQuiz, setShowQuiz] = useState(true);
  const [signature, setSignature] = useState('');
  const [receiptDialog, setReceiptDialog] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (id) {
      loadPolicy();
    }
  }, [id]);

  const loadPolicy = async () => {
    setLoading(true);
    const data = await fetchPolicyById(id!);
    if (data) {
      setPolicy(data);
    }
    setLoading(false);
  };

  const handleQuizSubmit = () => {
    let correctCount = 0;
    quizQuestions.forEach((q) => {
      if (quizAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const passed = correctCount >= quizQuestions.length * 0.7; // 70% passing
    setQuizPassed(passed);

    if (!passed) {
      toast.error('You must score at least 70% to acknowledge this policy. Please review the policy and try again.');
      setQuizAnswers({});
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignature('');
  };

  const saveSignature = () => {
    if (signatureRef.current) {
      const dataUrl = signatureRef.current.toDataURL();
      setSignature(dataUrl);
    }
  };

  const handleSubmit = async () => {
    if (!hasRead) {
      toast.error('Please confirm that you have read and understood the policy');
      return;
    }

    if (showQuiz && !quizPassed) {
      toast.error('Please complete and pass the quiz before acknowledging');
      return;
    }

    if (!signature) {
      toast.error('Please provide your signature');
      return;
    }

    const success = await acknowledgePolicy(id!, {
      signature,
      quizAnswers: showQuiz ? quizAnswers : undefined
    });

    if (success) {
      setReceiptDialog(true);
    }
  };

  if (loading || !policy) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
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
        <CardContent sx={{ p: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Description sx={{ fontSize: 60 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Policy Acknowledgment
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Please review and acknowledge the following policy
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Policy Summary */}
      <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              borderLeft: '6px solid',
              borderImage: 'linear-gradient(180deg, #667EEA 0%, #764BA2 100%) 1',
              pl: 3,
              mb: 3
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {policy.title}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
              <Typography variant="body2">
                Category: {policy.category}
              </Typography>
              <Typography variant="body2">
                Version: {policy.version}
              </Typography>
              <Typography variant="body2">
                Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
              </Typography>
            </Stack>
          </Box>

          <Typography
            variant="body1"
            sx={{ lineHeight: 1.8, color: 'text.primary', maxHeight: 300, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy.content) }}
          />

          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<Description />}
              onClick={() => window.open(`/compliance/policies/${id}`, '_blank')}
              sx={{ mr: 2 }}
            >
              View Full Policy
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Quiz Section */}
      {showQuiz && (
        <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Knowledge Check
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please answer the following questions to demonstrate your understanding (70% required to pass)
            </Typography>

            <Stack spacing={3}>
              {quizQuestions.map((q, idx) => (
                <Paper
                  key={q.id}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: alpha('#667EEA', 0.03),
                    border: '1px solid',
                    borderColor: quizAnswers[q.id] !== undefined ? '#667EEA' : 'divider'
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    {idx + 1}. {q.question}
                  </Typography>
                  <RadioGroup
                    value={quizAnswers[q.id] ?? ''}
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers,
                      [q.id]: parseInt(e.target.value)
                    })}
                  >
                    {q.options.map((option, optIdx) => (
                      <FormControlLabel
                        key={optIdx}
                        value={optIdx}
                        control={<Radio />}
                        label={option}
                        sx={{
                          mb: 1,
                          p: 1,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: alpha('#667EEA', 0.05)
                          }
                        }}
                      />
                    ))}
                  </RadioGroup>
                </Paper>
              ))}
            </Stack>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleQuizSubmit}
              disabled={Object.keys(quizAnswers).length !== quizQuestions.length}
              sx={{
                mt: 3,
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                py: 1.5,
                fontSize: '1.1rem'
              }}
            >
              Submit Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Acknowledgment Section */}
      {(!showQuiz || quizPassed) && (
        <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Acknowledgment
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={hasRead}
                  onChange={(e) => setHasRead(e.target.checked)}
                  sx={{
                    color: '#667EEA',
                    '&.Mui-checked': {
                      color: '#667EEA'
                    }
                  }}
                />
              }
              label={
                <Typography variant="body1">
                  I have read and understood this policy, and I agree to comply with all requirements
                  and procedures outlined within.
                </Typography>
              }
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: alpha('#667EEA', 0.03),
                border: '2px solid',
                borderColor: hasRead ? '#667EEA' : 'divider'
              }}
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Digital Signature
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please sign below to acknowledge this policy
            </Typography>

            <Box
              sx={{
                border: '2px solid',
                borderColor: signature ? '#10B981' : 'divider',
                borderRadius: 2,
                bgcolor: '#FAFAFA',
                mb: 2
              }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: 'signature-canvas',
                  style: { width: '100%', height: '200px' }
                }}
                onEnd={saveSignature}
              />
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={clearSignature}
              >
                Clear Signature
              </Button>
              {signature && (
                <Typography
                  variant="body2"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: '#10B981',
                    fontWeight: 600
                  }}
                >
                  <CheckCircle sx={{ mr: 1 }} /> Signature Saved
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {(!showQuiz || quizPassed) && (
        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleSubmit}
          disabled={!hasRead || !signature}
          sx={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            py: 2,
            fontSize: '1.2rem',
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6
            }
          }}
        >
          Submit Acknowledgment
        </Button>
      )}

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', p: 6 }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <CheckCircle sx={{ fontSize: 60, color: 'white' }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Acknowledgment Complete
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Thank you for acknowledging this policy. A receipt has been sent to your email.
          </Typography>

          <Paper sx={{ p: 3, bgcolor: '#F9FAFB', mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Acknowledgment Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Policy:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {policy.title}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Date:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date().toLocaleDateString()}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Time:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date().toLocaleTimeString()}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => window.print()}
            >
              Download Receipt
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/compliance/policies')}
              sx={{
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
              }}
            >
              Return to Policies
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
