import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  alpha,
  Typography,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DriveFileMove as DriveFileMoveIcon,
  CreateNewFolder as CreateNewFolderIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocuments } from '../../hooks/useDocuments';

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  documentCount: number;
  children?: Folder[];
  createdAt: string;
}

interface FolderTreeProps {
  folders?: Folder[];
  selectedFolder?: string | null;
  onSelectFolder?: (folderId: string) => void;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  folders: propFolders,
  selectedFolder: propSelectedFolder,
  onSelectFolder: propOnSelectFolder
}) => {
  const { createFolder, fetchFolders } = useDocuments();
  const [folders, setFolders] = useState<Folder[]>(propFolders || []);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(propSelectedFolder || null);

  useEffect(() => {
    if (!propFolders) {
      const loadFolders = async () => {
        try {
          await fetchFolders();
          // fetchFolders updates the hook state internally
        } catch (err) {
          console.error('Failed to fetch folders:', err);
        }
      };
      loadFolders();
    } else {
      setFolders(propFolders);
    }
  }, [propFolders, fetchFolders]);

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolder(folderId);
    if (folderId) {
      propOnSelectFolder?.(folderId);
    }
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextFolder, setContextFolder] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);

  const handleToggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleContextMenu = (event: React.MouseEvent, folderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget as HTMLElement);
    setContextFolder(folderId);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder({
        name: newFolderName,
        parentId: parentFolderId || undefined,
      });
      setOpenDialog(false);
      setNewFolderName('');
      setParentFolderId(null);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const buildFolderTree = (folders: Folder[], parentId: string | null = null): Folder[] => {
    return folders
      .filter((f) => (parentId ? f.parentId === parentId : !f.parentId))
      .map((folder) => ({
        ...folder,
        children: buildFolderTree(folders, folder.id),
      }));
  };

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <Box key={folder.id}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ListItemButton
            selected={isSelected}
            onClick={() => handleSelectFolder(folder.id)}
            sx={{
              pl: 2 + level * 2,
              borderRadius: 2,
              mb: 0.5,
              bgcolor: isSelected ? alpha('#10b981', 0.1) : 'transparent',
              '&.Mui-selected': {
                bgcolor: alpha('#10b981', 0.1),
                '&:hover': {
                  bgcolor: alpha('#10b981', 0.15),
                },
              },
              '&:hover': {
                bgcolor: alpha('#10b981', 0.05),
              },
            }}
          >
            {hasChildren && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(folder.id);
                }}
                sx={{ mr: 0.5 }}
              >
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            )}

            <ListItemIcon sx={{ minWidth: 40 }}>
              {isExpanded ? (
                <FolderOpenIcon sx={{ color: '#10b981' }} />
              ) : (
                <FolderIcon sx={{ color: '#10b981' }} />
              )}
            </ListItemIcon>

            <ListItemText
              primary={folder.name}
              primaryTypographyProps={{
                fontWeight: isSelected ? 600 : 500,
                fontSize: '0.9rem',
              }}
            />

            {folder.documentCount > 0 && (
              <Badge
                badgeContent={folder.documentCount}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: isSelected ? '#10b981' : alpha('#10b981', 0.2),
                    color: isSelected ? 'white' : '#10b981',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  },
                }}
              />
            )}

            <IconButton
              size="small"
              onClick={(e) => handleContextMenu(e, folder.id)}
              sx={{
                ml: 1,
                opacity: 0,
                '.MuiListItemButton-root:hover &': {
                  opacity: 1,
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        </motion.div>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <AnimatePresence>
              {folder.children?.map((child) => renderFolder(child, level + 1))}
            </AnimatePresence>
          </Collapse>
        )}
      </Box>
    );
  };

  const folderTree = buildFolderTree(folders);

  return (
    <Box>
      <Button
        fullWidth
        startIcon={<CreateNewFolderIcon />}
        onClick={() => {
          setParentFolderId(null);
          setOpenDialog(true);
        }}
        sx={{
          mb: 2,
          justifyContent: 'flex-start',
          color: '#10b981',
          fontWeight: 600,
          '&:hover': {
            bgcolor: alpha('#10b981', 0.05),
          },
        }}
      >
        New Folder
      </Button>

      <List sx={{ p: 0 }}>
        {/* Root/All Documents */}
        <ListItemButton
          selected={selectedFolder === null}
          onClick={() => handleSelectFolder(null)}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            bgcolor: selectedFolder === null ? alpha('#10b981', 0.1) : 'transparent',
            '&.Mui-selected': {
              bgcolor: alpha('#10b981', 0.1),
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <FolderIcon sx={{ color: '#10b981' }} />
          </ListItemIcon>
          <ListItemText
            primary="All Documents"
            primaryTypographyProps={{
              fontWeight: selectedFolder === null ? 600 : 500,
              fontSize: '0.9rem',
            }}
          />
          <Badge
            badgeContent={folders.reduce((acc, f) => acc + f.documentCount, 0)}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: selectedFolder === null ? '#10b981' : alpha('#10b981', 0.2),
                color: selectedFolder === null ? 'white' : '#10b981',
                fontWeight: 600,
                fontSize: '0.7rem',
              },
            }}
          />
        </ListItemButton>

        {folderTree.map((folder) => renderFolder(folder))}
      </List>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setParentFolderId(contextFolder);
            setOpenDialog(true);
            setAnchorEl(null);
          }}
        >
          <CreateNewFolderIcon sx={{ mr: 1, fontSize: 18 }} />
          New Subfolder
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <DriveFileMoveIcon sx={{ mr: 1, fontSize: 18 }} />
          Move
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: '#ef4444' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Folder Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
          }}
        >
          Create New Folder
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
          />
          {parentFolderId && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#10b981', 0.05), borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Parent Folder: {folders.find((f) => f.id === parentFolderId)?.name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              },
            }}
          >
            Create Folder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FolderTree;
