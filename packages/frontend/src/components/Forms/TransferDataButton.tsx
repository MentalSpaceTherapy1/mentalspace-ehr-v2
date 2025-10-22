import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FormTransferConfig, applyFieldMapping } from '../../config/formFieldMappings';
import DataComparisonView from './DataComparisonView';
import api from '../../lib/api';

interface TransferDataButtonProps {
  /** Client ID */
  clientId: string;
  /** Form assignment ID */
  assignmentId: string;
  /** Form submission data */
  submissionData: Record<string, any>;
  /** Current database data (for comparison) */
  currentData: Record<string, any>;
  /** Transfer configuration */
  config: FormTransferConfig;
  /** Optional: Existing intake assessment ID (for intake transfers only) */
  intakeAssessmentId?: string;
  /** Callback when transfer completes successfully */
  onTransferComplete?: (data: any) => void;
  /** Custom button className */
  className?: string;
}

/**
 * TransferDataButton Component
 *
 * Button that opens a modal with side-by-side data comparison and allows
 * staff to select fields to transfer from form submission to database.
 *
 * Features:
 * - Opens modal with DataComparisonView
 * - Shows conflicts and allows field selection
 * - Confirms before transfer
 * - Handles API call to transfer data
 * - Shows success/error messages
 * - Calls onTransferComplete callback
 */
export const TransferDataButton: React.FC<TransferDataButtonProps> = ({
  clientId,
  assignmentId,
  submissionData,
  currentData,
  config,
  intakeAssessmentId,
  onTransferComplete,
  className,
}) => {
  const [isModalOpen, setIsModalOpen, ] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowConfirmation(false);
  };

  const handleFieldSelectionChange = (fields: string[]) => {
    setSelectedFields(fields);
  };

  const handleProceedToConfirmation = () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to transfer');
      return;
    }
    setShowConfirmation(true);
  };

  const handleBackToSelection = () => {
    setShowConfirmation(false);
  };

  const handleConfirmTransfer = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to transfer');
      return;
    }

    setIsTransferring(true);

    try {
      // Apply field mapping to get transformed data
      const mappedData = applyFieldMapping(submissionData, config, selectedFields);

      // Determine endpoint based on transfer type
      const endpoint = config.transferEndpoint
        .replace(':clientId', clientId)
        .replace(':assignmentId', assignmentId);

      // Prepare request body
      const requestBody: any = {
        selectedFields,
        mappedData,
      };

      // Add intakeAssessmentId if provided (for intake transfers)
      if (intakeAssessmentId) {
        requestBody.intakeAssessmentId = intakeAssessmentId;
      }

      // Call transfer API
      const response = await api.post(endpoint, requestBody);

      // Show success message
      toast.success(config.successMessage);

      // Call callback with response data
      if (onTransferComplete) {
        onTransferComplete(response.data.data);
      }

      // Close modal
      handleCloseModal();
    } catch (error: any) {
      console.error('Error transferring data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to transfer data';
      toast.error(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      {/* Transfer Button */}
      <button
        onClick={handleOpenModal}
        className={className || 'px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg flex items-center'}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {config.buttonText}
      </button>

      {/* Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{config.buttonText}</h2>
                  <p className="text-green-100 text-sm mt-1">
                    {showConfirmation ? 'Confirm Transfer' : 'Select Fields to Transfer'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!showConfirmation ? (
                /* Field Selection View */
                <DataComparisonView
                  submissionData={submissionData}
                  currentData={currentData}
                  config={config}
                  onFieldSelectionChange={handleFieldSelectionChange}
                />
              ) : (
                /* Confirmation View */
                <div className="space-y-4">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
                    <div className="flex items-start">
                      <svg className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="text-lg font-bold text-blue-900 mb-2">Confirm Data Transfer</h3>
                        <p className="text-sm text-blue-800 mb-3">
                          You are about to transfer <strong>{selectedFields.length} field{selectedFields.length > 1 ? 's' : ''}</strong> from the client's form submission to their {config.targetModel === 'Client' ? 'demographics' : 'clinical intake'} record.
                        </p>
                        <p className="text-sm text-blue-800">
                          This action will <strong>overwrite</strong> any existing data in the selected fields.
                          Are you sure you want to proceed?
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected Fields Summary */}
                  <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Fields to be Transferred:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedFields.map(fieldId => {
                        const mapping = config.fieldMappings.find(m => m.sourceField === fieldId);
                        return (
                          <div key={fieldId} className="flex items-center text-sm text-gray-700">
                            <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {mapping?.label || fieldId}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t-2 border-gray-200">
              <div className="flex justify-between items-center">
                {!showConfirmation ? (
                  <>
                    <div className="text-sm text-gray-600">
                      {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseModal}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProceedToConfirmation}
                        disabled={selectedFields.length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        Continue
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBackToSelection}
                      disabled={isTransferring}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseModal}
                        disabled={isTransferring}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmTransfer}
                        disabled={isTransferring}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center"
                      >
                        {isTransferring ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Transferring...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Confirm Transfer
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransferDataButton;
