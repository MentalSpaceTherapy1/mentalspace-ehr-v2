import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Divider,
  Card,
  CardContent,
  alpha,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  Link as LinkIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocuments } from '../../hooks/useDocuments';
import { format } from 'date-fns';

interface DocumentViewerProps {
  documentId?: string;
  onClose?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentId: propDocumentId, onClose: propOnClose }) => {
  const { documentId: paramDocumentId } = useParams<{ documentId: string }>();
  const documentId = propDocumentId || paramDocumentId || '';
  const navigate = useNavigate();

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      navigate(-1);
    }
  };
  const { getDocumentVersions } = useDocuments();
  const [tabValue, setTabValue] = useState(0);
  const [shareLink, setShareLink] = useState('');
  const [comment, setComment] = useState('');
  const [versions, setVersions] = useState<any[]>([]);

  // Mock document data
  const document = {
    id: documentId,
    title: 'Treatment Plan Template',
    fileName: 'treatment-plan-template.pdf',
    fileType: 'application/pdf',
    fileSize: 2457600,
    url: '/documents/sample.pdf',
    category: 'Clinical',
    tags: ['Template', 'Important'],
    uploadedBy: 'user-1',
    uploadedByName: 'Dr. Sarah Johnson',
    accessLevel: 'PRIVATE',
    version: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const comments = [
    {
      id: '1',
      user: 'Dr. Michael Chen',
      avatar: 'M',
      comment: 'Great template! Very comprehensive.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '2',
      user: 'Dr. Emily Williams',
      avatar: 'E',
      comment: 'Can we add a section for family history?',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const relatedDocuments = [
    { id: '1', title: 'Assessment Form Template', type: 'pdf' },
    { id: '2', title: 'Progress Notes Template', type: 'doc' },
    { id: '3', title: 'Discharge Summary Template', type: 'doc' },
  ];

  useEffect(() => {
    loadVersions();
    generateShareLink();
  }, [documentId]);

  const loadVersions = async () => {
    try {
      const data = await getDocumentVersions(documentId);
      setVersions(data || []);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const generateShareLink = () => {
    const link = `${window.location.origin}/documents/share/${documentId}?token=${Math.random().toString(36).substr(2, 9)}`;
    setShareLink(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open onClose={handleClose} maxWidth="lg" fullWidth fullScreen>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {document.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {document.fileName} · {formatFileSize(document.fileSize)}
                </Typography>
                <Chip
                  label={`v${document.version}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#fff', 0.2),
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                {document.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      bgcolor: alpha('#fff', 0.2),
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                sx={{
                  bgcolor: 'white',
                  color: '#10b981',
                  '&:hover': { bgcolor: alpha('#fff', 0.9) },
                }}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: alpha('#fff', 0.1) },
                }}
              >
                Share
              </Button>
              <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Preview Area */}
          <Box sx={{ flex: 1, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Paper
                elevation={3}
                sx={{
                  width: '100%',
                  maxWidth: 800,
                  height: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'white',
                }}
              >
                {/* This would be replaced with actual document viewer (PDF.js, etc.) */}
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <FileIcon sx={{ fontSize: 120, color: '#cbd5e1', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Document Preview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {document.fileType}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<VisibilityIcon />}
                    sx={{
                      mt: 3,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    }}
                  >
                    Open in Viewer
                  </Button>
                </Box>
              </Paper>
            </motion.div>
          </Box>

          {/* Sidebar */}
          <Box sx={{ width: 380, borderLeft: '1px solid #e2e8f0', bgcolor: 'white', overflow: 'auto' }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
              <Tab icon={<CommentIcon />} label="Comments" />
              <Tab icon={<HistoryIcon />} label="Versions" />
              <Tab icon={<LinkIcon />} label="Share" />
            </Tabs>

            <Box sx={{ p: 2 }}>
              {/* Comments Tab */}
              {tabValue === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!comment.trim()}
                    sx={{
                      mb: 3,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    }}
                  >
                    Post Comment
                  </Button>

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Comments ({comments.length})
                  </Typography>
                  <List>
                    {comments.map((c) => (
                      <ListItem
                        key={c.id}
                        alignItems="flex-start"
                        sx={{
                          bgcolor: alpha('#10b981', 0.05),
                          borderRadius: 2,
                          mb: 1,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#10b981' }}>{c.avatar}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={c.user}
                          secondary={
                            <>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                {c.comment}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(c.createdAt), 'MMM dd, yyyy h:mm a')}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </motion.div>
              )}

              {/* Versions Tab */}
              {tabValue === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Version History
                  </Typography>
                  <List>
                    {[
                      { version: 3, date: new Date(), user: 'Dr. Sarah Johnson', current: true },
                      { version: 2, date: new Date(Date.now() - 86400000 * 7), user: 'Dr. Michael Chen' },
                      { version: 1, date: new Date(Date.now() - 86400000 * 14), user: 'Dr. Sarah Johnson' },
                    ].map((v) => (
                      <ListItem
                        key={v.version}
                        sx={{
                          bgcolor: v.current ? alpha('#10b981', 0.1) : alpha('#f8fafc', 1),
                          borderRadius: 2,
                          mb: 1,
                          border: v.current ? '2px solid #10b981' : '1px solid #e2e8f0',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                Version {v.version}
                              </Typography>
                              {v.current && (
                                <Chip
                                  label="Current"
                                  size="small"
                                  sx={{
                                    bgcolor: '#10b981',
                                    color: 'white',
                                    fontWeight: 600,
                                    height: 20,
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2">{v.user}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(v.date, 'MMM dd, yyyy h:mm a')}
                              </Typography>
                            </>
                          }
                        />
                        {!v.current && (
                          <Button size="small" sx={{ color: '#10b981' }}>
                            Restore
                          </Button>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </motion.div>
              )}

              {/* Share Tab */}
              {tabValue === 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Share Link
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: alpha('#10b981', 0.05),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
                      {shareLink}
                    </Typography>
                    <IconButton onClick={handleCopyLink} sx={{ color: '#10b981' }}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Paper>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Related Documents
                  </Typography>
                  <List>
                    {relatedDocuments.map((doc) => (
                      <ListItemButton
                        key={doc.id}
                        sx={{
                          bgcolor: alpha('#f8fafc', 1),
                          borderRadius: 2,
                          mb: 1,
                          border: '1px solid #e2e8f0',
                          '&:hover': {
                            bgcolor: alpha('#10b981', 0.05),
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}>
                            <FileIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={doc.title} secondary={doc.type.toUpperCase()} />
                      </ListItemButton>
                    ))}
                  </List>
                </motion.div>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default DocumentViewer;
