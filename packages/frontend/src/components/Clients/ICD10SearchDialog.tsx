import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface ICD10Code {
  code: string;
  description: string;
  category: string;
}

interface ICD10SearchDialogProps {
  onClose: () => void;
  onSelect?: (code: ICD10Code) => void;
}

export default function ICD10SearchDialog({ onClose, onSelect }: ICD10SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [results, setResults] = useState<ICD10Code[]>([]);

  // Search ICD-10 codes
  const { refetch: searchICD10, isLoading } = useQuery({
    queryKey: ['icd10-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await api.get(`/diagnoses/icd10/search?q=${encodeURIComponent(searchQuery)}`);
      return response.data.data as ICD10Code[];
    },
    enabled: false,
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        const result = await searchICD10();
        if (result.data) {
          setResults(result.data);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchICD10]);

  // Get unique categories from results
  const categories = ['all', ...new Set(results.map(r => r.category))];

  // Filter results by category
  const filteredResults = selectedCategory === 'all'
    ? results
    : results.filter(r => r.category === selectedCategory);

  const handleSelect = (code: ICD10Code) => {
    if (onSelect) {
      onSelect(code);
    }
    onClose();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Mood Disorders': 'from-blue-500 to-cyan-500',
      'Anxiety Disorders': 'from-purple-500 to-pink-500',
      'Trauma and Stressor-Related Disorders': 'from-red-500 to-rose-500',
      'OCD and Related Disorders': 'from-orange-500 to-amber-500',
      'Eating Disorders': 'from-green-500 to-emerald-500',
      'Substance Use Disorders': 'from-yellow-500 to-amber-500',
      'Personality Disorders': 'from-indigo-500 to-purple-500',
      'Neurodevelopmental Disorders': 'from-teal-500 to-cyan-500',
    };
    return colors[category] || 'from-gray-500 to-slate-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">ICD-10 Code Search</h2>
              <p className="text-indigo-100">Search for diagnosis codes by name or code</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or diagnosis name (e.g., F32.9, depression, anxiety)..."
            autoFocus
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none shadow-sm"
          />
          {isLoading && (
            <p className="text-sm text-gray-600 mt-2">Searching...</p>
          )}
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-sm text-amber-600 mt-2">Type at least 2 characters to search</p>
          )}
        </div>

        {/* Category Filters */}
        {results.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 overflow-x-auto">
            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All Categories' : category}
                  {category !== 'all' && (
                    <span className="ml-2 text-xs">
                      ({results.filter(r => r.category === category).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6">
          {searchQuery.length < 2 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Search ICD-10 Codes</h3>
              <p className="text-gray-600">
                Type at least 2 characters to start searching for diagnosis codes
              </p>
              <div className="mt-6 text-left max-w-md mx-auto">
                <p className="text-sm font-bold text-gray-700 mb-2">Examples:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Search by code: "F32.9", "F41.1"</li>
                  <li>• Search by name: "depression", "anxiety"</li>
                  <li>• Search by category: "mood", "PTSD"</li>
                </ul>
              </div>
            </div>
          ) : filteredResults.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                No ICD-10 codes match your search "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-md transition-all duration-200 font-semibold"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((code) => (
                <button
                  key={code.code}
                  onClick={() => handleSelect(code)}
                  className="w-full text-left bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-500 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-sm">
                          {code.code}
                        </span>
                        <span className={`px-3 py-1 bg-gradient-to-r ${getCategoryColor(code.category)} text-white rounded-lg font-semibold text-xs`}>
                          {code.category}
                        </span>
                      </div>
                      <p className="text-gray-800 font-semibold text-base leading-relaxed">
                        {code.description}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <span className="text-white text-xl">→</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredResults.length > 0 && (
                <>Showing {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}</>
              )}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
