// This file contains all remaining tab components for Practice Settings
// Import and use these in PracticeSettingsNew.tsx

import React, { useState } from 'react';
import {
  ShieldCheckIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ChartBarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
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

// =============================================
// COMPLIANCE SETTINGS TAB
// =============================================
export function ComplianceTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    hipaaComplianceEnabled: settings?.hipaaComplianceEnabled ?? true,
    requireTwoFactorAuth: settings?.requireTwoFactorAuth ?? false,
    passwordExpirationDays: settings?.passwordExpirationDays || 90,
    sessionTimeoutMinutes: settings?.sessionTimeoutMinutes || 30,
    enableAuditLogging: settings?.enableAuditLogging ?? true,
    dataRetentionYears: settings?.dataRetentionYears || 7,
    enableAutoBackup: settings?.enableAutoBackup ?? true,
    backupFrequency: settings?.backupFrequency || 'Daily',
    requireConsentForms: settings?.requireConsentForms ?? true,
    enableClientPortal: settings?.enableClientPortal ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Compliance Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure HIPAA compliance, security policies, and data retention
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">HIPAA & Security</h3>

        <Toggle
          label="HIPAA Compliance Mode"
          description="Enable HIPAA-compliant features and audit logging"
          checked={formData.hipaaComplianceEnabled}
          onChange={(checked) => setFormData({ ...formData, hipaaComplianceEnabled: checked })}
        />

        <Toggle
          label="Require Two-Factor Authentication"
          description="All users must enable 2FA for account access"
          checked={formData.requireTwoFactorAuth}
          onChange={(checked) => setFormData({ ...formData, requireTwoFactorAuth: checked })}
        />

        <Toggle
          label="Enable Audit Logging"
          description="Track all user actions for compliance and security"
          checked={formData.enableAuditLogging}
          onChange={(checked) => setFormData({ ...formData, enableAuditLogging: checked })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Expiration: <span className="text-blue-600 font-bold">{formData.passwordExpirationDays} days</span>
            </label>
            <input
              type="range"
              min="30"
              max="365"
              step="30"
              value={formData.passwordExpirationDays}
              onChange={(e) =>
                setFormData({ ...formData, passwordExpirationDays: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout: <span className="text-blue-600 font-bold">{formData.sessionTimeoutMinutes} minutes</span>
            </label>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={formData.sessionTimeoutMinutes}
              onChange={(e) =>
                setFormData({ ...formData, sessionTimeoutMinutes: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Data Management</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Retention Period: <span className="text-blue-600 font-bold">{formData.dataRetentionYears} years</span>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={formData.dataRetentionYears}
            onChange={(e) =>
              setFormData({ ...formData, dataRetentionYears: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="mt-2 text-sm text-gray-600">
            How long to retain client records after discharge
          </p>
        </div>

        <Toggle
          label="Enable Auto Backup"
          description="Automatically backup data on a regular schedule"
          checked={formData.enableAutoBackup}
          onChange={(checked) => setFormData({ ...formData, enableAutoBackup: checked })}
        />

        {formData.enableAutoBackup && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Frequency
            </label>
            <select
              value={formData.backupFrequency}
              onChange={(e) => setFormData({ ...formData, backupFrequency: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <ShieldCheckIcon className="h-5 w-5" />
          Save Compliance Settings
        </button>
      </div>
    </form>
  );
}

// =============================================
// TELEHEALTH SETTINGS TAB
// =============================================
export function TelehealthTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    enableTelehealth: settings?.enableTelehealth ?? true,
    telehealthPlatform: settings?.telehealthPlatform || 'Built-in',
    requireConsentForTelehealth: settings?.requireConsentForTelehealth ?? true,
    recordTelehealthSessions: settings?.recordTelehealthSessions ?? false,
    telehealthRecordingDisclosure: settings?.telehealthRecordingDisclosure || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
            <VideoCameraIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Telehealth Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure video session platform and recording policies
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <Toggle
          label="Enable Telehealth"
          description="Allow video sessions through the platform"
          checked={formData.enableTelehealth}
          onChange={(checked) => setFormData({ ...formData, enableTelehealth: checked })}
        />

        {formData.enableTelehealth && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telehealth Platform
              </label>
              <select
                value={formData.telehealthPlatform}
                onChange={(e) => setFormData({ ...formData, telehealthPlatform: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="Built-in">Built-in Video</option>
                <option value="Zoom">Zoom</option>
                <option value="Doxy.me">Doxy.me</option>
                <option value="Custom">Custom Integration</option>
              </select>
            </div>

            <Toggle
              label="Require Telehealth Consent"
              description="Clients must sign consent before video sessions"
              checked={formData.requireConsentForTelehealth}
              onChange={(checked) =>
                setFormData({ ...formData, requireConsentForTelehealth: checked })
              }
            />

            <Toggle
              label="Record Telehealth Sessions"
              description="Enable session recording capability"
              checked={formData.recordTelehealthSessions}
              onChange={(checked) =>
                setFormData({ ...formData, recordTelehealthSessions: checked })
              }
            />

            {formData.recordTelehealthSessions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recording Disclosure Statement
                </label>
                <textarea
                  rows={4}
                  value={formData.telehealthRecordingDisclosure}
                  onChange={(e) =>
                    setFormData({ ...formData, telehealthRecordingDisclosure: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter disclosure statement shown to clients when recording..."
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <VideoCameraIcon className="h-5 w-5" />
          Save Telehealth Settings
        </button>
      </div>
    </form>
  );
}

// =============================================
// SUPERVISION SETTINGS TAB
// =============================================
export function SupervisionTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    enableSupervision: settings?.enableSupervision ?? true,
    requiredSupervisionHours: settings?.requiredSupervisionHours || 3000,
    supervisionSessionFrequency: settings?.supervisionSessionFrequency || 'Weekly',
    enableGroupSupervision: settings?.enableGroupSupervision ?? true,
    enableTriadicSupervision: settings?.enableTriadicSupervision ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
            <AcademicCapIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Supervision Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure supervision requirements and session formats
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <Toggle
          label="Enable Supervision Module"
          description="Track supervision sessions and hours for licensure"
          checked={formData.enableSupervision}
          onChange={(checked) => setFormData({ ...formData, enableSupervision: checked })}
        />

        {formData.enableSupervision && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Supervision Hours
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.requiredSupervisionHours}
                onChange={(e) =>
                  setFormData({ ...formData, requiredSupervisionHours: parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <p className="mt-2 text-sm text-gray-600">
                Total hours required for licensure (default: 3000 for LPC in Georgia)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Session Frequency
              </label>
              <select
                value={formData.supervisionSessionFrequency}
                onChange={(e) =>
                  setFormData({ ...formData, supervisionSessionFrequency: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="Weekly">Weekly</option>
                <option value="Biweekly">Biweekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            <Toggle
              label="Enable Group Supervision"
              description="Allow group supervision sessions with multiple supervisees"
              checked={formData.enableGroupSupervision}
              onChange={(checked) => setFormData({ ...formData, enableGroupSupervision: checked })}
            />

            <Toggle
              label="Enable Triadic Supervision"
              description="Allow supervision with two supervisees simultaneously"
              checked={formData.enableTriadicSupervision}
              onChange={(checked) =>
                setFormData({ ...formData, enableTriadicSupervision: checked })
              }
            />
          </>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <AcademicCapIcon className="h-5 w-5" />
          Save Supervision Settings
        </button>
      </div>
    </form>
  );
}

// =============================================
// EMAIL SETTINGS TAB
// =============================================
export function EmailTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    smtpHost: settings?.smtpHost || '',
    smtpPort: settings?.smtpPort || 587,
    smtpSecure: settings?.smtpSecure ?? true,
    smtpUser: settings?.smtpUser || '',
    smtpPass: settings?.smtpPass || '',
    emailFromName: settings?.emailFromName || '',
    emailFromAddress: settings?.emailFromAddress || '',
    enableAppointmentReminders: settings?.enableAppointmentReminders ?? true,
    enableBillingReminders: settings?.enableBillingReminders ?? true,
    enableSystemNotifications: settings?.enableSystemNotifications ?? true,
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl">
            <EnvelopeIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Email Notification Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure SMTP server and email notification preferences
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">SMTP Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
            <input
              type="text"
              value={formData.smtpHost}
              onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
            <input
              type="number"
              value={formData.smtpPort}
              onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
            <input
              type="text"
              value={formData.smtpUser}
              onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
            <div className="flex gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.smtpPass}
                onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        <Toggle
          label="Use Secure Connection (TLS/SSL)"
          checked={formData.smtpSecure}
          onChange={(checked) => setFormData({ ...formData, smtpSecure: checked })}
        />
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Email Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
            <input
              type="text"
              value={formData.emailFromName}
              onChange={(e) => setFormData({ ...formData, emailFromName: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="MentalSpace Practice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
            <input
              type="email"
              value={formData.emailFromAddress}
              onChange={(e) => setFormData({ ...formData, emailFromAddress: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="noreply@practice.com"
            />
          </div>
        </div>

        <Toggle
          label="Appointment Reminders"
          description="Send reminder emails for upcoming appointments"
          checked={formData.enableAppointmentReminders}
          onChange={(checked) =>
            setFormData({ ...formData, enableAppointmentReminders: checked })
          }
        />

        <Toggle
          label="Billing Reminders"
          description="Send reminder emails for outstanding invoices"
          checked={formData.enableBillingReminders}
          onChange={(checked) => setFormData({ ...formData, enableBillingReminders: checked })}
        />

        <Toggle
          label="System Notifications"
          description="Send system-generated notifications (password resets, etc.)"
          checked={formData.enableSystemNotifications}
          onChange={(checked) =>
            setFormData({ ...formData, enableSystemNotifications: checked })
          }
        />
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <EnvelopeIcon className="h-5 w-5" />
          Save Email Settings
        </button>
      </div>
    </form>
  );
}

// =============================================
// CLIENT PORTAL SETTINGS TAB
// =============================================
export function PortalTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    portalRequireEmailVerification: settings?.portalRequireEmailVerification ?? true,
    portalEnableAppointmentBooking: settings?.portalEnableAppointmentBooking ?? true,
    portalEnableBilling: settings?.portalEnableBilling ?? true,
    portalEnableMessaging: settings?.portalEnableMessaging ?? true,
    portalEnableDocuments: settings?.portalEnableDocuments ?? true,
    portalEnableMoodTracking: settings?.portalEnableMoodTracking ?? true,
    portalEnableAssessments: settings?.portalEnableAssessments ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl">
            <UserGroupIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Client Portal Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure which features are available in the client portal
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Portal Features</h3>

        <Toggle
          label="Require Email Verification"
          description="Clients must verify their email before accessing the portal"
          checked={formData.portalRequireEmailVerification}
          onChange={(checked) =>
            setFormData({ ...formData, portalRequireEmailVerification: checked })
          }
        />

        <Toggle
          label="Appointment Booking"
          description="Allow clients to book and manage appointments"
          checked={formData.portalEnableAppointmentBooking}
          onChange={(checked) =>
            setFormData({ ...formData, portalEnableAppointmentBooking: checked })
          }
        />

        <Toggle
          label="Billing & Payments"
          description="Allow clients to view invoices and make payments"
          checked={formData.portalEnableBilling}
          onChange={(checked) => setFormData({ ...formData, portalEnableBilling: checked })}
        />

        <Toggle
          label="Secure Messaging"
          description="Enable secure communication between clients and clinicians"
          checked={formData.portalEnableMessaging}
          onChange={(checked) => setFormData({ ...formData, portalEnableMessaging: checked })}
        />

        <Toggle
          label="Document Sharing"
          description="Allow clients to upload and view documents"
          checked={formData.portalEnableDocuments}
          onChange={(checked) => setFormData({ ...formData, portalEnableDocuments: checked })}
        />

        <Toggle
          label="Mood Tracking"
          description="Enable mood logging and tracking features"
          checked={formData.portalEnableMoodTracking}
          onChange={(checked) => setFormData({ ...formData, portalEnableMoodTracking: checked })}
        />

        <Toggle
          label="Assessments & Surveys"
          description="Allow clients to complete assessments and questionnaires"
          checked={formData.portalEnableAssessments}
          onChange={(checked) => setFormData({ ...formData, portalEnableAssessments: checked })}
        />
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <UserGroupIcon className="h-5 w-5" />
          Save Portal Settings
        </button>
      </div>
    </form>
  );
}

// =============================================
// REPORTING SETTINGS TAB
// =============================================
export function ReportingTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    enableProductivityReports: settings?.enableProductivityReports ?? true,
    enableFinancialReports: settings?.enableFinancialReports ?? true,
    enableComplianceReports: settings?.enableComplianceReports ?? true,
    reportDistributionEmail: settings?.reportDistributionEmail || '',
    autoGenerateMonthlyReports: settings?.autoGenerateMonthlyReports ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Reporting Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure report generation and distribution preferences
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Report Types</h3>

        <Toggle
          label="Productivity Reports"
          description="Generate reports on clinician productivity and caseload"
          checked={formData.enableProductivityReports}
          onChange={(checked) => setFormData({ ...formData, enableProductivityReports: checked })}
        />

        <Toggle
          label="Financial Reports"
          description="Generate reports on revenue, collections, and billing"
          checked={formData.enableFinancialReports}
          onChange={(checked) => setFormData({ ...formData, enableFinancialReports: checked })}
        />

        <Toggle
          label="Compliance Reports"
          description="Generate reports on note completion, lockouts, and violations"
          checked={formData.enableComplianceReports}
          onChange={(checked) => setFormData({ ...formData, enableComplianceReports: checked })}
        />
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Report Distribution</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Distribution Email Address
          </label>
          <input
            type="email"
            value={formData.reportDistributionEmail}
            onChange={(e) => setFormData({ ...formData, reportDistributionEmail: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="reports@practice.com"
          />
          <p className="mt-2 text-sm text-gray-600">Email address for automated report delivery</p>
        </div>

        <Toggle
          label="Auto-Generate Monthly Reports"
          description="Automatically generate and email reports at the end of each month"
          checked={formData.autoGenerateMonthlyReports}
          onChange={(checked) =>
            setFormData({ ...formData, autoGenerateMonthlyReports: checked })
          }
        />
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <ChartBarIcon className="h-5 w-5" />
          Save Reporting Settings
        </button>
      </div>
    </form>
  );
}

// =============================================
// ADVANCED SETTINGS TAB
// =============================================
export function AdvancedTab({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    enableBetaFeatures: settings?.enableBetaFeatures ?? false,
    enableExperimentalAI: settings?.enableExperimentalAI ?? false,
    enableAdvancedAnalytics: settings?.enableAdvancedAnalytics ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl">
            <BeakerIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Advanced Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure experimental features and advanced options
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-6 rounded-xl">
        <p className="text-sm text-yellow-800">
          <strong>Warning:</strong> These are experimental features that may be unstable. Enable at
          your own risk in production environments.
        </p>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Feature Flags</h3>

        <Toggle
          label="Enable Beta Features"
          description="Access to features currently in beta testing"
          checked={formData.enableBetaFeatures}
          onChange={(checked) => setFormData({ ...formData, enableBetaFeatures: checked })}
        />

        <Toggle
          label="Enable Experimental AI"
          description="Access cutting-edge AI features (may be unstable)"
          checked={formData.enableExperimentalAI}
          onChange={(checked) => setFormData({ ...formData, enableExperimentalAI: checked })}
        />

        <Toggle
          label="Enable Advanced Analytics"
          description="Access to advanced analytics and insights dashboard"
          checked={formData.enableAdvancedAnalytics}
          onChange={(checked) => setFormData({ ...formData, enableAdvancedAnalytics: checked })}
        />
      </div>

      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <BeakerIcon className="h-5 w-5" />
          Save Advanced Settings
        </button>
      </div>
    </form>
  );
}
