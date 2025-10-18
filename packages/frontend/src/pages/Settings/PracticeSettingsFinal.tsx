import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  SparklesIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ChartBarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

// Import all tab components
import ClinicalDocTab from './ClinicalDocTab';
import SchedulingTab from './SchedulingTab';
import BillingTab from './BillingTab';
import AIIntegrationTab from './AIIntegrationTab';
import {
  ComplianceTab,
  TelehealthTab,
  SupervisionTab,
  EmailTab,
  PortalTab,
  ReportingTab,
  AdvancedTab,
} from './AllRemainingTabs';

// Tab definitions
const TABS = [
  { id: 'general', name: 'General', icon: Cog6ToothIcon },
  { id: 'clinical', name: 'Clinical Documentation', icon: DocumentTextIcon },
  { id: 'scheduling', name: 'Scheduling', icon: CalendarIcon },
  { id: 'billing', name: 'Billing', icon: CurrencyDollarIcon },
  { id: 'compliance', name: 'Compliance', icon: ShieldCheckIcon },
  { id: 'telehealth', name: 'Telehealth', icon: VideoCameraIcon },
  { id: 'supervision', name: 'Supervision', icon: AcademicCapIcon },
  { id: 'ai', name: 'AI Integration', icon: SparklesIcon, highlight: true },
  { id: 'email', name: 'Email', icon: EnvelopeIcon },
  { id: 'portal', name: 'Client Portal', icon: UserGroupIcon },
  { id: 'reporting', name: 'Reporting', icon: ChartBarIcon },
  { id: 'advanced', name: 'Advanced', icon: BeakerIcon },
];

export default function PracticeSettingsFinal() {
  const [activeTab, setActiveTab] = useState('general');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const queryClient = useQueryClient();

  // Fetch practice settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['practice-settings'],
    queryFn: async () => {
      const response = await api.get('/practice-settings');
      return response.data.data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put('/practice-settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-settings'] });
      setSuccessMessage('Settings updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.error || 'Failed to update settings');
      setSuccessMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const handleSave = (updates: any) => {
    updateSettingsMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Practice Settings</h1>
        <p className="text-gray-600 text-lg">
          Configure and manage all aspects of your practice
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

      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex flex-wrap -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center px-6 py-4 border-b-2 font-medium text-sm transition-all duration-200
                    ${
                      isActive
                        ? 'border-indigo-500 text-indigo-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                    }
                    ${tab.highlight ? 'relative' : ''}
                  `}
                >
                  <Icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {tab.name}
                  {tab.highlight && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'general' && (
            <GeneralSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'clinical' && (
            <ClinicalDocTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'scheduling' && (
            <SchedulingTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'billing' && (
            <BillingTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'compliance' && (
            <ComplianceTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'telehealth' && (
            <TelehealthTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'supervision' && (
            <SupervisionTab settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'ai' && <AIIntegrationTab settings={settings} onSave={handleSave} />}
          {activeTab === 'email' && <EmailTab settings={settings} onSave={handleSave} />}
          {activeTab === 'portal' && <PortalTab settings={settings} onSave={handleSave} />}
          {activeTab === 'reporting' && <ReportingTab settings={settings} onSave={handleSave} />}
          {activeTab === 'advanced' && <AdvancedTab settings={settings} onSave={handleSave} />}
        </div>
      </div>
    </div>
  );
}

// General Settings Tab Component
const GeneralSettings = ({ settings, onSave }: any) => {
  const [formData, setFormData] = useState(settings || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <Cog6ToothIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">General Practice Information</h2>
            <p className="text-gray-600 mt-1">
              Configure basic practice details and operating hours
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Practice Name *
            </label>
            <input
              type="text"
              value={formData.practiceName || ''}
              onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Practice Email *
            </label>
            <input
              type="email"
              value={formData.practiceEmail || ''}
              onChange={(e) => setFormData({ ...formData, practiceEmail: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Practice Phone *
            </label>
            <input
              type="tel"
              value={formData.practicePhone || ''}
              onChange={(e) => setFormData({ ...formData, practicePhone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={formData.practiceWebsite || ''}
              onChange={(e) => setFormData({ ...formData, practiceWebsite: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://www.example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone || 'America/New_York'}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Hours
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={formData.businessHoursStart || '09:00'}
                onChange={(e) => setFormData({ ...formData, businessHoursStart: e.target.value })}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="flex items-center text-gray-500">to</span>
              <input
                type="time"
                value={formData.businessHoursEnd || '17:00'}
                onChange={(e) => setFormData({ ...formData, businessHoursEnd: e.target.value })}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          Save General Settings
        </button>
      </div>
    </form>
  );
};
