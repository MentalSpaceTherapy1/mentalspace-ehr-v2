import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as portalApi from '../../lib/portalApi';

interface PortalTabProps {
  clientId: string;
}

export default function PortalTab({ clientId }: PortalTabProps) {
  const queryClient = useQueryClient();

  // Form assignment state
  const [selectedFormId, setSelectedFormId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [isFormRequired, setIsFormRequired] = useState(false);

  // Document sharing state
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
    mutationFn: (data: portalApi.AssignFormRequest) =>
      portalApi.assignFormToClient(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientForms', clientId] });
      setSelectedFormId('');
      setFormDueDate('');
      setIsFormRequired(false);
      alert('Form assigned successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to assign form');
    },
  });

  // Remove form mutation
  const removeFormMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      portalApi.removeFormAssignment(clientId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientForms', clientId] });
      alert('Form assignment removed successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to remove form assignment');
    },
  });

  // Send form reminder mutation
  const sendFormReminderMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      portalApi.sendFormReminder(clientId, assignmentId),
    onSuccess: () => {
      alert('Reminder sent successfully!');
    },
    onError: () => {
      alert('Failed to send reminder');
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
      alert('Document shared successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to share document');
    },
  });

  // Revoke document access mutation
  const revokeDocumentMutation = useMutation({
    mutationFn: (documentId: string) =>
      portalApi.revokeDocumentAccess(clientId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedDocuments', clientId] });
      alert('Document access revoked successfully!');
    },
    onError: () => {
      alert('Failed to revoke document access');
    },
  });

  const handleAssignForm = () => {
    if (!selectedFormId) {
      alert('Please select a form');
      return;
    }

    assignFormMutation.mutate({
      formId: selectedFormId,
      dueDate: formDueDate || undefined,
      isRequired: isFormRequired,
    });
  };

  const handleShareDocument = () => {
    if (!documentTitle || !documentType) {
      alert('Please fill in all required fields');
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
                  Select Form
                </label>
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={loadingForms}
                >
                  <option value="">Choose a form...</option>
                  {formLibrary.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.formName}
                    </option>
                  ))}
                </select>
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
                            // View submission logic
                            alert('View submission feature coming soon!');
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
                            alert('No file URL available');
                          }
                        }}
                        className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm('Are you sure you want to revoke access to this document?')
                          ) {
                            revokeDocumentMutation.mutate(document.id);
                          }
                        }}
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
    </div>
  );
}
