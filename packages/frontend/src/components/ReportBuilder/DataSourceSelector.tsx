import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface DataSource {
  name: string;
  fields: string[];
  relations: string[];
}

interface DataSourceSelectorProps {
  selectedSources: string[];
  onChange: (sources: string[]) => void;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  selectedSources,
  onChange
}) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await api.get('/custom-reports/data-sources');
      setDataSources(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data sources');
      console.error('Data source fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (sourceName: string) => {
    const newSources = selectedSources.includes(sourceName)
      ? selectedSources.filter((s) => s !== sourceName)
      : [...selectedSources, sourceName];
    onChange(newSources);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-center">
          <span className="text-2xl mr-3">❌</span>
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-4xl">🗄️</span>
          <h2 className="text-2xl font-bold text-white">Select Data Sources</h2>
        </div>
        <p className="text-purple-100 text-sm">
          Choose the tables you want to include in your report. Related tables can be joined automatically.
        </p>
      </div>

      {/* Data Source Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataSources.map((source) => {
          const isSelected = selectedSources.includes(source.name);

          return (
            <div
              key={source.name}
              onClick={() => handleToggle(source.name)}
              className={`
                relative group cursor-pointer rounded-xl p-5
                transition-all duration-300 transform hover:scale-105
                ${isSelected
                  ? 'bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-500 shadow-lg'
                  : 'bg-white border-2 border-gray-200 hover:border-purple-400 shadow-md hover:shadow-xl'
                }
              `}
            >
              {/* Selection Indicator */}
              <div className={`
                absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center
                transition-all duration-300
                ${isSelected
                  ? 'bg-gradient-to-r from-purple-500 to-violet-600 scale-100'
                  : 'bg-gray-200 scale-90'
                }
              `}>
                {isSelected && <span className="text-white text-xs">✓</span>}
              </div>

              {/* Content */}
              <div className="flex items-center space-x-3 mb-3">
                <div className={`
                  p-2 rounded-lg transition-colors duration-300
                  ${isSelected
                    ? 'bg-gradient-to-r from-purple-500 to-violet-600'
                    : 'bg-gray-100 group-hover:bg-purple-100'
                  }
                `}>
                  <span className="text-xl">🗄️</span>
                </div>
                <h3 className={`
                  text-lg font-semibold transition-colors duration-300
                  ${isSelected ? 'text-purple-700' : 'text-gray-800'}
                `}>
                  {source.name}
                </h3>
              </div>

              {/* Field Count */}
              <div className={`
                inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm
                transition-colors duration-300
                ${isSelected
                  ? 'bg-white text-purple-700'
                  : 'bg-gray-100 text-gray-700 group-hover:bg-purple-50'
                }
              `}>
                <span>📋</span>
                <span className="font-medium">{source.fields.length} fields</span>
              </div>

              {/* Relations */}
              {source.relations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Relations:</p>
                  <div className="flex flex-wrap gap-1">
                    {source.relations.slice(0, 3).map((rel) => (
                      <span
                        key={rel}
                        className={`
                          text-xs px-2 py-1 rounded-full
                          transition-colors duration-300
                          ${isSelected
                            ? 'bg-purple-200 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}
                      >
                        {rel}
                      </span>
                    ))}
                    {source.relations.length > 3 && (
                      <span className={`
                        text-xs px-2 py-1 rounded-full
                        ${isSelected
                          ? 'bg-purple-200 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                        }
                      `}>
                        +{source.relations.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedSources.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-md animate-fadeIn">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-blue-800 font-medium">
              Selected {selectedSources.length} data source{selectedSources.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceSelector;
