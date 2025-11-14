import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  alpha
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
  TableChart as TableChartIcon,
  PieChart as PieChartIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useModule9Reports, ReportData } from '../../hooks/useModule9Reports';
import dayjs, { Dayjs } from 'dayjs';
import { format } from 'date-fns';
import ExportDialog from './ExportDialog';

const ReportViewer: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { generateReport, loading, error } = useModule9Reports();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(30, 'day'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId, startDate, endDate]);

  const loadReport = async () => {
    if (!reportId) return;

    try {
      const data = await generateReport(
        reportId,
        [],
        {
          startDate: startDate?.toISOString() || '',
          endDate: endDate?.toISOString() || ''
        }
      );
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  };

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleShare = (event: React.MouseEvent<HTMLElement>) => {
    setShareAnchorEl(event.currentTarget);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderChart = (chart: any) => {
    const colors = chart.colors || ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chart.yKey || 'value'} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={chart.yKey || 'value'} stroke={colors[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={chart.type === 'donut' ? 60 : 0}
                outerRadius={80}
                label
              >
                {chart.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={chart.yKey || 'value'} stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={() => navigate('/reports')}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {reportData.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip label={reportData.category} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Generated: {format(new Date(reportData.generatedAt), 'PPpp')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
              >
                Print
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
              >
                Share
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Box>
          </Box>

          {/* Date Range Picker */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(date) => setStartDate(date)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Typography>to</Typography>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(date) => setEndDate(date)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button variant="outlined" onClick={loadReport}>
              Apply
            </Button>
          </Box>
        </Box>

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {reportData.summary.totalRecords.toLocaleString()}
                </Typography>
                <Typography variant="body2">Total Records</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {reportData.summary.filteredRecords.toLocaleString()}
                </Typography>
                <Typography variant="body2">Filtered Records</Typography>
              </CardContent>
            </Card>
          </Grid>
          {Object.entries(reportData.summary.metrics).slice(0, 2).map(([key, value]: [string, any], index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={key}>
              <Card
                sx={{
                  background: index === 0
                    ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                    : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white'
                }}
              >
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </Typography>
                  <Typography variant="body2">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab icon={<BarChartIcon />} label="Charts" />
            <Tab icon={<TableChartIcon />} label="Data Table" />
            <Tab icon={<AssessmentIcon />} label="Summary" />
          </Tabs>
        </Paper>

        {/* Charts Tab */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {reportData.charts.map((chart) => (
              <Grid size={{ xs: 12, md: 6 }} key={chart.id}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {chart.title}
                  </Typography>
                  {renderChart(chart)}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Data Table Tab */}
        {activeTab === 1 && (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {reportData.data.length > 0 && Object.keys(reportData.data[0]).map((key) => (
                      <TableCell key={key} sx={{ fontWeight: 600 }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {typeof value === 'object' ? JSON.stringify(value) : value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={reportData.data.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </Paper>
        )}

        {/* Summary Tab */}
        {activeTab === 2 && (
          <Paper sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Report Summary
            </Typography>
            <Grid container spacing={3}>
              {Object.entries(reportData.summary.metrics).map(([key, value]: [string, any]) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary" sx={{ mb: 1, fontWeight: 700 }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Share Menu */}
        <Menu
          anchorEl={shareAnchorEl}
          open={Boolean(shareAnchorEl)}
          onClose={() => setShareAnchorEl(null)}
        >
          <MenuItem onClick={() => setShareAnchorEl(null)}>
            <ListItemIcon>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText>Email Report</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setShareAnchorEl(null)}>
            <ListItemIcon>
              <ShareIcon />
            </ListItemIcon>
            <ListItemText>Copy Link</ListItemText>
          </MenuItem>
        </Menu>

        {/* Export Dialog */}
        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          reportId={reportData.id}
          reportTitle={reportData.title}
        />
      </Container>
    </LocalizationProvider>
  );
};

export default ReportViewer;
