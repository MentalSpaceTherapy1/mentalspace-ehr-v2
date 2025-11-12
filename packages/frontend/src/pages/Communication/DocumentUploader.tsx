import React, { useState, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Grid,
  alpha,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckCircleIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useDocuments } from '../../hooks/useDocuments';

interface DocumentUploaderProps {
  onClose: () => void;
  folderId?: string | null;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onClose, folderId }) => {
  const { uploadDocument, loading } = useDocuments();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [metadata, setMetadata] = useState({
    title: '',
    category: '',
    tags: [] as string[],
    accessLevel: 'PRIVATE',
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    if (acceptedFiles.length > 0 && !metadata.title) {
      setMetadata((prev) => ({
        ...prev,
        title: acceptedFiles[0].name.replace(/\.[^/.]+$/, ''),
      }));
    }
  }, [metadata.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    for (const file of files) {
      try {
        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90),
          }));
        }, 200);

        await uploadDocument({
          file,
          title: metadata.title || file.name,
          folderId: folderId || undefined,
          category: metadata.category || undefined,
          tags: metadata.tags,
          accessLevel: metadata.accessLevel,
        });

        clearInterval(interval);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return <PdfIcon sx={{ fontSize: 40, color: '#ef4444' }} />;
    if (file.type.includes('image')) return <ImageIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />;
    return <FileIcon sx={{ fontSize: 40, color: '#6b7280' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const categories = ['Clinical', 'Administrative', 'Financial', 'Legal', 'Training', 'Other'];
  const tagOptions = ['Important', 'Confidential', 'Archive', 'Review', 'Template'];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudUploadIcon sx={{ fontSize: 32 }} />
          <Typography variant="h6" fontWeight={600}>
            Upload Documents
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {loading && <LinearProgress />}

      <DialogContent sx={{ p: 3 }}>
        {/* Dropzone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Paper
            {...getRootProps()}
            sx={{
              p: 4,
              mb: 3,
              border: `2px dashed ${isDragActive ? '#10b981' : '#cbd5e1'}`,
              bgcolor: isDragActive ? alpha('#10b981', 0.05) : alpha('#f8fafc', 1),
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              '&:hover': {
                borderColor: '#10b981',
                bgcolor: alpha('#10b981', 0.05),
              },
            }}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <CloudUploadIcon
                sx={{
                  fontSize: 64,
                  color: isDragActive ? '#10b981' : '#cbd5e1',
                  mb: 2,
                }}
              />
            </motion.div>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Supports: PDF, Images, Documents, Spreadsheets
            </Typography>
          </Paper>
        </motion.div>

        {/* File List */}
        {files.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Selected Files ({files.length})
            </Typography>
            <AnimatePresence>
              {files.map((file, index) => {
                const progress = uploadProgress[file.name] || 0;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        mb: 1,
                        border: '1px solid #e2e8f0',
                        bgcolor: progress === 100 ? alpha('#10b981', 0.05) : 'white',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getFileIcon(file)}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.size)}
                          </Typography>
                          {progress > 0 && (
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{
                                mt: 1,
                                height: 6,
                                borderRadius: 1,
                                bgcolor: alpha('#10b981', 0.1),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: '#10b981',
                                },
                              }}
                            />
                          )}
                        </Box>
                        {progress === 100 ? (
                          <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFile(index)}
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Box>
        )}

        {/* Metadata Form */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', bgcolor: '#fafbfc' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Document Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={metadata.category}
                      onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                      label="Category"
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={tagOptions}
                    value={metadata.tags}
                    onChange={(e, value) => setMetadata({ ...metadata, tags: value })}
                    renderInput={(params) => <TextField {...params} label="Tags" />}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          {...getTagProps({ index })}
                          sx={{
                            bgcolor: alpha('#10b981', 0.1),
                            color: '#10b981',
                            fontWeight: 600,
                          }}
                        />
                      ))
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Access Level
                  </Typography>
                  <RadioGroup
                    value={metadata.accessLevel}
                    onChange={(e) => setMetadata({ ...metadata, accessLevel: e.target.value })}
                    row
                  >
                    <FormControlLabel
                      value="PUBLIC"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label="Public"
                            size="small"
                            sx={{
                              bgcolor: alpha('#3b82f6', 0.1),
                              color: '#3b82f6',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="PRIVATE"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label="Private"
                            size="small"
                            sx={{
                              bgcolor: alpha('#f59e0b', 0.1),
                              color: '#f59e0b',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="RESTRICTED"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label="Restricted"
                            size="small"
                            sx={{
                              bgcolor: alpha('#ef4444', 0.1),
                              color: '#ef4444',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      }
                    />
                  </RadioGroup>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={files.length === 0 || !metadata.title || loading}
          startIcon={<CloudUploadIcon />}
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            px: 4,
            '&:hover': {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            },
          }}
        >
          Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploader;
