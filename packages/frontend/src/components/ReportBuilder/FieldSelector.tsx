import React, { useState } from 'react';

interface QueryField {
  source: string;
  field: string;
  alias?: string;
}

interface FieldSelectorProps {
  dataSources: string[];
  selectedFields: QueryField[];
  onChange: (fields: QueryField[]) => void;
}

// Mock field definitions - in real implementation, fetch from API
const FIELD_DEFINITIONS: Record<string, Record<string, string>> = {
  Client: {
    id: 'string',
    firstName: 'string',
    lastName: 'string',
    email: 'string',
    phone: 'string',
    dateOfBirth: 'date',
    status: 'enum',
    createdAt: 'date',
    updatedAt: 'date'
  },
  Appointment: {
    id: 'string',
    clientId: 'string',
    clinicianId: 'string',
    appointmentDate: 'date',
    startTime: 'string',
    endTime: 'string',
    duration: 'number',
    status: 'enum',
    appointmentType: 'string',
    createdAt: 'date',
    updatedAt: 'date'
  },
  ClinicalNote: {
    id: 'string',
    clientId: 'string',
    clinicianId: 'string',
    appointmentId: 'string',
    noteDate: 'date',
    serviceDate: 'date',
    status: 'enum',
    isSigned: 'boolean',
    signedAt: 'date',
    createdAt: 'date',
    updatedAt: 'date'
  },
  Charge: {
    id: 'string',
    clientId: 'string',
    appointmentId: 'string',
    serviceCodeId: 'string',
    serviceDate: 'date',
    billingStatus: 'enum',
    chargeAmount: 'number',
    paidAmount: 'number',
    submittedAt: 'date',
    paidAt: 'date',
    createdAt: 'date',
    updatedAt: 'date'
  },
  ServiceCode: {
    id: 'string',
    code: 'string',
    description: 'string',
    defaultRate: 'number',
    serviceType: 'string',
    isActive: 'boolean',
    createdAt: 'date',
    updatedAt: 'date'
  },
  User: {
    id: 'string',
    email: 'string',
    firstName: 'string',
    lastName: 'string',
    role: 'enum',
    isActive: 'boolean',
    createdAt: 'date',
    updatedAt: 'date'
  },
  Insurance: {
    id: 'string',
    clientId: 'string',
    payerId: 'string',
    policyNumber: 'string',
    isPrimary: 'boolean',
    isActive: 'boolean',
    effectiveDate: 'date',
    terminationDate: 'date',
    createdAt: 'date',
    updatedAt: 'date'
  },
  Payer: {
    id: 'string',
    name: 'string',
    type: 'enum',
    isActive: 'boolean',
    createdAt: 'date',
    updatedAt: 'date'
  }
};

const TYPE_ICONS: Record<string, string> = {
  string: '📝',
  number: '🔢',
  date: '📅',
  boolean: '✓/✗',
  enum: '🔽'
};

const FieldSelector: React.FC<FieldSelectorProps> = ({
  dataSources,
  selectedFields,
  onChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const addField = (source: string, field: string) => {
    const newField: QueryField = { source, field };
    onChange([...selectedFields, newField]);
  };

  const removeField = (index: number) => {
    const newFields = selectedFields.filter((_, i) => i !== index);
    onChange(newFields);
  };

  const updateAlias = (index: number, alias: string) => {
    const newFields = [...selectedFields];
    newFields[index].alias = alias;
    onChange(newFields);
  };

  if (dataSources.length === 0) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="flex items-center">
          <span className="text-2xl mr-3">⚠️</span>
          <p className="text-amber-700 font-medium">Please select at least one data source first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-4xl">📋</span>
          <h2 className="text-2xl font-bold text-white">Select Fields</h2>
        </div>
        <p className="text-purple-100 text-sm">
          Click fields from the left panel to add them to your report
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Fields Panel */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
            <h3 className="text-white font-semibold text-lg">Available Fields</h3>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xl">🔍</span>
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          {/* Fields List */}
          <div className="h-[600px] overflow-y-auto p-4 space-y-4">
            {dataSources.map((source) => {
              const sourceFields = Object.entries(FIELD_DEFINITIONS[source] || {}).filter(
                ([field]) =>
                  !searchTerm ||
                  field.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  source.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (sourceFields.length === 0) return null;

              return (
                <div key={source} className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">🗄️</span>
                    <h4 className="font-semibold text-purple-700">{source}</h4>
                  </div>

                  <div className="space-y-1 ml-4">
                    {sourceFields.map(([field, type]) => (
                      <button
                        key={`${source}.${field}`}
                        onClick={() => addField(source, field)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 group"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{TYPE_ICONS[type] || '📄'}</span>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                            {field}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full group-hover:bg-purple-100 group-hover:text-purple-700">
                            {type}
                          </span>
                          <span className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Fields Panel */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-purple-300 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-4">
            <h3 className="text-white font-semibold text-lg">
              Selected Fields ({selectedFields.length})
            </h3>
          </div>

          <div className="h-[700px] overflow-y-auto p-4">
            {selectedFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <span className="text-6xl opacity-20">📋</span>
                <p className="text-gray-500">
                  No fields selected.<br />
                  Click on a field from the left to add it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedFields.map((field, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border-2 border-purple-200 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📌</span>
                        <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-xs rounded-full font-medium">
                          {field.source}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          {field.field}
                        </span>
                      </div>
                      <button
                        onClick={() => removeField(index)}
                        className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors duration-300"
                      >
                        <span className="text-lg">🗑️</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder={`${field.source}_${field.field}`}
                      value={field.alias || ''}
                      onChange={(e) => updateAlias(index, e.target.value)}
                      className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm transition-colors duration-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">Alias (optional)</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldSelector;
