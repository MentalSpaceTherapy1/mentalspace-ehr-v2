import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface GroupSession {
  id: string;
  groupName: string;
  description?: string;
  facilitatorId: string;
  coFacilitatorId?: string;
  maxCapacity: number;
  currentEnrollment: number;
  groupType: string;
  isOpenEnrollment: boolean;
  requiresScreening: boolean;
  isTelehealthAvailable: boolean;
  appointmentTypeId: string;
  recurringPattern?: string;
  dayOfWeek?: number;
  startTime?: string;
  duration?: number;
  billingType: string;
  ratePerMember?: number;
  status: string;
  startDate: string;
  endDate?: string;
  facilitator?: any;
  coFacilitator?: any;
  appointmentType?: any;
  _count?: {
    members: number;
    sessions: number;
  };
}

export default function GroupSessionsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSession[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupSession | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');

  const [formData, setFormData] = useState({
    groupName: '',
    description: '',
    facilitatorId: '',
    coFacilitatorId: '',
    maxCapacity: 12,
    groupType: 'THERAPY',
    isOpenEnrollment: false,
    requiresScreening: true,
    isTelehealthAvailable: false,
    appointmentTypeId: '',
    recurringPattern: 'WEEKLY',
    dayOfWeek: 1,
    startTime: '10:00',
    duration: 90,
    billingType: 'PER_MEMBER',
    ratePerMember: 0,
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, usersRes, typesRes] = await Promise.all([
        api.get('/group-sessions', {
          params: { status: filterStatus !== 'ALL' ? filterStatus : undefined },
        }),
        api.get('/users?role=CLINICIAN'),
        api.get('/appointment-types/category/GROUP'),
      ]);

      setGroups(groupsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setAppointmentTypes(typesRes.data.data || []);
    } catch (error: any) {
      setErrorMessage('Failed to load group sessions');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (group?: GroupSession) => {
    if (group) {
      setSelectedGroup(group);
      setFormData({
        groupName: group.groupName,
        description: group.description || '',
        facilitatorId: group.facilitatorId,
        coFacilitatorId: group.coFacilitatorId || '',
        maxCapacity: group.maxCapacity,
        groupType: group.groupType,
        isOpenEnrollment: group.isOpenEnrollment,
        requiresScreening: group.requiresScreening,
        isTelehealthAvailable: group.isTelehealthAvailable || false,
        appointmentTypeId: group.appointmentTypeId,
        recurringPattern: group.recurringPattern || 'WEEKLY',
        dayOfWeek: group.dayOfWeek || 1,
        startTime: group.startTime || '10:00',
        duration: group.duration || 90,
        billingType: group.billingType,
        ratePerMember: group.ratePerMember || 0,
        status: group.status,
        startDate: group.startDate.split('T')[0],
        endDate: group.endDate ? group.endDate.split('T')[0] : '',
      });
    } else {
      setSelectedGroup(null);
      setFormData({
        groupName: '',
        description: '',
        facilitatorId: '',
        coFacilitatorId: '',
        maxCapacity: 12,
        groupType: 'THERAPY',
        isOpenEnrollment: false,
        requiresScreening: true,
        isTelehealthAvailable: false,
        appointmentTypeId: '',
        recurringPattern: 'WEEKLY',
        dayOfWeek: 1,
        startTime: '10:00',
        duration: 90,
        billingType: 'PER_MEMBER',
        ratePerMember: 0,
        status: 'ACTIVE',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage('');

      const payload = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        coFacilitatorId: formData.coFacilitatorId || undefined,
      };

      if (selectedGroup?.id) {
        await api.put(`/group-sessions/${selectedGroup.id}`, payload);
        setSuccessMessage('Group session updated successfully');
      } else {
        await api.post('/group-sessions', payload);
        setSuccessMessage('Group session created successfully');
      }

      handleCloseDialog();
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save group session');
      console.error('Error saving group:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    try {
      await api.delete(`/group-sessions/${groupToDelete}`);
      setSuccessMessage('Group session deleted successfully');
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to delete group session');
      console.error('Error deleting group:', error);
    }
  };

  const handleViewGroup = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FULL':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CLOSED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'THERAPY':
        return 'Group Therapy';
      case 'SUPPORT':
        return 'Support Group';
      case 'EDUCATION':
        return 'Psychoeducation';
      case 'SKILLS':
        return 'Skills Training';
      default:
        return type;
    }
  };

  const dayOfWeekOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Group Sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent flex items-center">
            <span className="mr-3">👥</span> Group Sessions
          </h1>
          <button
            onClick={() => handleOpenDialog()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-semibold flex items-center"
          >
            <span className="mr-2 text-xl">➕</span> Create Group
          </button>
        </div>
        <p className="text-gray-600 text-lg">Manage group therapy sessions and enrollment</p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <p className="text-red-800 font-semibold">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-600 hover:text-red-800">
            <span className="text-xl">✖</span>
          </button>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-green-800 font-semibold">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
            <span className="text-xl">✖</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-semibold text-gray-700">Status Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border-2 border-cyan-200 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
          >
            <option value="ALL">All Groups</option>
            <option value="ACTIVE">Active</option>
            <option value="FULL">Full</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">No Group Sessions Found</h3>
          <p className="text-gray-500 mb-6">Create your first group session to get started</p>
          <button
            onClick={() => handleOpenDialog()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            Create Group Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-cyan-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-800">{group.groupName}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(
                        group.status
                      )}`}
                    >
                      {group.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border-2 border-purple-200">
                      {getGroupTypeLabel(group.groupType)}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-gray-600 mb-3">{group.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Facilitator */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">👨‍🏫 Facilitator</p>
                  <p className="text-sm font-bold text-blue-700">
                    {group.facilitator
                      ? `${group.facilitator.firstName} ${group.facilitator.lastName}`
                      : 'N/A'}
                  </p>
                  {group.coFacilitator && (
                    <p className="text-xs text-blue-600 mt-1">
                      Co-fac: {group.coFacilitator.firstName} {group.coFacilitator.lastName}
                    </p>
                  )}
                </div>

                {/* Enrollment */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">📊 Enrollment</p>
                  <p className="text-2xl font-bold text-green-700">
                    {group.currentEnrollment} / {group.maxCapacity}
                  </p>
                </div>

                {/* Schedule */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">📅 Schedule</p>
                  {group.recurringPattern && group.startTime ? (
                    <>
                      <p className="text-sm font-bold text-purple-700">
                        {group.recurringPattern === 'WEEKLY' ? 'Weekly' : 'Bi-weekly'}
                      </p>
                      <p className="text-xs text-purple-600">
                        {dayOfWeekOptions.find((d) => d.value === group.dayOfWeek)?.label} at{' '}
                        {group.startTime}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Not scheduled</p>
                  )}
                </div>

                {/* Billing */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">💰 Billing</p>
                  <p className="text-sm font-bold text-amber-700">
                    {group.billingType === 'PER_MEMBER' ? 'Per Member' : 'Flat Rate'}
                  </p>
                  {group.ratePerMember && (
                    <p className="text-xs text-amber-600">${group.ratePerMember.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t-2 border-gray-100">
                <button
                  onClick={() => handleViewGroup(group.id)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center"
                >
                  <span className="mr-2">👁️</span> View Details
                </button>
                <button
                  onClick={() => handleOpenDialog(group)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center"
                >
                  <span className="mr-2">✏️</span> Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(group.id)}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center"
                >
                  <span className="mr-2">🗑️</span> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">
                {selectedGroup ? 'Edit Group Session' : 'Create Group Session'}
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    rows={2}
                  />
                </div>

                {/* Group Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Group Type *
                  </label>
                  <select
                    value={formData.groupType}
                    onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    required
                  >
                    <option value="THERAPY">Group Therapy</option>
                    <option value="SUPPORT">Support Group</option>
                    <option value="EDUCATION">Psychoeducation</option>
                    <option value="SKILLS">Skills Training</option>
                  </select>
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Appointment Type *
                  </label>
                  <select
                    value={formData.appointmentTypeId}
                    onChange={(e) => setFormData({ ...formData, appointmentTypeId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    required
                  >
                    <option value="">Select Type</option>
                    {appointmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.typeName} {type.cptCode ? `(${type.cptCode})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Facilitator */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facilitator *
                  </label>
                  <select
                    value={formData.facilitatorId}
                    onChange={(e) => setFormData({ ...formData, facilitatorId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    required
                  >
                    <option value="">Select Facilitator</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} {user.title ? `(${user.title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Co-Facilitator */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Co-Facilitator (Optional)
                  </label>
                  <select
                    value={formData.coFacilitatorId}
                    onChange={(e) => setFormData({ ...formData, coFacilitatorId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  >
                    <option value="">None</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} {user.title ? `(${user.title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Capacity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Capacity *
                  </label>
                  <input
                    type="number"
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    min={1}
                    max={50}
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="FULL">Full</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                {/* Schedule Section */}
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">📅</span> Schedule
                  </h3>
                </div>

                {/* Recurring Pattern */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Recurring Pattern
                  </label>
                  <select
                    value={formData.recurringPattern}
                    onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-weekly</option>
                  </select>
                </div>

                {/* Day of Week */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  >
                    {dayOfWeekOptions.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    min={15}
                    step={15}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  />
                </div>

                {/* Billing Section */}
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">💰</span> Billing
                  </h3>
                </div>

                {/* Billing Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Type</label>
                  <select
                    value={formData.billingType}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                  >
                    <option value="PER_MEMBER">Per Member</option>
                    <option value="FLAT_RATE">Flat Rate</option>
                  </select>
                </div>

                {/* Rate Per Member */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rate Per Member
                  </label>
                  <input
                    type="number"
                    value={formData.ratePerMember}
                    onChange={(e) =>
                      setFormData({ ...formData, ratePerMember: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all"
                    min={0}
                    step={0.01}
                  />
                </div>

                {/* Switches */}
                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isOpenEnrollment}
                      onChange={(e) =>
                        setFormData({ ...formData, isOpenEnrollment: e.target.checked })
                      }
                      className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Open Enrollment</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresScreening}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresScreening: e.target.checked })
                      }
                      className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Requires Screening</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTelehealthAvailable}
                      onChange={(e) =>
                        setFormData({ ...formData, isTelehealthAvailable: e.target.checked })
                      }
                      className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Telehealth Available</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3 border-t-2 border-gray-200">
              <button
                onClick={handleCloseDialog}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-2">⚠️</span> Delete Group Session
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete this group session? If it has active members, it will
                be archived instead of deleted.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3 border-t-2 border-gray-200">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
