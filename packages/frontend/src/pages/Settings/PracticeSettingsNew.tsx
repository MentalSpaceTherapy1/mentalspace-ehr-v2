import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
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

export default function PracticeSettingsNew() {
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
            <ClinicalDocSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'scheduling' && (
            <SchedulingSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'billing' && (
            <BillingSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'compliance' && (
            <ComplianceSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'telehealth' && (
            <TelehealthSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'supervision' && (
            <SupervisionSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'ai' && <AIIntegrationSettings settings={settings} onSave={handleSave} />}
          {activeTab === 'email' && <EmailSettings settings={settings} onSave={handleSave} />}
          {activeTab === 'portal' && <PortalSettings settings={settings} onSave={handleSave} />}
          {activeTab === 'reporting' && <ReportingSettings settings={settings} onSave={handleSave} />}
          {activeTab === 'advanced' && <AdvancedSettings settings={settings} onSave={handleSave} />}
        </div>
      </div>
    </div>
  );
}

// Reusable Components
interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-100">
    <div className="flex-1">
      <p className="font-bold text-gray-800">{label}</p>
      {description && <p className="text-sm text-gray-600">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600"></div>
    </label>
  </div>
);

// Tab Components (Placeholders - will be replaced with full implementations)
const GeneralSettings = ({ settings, onSave }: any) => {
  const [formData, setFormData] = useState(settings || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">General Practice Information</h2>

      <div className="space-y-6 mb-8">
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

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Save General Settings
        </button>
      </div>
    </form>
  );
};

const ClinicalDocSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Clinical Documentation Settings</h2>
    <p className="text-gray-600 mb-4">Configure note completion deadlines, co-signing, and Sunday lockout.</p>
    {/* Implementation will be added */}
    <div className="text-center text-gray-500 py-12">Clinical Documentation tab content coming soon...</div>
  </div>
);

const SchedulingSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Scheduling Settings</h2>
    <div className="text-center text-gray-500 py-12">Scheduling tab content coming soon...</div>
  </div>
);

const BillingSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing Settings</h2>
    <div className="text-center text-gray-500 py-12">Billing tab content coming soon...</div>
  </div>
);

const ComplianceSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Compliance Settings</h2>
    <div className="text-center text-gray-500 py-12">Compliance tab content coming soon...</div>
  </div>
);

const TelehealthSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Telehealth Settings</h2>
    <div className="text-center text-gray-500 py-12">Telehealth tab content coming soon...</div>
  </div>
);

const SupervisionSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Supervision Settings</h2>
    <div className="text-center text-gray-500 py-12">Supervision tab content coming soon...</div>
  </div>
);

const AIIntegrationSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Integration Settings</h2>
    <div className="text-center text-gray-500 py-12">AI Integration tab will be implemented next...</div>
  </div>
);

const EmailSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Notification Settings</h2>
    <div className="text-center text-gray-500 py-12">Email tab content coming soon...</div>
  </div>
);

const PortalSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Client Portal Settings</h2>
    <div className="text-center text-gray-500 py-12">Portal tab content coming soon...</div>
  </div>
);

const ReportingSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Reporting Settings</h2>
    <div className="text-center text-gray-500 py-12">Reporting tab content coming soon...</div>
  </div>
);

const AdvancedSettings = ({ settings, onSave }: any) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Advanced Settings</h2>
    <div className="text-center text-gray-500 py-12">Advanced tab content coming soon...</div>
  </div>
);
