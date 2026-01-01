import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import {
  Box,
  Card,
  Typography,
  Button,
  LinearProgress,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  AppBar,
  Toolbar,
  FormControl,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha
} from '@mui/material';
import {
  CheckCircle,
  History,
  Menu,
  Close,
  Highlight,
  Comment,
  Print,
  Download,
  Share,
  ArrowBack
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { usePolicy } from '../../hooks/usePolicy';

export default function PolicyViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchPolicyById, acknowledgePolicy } = usePolicy();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readProgress, setReadProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState('current');
  const [acknowledgeDialog, setAcknowledgeDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
      setSelectedVersion(data.version);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        setReadProgress(Math.min(progress, 100));
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleAcknowledge = async () => {
    if (readProgress < 90) {
      toast.error('Please read through the entire policy before acknowledging');
      return;
    }
    const success = await acknowledgePolicy(id!, {});
    if (success) {
      setAcknowledgeDialog(false);
      navigate('/compliance/policies');
    }
  };

  const tableOfContents = [
    { id: 'purpose', title: 'Purpose & Scope' },
    { id: 'policy', title: 'Policy Statement' },
    { id: 'procedures', title: 'Procedures' },
    { id: 'responsibilities', title: 'Responsibilities' },
    { id: 'compliance', title: 'Compliance & Enforcement' },
    { id: 'references', title: 'References' }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (!policy) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Policy not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top AppBar */}
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          boxShadow: 3
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/compliance/policies')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <IconButton color="inherit" onClick={() => setTocOpen(!tocOpen)} sx={{ mr: 2 }}>
            <Menu />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {policy.title}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip
                icon={<History />}
                label={`Version ${policy.version}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip
                label={policy.category}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Stack>
          </Box>

          {/* Version Selector */}
          <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
            <Select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                '.MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value={policy.version}>Current (v{policy.version})</MenuItem>
              {policy.versionHistory?.map((v: any) => (
                <MenuItem key={v.version} value={v.version}>v{v.version}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Print">
            <IconButton color="inherit">
              <Print />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton color="inherit">
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton color="inherit">
              <Share />
            </IconButton>
          </Tooltip>
        </Toolbar>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={readProgress}
          sx={{
            height: 4,
            bgcolor: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
            }
          }}
        />
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Table of Contents */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={tocOpen}
          sx={{
            width: tocOpen ? 280 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              position: 'relative',
              borderRight: '2px solid',
              borderColor: 'divider',
              background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)'
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Table of Contents
            </Typography>
            <List>
              {tableOfContents.map((item, index) => (
                <ListItem
                  key={item.id}
                  onClick={() => {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                      color: 'white'
                    }
                  }}
                >
                  <ListItemText
                    primary={`${index + 1}. ${item.title}`}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Policy Content */}
        <Box
          ref={contentRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 4,
            bgcolor: '#FAFAFA'
          }}
        >
          <Card
            sx={{
              maxWidth: 900,
              mx: 'auto',
              p: 6,
              borderRadius: 3,
              boxShadow: 3
            }}
          >
            {/* Header */}
            <Box
              sx={{
                borderLeft: '6px solid',
                borderImage: 'linear-gradient(180deg, #667EEA 0%, #764BA2 100%) 1',
                pl: 3,
                mb: 4
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {policy.title}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
                <Typography variant="body2">
                  Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
                </Typography>
                {policy.reviewDate && (
                  <Typography variant="body2">
                    Review: {new Date(policy.reviewDate).toLocaleDateString()}
                  </Typography>
                )}
              </Stack>
            </Box>

            {/* Content Sections */}
            {tableOfContents.map((section) => (
              <Box key={section.id} id={section.id} sx={{ mb: 4 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {section.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ lineHeight: 1.8, color: 'text.primary' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy.content) }}
                />
              </Box>
            ))}

            {/* Attachments */}
            {policy.attachments && policy.attachments.length > 0 && (
              <Box sx={{ mt: 4, p: 3, bgcolor: '#F3F4F6', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Attachments
                </Typography>
                <Stack spacing={1}>
                  {policy.attachments.map((att: any) => (
                    <Chip
                      key={att.id}
                      label={att.filename}
                      icon={<Download />}
                      onClick={() => window.open(att.url, '_blank')}
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Card>
        </Box>
      </Box>

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', right: 24, bottom: 24 }}>
        <Stack spacing={2}>
          <Tooltip title="Highlight Text">
            <Fab
              size="medium"
              sx={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white'
              }}
            >
              <Highlight />
            </Fab>
          </Tooltip>
          <Tooltip title="Add Comment">
            <Fab
              size="medium"
              sx={{
                background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                color: 'white'
              }}
            >
              <Comment />
            </Fab>
          </Tooltip>
        </Stack>
      </Box>

      {/* Sticky Acknowledge Button */}
      {policy.status === 'ACTIVE' && (
        <AppBar
          position="sticky"
          sx={{
            top: 'auto',
            bottom: 0,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: 3
          }}
        >
          <Toolbar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                Read Progress: {Math.round(readProgress)}%
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<CheckCircle />}
              onClick={() => setAcknowledgeDialog(true)}
              disabled={readProgress < 90}
              sx={{
                bgcolor: 'white',
                color: '#059669',
                fontWeight: 700,
                px: 4,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)'
                }
              }}
            >
              Acknowledge Policy
            </Button>
          </Toolbar>
        </AppBar>
      )}

      {/* Acknowledge Dialog */}
      <Dialog open={acknowledgeDialog} onClose={() => setAcknowledgeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Acknowledge Policy</DialogTitle>
        <DialogContent>
          <Typography>
            By acknowledging this policy, you confirm that you have read and understand its contents
            and agree to comply with all requirements.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcknowledgeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAcknowledge}
            sx={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            }}
          >
            I Acknowledge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
