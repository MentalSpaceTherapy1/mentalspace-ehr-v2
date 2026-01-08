import React, { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, Loader2, AlertCircle, ChevronDown, ChevronUp, X, Lightbulb } from 'lucide-react';
import { api } from '../../lib/api';

interface ParsedQuery {
  reportType: string;
  parameters: Record<string, any>;
  dateRange: { start: string; end: string } | null;
  explanation: string;
  confidence: number;
}

interface NaturalLanguageResult {
  success: boolean;
  query: string;
  interpretation: ParsedQuery;
  data: any;
  summary?: string;
  error?: string;
}

interface ExampleQueries {
  [category: string]: string[];
}

interface NaturalLanguageSearchProps {
  onResultReceived?: (result: NaturalLanguageResult) => void;
  className?: string;
}

export default function NaturalLanguageSearch({
  onResultReceived,
  className = ''
}: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NaturalLanguageResult | null>(null);
  const [examples, setExamples] = useState<ExampleQueries | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load example queries on mount
  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const response = await api.get('/reports/natural-language/examples');
      if (response.data.success) {
        setExamples(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load examples:', error);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setShowResults(true);

    try {
      const response = await api.post('/reports/natural-language', { query: query.trim() });
      setResult(response.data);
      onResultReceived?.(response.data);
    } catch (error: any) {
      const errorResult: NaturalLanguageResult = {
        success: false,
        query,
        interpretation: {
          reportType: 'unknown',
          parameters: {},
          dateRange: null,
          explanation: '',
          confidence: 0,
        },
        data: null,
        error: error.response?.data?.error || 'Failed to process query. Please try again.',
      };
      setResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, onResultReceived]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const useExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setShowExamples(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResult(null);
    setShowResults(false);
  };

  const reportTypeLabels: Record<string, string> = {
    financial: 'Financial Report',
    credentialing: 'Credentialing Report',
    training: 'Training Compliance',
    policy: 'Policy Compliance',
    incident: 'Incident Analysis',
    performance: 'Performance Metrics',
    attendance: 'Attendance Report',
    vendor: 'Vendor Report',
    audit: 'Audit Trail',
    dashboard: 'Practice Dashboard',
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Search Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Ask AI</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
            Natural Language
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Query reports using plain English. Try: "Show me revenue by clinician last month"
        </p>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What would you like to know? e.g., 'Credentials expiring in 90 days'"
            className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {query && (
              <button
                onClick={clearSearch}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isLoading}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>

        {/* Examples Toggle */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="mt-2 flex items-center text-sm text-indigo-600 hover:text-indigo-700"
        >
          <Lightbulb className="w-4 h-4 mr-1" />
          {showExamples ? 'Hide examples' : 'Show example queries'}
          {showExamples ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>

        {/* Example Queries */}
        {showExamples && examples && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(examples).slice(0, 6).map(([category, queries]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {queries.slice(0, 2).map((exampleQuery, idx) => (
                      <button
                        key={idx}
                        onClick={() => useExample(exampleQuery)}
                        className="w-full text-left text-sm text-gray-700 hover:text-indigo-600 hover:bg-white px-2 py-1 rounded transition-colors"
                      >
                        "{exampleQuery}"
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {showResults && result && (
        <div className="border-t border-gray-100">
          {/* Interpretation */}
          <div className="p-4 bg-gray-50">
            <div className="flex items-start space-x-3">
              {result.success ? (
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {result.success ? 'Query Interpreted' : 'Query Failed'}
                  </span>
                  {result.success && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                      {reportTypeLabels[result.interpretation.reportType] || result.interpretation.reportType}
                    </span>
                  )}
                  {result.interpretation.confidence > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      result.interpretation.confidence >= 0.8
                        ? 'bg-green-100 text-green-700'
                        : result.interpretation.confidence >= 0.5
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(result.interpretation.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {result.interpretation.explanation || result.error}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {result.success && result.summary && (
            <div className="p-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">AI Summary</h4>
              <p className="text-sm text-gray-700 bg-indigo-50 p-3 rounded-lg">
                {result.summary}
              </p>
            </div>
          )}

          {/* Data Preview */}
          {result.success && result.data?.data?.summary && (
            <div className="p-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.data.data.summary)
                  .filter(([, value]) => typeof value === 'number' || typeof value === 'string')
                  .slice(0, 8)
                  .map(([key, value]) => {
                    const displayValue = value as string | number;
                    return (
                      <div key={key} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 capitalize mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {typeof displayValue === 'number'
                            ? displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                            : String(displayValue)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {!result.success && result.error && (
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Unable to process query</p>
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Try rephrasing your query or use one of the example queries above.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
