import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Badge,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Schedule as ScheduleIcon,
  FileDownload as FileDownloadIcon,
  FilterList as FilterListIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useModule9Reports } from '../../hooks/useModule9Reports';
import { format } from 'date-fns';

const Module9ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { reports, favoriteReports, recentReports, toggleFavorite, loadRecentReports } = useModule9Reports();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const categories = ['All', 'Compliance', 'Safety', 'HR', 'Financial', 'Portal'];

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || report.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteReportsList = reports.filter(r => favoriteReports.includes(r.id));

  const handleExportAll = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleExport = (format: string) => {
    console.log('Exporting all data as:', format);
    handleCloseMenu();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              📊 Module 9 Reports & Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive reporting across all organizational systems
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => loadRecentReports()} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => navigate('/reports/schedules')}
            >
              Schedule Reports
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportAll}
            >
              Export All Data
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/reports/builder')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                }
              }}
            >
              Create Custom Report
            </Button>
          </Box>
        </Box>

        {/* Search and Filter */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {categories.map(category => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Favorite Reports */}
      {favoriteReportsList.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StarIcon sx={{ color: '#F59E0B' }} />
            Favorite Reports
          </Typography>
          <Grid container spacing={3}>
            {favoriteReportsList.map(report => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={report.id}>
                <ReportCard
                  report={report}
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(report.id)}
                  onClick={() => navigate(`/reports/${report.id}`)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* All Reports */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          All Reports ({filteredReports.length})
        </Typography>
        <Grid container spacing={3}>
          {filteredReports.map(report => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={report.id}>
              <ReportCard
                report={report}
                isFavorite={favoriteReports.includes(report.id)}
                onToggleFavorite={() => toggleFavorite(report.id)}
                onClick={() => navigate(`/reports/${report.id}`)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon />
            Recently Generated
          </Typography>
          <Grid container spacing={2}>
            {recentReports.slice(0, 6).map(report => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={report.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => navigate(`/reports/view/${report.id}`)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {report.title}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip label={report.category} size="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(report.generatedAt), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {report.summary.totalRecords} records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Export Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>📄</ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>📊</ListItemIcon>
          <ListItemText>Export as Excel</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>📋</ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

interface ReportCardProps {
  report: any;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, isFavorite, onToggleFavorite, onClick }) => {
  return (
    <Card
      sx={{
        cursor: 'pointer',
        height: '100%',
        position: 'relative',
        transition: 'all 0.3s',
        background: `linear-gradient(135deg, ${alpha(report.color, 0.1)} 0%, ${alpha(report.color, 0.05)} 100%)`,
        border: `2px solid ${alpha(report.color, 0.2)}`,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 12px 24px ${alpha(report.color, 0.3)}`,
          border: `2px solid ${report.color}`,
        }
      }}
    >
      <CardContent onClick={onClick}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${report.color} 0%, ${alpha(report.color, 0.7)} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}
          >
            {report.icon}
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            sx={{ color: isFavorite ? '#F59E0B' : 'text.secondary' }}
          >
            {isFavorite ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {report.name}
        </Typography>

        <Chip
          label={report.category}
          size="small"
          sx={{
            mb: 1,
            backgroundColor: alpha(report.color, 0.2),
            color: report.color,
            fontWeight: 600
          }}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {report.description}
        </Typography>

        {report.lastRun && (
          <Typography variant="caption" color="text.secondary">
            Last run: {format(new Date(report.lastRun), 'MMM dd, yyyy')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default Module9ReportsDashboard;
