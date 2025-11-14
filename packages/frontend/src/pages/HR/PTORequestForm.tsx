import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  LinearProgress,
  Stack,
  IconButton,
} from '@mui/material';
import {
  BeachAccess as BeachAccessIcon,
  LocalHospital as LocalHospitalIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarTodayIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { usePTO, PTOBalance, CreatePTORequest } from '../../hooks/usePTO';
import { useAuth } from '../../hooks/useAuth';
import { format, differenceInDays, addDays } from 'date-fns';

interface PTORequestFormProps {
  employeeId?: string;
  employeeName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PTO_TYPES = [
  { value: 'VACATION', label: 'Vacation', icon: <BeachAccessIcon />, color: '#3498DB' },
  { value: 'SICK', label: 'Sick Leave', icon: <LocalHospitalIcon />, color: '#E74C3C' },
  { value: 'PERSONAL', label: 'Personal Day', icon: <PersonIcon />, color: '#9B59B6' },
  { value: 'BEREAVEMENT', label: 'Bereavement', icon: <PersonIcon />, color: '#34495E' },
  { value: 'JURY_DUTY', label: 'Jury Duty', icon: <PersonIcon />, color: '#16A085' },
];

const PTORequestForm: React.FC<PTORequestFormProps> = ({
  employeeId: propEmployeeId,
  employeeName: propEmployeeName,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const employeeId = propEmployeeId || user?.id || '';
  const employeeName = propEmployeeName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const handleCancel = onCancel || (() => navigate('/hr/pto'));
  const { createRequest, getBalance, checkConflicts, loading } = usePTO();
  const [balance, setBalance] = useState<PTOBalance | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePTORequest>>({
    employeeId,
    type: 'VACATION',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    totalDays: 1,
    totalHours: 8,
    reason: '',
    coveragePlan: '',
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadBalance();
  }, [employeeId]);

  useEffect(() => {
    calculateDaysAndHours();
    checkForConflicts();
  }, [formData.startDate, formData.endDate]);

  const loadBalance = async () => {
    try {
      const data = await getBalance(employeeId);
      setBalance(data);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const calculateDaysAndHours = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = differenceInDays(end, start) + 1;
      const hours = days * 8;

      setFormData({
        ...formData,
        totalDays: days,
        totalHours: hours,
      });

      // Generate list of dates
      const dates: string[] = [];
      for (let i = 0; i < days; i++) {
        dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
      }
      setSelectedDates(dates);
    }
  };

  const checkForConflicts = async () => {
    if (formData.startDate && formData.endDate) {
      try {
        const result = await checkConflicts(formData.startDate, formData.endDate);
        setConflicts(result);
      } catch (error) {
        console.error('Failed to check conflicts:', error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setErrorMessage('');

      // Validate balance
      const requestType = formData.type as string;
      const balanceKey = requestType.toLowerCase() as 'vacation' | 'sick' | 'personal';
      const availableBalance = balance?.[balanceKey]?.available || 0;

      if (formData.totalDays! > availableBalance) {
        setErrorMessage(
          `Insufficient ${requestType.toLowerCase()} balance. Available: ${availableBalance} days`
        );
        return;
      }

      await createRequest(formData as CreatePTORequest);
      setSuccessMessage('PTO request submitted successfully!');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to submit PTO request');
    }
  };

  const getAvailableBalance = () => {
    if (!balance) return 0;
    const type = formData.type as string;
    const balanceKey = type.toLowerCase() as 'vacation' | 'sick' | 'personal';
    return balance[balanceKey]?.available || 0;
  };

  const getBalanceColor = () => {
    const available = getAvailableBalance();
    const requested = formData.totalDays || 0;

    if (requested > available) return '#E74C3C';
    if (available - requested < 3) return '#F39C12';
    return '#2ECC71';
  };

  const getPTOTypeConfig = (type: string) => {
    return PTO_TYPES.find((t) => t.value === type) || PTO_TYPES[0];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#2C3E50', fontWeight: 700 }}>
            Request Time Off
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {employeeName}
          </Typography>
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Balance Overview */}
        {balance && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: '2px solid #3498DB30', backgroundColor: '#3498DB10' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#3498DB', fontWeight: 600 }}>
                    <BeachAccessIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                    Vacation
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {balance.vacation.available}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    days available
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(balance.vacation.available / balance.vacation.accrued) * 100}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E0E0E0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#3498DB',
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: '2px solid #E74C3C30', backgroundColor: '#E74C3C10' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#E74C3C', fontWeight: 600 }}>
                    <LocalHospitalIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                    Sick Leave
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {balance.sick.available}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    days available
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(balance.sick.available / balance.sick.accrued) * 100}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E0E0E0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#E74C3C',
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: '2px solid #9B59B630', backgroundColor: '#9B59B610' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#9B59B6', fontWeight: 600 }}>
                    <PersonIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                    Personal
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {balance.personal.available}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    days available
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(balance.personal.available / balance.personal.accrued) * 100}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#E0E0E0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#9B59B6',
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Request Form */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <InputLabel>PTO Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="PTO Type"
              >
                {PTO_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      <Typography>{type.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Days Calculator */}
          <Grid size={{ xs: 12 }}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${getPTOTypeConfig(formData.type!).color}15 0%, ${
                  getPTOTypeConfig(formData.type!).color
                }05 100%)`,
                border: `2px solid ${getPTOTypeConfig(formData.type!).color}30`,
              }}
            >
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: getPTOTypeConfig(formData.type!).color }}>
                        {formData.totalDays}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Days Requested
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: getPTOTypeConfig(formData.type!).color }}>
                        {formData.totalHours}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Hours
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: getBalanceColor() }}>
                        {getAvailableBalance() - (formData.totalDays || 0)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Days Remaining
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {selectedDates.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Selected Dates:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                      {selectedDates.map((date) => (
                        <Chip
                          key={date}
                          label={format(new Date(date), 'MMM dd, yyyy')}
                          icon={<CalendarTodayIcon />}
                          sx={{
                            backgroundColor: getPTOTypeConfig(formData.type!).color,
                            color: 'white',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Conflicts Warning */}
          {conflicts && conflicts.hasConflicts && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Team Coverage Alert
                </Typography>
                <Typography variant="body2">
                  {conflicts.conflictCount} team member(s) already have approved PTO during this period.
                  Please ensure adequate coverage is arranged.
                </Typography>
              </Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Request"
              placeholder="Provide a brief reason for your time off request..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Coverage Plan"
              placeholder="Who will cover your responsibilities during your absence?"
              value={formData.coveragePlan}
              onChange={(e) => setFormData({ ...formData, coveragePlan: e.target.value })}
            />
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
          {onCancel && (
            <Button onClick={onCancel} startIcon={<CancelIcon />} variant="outlined">
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={loading || !formData.startDate || !formData.endDate}
            sx={{
              background: `linear-gradient(135deg, ${getPTOTypeConfig(formData.type!).color} 0%, ${
                getPTOTypeConfig(formData.type!).color
              }CC 100%)`,
              px: 4,
            }}
          >
            Submit Request
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default PTORequestForm;
