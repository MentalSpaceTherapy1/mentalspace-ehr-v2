import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Menu,
  MenuItem,
  alpha,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as TableIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocuments } from '../../hooks/useDocuments';
import FolderTree from './FolderTree';
import DocumentUploader from './DocumentUploader';
import { format } from 'date-fns';

const DocumentLibrary: React.FC = () => {
  const { documents, folders, loading, fetchDocuments, fetchFolders } = useDocuments();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments(selectedFolder || undefined);
    fetchFolders();
  }, [selectedFolder]);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <PdfIcon sx={{ fontSize: 40, color: '#ef4444' }} />;
    if (fileType.includes('image')) return <ImageIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />;
    if (fileType.includes('document') || fileType.includes('word'))
      return <DocIcon sx={{ fontSize: 40, color: '#3b82f6' }} />;
    if (fileType.includes('sheet') || fileType.includes('excel'))
      return <TableIcon sx={{ fontSize: 40, color: '#10b981' }} />;
    return <FileIcon sx={{ fontSize: 40, color: '#6b7280' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FolderIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Document Library
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Manage and organize your documents
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setShowUploader(true)}
            sx={{
              bgcolor: 'white',
              color: '#10b981',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: alpha('#fff', 0.9),
              },
            }}
          >
            Upload Document
          </Button>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Sidebar - Folder Tree */}
          <Grid item xs={12} md={3} sx={{ height: '100%', borderRight: '1px solid #e2e8f0' }}>
            <Paper elevation={0} sx={{ height: '100%', borderRadius: 0, overflow: 'auto', p: 2 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Folders
              </Typography>
              <FolderTree
                folders={folders}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
              />

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Recent Documents
                </Typography>
                {recentDocuments.map((doc) => (
                  <Card
                    key={doc.id}
                    sx={{
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha('#10b981', 0.05) },
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {getFileIcon(doc.fileType)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {doc.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(doc.createdAt), 'MMM dd')}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Main Content Area */}
          <Grid item xs={12} md={9} sx={{ height: '100%', overflow: 'auto' }}>
            <Box sx={{ p: 3 }}>
              {/* Toolbar */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'white',
                    },
                  }}
                />

                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, value) => value && setViewMode(value)}
                  size="small"
                >
                  <ToggleButton value="grid">
                    <ViewModuleIcon />
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ViewListIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Documents Grid/List */}
              <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                  <Grid container spacing={2}>
                    {filteredDocuments.map((doc, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card
                            sx={{
                              height: '100%',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                height: 140,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: alpha('#10b981', 0.05),
                                position: 'relative',
                              }}
                            >
                              {getFileIcon(doc.fileType)}
                              <IconButton
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  bgcolor: 'white',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoc(doc.id);
                                  setAnchorEl(e.currentTarget);
                                }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Box>
                            <CardContent>
                              <Typography variant="subtitle2" fontWeight={600} noWrap gutterBottom>
                                {doc.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                {formatFileSize(doc.fileSize)}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                {doc.category && (
                                  <Chip
                                    label={doc.category}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha('#10b981', 0.1),
                                      color: '#10b981',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                    }}
                                  />
                                )}
                                <Chip
                                  label={`v${doc.version}`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha('#3b82f6', 0.1),
                                    color: '#3b82f6',
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    {filteredDocuments.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: alpha('#10b981', 0.05),
                            },
                          }}
                        >
                          {getFileIcon(doc.fileType)}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {doc.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {doc.uploadedByName} · {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                            </Typography>
                          </Box>
                          <Chip
                            label={formatFileSize(doc.fileSize)}
                            size="small"
                            sx={{ bgcolor: alpha('#6b7280', 0.1) }}
                          />
                          {doc.category && (
                            <Chip
                              label={doc.category}
                              size="small"
                              sx={{
                                bgcolor: alpha('#10b981', 0.1),
                                color: '#10b981',
                                fontWeight: 600,
                              }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDoc(doc.id);
                              setAnchorEl(e.currentTarget);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </motion.div>
                    ))}
                  </Paper>
                )}
              </AnimatePresence>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Document Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <DownloadIcon sx={{ mr: 1, fontSize: 18 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ShareIcon sx={{ mr: 1, fontSize: 18 }} />
          Share
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <StarIcon sx={{ mr: 1, fontSize: 18 }} />
          Add to Favorites
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: '#ef4444' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Document Uploader Dialog */}
      {showUploader && (
        <DocumentUploader onClose={() => setShowUploader(false)} folderId={selectedFolder} />
      )}
    </Box>
  );
};

export default DocumentLibrary;
