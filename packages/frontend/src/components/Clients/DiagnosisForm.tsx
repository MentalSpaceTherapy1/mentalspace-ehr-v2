import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface DiagnosisFormProps {
  clientId: string;
  diagnosis?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ICD10Code {
  code: string;
  description: string;
  category: string;
}

export default function DiagnosisForm({ clientId, diagnosis, onSuccess, onCancel }: DiagnosisFormProps) {
  const [formData, setFormData] = useState({
    diagnosisType: diagnosis?.diagnosisType || 'PRIMARY',
    icd10Code: diagnosis?.icd10Code || '',
    dsm5Code: diagnosis?.dsm5Code || '',
    diagnosisName: diagnosis?.diagnosisName || '',
    diagnosisCategory: diagnosis?.diagnosisCategory || '',
    severitySpecifier: diagnosis?.severitySpecifier || '',
    courseSpecifier: diagnosis?.courseSpecifier || '',
    onsetDate: diagnosis?.onsetDate ? diagnosis.onsetDate.split('T')[0] : '',
    supportingEvidence: diagnosis?.supportingEvidence || '',
    differentialConsiderations: diagnosis?.differentialConsiderations || '',
  });

  const [icd10Search, setIcd10Search] = useState('');
  const [icd10Results, setIcd10Results] = useState<ICD10Code[]>([]);
  const [showIcd10Results, setShowIcd10Results] = useState(false);

  // Search ICD-10 codes
  const { refetch: searchICD10 } = useQuery({
    queryKey: ['icd10-search', icd10Search],
    queryFn: async () => {
      if (!icd10Search || icd10Search.length < 2) return [];
      const response = await api.get(`/diagnoses/icd10/search?q=${encodeURIComponent(icd10Search)}`);
      return response.data.data as ICD10Code[];
    },
    enabled: false,
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (icd10Search.length >= 2) {
        const result = await searchICD10();
        if (result.data) {
          setIcd10Results(result.data);
          setShowIcd10Results(true);
        }
      } else {
        setIcd10Results([]);
        setShowIcd10Results(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [icd10Search, searchICD10]);

  // Create diagnosis mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/clients/${clientId}/diagnoses`, data);
      return response.data;
    },
    onSuccess,
  });

  // Update diagnosis mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/diagnoses/${diagnosis.id}`, data);
      return response.data;
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      onsetDate: formData.onsetDate ? new Date(formData.onsetDate).toISOString() : undefined,
      severitySpecifier: formData.severitySpecifier || undefined,
      courseSpecifier: formData.courseSpecifier || undefined,
      supportingEvidence: formData.supportingEvidence || undefined,
      differentialConsiderations: formData.differentialConsiderations || undefined,
    };

    if (diagnosis) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleIcd10Select = (code: ICD10Code) => {
    setFormData({
      ...formData,
      icd10Code: code.code,
      diagnosisName: code.description,
      diagnosisCategory: code.category,
    });
    setIcd10Search(`${code.code} - ${code.description}`);
    setShowIcd10Results(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700 font-semibold">Error: {(error as any).message}</p>
        </div>
      )}

      {/* ICD-10 Code Search */}
      <div className="relative">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Search ICD-10 Code
        </label>
        <input
          type="text"
          value={icd10Search}
          onChange={(e) => setIcd10Search(e.target.value)}
          placeholder="Type to search ICD-10 codes..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        />
        {showIcd10Results && icd10Results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {icd10Results.map((code) => (
              <button
                key={code.code}
                type="button"
                onClick={() => handleIcd10Select(code)}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-200 last:border-b-0"
              >
                <div className="font-bold text-indigo-600">{code.code}</div>
                <div className="text-sm text-gray-700">{code.description}</div>
                <div className="text-xs text-gray-500 mt-1">{code.category}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diagnosis Type */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Diagnosis Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.diagnosisType}
            onChange={(e) => setFormData({ ...formData, diagnosisType: e.target.value })}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          >
            <option value="PRIMARY">Primary</option>
            <option value="SECONDARY">Secondary</option>
            <option value="RULE_OUT">Rule Out</option>
            <option value="HISTORICAL">Historical</option>
            <option value="PROVISIONAL">Provisional</option>
          </select>
        </div>

        {/* ICD-10 Code */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ICD-10 Code
          </label>
          <input
            type="text"
            value={formData.icd10Code}
            onChange={(e) => setFormData({ ...formData, icd10Code: e.target.value })}
            placeholder="e.g., F32.9"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Diagnosis Name */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Diagnosis Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.diagnosisName}
          onChange={(e) => setFormData({ ...formData, diagnosisName: e.target.value })}
          required
          placeholder="e.g., Major Depressive Disorder"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DSM-5 Code */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            DSM-5 Code
          </label>
          <input
            type="text"
            value={formData.dsm5Code}
            onChange={(e) => setFormData({ ...formData, dsm5Code: e.target.value })}
            placeholder="e.g., 296.23"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Diagnosis Category
          </label>
          <input
            type="text"
            value={formData.diagnosisCategory}
            onChange={(e) => setFormData({ ...formData, diagnosisCategory: e.target.value })}
            placeholder="e.g., Mood Disorders"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Specifier */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Severity Specifier
          </label>
          <select
            value={formData.severitySpecifier}
            onChange={(e) => setFormData({ ...formData, severitySpecifier: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          >
            <option value="">None</option>
            <option value="MILD">Mild</option>
            <option value="MODERATE">Moderate</option>
            <option value="SEVERE">Severe</option>
            <option value="EXTREME">Extreme</option>
          </select>
        </div>

        {/* Onset Date */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Onset Date
          </label>
          <input
            type="date"
            value={formData.onsetDate}
            onChange={(e) => setFormData({ ...formData, onsetDate: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Course Specifier */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Course Specifier
        </label>
        <input
          type="text"
          value={formData.courseSpecifier}
          onChange={(e) => setFormData({ ...formData, courseSpecifier: e.target.value })}
          placeholder="e.g., Recurrent, In Partial Remission"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Supporting Evidence */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Supporting Evidence
        </label>
        <textarea
          value={formData.supportingEvidence}
          onChange={(e) => setFormData({ ...formData, supportingEvidence: e.target.value })}
          placeholder="Clinical observations, test results, reported symptoms..."
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Differential Considerations */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Differential Considerations
        </label>
        <textarea
          value={formData.differentialConsiderations}
          onChange={(e) => setFormData({ ...formData, differentialConsiderations: e.target.value })}
          placeholder="Alternative diagnoses considered and why they were ruled out..."
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:transform-none"
        >
          {isPending ? 'Saving...' : diagnosis ? 'Update Diagnosis' : 'Add Diagnosis'}
        </button>
      </div>
    </form>
  );
}
