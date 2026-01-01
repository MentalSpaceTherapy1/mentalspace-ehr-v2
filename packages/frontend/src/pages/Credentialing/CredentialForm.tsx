import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield,
  Save,
  X,
  Upload,
  FileText,
  Calendar,
  Award,
  Building,
  Hash,
  AlertCircle,
  Check,
  User,
  Bell,
  Trash2,
} from 'lucide-react';
import {
  useCredential,
  useCreateCredential,
  useUpdateCredential,
  useUploadDocument,
} from '../../hooks/useCredentialing';

export default function CredentialForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: existingCredential } = useCredential(id || '');
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const uploadDocument = useUploadDocument();

  const [formData, setFormData] = useState({
    staffId: existingCredential?.staffId || '',
    staffName: existingCredential?.staffName || '',
    type: existingCredential?.type || 'LICENSE',
    credentialNumber: existingCredential?.credentialNumber || '',
    issuingAuthority: existingCredential?.issuingAuthority || '',
    issueDate: existingCredential?.issueDate || '',
    expirationDate: existingCredential?.expirationDate || '',
    alertThresholdDays: existingCredential?.alertThresholdDays || 30,
    notes: existingCredential?.notes || '',
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and image files are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.staffName.trim()) newErrors.staffName = 'Staff name is required';
    if (!formData.credentialNumber.trim()) newErrors.credentialNumber = 'Credential number is required';
    if (!formData.issuingAuthority.trim()) newErrors.issuingAuthority = 'Issuing authority is required';
    if (!formData.issueDate) newErrors.issueDate = 'Issue date is required';
    if (!formData.expirationDate) newErrors.expirationDate = 'Expiration date is required';

    // Validate dates
    if (formData.issueDate && formData.expirationDate) {
      const issue = new Date(formData.issueDate);
      const expiration = new Date(formData.expirationDate);
      if (expiration <= issue) {
        newErrors.expirationDate = 'Expiration date must be after issue date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      let credentialId: string;

      if (isEdit && id) {
        await updateCredential.mutateAsync({ id, data: formData });
        credentialId = id;
      } else {
        const result = await createCredential.mutateAsync(formData);
        credentialId = result.id;
      }

      // Upload document if provided
      if (uploadedFile) {
        await uploadDocument.mutateAsync({ credentialId, file: uploadedFile });
      }

      navigate('/credentialing/list');
    } catch (error) {
      toast.error('Failed to save credential');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Shield className="w-12 h-12 text-purple-600 mr-4" />
          {isEdit ? 'Edit Credential' : 'Add New Credential'}
        </h1>
        <p className="text-gray-600 text-lg">
          {isEdit ? 'Update credential information' : 'Register a new license or certification'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <User className="w-7 h-7 text-purple-600 mr-3" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Staff Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Staff Member Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.staffName}
                  onChange={(e) => handleChange('staffName', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-purple-500 transition-all ${
                    errors.staffName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Dr. John Smith"
                />
              </div>
              {errors.staffName && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.staffName}
                </p>
              )}
            </div>

            {/* Credential Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Credential Type *
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all appearance-none bg-white"
                >
                  <option value="LICENSE">License</option>
                  <option value="CERTIFICATION">Certification</option>
                  <option value="DEA">DEA Registration</option>
                  <option value="NPI">NPI Number</option>
                  <option value="INSURANCE">Insurance Credential</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Credential Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Credential Number *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.credentialNumber}
                  onChange={(e) => handleChange('credentialNumber', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-purple-500 transition-all ${
                    errors.credentialNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ABC123456"
                />
              </div>
              {errors.credentialNumber && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.credentialNumber}
                </p>
              )}
            </div>

            {/* Issuing Authority */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Issuing Authority *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.issuingAuthority}
                  onChange={(e) => handleChange('issuingAuthority', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-purple-500 transition-all ${
                    errors.issuingAuthority ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="State Medical Board"
                />
              </div>
              {errors.issuingAuthority && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.issuingAuthority}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-7 h-7 text-blue-600 mr-3" />
            Important Dates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Issue Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Issue Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleChange('issueDate', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition-all ${
                    errors.issueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.issueDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.issueDate}
                </p>
              )}
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Expiration Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => handleChange('expirationDate', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-blue-500 transition-all ${
                    errors.expirationDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.expirationDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.expirationDate}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Bell className="w-7 h-7 text-yellow-600 mr-3" />
            Alert Settings
          </h2>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Alert Threshold: {formData.alertThresholdDays} days before expiration
            </label>
            <input
              type="range"
              min="7"
              max="90"
              step="1"
              value={formData.alertThresholdDays}
              onChange={(e) => handleChange('alertThresholdDays', parseInt(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #fbbf24 50%, #ef4444 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>7 days</span>
              <span>30 days</span>
              <span>60 days</span>
              <span>90 days</span>
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Upload className="w-7 h-7 text-green-600 mr-3" />
            Document Upload
          </h2>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-4 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
            }`}
          >
            {uploadedFile ? (
              <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-bold text-gray-900 mb-2">
                  Drag and drop your document here
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <label className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer font-bold">
                  <Upload className="w-5 h-5" />
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">
                  Supported formats: PDF, JPG, PNG (Max 10MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FileText className="w-7 h-7 text-indigo-600 mr-3" />
            Additional Notes
          </h2>

          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 transition-all resize-none"
            placeholder="Add any additional notes or comments..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createCredential.isPending || updateCredential.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createCredential.isPending || updateCredential.isPending ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-6 h-6" />
                {isEdit ? 'Update Credential' : 'Save Credential'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/credentialing/list')}
            className="px-8 py-4 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-bold text-lg flex items-center gap-2"
          >
            <X className="w-6 h-6" />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
