import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

const PayerRuleImporter: React.FC = () => {
  const navigate = useNavigate();
  const { payerId } = useParams<{ payerId: string }>();

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Please select a CSV file');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('payerId', payerId || '');
      formData.append('dryRun', dryRun.toString());

      const response = await axios.post('/api/v1/payer-rules/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import rules');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `clinicianCredential,placeOfService,serviceType,supervisionRequired,cosignRequired,cosignTimeframeDays,noteCompletionDays,diagnosisRequired,treatmentPlanRequired,medicalNecessityRequired,priorAuthRequired,isProhibited,prohibitionReason,effectiveDate,isActive
LAMFT,OFFICE,PSYCHOTHERAPY,true,true,7,30,true,true,true,false,false,,2024-01-01,true
LPC,TELEHEALTH,PSYCHOTHERAPY,false,false,,,true,true,true,false,false,,2024-01-01,true
LAPC,OFFICE,EVALUATION,true,true,14,30,true,true,true,false,false,,2024-01-01,true`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payer-rules-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/billing/payers/${payerId}/rules`)}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          ← Back to Rules
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Import Payer Rules (CSV)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bulk import multiple payer rules from a CSV file
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-3">Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-2 ml-4 list-decimal">
          <li>Download the CSV template by clicking the button below</li>
          <li>Open the template in Excel or Google Sheets</li>
          <li>Fill in your payer rules (one row per rule)</li>
          <li>Save the file as CSV format</li>
          <li>Upload the file using the form below</li>
          <li>Use "Dry Run" mode first to validate without importing</li>
          <li>If validation passes, uncheck "Dry Run" and import for real</li>
        </ol>

        <button
          onClick={downloadTemplate}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Download CSV Template
        </button>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleImport} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            required
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="dryRun"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
          />
          <div className="ml-3">
            <label htmlFor="dryRun" className="font-medium text-gray-700">
              Dry Run (Test Mode)
            </label>
            <p className="text-xs text-gray-500">
              Validate the CSV file without actually creating rules. Uncheck to import for real.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(`/billing/payers/${payerId}/rules`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={importing || !file}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Processing...' : dryRun ? 'Validate CSV' : 'Import Rules'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Import Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div
            className={`p-6 rounded-lg shadow ${
              result.success && result.failed === 0
                ? 'bg-green-50 border-2 border-green-200'
                : 'bg-yellow-50 border-2 border-yellow-200'
            }`}
          >
            <h2 className="text-xl font-bold mb-2">
              {result.success && result.failed === 0 ? (
                <span className="text-green-800">✓ {dryRun ? 'Validation' : 'Import'} Successful</span>
              ) : (
                <span className="text-yellow-800">⚠ {dryRun ? 'Validation' : 'Import'} Completed with Errors</span>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm text-gray-600">Successfully {dryRun ? 'Validated' : 'Imported'}</div>
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Failed</div>
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              </div>
            </div>

            {dryRun && result.success && result.failed === 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  ✓ Validation successful! All {result.imported} rules are valid. Uncheck "Dry Run" and click
                  "Import Rules" to actually create them.
                </p>
              </div>
            )}

            {!dryRun && result.success && result.failed === 0 && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => navigate(`/billing/payers/${payerId}/rules`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View Imported Rules
                </button>
              </div>
            )}
          </div>

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                <h3 className="text-lg font-medium text-red-900">Validation Errors ({result.errors.length})</h3>
                <p className="text-sm text-red-700 mt-1">
                  Fix these errors in your CSV file and try again
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Row
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Field
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.errors.map((err, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {err.row}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {err.field}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Format Reference */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">CSV Column Reference</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Column</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Required</th>
                <th className="text-left py-2 font-medium text-gray-700">Valid Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-2 pr-4 text-gray-600">clinicianCredential</td>
                <td className="py-2 pr-4 text-red-600">Yes</td>
                <td className="py-2 text-gray-600">LAMFT, LPC, LAPC, LMFT, LCSW, etc.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">placeOfService</td>
                <td className="py-2 pr-4 text-red-600">Yes</td>
                <td className="py-2 text-gray-600">OFFICE, TELEHEALTH, HOME, SCHOOL, etc.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">serviceType</td>
                <td className="py-2 pr-4 text-red-600">Yes</td>
                <td className="py-2 text-gray-600">PSYCHOTHERAPY, EVALUATION, INTAKE, etc.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">supervisionRequired</td>
                <td className="py-2 pr-4 text-gray-600">No</td>
                <td className="py-2 text-gray-600">true or false (default: false)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">cosignRequired</td>
                <td className="py-2 pr-4 text-gray-600">No</td>
                <td className="py-2 text-gray-600">true or false (default: false)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">cosignTimeframeDays</td>
                <td className="py-2 pr-4 text-gray-600">No</td>
                <td className="py-2 text-gray-600">Number (e.g., 7, 14, 30)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">noteCompletionDays</td>
                <td className="py-2 pr-4 text-gray-600">No</td>
                <td className="py-2 text-gray-600">Number (e.g., 30, 60, 90)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">isProhibited</td>
                <td className="py-2 pr-4 text-gray-600">No</td>
                <td className="py-2 text-gray-600">true or false (default: false)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">prohibitionReason</td>
                <td className="py-2 pr-4 text-gray-600">If prohibited</td>
                <td className="py-2 text-gray-600">Text explaining why prohibited</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">effectiveDate</td>
                <td className="py-2 pr-4 text-red-600">Yes</td>
                <td className="py-2 text-gray-600">YYYY-MM-DD format</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-600">isActive</td>
                <td className="py-2 pr-4 text-gray-600">No</td>
                <td className="py-2 text-gray-600">true or false (default: true)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayerRuleImporter;
