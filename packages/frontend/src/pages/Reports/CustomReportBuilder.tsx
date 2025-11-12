import React, { useState, useEffect } from 'react';
import {
  Save,
  Play,
  ArrowLeft,
  ArrowRight,
  X,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import DataSourceSelector from '../../components/ReportBuilder/DataSourceSelector';
import FieldSelector from '../../components/ReportBuilder/FieldSelector';
import FilterBuilder from '../../components/ReportBuilder/FilterBuilder';
import AggregationBuilder from '../../components/ReportBuilder/AggregationBuilder';
import ReportPreview from '../../components/ReportBuilder/ReportPreview';

// ============================================================================
// TYPES
// ============================================================================

interface QueryField {
  source: string;
  field: string;
  alias?: string;
}

interface QueryFilter {
  field: string;
  operator: string;
  values?: any[];
}

interface QueryAggregation {
  field: string;
  function: string;
  alias: string;
}

interface QuerySort {
  field: string;
  direction: 'ASC' | 'DESC';
}

interface QueryConfig {
  dataSources: string[];
  fields: QueryField[];
  filters?: QueryFilter[];
  groupBy?: string[];
  aggregations?: QueryAggregation[];
  orderBy?: QuerySort[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CustomReportBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportCategory, setReportCategory] = useState('CUSTOM');
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    dataSources: [],
    fields: [],
    filters: [],
    aggregations: [],
    orderBy: []
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const steps = [
    { number: 1, title: 'Select Data Sources', emoji: '🗃️' },
    { number: 2, title: 'Choose Fields', emoji: '🔍' },
    { number: 3, title: 'Add Filters', emoji: '🔧' },
    { number: 4, title: 'Add Aggregations', emoji: '📊' },
    { number: 5, title: 'Sort Results', emoji: '🔢' },
    { number: 6, title: 'Preview', emoji: '👁️' },
    { number: 7, title: 'Save Report', emoji: '💾' }
  ];

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNext = async () => {
    setError(null);

    // Validate current step
    if (activeStep === 0 && queryConfig.dataSources.length === 0) {
      setError('Please select at least one data source');
      return;
    }

    if (activeStep === 1 && queryConfig.fields.length === 0) {
      setError('Please select at least one field');
      return;
    }

    // If moving to preview step, fetch preview data
    if (activeStep === 4) {
      await fetchPreview();
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevStep) => prevStep - 1);
  };

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/custom-reports/preview', {
        queryConfig
      });
      setPreviewData(response.data.results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch preview');
      console.error('Preview error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      setError('Report name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/custom-reports', {
        name: reportName,
        description: reportDescription,
        category: reportCategory,
        queryConfig,
        isPublic: false
      });

      setSaveDialogOpen(false);
      navigate('/reports');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save report');
      console.error('Save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQueryConfig = (updates: Partial<QueryConfig>) => {
    setQueryConfig((prev) => ({ ...prev, ...updates }));
  };

  // ============================================================================
  // STEP CONTENT
  // ============================================================================

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <DataSourceSelector
            selectedSources={queryConfig.dataSources}
            onChange={(dataSources) => updateQueryConfig({ dataSources })}
          />
        );
      case 1:
        return (
          <FieldSelector
            dataSources={queryConfig.dataSources}
            selectedFields={queryConfig.fields}
            onChange={(fields) => updateQueryConfig({ fields })}
          />
        );
      case 2:
        return (
          <FilterBuilder
            dataSources={queryConfig.dataSources}
            filters={queryConfig.filters || []}
            onChange={(filters) => updateQueryConfig({ filters })}
          />
        );
      case 3:
        return (
          <AggregationBuilder
            fields={queryConfig.fields}
            aggregations={queryConfig.aggregations || []}
            groupBy={queryConfig.groupBy || []}
            onChange={(aggregations, groupBy) =>
              updateQueryConfig({ aggregations, groupBy })
            }
          />
        );
      case 4:
        return (
          <div>
            <div className="flex items-center mb-6">
              <span className="text-5xl mr-4">🔢</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Sort Results</h3>
                <p className="text-gray-600">Add sorting rules to order your report results</p>
              </div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 flex items-center">
              <AlertCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
              <p className="text-blue-800 font-medium">Sorting configuration coming soon</p>
            </div>
          </div>
        );
      case 5:
        return (
          <ReportPreview
            data={previewData}
            fields={queryConfig.fields}
            isLoading={isLoading}
            onRefresh={fetchPreview}
          />
        );
      case 6:
        return (
          <div>
            <div className="flex items-center mb-6">
              <span className="text-5xl mr-4">💾</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Save Report</h3>
                <p className="text-gray-600">Give your report a name and save it for future use</p>
              </div>
            </div>

            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Report Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl focus:ring-4 focus:ring-teal-300 focus:border-teal-400 transition-all duration-200 font-medium"
                  placeholder="Enter report name..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl focus:ring-4 focus:ring-teal-300 focus:border-teal-400 transition-all duration-200 font-medium"
                  rows={3}
                  placeholder="Enter description..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl focus:ring-4 focus:ring-teal-300 focus:border-teal-400 transition-all duration-200 font-medium"
                >
                  <option value="CUSTOM">Custom</option>
                  <option value="CLINICAL">Clinical</option>
                  <option value="BILLING">Billing</option>
                  <option value="ADMINISTRATIVE">Administrative</option>
                  <option value="FINANCIAL">Financial</option>
                </select>
              </div>
            </div>

            <div className="mt-6 bg-white border-2 border-teal-200 rounded-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Report Summary</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🗃️</span>
                  <span className="text-gray-700"><strong>Data Sources:</strong> {queryConfig.dataSources.join(', ')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔍</span>
                  <span className="text-gray-700"><strong>Fields:</strong> {queryConfig.fields.length}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔧</span>
                  <span className="text-gray-700"><strong>Filters:</strong> {queryConfig.filters?.length || 0}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  <span className="text-gray-700"><strong>Aggregations:</strong> {queryConfig.aggregations?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return 'Unknown step';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2 flex items-center">
              <span className="text-5xl mr-3">🏗️</span>
              Custom Report Builder
            </h1>
            <p className="text-gray-600 text-lg">Build powerful custom reports with our visual query builder</p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200 flex items-center"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </button>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                    index === activeStep
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg scale-110'
                      : index < activeStep
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {index < activeStep ? '✓' : step.emoji}
                  </div>
                  <p className={`text-xs mt-2 font-bold text-center max-w-[100px] ${
                    index === activeStep ? 'text-teal-600' : index < activeStep ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                    index < activeStep ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-3xl mr-3">⚠️</span>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step Content */}
          <div className="min-h-[400px]">
            {getStepContent(activeStep)}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-gray-200">
            <button
              disabled={activeStep === 0}
              onClick={handleBack}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 font-medium">
                Step {activeStep + 1} of {steps.length}
              </div>
              {activeStep === steps.length - 1 ? (
                <button
                  onClick={handleSaveReport}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  Save Report
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Next
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
