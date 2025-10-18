import React, { useState } from 'react';
import {
  CurrencyDollarIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface BillingTabProps {
  settings: any;
  onSave: (updates: any) => void;
}

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

export default function BillingTab({ settings, onSave }: BillingTabProps) {
  const [formData, setFormData] = useState({
    defaultCurrency: settings?.defaultCurrency || 'USD',
    taxRate: settings?.taxRate || 0,
    enableInsuranceBilling: settings?.enableInsuranceBilling ?? true,
    enableSelfPayBilling: settings?.enableSelfPayBilling ?? true,
    requirePaymentAtTimeOfService: settings?.requirePaymentAtTimeOfService ?? false,
    acceptedPaymentMethods: settings?.acceptedPaymentMethods || [
      'Cash',
      'Credit Card',
      'Check',
      'Insurance',
    ],
    lateFeeEnabled: settings?.lateFeeEnabled ?? false,
    lateFeeAmount: settings?.lateFeeAmount || '',
    lateFeeDaysAfterDue: settings?.lateFeeDaysAfterDue || 30,
    invoicePrefix: settings?.invoicePrefix || 'INV',
    invoiceStartingNumber: settings?.invoiceStartingNumber || 1000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Insurance', 'HSA/FSA'];

  const togglePaymentMethod = (method: string) => {
    const methods = formData.acceptedPaymentMethods.includes(method)
      ? formData.acceptedPaymentMethods.filter((m: string) => m !== method)
      : [...formData.acceptedPaymentMethods, method];
    setFormData({ ...formData, acceptedPaymentMethods: methods });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl">
            <CurrencyDollarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Billing Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure billing preferences, payment methods, and invoice settings
            </p>
          </div>
        </div>
      </div>

      {/* General Billing Settings */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
          <h3 className="text-xl font-bold text-gray-900">General Billing</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Currency
            </label>
            <select
              value={formData.defaultCurrency}
              onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
            <p className="mt-2 text-xs text-gray-500">Applied to all billable services</p>
          </div>
        </div>

        <Toggle
          label="Enable Insurance Billing"
          description="Accept and process insurance claims for services"
          checked={formData.enableInsuranceBilling}
          onChange={(checked) => setFormData({ ...formData, enableInsuranceBilling: checked })}
        />

        <Toggle
          label="Enable Self-Pay Billing"
          description="Accept direct payment from clients without insurance"
          checked={formData.enableSelfPayBilling}
          onChange={(checked) => setFormData({ ...formData, enableSelfPayBilling: checked })}
        />

        <Toggle
          label="Require Payment at Time of Service"
          description="Collect payment immediately after each session"
          checked={formData.requirePaymentAtTimeOfService}
          onChange={(checked) =>
            setFormData({ ...formData, requirePaymentAtTimeOfService: checked })
          }
        />
      </div>

      {/* Payment Methods */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCardIcon className="h-6 w-6 text-emerald-600" />
          <h3 className="text-xl font-bold text-gray-900">Accepted Payment Methods</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <label
              key={method}
              className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.acceptedPaymentMethods.includes(method)
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.acceptedPaymentMethods.includes(method)}
                onChange={() => togglePaymentMethod(method)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mr-2"
              />
              <span className="text-sm font-medium text-gray-700">{method}</span>
            </label>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Selected methods:</strong>{' '}
            {formData.acceptedPaymentMethods.length > 0
              ? formData.acceptedPaymentMethods.join(', ')
              : 'None'}
          </p>
        </div>
      </div>

      {/* Late Fees */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="h-6 w-6 text-orange-600" />
          <h3 className="text-xl font-bold text-gray-900">Late Fees</h3>
        </div>

        <Toggle
          label="Enable Late Fees"
          description="Charge late fees for overdue invoices"
          checked={formData.lateFeeEnabled}
          onChange={(checked) => setFormData({ ...formData, lateFeeEnabled: checked })}
        />

        {formData.lateFeeEnabled && (
          <div className="space-y-4 pl-4 border-l-4 border-orange-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Fee Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.lateFeeAmount}
                    onChange={(e) => setFormData({ ...formData, lateFeeAmount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Fixed fee or percentage</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days After Due Date
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.lateFeeDaysAfterDue}
                  onChange={(e) =>
                    setFormData({ ...formData, lateFeeDaysAfterDue: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Late fee applied after this many days
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Settings */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <DocumentTextIcon className="h-6 w-6 text-emerald-600" />
          <h3 className="text-xl font-bold text-gray-900">Invoice Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={formData.invoicePrefix}
              onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="INV"
              maxLength={10}
            />
            <p className="mt-2 text-xs text-gray-500">
              Prefix for invoice numbers (e.g., INV-1001)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Invoice Number
            </label>
            <input
              type="number"
              min="1"
              value={formData.invoiceStartingNumber}
              onChange={(e) =>
                setFormData({ ...formData, invoiceStartingNumber: parseInt(e.target.value) })
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              First invoice number (increments automatically)
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>Example Invoice Number:</strong> {formData.invoicePrefix}-
            {formData.invoiceStartingNumber}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <CurrencyDollarIcon className="h-5 w-5" />
          Save Billing Settings
        </button>
      </div>
    </form>
  );
}
