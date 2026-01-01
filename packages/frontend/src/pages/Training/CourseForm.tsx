import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useCreateCourse, useUpdateCourse } from '../../hooks/useTraining';

interface CourseFormProps {
  courseId?: string;
  initialData?: any;
}

export default function CourseForm({ courseId, initialData }: CourseFormProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    type: initialData?.type || '',
    format: initialData?.format || '',
    coverImage: initialData?.coverImage || '',
    ceuCredits: initialData?.ceuCredits || 0,
    creditType: initialData?.creditType || '',
    duration: initialData?.duration || 0,
    required: initialData?.required || false,
    prerequisites: initialData?.prerequisites || [],
    instructorId: initialData?.instructorId || '',
    instructorName: initialData?.instructorName || '',
    instructorBio: initialData?.instructorBio || '',
    materials: initialData?.materials || [],
    targetRoles: initialData?.targetRoles || [],
  });

  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();

  const categories = ['Clinical Skills', 'Ethics', 'Technology', 'Leadership', 'Compliance'];
  const types = ['CEU', 'Certification', 'Professional Development'];
  const formats = ['Online', 'In-Person', 'Hybrid', 'Self-Paced'];
  const roles = ['Clinician', 'Admin', 'Supervisor', 'Support Staff'];

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r: string) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const handleSubmit = async () => {
    try {
      if (courseId) {
        await updateMutation.mutateAsync({ courseId, courseData: formData });
        toast.success('Course updated successfully!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Course created successfully!');
      }
      navigate('/training/admin/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: '📋' },
    { number: 2, title: 'Content & Materials', icon: '📚' },
    { number: 3, title: 'Settings & Roles', icon: '⚙️' },
    { number: 4, title: 'Review & Publish', icon: '✅' },
  ];

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Preview</h1>
            <button
              onClick={() => setPreviewMode(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              <X className="w-4 h-4" />
              Close Preview
            </button>
          </div>
          {/* Course Preview Card */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden">
            <div className="h-64 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 flex items-center justify-center">
              {formData.coverImage ? (
                <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-9xl">📚</span>
              )}
            </div>
            <div className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{formData.title || 'Course Title'}</h2>
              <p className="text-lg text-gray-700 mb-6">{formData.description || 'Course description...'}</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="text-2xl font-bold text-indigo-600">{formData.duration}h</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">CEU Credits</p>
                  <p className="text-2xl font-bold text-purple-600">{formData.ceuCredits}</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                  <p className="text-sm text-gray-600 mb-1">Format</p>
                  <p className="text-2xl font-bold text-pink-600">{formData.format}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                  {formData.category}
                </span>
                <span className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                  {formData.type}
                </span>
                {formData.required && (
                  <span className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full">
                    REQUIRED
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/training/admin/courses')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Courses
          </button>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            {courseId ? 'Edit Course' : 'Create New Course'}
          </h1>
          <p className="text-gray-600 text-lg">Build engaging training content for your team</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-6 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div
                  className={`flex flex-col items-center cursor-pointer ${
                    currentStep === step.number ? 'opacity-100' : 'opacity-50'
                  }`}
                  onClick={() => setCurrentStep(step.number)}
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2 transition-all duration-300 ${
                      currentStep === step.number
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg scale-110'
                        : currentStep > step.number
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.icon}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 bg-gray-200 mx-4">
                    <div
                      className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ${
                        currentStep > step.number ? 'w-full' : 'w-0'
                      }`}
                    ></div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8 mb-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Course Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter course description"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select type</option>
                    {types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Format *</label>
                  <select
                    value={formData.format}
                    onChange={(e) => handleInputChange('format', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select format</option>
                    {formats.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cover Image URL</label>
                  <input
                    type="text"
                    value={formData.coverImage}
                    onChange={(e) => handleInputChange('coverImage', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Content & Materials</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Duration (hours) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">CEU Credits *</label>
                  <input
                    type="number"
                    value={formData.ceuCredits}
                    onChange={(e) => handleInputChange('ceuCredits', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Credit Type</label>
                <input
                  type="text"
                  value={formData.creditType}
                  onChange={(e) => handleInputChange('creditType', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., APA, NBCC, NASW"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Instructor Name</label>
                <input
                  type="text"
                  value={formData.instructorName}
                  onChange={(e) => handleInputChange('instructorName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter instructor name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Instructor Bio</label>
                <textarea
                  value={formData.instructorBio}
                  onChange={(e) => handleInputChange('instructorBio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter instructor biography"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Course Materials</label>
                <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-indigo-400" />
                  <p className="text-gray-600">
                    Drop files here or click to upload
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported formats: PDF, DOCX, MP4, PPT
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings & Target Roles</h2>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => handleInputChange('required', e.target.checked)}
                    className="w-6 h-6 text-red-600 border-red-300 rounded focus:ring-red-500"
                  />
                  <div>
                    <span className="text-lg font-bold text-gray-900">Mark as Required</span>
                    <p className="text-sm text-gray-600">
                      All selected roles must complete this training
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Target Roles *</label>
                <div className="grid grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        formData.targetRoles.includes(role)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetRoles.includes(role)}
                        onChange={() => handleRoleToggle(role)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-gray-900">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Publish</h2>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Ready to Publish</h3>
                    <p className="text-sm text-gray-600">Review your course details before publishing</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Course Title</p>
                  <p className="font-bold text-gray-900">{formData.title || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="font-bold text-gray-900">{formData.category || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-bold text-gray-900">{formData.duration} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">CEU Credits</p>
                  <p className="font-bold text-gray-900">{formData.ceuCredits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Format</p>
                  <p className="font-bold text-gray-900">{formData.format || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Required</p>
                  <p className="font-bold text-gray-900">{formData.required ? 'Yes' : 'No'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Target Roles</p>
                  <p className="font-bold text-gray-900">
                    {formData.targetRoles.length > 0 ? formData.targetRoles.join(', ') : 'None selected'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors font-bold"
          >
            <Eye className="w-5 h-5" />
            Preview
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors font-bold shadow-lg"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-colors font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {courseId ? 'Update Course' : 'Publish Course'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
