import React, { useState } from 'react';
import { X, Check, Edit2, XCircle, AlertTriangle } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedData: Record<string, any>;
  onAccept: (data: Record<string, any>) => void;
  onReject: () => void;
  noteType: string;
  warnings?: string[];
  confidence?: number;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  generatedData,
  onAccept,
  onReject,
  noteType,
  warnings = [],
  confidence,
}) => {
  const [editedData, setEditedData] = useState(generatedData);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  if (!isOpen) return null;

  const handleAccept = () => {
    onAccept(editedData);
    onClose();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const handleFieldEdit = (field: string, value: any) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const renderFieldValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value || 'Not specified');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Review Generated {noteType}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review the AI-generated content before accepting
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Confidence & Warnings */}
        {(confidence !== undefined || warnings.length > 0) && (
          <div className="px-6 py-4 bg-gray-50 border-b space-y-3">
            {confidence !== undefined && (
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      Confidence Level
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        confidence >= 0.8
                          ? 'bg-green-500'
                          : confidence >= 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-900 mb-1">
                      Warnings
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'preview'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'edit'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Edit2 className="w-4 h-4" />
              <span>Edit Fields</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {Object.entries(editedData).map(([key, value]) => (
                <div key={key} className="border-b border-gray-200 pb-3">
                  <dt className="text-sm font-medium text-gray-700 mb-1">
                    {formatFieldName(key)}
                  </dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                    {renderFieldValue(value)}
                  </dd>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(editedData).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formatFieldName(key)}
                  </label>
                  {typeof value === 'string' && value.length > 100 ? (
                    <textarea
                      value={value}
                      onChange={(e) => handleFieldEdit(key, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={renderFieldValue(value)}
                      onChange={(e) => handleFieldEdit(key, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleReject}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Accept & Populate Form</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
