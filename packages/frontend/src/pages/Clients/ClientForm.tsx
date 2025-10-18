import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  PRONOUNS_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  RELIGION_OPTIONS,
  PRIMARY_LANGUAGE_OPTIONS,
  US_STATES,
} from '../../constants/clientFormOptions';

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch client data for editing
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: isEditMode,
  });

  // Fetch available therapists
  const { data: therapistsData } = useQuery({
    queryKey: ['therapists'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/users?role=CLINICIAN', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  const therapists = therapistsData || [];

  // Form state
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    preferredName: '',
    pronouns: '',
    dateOfBirth: '',

    // Contact Information
    primaryPhone: '',
    primaryPhoneType: 'Mobile',
    secondaryPhone: '',
    secondaryPhoneType: 'Home',
    email: '',
    preferredContactMethod: 'Phone',
    okayToLeaveMessage: true,

    // Address
    addressStreet1: '',
    addressStreet2: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
    addressCounty: '',

    // Demographics
    gender: 'PREFER_NOT_TO_SAY',
    genderIdentity: '',
    sexualOrientation: '',
    religion: '',
    maritalStatus: 'SINGLE',
    race: [] as string[],
    ethnicity: '',
    primaryLanguage: 'English',
    otherLanguages: [] as string[],
    needsInterpreter: false,
    interpreterLanguage: '',

    // Assignment
    primaryTherapistId: '',
    secondaryTherapist1Id: '',
    secondaryTherapist2Id: '',
    secondaryTherapist3Id: '',
    psychiatristId: '',
    caseManagerId: '',

    // Social Information
    education: '',
    employmentStatus: '',
    occupation: '',
    livingArrangement: '',
    housingStatus: '',

    // Legal/Guardian (deprecated - will use separate guardian table)
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
  });

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} years old` : '';
  };

  // Load client data when editing
  useEffect(() => {
    if (clientData) {
      setFormData({
        firstName: clientData.firstName || '',
        middleName: clientData.middleName || '',
        lastName: clientData.lastName || '',
        suffix: clientData.suffix || '',
        preferredName: clientData.preferredName || '',
        pronouns: clientData.pronouns || '',
        dateOfBirth: clientData.dateOfBirth ? new Date(clientData.dateOfBirth).toISOString().split('T')[0] : '',
        primaryPhone: clientData.primaryPhone || '',
        primaryPhoneType: clientData.primaryPhoneType || 'Mobile',
        secondaryPhone: clientData.secondaryPhone || '',
        secondaryPhoneType: clientData.secondaryPhoneType || 'Home',
        email: clientData.email || '',
        preferredContactMethod: clientData.preferredContactMethod || 'Phone',
        okayToLeaveMessage: clientData.okayToLeaveMessage ?? true,
        addressStreet1: clientData.addressStreet1 || '',
        addressStreet2: clientData.addressStreet2 || '',
        addressCity: clientData.addressCity || '',
        addressState: clientData.addressState || '',
        addressZipCode: clientData.addressZipCode || '',
        addressCounty: clientData.addressCounty || '',
        gender: clientData.gender || 'PREFER_NOT_TO_SAY',
        genderIdentity: clientData.genderIdentity || '',
        sexualOrientation: clientData.sexualOrientation || '',
        religion: clientData.religion || '',
        maritalStatus: clientData.maritalStatus || 'SINGLE',
        race: clientData.race || [],
        ethnicity: clientData.ethnicity || '',
        primaryLanguage: clientData.primaryLanguage || 'English',
        otherLanguages: clientData.otherLanguages || [],
        needsInterpreter: clientData.needsInterpreter || false,
        interpreterLanguage: clientData.interpreterLanguage || '',
        primaryTherapistId: clientData.primaryTherapistId || '',
        secondaryTherapist1Id: clientData.secondaryTherapist1Id || '',
        secondaryTherapist2Id: clientData.secondaryTherapist2Id || '',
        secondaryTherapist3Id: clientData.secondaryTherapist3Id || '',
        psychiatristId: clientData.psychiatristId || '',
        caseManagerId: clientData.caseManagerId || '',
        education: clientData.education || '',
        employmentStatus: clientData.employmentStatus || '',
        occupation: clientData.occupation || '',
        livingArrangement: clientData.livingArrangement || '',
        housingStatus: clientData.housingStatus || '',
        guardianName: clientData.guardianName || '',
        guardianPhone: clientData.guardianPhone || '',
        guardianRelationship: clientData.guardianRelationship || '',
      });
    }
  }, [clientData]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const url = isEditMode ? `/clients/${id}` : '/clients';
      const method = isEditMode ? 'patch' : 'post';

      // Convert dateOfBirth to ISO string
      const submitData: any = {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      };

      // Remove empty string values for optional UUID fields
      const optionalUUIDFields = [
        'secondaryTherapist1Id',
        'secondaryTherapist2Id',
        'secondaryTherapist3Id',
        'psychiatristId',
        'caseManagerId',
      ];

      optionalUUIDFields.forEach(field => {
        if (submitData[field] === '') {
          delete submitData[field];
        }
      });

      const response = await axios[method](url, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSuccessMessage(isEditMode ? 'Client updated successfully!' : 'Client created successfully!');
      setErrorMessage('');
      setTimeout(() => {
        navigate('/clients');
      }, 1500);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to save client');
      setSuccessMessage('');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleRaceChange = (race: string) => {
    setFormData(prev => ({
      ...prev,
      race: prev.race.includes(race)
        ? prev.race.filter(r => r !== race)
        : [...prev.race, race],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Client...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="mr-3">{isEditMode ? '✏️' : '➕'}</span>
          {isEditMode ? 'Edit Client' : 'Add New Client'}
        </h1>
        <p className="text-gray-600 text-lg">
          {isEditMode ? 'Update client information' : 'Enter comprehensive client demographics and information'}
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg flex items-center">
          <span className="text-2xl mr-3">✓</span>
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl shadow-lg flex items-center">
          <span className="text-2xl mr-3">⚠</span>
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">👤</span> Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Suffix</label>
                <input
                  type="text"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  placeholder="Jr., Sr., III"
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Preferred Name</label>
                <input
                  type="text"
                  name="preferredName"
                  value={formData.preferredName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pronouns</label>
                <select
                  name="pronouns"
                  value={formData.pronouns}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Pronouns</option>
                  {PRONOUNS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 font-medium"
                />
                {formData.dateOfBirth && (
                  <p className="mt-2 text-sm font-semibold text-indigo-600">
                    Age: {calculateAge(formData.dateOfBirth)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-purple-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📱</span> Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="primaryPhone"
                  value={formData.primaryPhone}
                  onChange={handleChange}
                  required
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Primary Phone Type</label>
                <select
                  name="primaryPhoneType"
                  value={formData.primaryPhoneType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                >
                  <option value="Mobile">Mobile</option>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Phone</label>
                <input
                  type="tel"
                  name="secondaryPhone"
                  value={formData.secondaryPhone}
                  onChange={handleChange}
                  placeholder="(555) 987-6543"
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Phone Type</label>
                <select
                  name="secondaryPhoneType"
                  value={formData.secondaryPhoneType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                >
                  <option value="Mobile">Mobile</option>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="client@example.com"
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Preferred Contact Method</label>
                <select
                  name="preferredContactMethod"
                  value={formData.preferredContactMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all duration-200 font-medium"
                >
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Text">Text/SMS</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="okayToLeaveMessage"
                    checked={formData.okayToLeaveMessage}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 border-2 border-purple-300 rounded focus:ring-4 focus:ring-purple-300"
                  />
                  <span className="text-sm font-bold text-gray-700">Okay to leave voicemail messages</span>
                </label>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-cyan-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🏠</span> Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressStreet1"
                  value={formData.addressStreet1}
                  onChange={handleChange}
                  required
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Address Line 2</label>
                <input
                  type="text"
                  name="addressStreet2"
                  value={formData.addressStreet2}
                  onChange={handleChange}
                  placeholder="Apt, Suite, Unit, etc."
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressCity"
                  value={formData.addressCity}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  name="addressState"
                  value={formData.addressState}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select State</option>
                  {US_STATES.map(state => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressZipCode"
                  value={formData.addressZipCode}
                  onChange={handleChange}
                  required
                  placeholder="12345"
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">County</label>
                <input
                  type="text"
                  name="addressCounty"
                  value={formData.addressCounty}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-pink-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📊</span> Demographics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Legal Sex</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="NON_BINARY">Non-Binary</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer Not to Say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Gender Identity</label>
                <select
                  name="genderIdentity"
                  value={formData.genderIdentity}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Gender Identity</option>
                  {GENDER_IDENTITY_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Sexual Orientation</label>
                <select
                  name="sexualOrientation"
                  value={formData.sexualOrientation}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Sexual Orientation</option>
                  {SEXUAL_ORIENTATION_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Religion</label>
                <select
                  name="religion"
                  value={formData.religion}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Religion</option>
                  {RELIGION_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Marital Status</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="SEPARATED">Separated</option>
                  <option value="DOMESTIC_PARTNERSHIP">Domestic Partnership</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ethnicity</label>
                <select
                  name="ethnicity"
                  value={formData.ethnicity}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Ethnicity</option>
                  <option value="Hispanic or Latino">Hispanic or Latino</option>
                  <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                  <option value="Prefer Not to Say">Prefer Not to Say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Primary Language</label>
                <select
                  name="primaryLanguage"
                  value={formData.primaryLanguage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                >
                  {PRIMARY_LANGUAGE_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="needsInterpreter"
                    checked={formData.needsInterpreter}
                    onChange={handleChange}
                    className="w-5 h-5 text-pink-600 border-2 border-pink-300 rounded focus:ring-4 focus:ring-pink-300"
                  />
                  <span className="text-sm font-bold text-gray-700">Client needs interpreter services</span>
                </label>
              </div>

              {formData.needsInterpreter && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Interpreter Language</label>
                  <input
                    type="text"
                    name="interpreterLanguage"
                    value={formData.interpreterLanguage}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all duration-200 font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-green-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">👨‍⚕️</span> Clinical Assignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Primary Therapist <span className="text-red-500">*</span>
                </label>
                <select
                  name="primaryTherapistId"
                  value={formData.primaryTherapistId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Therapist</option>
                  {therapists.map((therapist: any) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.firstName} {therapist.lastName}, {therapist.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Therapist 1</label>
                <select
                  name="secondaryTherapist1Id"
                  value={formData.secondaryTherapist1Id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Therapist (Optional)</option>
                  {therapists.map((therapist: any) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.firstName} {therapist.lastName}, {therapist.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Therapist 2</label>
                <select
                  name="secondaryTherapist2Id"
                  value={formData.secondaryTherapist2Id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Therapist (Optional)</option>
                  {therapists.map((therapist: any) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.firstName} {therapist.lastName}, {therapist.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Therapist 3</label>
                <select
                  name="secondaryTherapist3Id"
                  value={formData.secondaryTherapist3Id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Therapist (Optional)</option>
                  {therapists.map((therapist: any) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.firstName} {therapist.lastName}, {therapist.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Psychiatrist</label>
                <select
                  name="psychiatristId"
                  value={formData.psychiatristId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Psychiatrist (Optional)</option>
                  {therapists.map((therapist: any) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.firstName} {therapist.lastName}, {therapist.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Case Manager</label>
                <select
                  name="caseManagerId"
                  value={formData.caseManagerId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all duration-200 font-medium"
                >
                  <option value="">Select Case Manager (Optional)</option>
                  {therapists.map((therapist: any) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.firstName} {therapist.lastName}, {therapist.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Social Information */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-amber-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🏢</span> Social Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Education Level</label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="High School, Bachelor's, etc."
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Employment Status</label>
                <input
                  type="text"
                  name="employmentStatus"
                  value={formData.employmentStatus}
                  onChange={handleChange}
                  placeholder="Employed, Unemployed, Student, etc."
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Living Arrangement</label>
                <input
                  type="text"
                  name="livingArrangement"
                  value={formData.livingArrangement}
                  onChange={handleChange}
                  placeholder="Alone, With Family, etc."
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Housing Status</label>
                <input
                  type="text"
                  name="housingStatus"
                  value={formData.housingStatus}
                  onChange={handleChange}
                  placeholder="Own, Rent, Homeless, etc."
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-400 transition-all duration-200 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-rose-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">⚖️</span> Legal Guardian (if applicable)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Guardian Name</label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Guardian Phone</label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border-2 border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Relationship</label>
                <input
                  type="text"
                  name="guardianRelationship"
                  value={formData.guardianRelationship}
                  onChange={handleChange}
                  placeholder="Parent, Spouse, etc."
                  className="w-full px-4 py-3 border-2 border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-300 focus:border-rose-400 transition-all duration-200 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <span className="mr-2">💾</span>
                  {isEditMode ? 'Update Client' : 'Create Client'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
