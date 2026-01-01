import api from './api';

/**
 * Client Portal API Service
 * EHR-side APIs for clinicians to manage client portal features
 */

// =============== FORM MANAGEMENT ===============

export interface IntakeForm {
  id: string;
  formName: string;
  formDescription: string;
  formType: string;
  isActive: boolean;
  isRequired: boolean;
  assignedToNewClients: boolean;
}

export interface FormAssignment {
  id: string;
  clientId: string;
  formId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate: string | null;
  completedAt: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isRequired: boolean;
  assignmentNotes?: string;
  lastReminderSent?: string;
  form?: {
    formName: string;
    formDescription: string;
  };
  submission?: any;
}

export interface AssignFormRequest {
  formId: string;
  dueDate?: string;
  isRequired?: boolean;
  assignmentNotes?: string;
  clientMessage?: string;
}

/**
 * Get all available forms from the library
 */
export const getFormLibrary = async (isActive?: boolean): Promise<IntakeForm[]> => {
  const params = isActive !== undefined ? { isActive } : {};
  const response = await api.get('/clients/library', { params });
  return response.data.data;
};

/**
 * Get all form assignments for a specific client
 */
export const getClientFormAssignments = async (clientId: string): Promise<FormAssignment[]> => {
  const response = await api.get(`/clients/${clientId}/forms`);
  return response.data.data;
};

/**
 * Assign a form to a client
 */
export const assignFormToClient = async (
  clientId: string,
  data: AssignFormRequest
): Promise<FormAssignment> => {
  const response = await api.post(`/clients/${clientId}/forms/assign`, data);
  return response.data.data;
};

/**
 * Remove a form assignment
 */
export const removeFormAssignment = async (
  clientId: string,
  assignmentId: string
): Promise<void> => {
  await api.delete(`/clients/${clientId}/forms/${assignmentId}`);
};

/**
 * Send a reminder for a pending form
 */
export const sendFormReminder = async (
  clientId: string,
  assignmentId: string
): Promise<void> => {
  await api.post(`/clients/${clientId}/forms/${assignmentId}/remind`);
};

/**
 * View a form submission
 */
export const viewFormSubmission = async (
  clientId: string,
  assignmentId: string
): Promise<any> => {
  const response = await api.get(`/clients/${clientId}/forms/${assignmentId}/submission`);
  return response.data.data;
};

// =============== DOCUMENT MANAGEMENT ===============

export interface SharedDocument {
  id: string;
  clientId: string;
  documentName: string;
  documentType: string;
  documentS3Key: string;
  sharedBy: string;
  sharedAt: string;
  expiresAt?: string;
  viewCount: number;
  lastViewedAt?: string;
  isActive: boolean;
}

export interface ShareDocumentRequest {
  documentName: string;
  documentType: string;
  documentS3Key: string;
  expiresAt?: string;
}

export interface DocumentAnalytics {
  viewCount: number;
  lastViewedAt?: string;
  firstViewedAt?: string;
}

/**
 * Get all documents shared with a client
 */
export const getSharedDocumentsForClient = async (
  clientId: string
): Promise<SharedDocument[]> => {
  const response = await api.get(`/clients/${clientId}/documents/shared`);
  return response.data.data;
};

/**
 * Share a document with a client
 */
export const shareDocumentWithClient = async (
  clientId: string,
  data: ShareDocumentRequest
): Promise<SharedDocument> => {
  const response = await api.post(`/clients/${clientId}/documents/share`, data);
  return response.data.data;
};

/**
 * Revoke access to a shared document
 */
export const revokeDocumentAccess = async (
  clientId: string,
  documentId: string
): Promise<void> => {
  await api.delete(`/clients/${clientId}/documents/shared/${documentId}`);
};

/**
 * Get analytics for a shared document
 */
export const getDocumentAnalytics = async (
  clientId: string,
  documentId: string
): Promise<DocumentAnalytics> => {
  const response = await api.get(
    `/clients/${clientId}/documents/shared/${documentId}/analytics`
  );
  return response.data.data;
};

/**
 * Upload a document file
 */
export const uploadDocumentFile = async (file: File): Promise<{ fileUrl: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/clients/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data;
};

// =============== PORTAL ACCESS MANAGEMENT ===============

export interface PortalStatus {
  hasPortalAccount: boolean;
  portalAccount: {
    id: string;
    email: string;
    accountStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED';
    portalAccessGranted: boolean;
    lastLoginDate: string | null;
    createdAt: string;
  } | null;
}

/**
 * Get portal account status for a client
 */
export const getPortalStatus = async (clientId: string): Promise<PortalStatus> => {
  const response = await api.get(`/client-portal/clients/${clientId}/portal-status`);
  return response.data.data;
};

/**
 * Send portal invitation to a client (creates portal account)
 */
export const sendPortalInvitation = async (clientId: string): Promise<{
  success: boolean;
  portalAccountId: string;
  email: string;
  invitationSent: boolean;
}> => {
  const response = await api.post(`/client-portal/clients/${clientId}/invite`);
  return response.data.data;
};

/**
 * Resend portal invitation email
 */
export const resendPortalInvitation = async (clientId: string): Promise<{
  success: boolean;
  message: string;
  emailSent: boolean;
}> => {
  const response = await api.post(`/client-portal/clients/${clientId}/resend-invitation`);
  return response.data.data;
};

/**
 * Deactivate a portal account (admin only)
 */
export const deactivatePortalAccount = async (portalAccountId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await api.post(`/admin/portal/accounts/${portalAccountId}/deactivate`);
  return response.data;
};

/**
 * Activate a portal account (admin only)
 */
export const activatePortalAccount = async (portalAccountId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await api.post(`/admin/portal/accounts/${portalAccountId}/activate`);
  return response.data;
};
