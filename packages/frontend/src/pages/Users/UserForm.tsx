import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { UserRole } from '@mentalspace/shared';

interface UserFormData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  title: string;
  role: UserRole;
  npiNumber: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiration: string;
  phoneNumber: string;
  isActive: boolean;
}

export default function UserForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    title: '',
    role: 'CLINICIAN',
    npiNumber: '',
    licenseNumber: '',
    licenseState: '',
    licenseExpiration: '',
    phoneNumber: '',
    isActive: true,
  });

  const [error, setError] = useState('');

  // Fetch user data if editing
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await axios.get(`/api/v1/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        title: userData.title || '',
        role: userData.role || 'CLINICIAN',
        npiNumber: userData.npiNumber || '',
        licenseNumber: userData.licenseNumber || '',
        licenseState: userData.licenseState || '',
        licenseExpiration: userData.licenseExpiration ? new Date(userData.licenseExpiration).toISOString().split('T')[0] : '',
        phoneNumber: userData.phoneNumber || '',
        isActive: userData.isActive ?? true,
      });
    }
  }, [userData]);

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const submitData: any = { ...data };

      // Only include licenseExpiration if it has a value
      if (data.licenseExpiration && data.licenseExpiration.trim() !== '') {
        submitData.licenseExpiration = new Date(data.licenseExpiration).toISOString();
      } else {
        // Remove the field if it's empty
        delete submitData.licenseExpiration;
      }

      const response = await axios.post('/api/v1/users', submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserFormData>) => {
      const submitData = data.licenseExpiration ? {
        ...data,
        licenseExpiration: new Date(data.licenseExpiration).toISOString(),
      } : data;
      const response = await axios.put(`/api/v1/users/${id}`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      navigate(`/users/${id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isEdit) {
      const { password, ...updateData } = formData;
      updateMutation.mutate(updateData);
    } else {
      if (!formData.password || formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      createMutation.mutate(formData);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">Loading user...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 border-2 border-indigo-200 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold mb-4"
        >
          <span className="mr-2">←</span> Back to Users
        </button>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {isEdit ? '✏️ Edit User' : '✨ Create New User'}
        </h1>
        <p className="text-gray-600 text-lg">
          {isEdit ? 'Update user information and permissions' : 'Add a new user to the system'}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center shadow-lg">
              <span className="text-2xl mr-3">⚠️</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Personal Information Section */}
          <div className="border-l-4 border-indigo-500 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">👤</span> Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-bold text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-bold text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-2">
                  Title / Credentials
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., LCSW, LMFT, Psy.D."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-bold text-gray-700 mb-2">
                  📞 Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Account Information Section */}
          <div className="border-l-4 border-purple-500 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🔐</span> Account Information
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                  📧 Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                />
              </div>

              {!isEdit && (
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                    🔑 Password *
                  </label>
                  <input
                    id="password"
                    type="password"
                    required={!isEdit}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                    minLength={8}
                  />
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    💡 Minimum 8 characters, must include uppercase, lowercase, number, and special character
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="role" className="block text-sm font-bold text-gray-700 mb-2">
                  👑 Role *
                </label>
                <select
                  id="role"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-bold"
                >
                  <option value="ADMINISTRATOR">🔴 Administrator</option>
                  <option value="SUPERVISOR">🟣 Supervisor</option>
                  <option value="CLINICIAN">🔵 Clinician</option>
                  <option value="BILLING_STAFF">🟢 Billing Staff</option>
                  <option value="FRONT_DESK">🟡 Front Desk</option>
                  <option value="ASSOCIATE">🟠 Associate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Professional Information Section */}
          <div className="border-l-4 border-cyan-500 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🏥</span> Professional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="npiNumber" className="block text-sm font-bold text-gray-700 mb-2">
                  NPI Number
                </label>
                <input
                  id="npiNumber"
                  type="text"
                  placeholder="1234567890"
                  value={formData.npiNumber}
                  onChange={(e) => setFormData({ ...formData, npiNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-bold text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  id="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label htmlFor="licenseState" className="block text-sm font-bold text-gray-700 mb-2">
                  License State
                </label>
                <input
                  id="licenseState"
                  type="text"
                  placeholder="CA"
                  maxLength={2}
                  value={formData.licenseState}
                  onChange={(e) => setFormData({ ...formData, licenseState: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium uppercase"
                />
              </div>

              <div>
                <label htmlFor="licenseExpiration" className="block text-sm font-bold text-gray-700 mb-2">
                  License Expiration
                </label>
                <input
                  id="licenseExpiration"
                  type="date"
                  value={formData.licenseExpiration}
                  onChange={(e) => setFormData({ ...formData, licenseExpiration: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="border-l-4 border-green-500 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">⚡</span> Account Status
            </h2>
            <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-6 w-6 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-4 block text-base font-bold text-gray-900">
                {formData.isActive ? (
                  <span className="text-green-700">✅ Active - User can log in and access the system</span>
                ) : (
                  <span className="text-red-700">❌ Inactive - User cannot log in</span>
                )}
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-8 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl text-base font-bold text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transform hover:scale-105 transition-all duration-200 font-bold text-base"
            >
              {createMutation.isPending || updateMutation.isPending
                ? '💾 Saving...'
                : isEdit
                ? '✅ Update User'
                : '✨ Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
