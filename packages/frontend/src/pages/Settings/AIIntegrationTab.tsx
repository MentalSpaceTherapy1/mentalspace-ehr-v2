import React, { useState } from 'react';
import {
  SparklesIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface AIIntegrationTabProps {
  settings: any;
  onSave: (updates: any) => void;
}

export default function AIIntegrationTab({ settings, onSave }: AIIntegrationTabProps) {
  const [formData, setFormData] = useState({
    enableAIFeatures: settings?.enableAIFeatures || false,
    aiProvider: settings?.aiProvider || '',
    aiModel: settings?.aiModel || '',
    aiApiKey: settings?.aiApiKey || '',
    enableAINoteGeneration: settings?.enableAINoteGeneration || false,
    enableAITreatmentSuggestions: settings?.enableAITreatmentSuggestions || false,
    enableAIScheduling: settings?.enableAIScheduling || false,
    enableAIDiagnosisAssistance: settings?.enableAIDiagnosisAssistance || false,
    aiConfidenceThreshold: settings?.aiConfidenceThreshold || 0.8,
    requireHumanReview: settings?.requireHumanReview ?? true,
    aiUsageLogging: settings?.aiUsageLogging ?? true,
  });

  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const providers = [
    { value: '', label: 'Select a provider...' },
    { value: 'OpenAI', label: 'OpenAI (GPT-4, GPT-3.5)' },
    { value: 'Anthropic', label: 'Anthropic (Claude)' },
    { value: 'Custom', label: 'Custom API' },
  ];

  const models = {
    OpenAI: [
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Recommended)' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    Anthropic: [
      { value: 'claude-3-opus', label: 'Claude 3 Opus (Most Capable)' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
    ],
    Custom: [{ value: 'custom', label: 'Custom Model' }],
  };

  const availableModels = formData.aiProvider
    ? (models as any)[formData.aiProvider] || []
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">AI Integration Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure AI-powered features to enhance clinical workflows
            </p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-6 rounded-xl">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Important: AI as a Clinical Assistant
            </h3>
            <p className="text-sm text-yellow-800">
              AI-generated content should <strong>always be reviewed by qualified
              professionals</strong>. AI is a tool to assist, not replace, clinical judgment.
              All AI outputs must comply with HIPAA and your practice's ethical guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* Master AI Toggle */}
      <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Enable AI Features
            </h3>
            <p className="text-gray-600">
              Master switch for all AI-powered functionality in the system
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableAIFeatures}
              onChange={(e) =>
                setFormData({ ...formData, enableAIFeatures: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-20 h-10 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"></div>
          </label>
        </div>
      </div>

      {/* AI Provider Configuration */}
      {formData.enableAIFeatures && (
        <>
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              AI Provider Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Provider *
                </label>
                <select
                  value={formData.aiProvider}
                  onChange={(e) =>
                    setFormData({ ...formData, aiProvider: e.target.value, aiModel: '' })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required={formData.enableAIFeatures}
                >
                  {providers.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Choose your preferred AI service provider
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model *
                </label>
                <select
                  value={formData.aiModel}
                  onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required={formData.enableAIFeatures && formData.aiProvider !== ''}
                  disabled={!formData.aiProvider}
                >
                  <option value="">Select a model...</option>
                  {availableModels.map((m: any) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Select the specific AI model to use
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.aiApiKey}
                  onChange={(e) => setFormData({ ...formData, aiApiKey: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                  placeholder={showApiKey ? 'sk-...' : '••••••••••••••••'}
                  required={formData.enableAIFeatures}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Your API key is encrypted at rest and never exposed in logs
              </p>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">AI Feature Toggles</h3>

            <div className="space-y-4">
              {/* AI Note Generation */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="h-5 w-5 text-purple-600" />
                    <p className="font-bold text-gray-800">AI Note Generation</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Generate clinical notes from session transcripts or dictation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAINoteGeneration}
                    onChange={(e) =>
                      setFormData({ ...formData, enableAINoteGeneration: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"></div>
                </label>
              </div>

              {/* AI Treatment Suggestions */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="h-5 w-5 text-purple-600" />
                    <p className="font-bold text-gray-800">AI Treatment Suggestions</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Provide evidence-based treatment recommendations based on symptoms and diagnosis
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAITreatmentSuggestions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enableAITreatmentSuggestions: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"></div>
                </label>
              </div>

              {/* AI Scheduling Assistant */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="h-5 w-5 text-purple-600" />
                    <p className="font-bold text-gray-800">AI Scheduling Assistant</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Optimize appointment scheduling and suggest best times for sessions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAIScheduling}
                    onChange={(e) =>
                      setFormData({ ...formData, enableAIScheduling: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"></div>
                </label>
              </div>

              {/* AI Diagnosis Assistance */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="h-5 w-5 text-purple-600" />
                    <p className="font-bold text-gray-800">AI Diagnosis Assistance</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Suggest relevant ICD-10 codes based on symptoms and clinical presentation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAIDiagnosisAssistance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enableAIDiagnosisAssistance: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* AI Quality & Safety Settings */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheckIcon className="h-6 w-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-gray-900">AI Quality & Safety Settings</h3>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Threshold: {(formData.aiConfidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={formData.aiConfidenceThreshold * 100}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfidenceThreshold: parseInt(e.target.value) / 100,
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <p className="mt-2 text-xs text-gray-500">
                AI suggestions below this confidence level will be flagged for review
              </p>
            </div>

            {/* Require Human Review */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-100">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                  <p className="font-bold text-gray-800">Require Human Review</p>
                </div>
                <p className="text-sm text-gray-600">
                  All AI-generated content must be reviewed by a clinician before use
                </p>
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  Recommended: Keep this enabled for compliance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireHumanReview}
                  onChange={(e) =>
                    setFormData({ ...formData, requireHumanReview: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-blue-600"></div>
              </label>
            </div>

            {/* AI Usage Logging */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-100">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                  <p className="font-bold text-gray-800">Enable AI Usage Logging</p>
                </div>
                <p className="text-sm text-gray-600">
                  Track all AI interactions for audit and compliance purposes
                </p>
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  Recommended: Keep this enabled for HIPAA compliance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.aiUsageLogging}
                  onChange={(e) =>
                    setFormData({ ...formData, aiUsageLogging: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-blue-600"></div>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <SparklesIcon className="h-5 w-5" />
          Save AI Integration Settings
        </button>
      </div>
    </form>
  );
}
