import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface ValidationResult {
  passed: boolean;
  note: {
    id: string;
    serviceDate: string;
    status: string;
    client: {
      firstName: string;
      lastName: string;
    };
    clinician: {
      firstName: string;
      lastName: string;
      credential: string;
    };
  };
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
  holdsCreated?: number;
}

interface Note {
  id: string;
  serviceDate: string;
  client: {
    firstName: string;
    lastName: string;
  };
  clinician: {
    firstName: string;
    lastName: string;
  };
}

const BillingReadinessChecker: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createHolds, setCreateHolds] = useState(true);

  useEffect(() => {
    fetchRecentNotes();
  }, []);

  const fetchRecentNotes = async () => {
    try {
      setLoading(true);
      // Fetch recently signed notes
      const response = await api.get('/notes?status=SIGNED&limit=50');
      setNotes(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Could not load notes. Please ensure notes API is available.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteId) {
      toast.error('Please select a note');
      return;
    }

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post(
        `/billing-readiness/validate/${selectedNoteId}`,
        { createHolds }
      );
      setResult(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to validate note');
    } finally {
      setChecking(false);
    }
  };

  const getCheckIcon = (passed: boolean) => {
    if (passed) {
      return (
        <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing Readiness Checker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Validate if a note meets all billing requirements and payer rules
        </p>
      </div>

      {/* Selection Form */}
      <form onSubmit={handleCheck} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="noteId" className="block text-sm font-medium text-gray-700 mb-2">
              Select Note to Check
            </label>
            <select
              id="noteId"
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a Note --</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {new Date(note.serviceDate).toLocaleDateString()} - {note.client.lastName},{' '}
                  {note.client.firstName} ({note.clinician.lastName})
                </option>
              ))}
            </select>
            {loading && <p className="text-sm text-gray-500 mt-1">Loading notes...</p>}
            {!loading && notes.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">
                No signed notes found. Only signed notes can be checked for billing readiness.
              </p>
            )}
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="createHolds"
              checked={createHolds}
              onChange={(e) => setCreateHolds(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
            />
            <div className="ml-3">
              <label htmlFor="createHolds" className="font-medium text-gray-700">
                Automatically create billing holds for failed checks
              </label>
              <p className="text-xs text-gray-500">
                If validation fails, holds will be created to prevent billing
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/billing/holds')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              View All Holds
            </button>
            <button
              type="submit"
              disabled={checking || !selectedNoteId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Check Billing Readiness'}
            </button>
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Validation Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div
            className={`p-6 rounded-lg shadow ${
              result.passed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {result.passed ? (
                    <span className="text-green-800">✓ Ready for Billing</span>
                  ) : (
                    <span className="text-red-800">✗ Not Ready for Billing</span>
                  )}
                </h2>
                <p className="text-sm mt-1">
                  Client: {result.note.client.lastName}, {result.note.client.firstName} |{' '}
                  Service Date: {new Date(result.note.serviceDate).toLocaleDateString()} |{' '}
                  Clinician: {result.note.clinician.lastName} ({result.note.clinician.credential})
                </p>
                {result.holdsCreated !== undefined && result.holdsCreated > 0 && (
                  <p className="text-sm mt-2 font-medium text-red-700">
                    {result.holdsCreated} billing hold(s) created
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/clinical-notes/${result.note.id}`)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                View Note
              </button>
            </div>
          </div>

          {/* Validation Checks */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Validation Checks</h3>
              <p className="text-sm text-gray-500 mt-1">
                {result.checks.filter((c) => c.passed).length} of {result.checks.length} checks passed
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {result.checks.map((check, index) => (
                <li key={index} className="px-6 py-4 flex items-start">
                  <div className="flex-shrink-0 mt-0.5">{getCheckIcon(check.passed)}</div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-medium ${
                          check.passed ? 'text-gray-900' : 'text-red-900'
                        }`}
                      >
                        {check.name}
                      </h4>
                    </div>
                    <p className={`text-sm mt-1 ${check.passed ? 'text-gray-600' : 'text-red-600'}`}>
                      {check.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          {!result.passed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">Next Steps to Resolve Issues</h3>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                {result.checks
                  .filter((c) => !c.passed)
                  .map((check, index) => (
                    <li key={index}>{check.message}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Billing Validation Checks</h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
          <li>Note must be signed or cosigned</li>
          <li>Matching payer rule must exist for credential/service combination</li>
          <li>Credential/service combination must not be prohibited</li>
          <li>Supervision requirements must be met if applicable</li>
          <li>Cosign requirements and timeframes must be satisfied</li>
          <li>Note completion timeframe must be met</li>
          <li>Diagnosis code must be present if required</li>
          <li>Current treatment plan must exist (less than 90 days old)</li>
          <li>Medical necessity must be documented</li>
          <li>Prior authorization must be obtained if required</li>
        </ul>
      </div>
    </div>
  );
};

export default BillingReadinessChecker;
