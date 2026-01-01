import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as portalApi from '../../lib/portalApi';
import FormSubmissionViewer from './FormSubmissionViewer';
import ConfirmModal from '../ConfirmModal';

interface PortalTabProps {
  clientId: string;
}

export default function PortalTab({ clientId }: PortalTabProps) {
  const queryClient = useQueryClient();

  // Form assignment state
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [formDueDate, setFormDueDate] = useState('');
  const [isFormRequired, setIsFormRequired] = useState(false);
  const [clientMessage, setClientMessage] = useState('');

  // Document sharing state
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Form submission viewer state
  const [viewingSubmission, setViewingSubmission] = useState<{ clientId: string; assignmentId: string } | null>(null);

  // Revoke document confirmation state
  const [revokeConfirm, setRevokeConfirm] = useState<{ isOpen: boolean; documentId: string }>({
    isOpen: false,
    documentId: '',
  });

  const handleRevokeClick = (documentId: string) => {
    setRevokeConfirm({ isOpen: true, documentId });
  };

  const confirmRevoke = () => {
    revokeDocumentMutation.mutate(revokeConfirm.documentId);
    setRevokeConfirm({ isOpen: false, documentId: '' });
  };

  // Fetch form library
  const { data: formLibrary = [], isLoading: loadingForms } = useQuery({
    queryKey: ['formLibrary'],
    queryFn: () => portalApi.getFormLibrary(true),
  });

  // Fetch client form assignments
  const { data: formAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['clientForms', clientId],
    queryFn: () => portalApi.getClientFormAssignments(clientId),
  });

  // Fetch shared documents
  const { data: sharedDocuments = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['sharedDocuments', clientId],
    queryFn: () => portalApi.getSharedDocumentsForClient(clientId),
  });

  // Assign form mutation
  const assignFormMutation = useMutation({
    mutationFn: async (data: { formIds: string[]; dueDate?: string; isRequired: boolean; clientMessage?: string }) => {
      // Assign each form sequentially
      const promises = data.formIds.map(formId =>
        portalApi.assignFormToClient(clientId, {
          formId,
          dueDate: data.dueDate,
          isRequired: data.isRequired,
          clientMessage: data.clientMessage,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientForms', clientId] });
      setSelectedFormIds([]);
      setFormDueDate('');
      setIsFormRequired(false);
      setClientMessage('');
      toast.success(`Successfully assigned ${data.length} form${data.length > 1 ? 's' : ''} to client!`, {
        duration: 4000,
        position: 'top-center',
        icon: '✅',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign forms', {
        duration: 4000,
        position: 'top-center',
      });
    },
  });

  // Remove form mutation
  const removeFormMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      portalApi.removeFormAssignment(clientId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientForms', clientId] });
      toast.success('Form assignment removed successfully!', {
        duration: 3000,
        position: 'top-center',
        icon: '🗑️',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove form assignment', {
        duration: 4000,
        position: 'top-center',
      });
    },
  });

  // Send form reminder mutation
  const sendFormReminderMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      portalApi.sendFormReminder(clientId, assignmentId),
    onSuccess: () => {
      toast.success('Reminder sent successfully!', {
        duration: 3000,
        position: 'top-center',
        icon: '📧',
      });
    },
    onError: () => {
      toast.error('Failed to send reminder', {
        duration: 4000,
        position: 'top-center',
      });
    },
  });

  // Share document mutation
  const shareDocumentMutation = useMutation({
    mutationFn: async (data: portalApi.ShareDocumentRequest) => {
      let fileUrl = data.fileUrl;

      // Upload file if selected
      if (uploadedFile) {
        try {
          const uploadResult = await portalApi.uploadDocumentFile(uploadedFile);
          fileUrl = uploadResult.fileUrl;
        } catch (error) {
          throw new Error('File upload failed');
        }
      }

      return portalApi.shareDocumentWithClient(clientId, { ...data, fileUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedDocuments', clientId] });
      setDocumentTitle('');
      setDocumentType('');
      setUploadedFile(null);
      toast.success('Document shared successfully!', {
        duration: 3000,
        position: 'top-center',
        icon: '📄',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to share document', {
        duration: 4000,
        position: 'top-center',
      });
    },
  });

  // Revoke document access mutation
  const revokeDocumentMutation = useMutation({
    mutationFn: (documentId: string) =>
      portalApi.revokeDocumentAccess(clientId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedDocuments', clientId] });
      toast.success('Document access revoked successfully!', {
        duration: 3000,
        position: 'top-center',
        icon: '🔒',
      });
    },
    onError: () => {
      toast.error('Failed to revoke document access', {
        duration: 4000,
        position: 'top-center',
      });
    },
  });

  const handleAssignForm = () => {
    if (selectedFormIds.length === 0) {
      toast.error('Please select at least one form', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    assignFormMutation.mutate({
      formIds: selectedFormIds,
      dueDate: formDueDate || undefined,
      isRequired: isFormRequired,
      clientMessage: clientMessage || undefined,
    });
  };

  const toggleFormSelection = (formId: string) => {
    setSelectedFormIds(prev =>
      prev.includes(formId)
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    );
  };

  const handleShareDocument = () => {
    if (!documentTitle || !documentType) {
      toast.error('Please fill in all required fields', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    shareDocumentMutation.mutate({
      documentTitle,
      documentType,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'COMPLETED':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
        <h2 className="text-3xl font-bold mb-2 flex items-center">
          <span className="mr-3">🌐</span> Client Portal Management
        </h2>
        <p className="text-cyan-100">
          Assign intake forms, share documents, and manage portal access for this client
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form Assignments */}
        <div className="space-y-6">
          {/* Assign New Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-purple-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📝</span> Assign Intake Form
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Forms ({selectedFormIds.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border-2 border-gray-300 rounded-xl p-3 space-y-2">
                  {loadingForms ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  ) : formLibrary.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">No forms available</p>
                  ) : (
                    formLibrary.map((form) => (
                      <label
                        key={form.id}
                        className="flex items-center space-x-3 p-2 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFormIds.includes(form.id)}
                          onChange={() => toggleFormSelection(form.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{form.formName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Message to Client (Optional)
                </label>
                <textarea
                  value={clientMessage}
                  onChange={(e) => setClientMessage(e.target.value)}
                  placeholder="Write a message to the client about these forms..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="required-form"
                  checked={isFormRequired}
                  onChange={(e) => setIsFormRequired(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="required-form" className="text-sm font-semibold text-gray-700">
                  Mark as required
                </label>
              </div>

              <button
                onClick={handleAssignForm}
                disabled={assignFormMutation.isPending}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
              >
                {assignFormMutation.isPending ? 'Assigning...' : 'Assign Form to Client'}
              </button>
            </div>
          </div>

          {/* Assigned Forms List */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📋</span> Assigned Forms
            </h3>

            <div className="space-y-3">
              {loadingAssignments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : formAssignments.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>No forms assigned yet</p>
                </div>
              ) : (
                formAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-4 rounded-xl border-2 ${
                      assignment.status === 'COMPLETED'
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                        : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-1">
                          {assignment.form?.formName || 'Unknown Form'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                        {assignment.dueDate && (
                          <p className="text-sm text-gray-600">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        )}
                        {assignment.completedAt && (
                          <p className="text-sm text-gray-600">
                            Completed: {new Date(assignment.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 ${getStatusBadgeColor(
                          assignment.status
                        )} text-white text-xs font-bold rounded-full`}
                      >
                        {assignment.status}
                      </span>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      {assignment.status !== 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => removeFormMutation.mutate(assignment.id)}
                            disabled={removeFormMutation.isPending}
                            className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => sendFormReminderMutation.mutate(assignment.id)}
                            disabled={sendFormReminderMutation.isPending}
                            className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            Send Reminder
                          </button>
                        </>
                      )}
                      {assignment.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setViewingSubmission({
                              clientId: clientId,
                              assignmentId: assignment.id,
                            });
                          }}
                          className="px-3 py-1 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                          View Submission
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Document Sharing */}
        <div className="space-y-6">
          {/* Share New Document Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-cyan-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📤</span> Share Document
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Enter document title..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                >
                  <option value="">Choose type...</option>
                  <option value="treatment-plan">Treatment Plan</option>
                  <option value="assessment-results">Assessment Results</option>
                  <option value="educational">Educational Material</option>
                  <option value="insurance">Insurance Document</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-gray-400 mb-2">
                      <span className="text-4xl">📁</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-600">
                      {uploadedFile
                        ? uploadedFile.name
                        : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX (Max 10MB)
                    </p>
                  </label>
                </div>
              </div>

              <button
                onClick={handleShareDocument}
                disabled={shareDocumentMutation.isPending}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
              >
                {shareDocumentMutation.isPending ? 'Sharing...' : 'Share Document'}
              </button>
            </div>
          </div>

          {/* Shared Documents List */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-blue-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📄</span> Shared Documents
            </h3>

            <div className="space-y-3">
              {loadingDocuments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : sharedDocuments.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>No documents shared yet</p>
                </div>
              ) : (
                sharedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-1">
                          {document.documentTitle}
                        </h4>
                        <p className="text-sm text-gray-600">Type: {document.documentType}</p>
                        <p className="text-sm text-gray-600">
                          Shared: {new Date(document.sharedAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Views: {document.viewCount}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 ${
                          document.viewCount > 0 ? 'bg-green-500' : 'bg-gray-400'
                        } text-white text-xs font-bold rounded-full`}
                      >
                        {document.viewCount > 0 ? 'VIEWED' : 'NOT VIEWED'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (document.fileUrl) {
                            window.open(document.fileUrl, '_blank');
                          } else {
                            toast.error('No file URL available', {
                              duration: 3000,
                              position: 'top-center',
                            });
                          }
                        }}
                        className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleRevokeClick(document.id)}
                        disabled={revokeDocumentMutation.isPending}
                        className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        Revoke Access
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Portal Access Status */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">✅</span> Portal Access Status
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
                <div>
                  <p className="font-bold text-gray-800">Portal Account</p>
                  <p className="text-sm text-gray-600">Status information coming soon</p>
                </div>
                <span className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl">
                  ACTIVE
                </span>
              </div>

              <button className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Send Portal Access Email
              </button>

              <button className="w-full px-4 py-3 bg-red-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Deactivate Portal Access
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Submission Viewer Modal */}
      {viewingSubmission && (
        <FormSubmissionViewer
          clientId={viewingSubmission.clientId}
          assignmentId={viewingSubmission.assignmentId}
          onClose={() => setViewingSubmission(null)}
        />
      )}

      {/* Revoke Document Confirmation Modal */}
      <ConfirmModal
        isOpen={revokeConfirm.isOpen}
        onClose={() => setRevokeConfirm({ isOpen: false, documentId: '' })}
        onConfirm={confirmRevoke}
        title="Revoke Document Access"
        message="Are you sure you want to revoke access to this document?"
        confirmText="Revoke Access"
        confirmVariant="danger"
      />
    </div>
  );
}
