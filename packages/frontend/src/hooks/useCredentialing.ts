import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Base API URL (relative to /api/v1)
const API_BASE = '/credentialing';

// Types
export interface Credential {
  id: string;
  staffId: string;
  staffName: string;
  type: 'LICENSE' | 'CERTIFICATION' | 'DEA' | 'NPI' | 'INSURANCE' | 'OTHER';
  credentialNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expirationDate: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED';
  documentUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  alertThresholdDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialVerification {
  id: string;
  credentialId: string;
  verifiedBy: string;
  verifiedAt: string;
  status: 'VERIFIED' | 'REJECTED' | 'PENDING';
  notes: string;
  documentReviewed: boolean;
}

export interface ScreeningResult {
  id: string;
  staffId: string;
  staffName: string;
  screeningType: 'OIG' | 'SAM' | 'NPDB';
  status: 'CLEAR' | 'FLAGGED' | 'PENDING';
  screenedAt: string;
  nextScreeningDate: string;
  findings?: string;
}

export interface ExpirationAlert {
  id: string;
  credentialId: string;
  staffName: string;
  credentialType: string;
  expirationDate: string;
  daysUntilExpiration: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  dismissed: boolean;
}

export interface ComplianceStats {
  totalCredentials: number;
  activeCredentials: number;
  expiringCredentials: number;
  expiredCredentials: number;
  pendingVerification: number;
  complianceRate: number;
  credentialsByType: Record<string, number>;
  credentialsByStatus: Record<string, number>;
}

// GET all credentials
export const useCredentials = (filters?: {
  staffId?: string;
  type?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['credentials', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters?.staffId) params.staffId = filters.staffId;
      if (filters?.type) params.type = filters.type;
      if (filters?.status) params.status = filters.status;

      const res = await api.get(API_BASE, { params });
      return res.data.data as Credential[];
    }
  });
};

// GET single credential
export const useCredential = (id: string) => {
  return useQuery({
    queryKey: ['credential', id],
    queryFn: async () => {
      const res = await api.get(`${API_BASE}/${id}`);
      return res.data.data as Credential;
    },
    enabled: !!id
  });
};

// CREATE credential
export const useCreateCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Credential>) => {
      const res = await api.post(API_BASE, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    }
  });
};

// UPDATE credential
export const useUpdateCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Credential> }) => {
      const res = await api.put(`${API_BASE}/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      queryClient.invalidateQueries({ queryKey: ['credential', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    }
  });
};

// DELETE credential
export const useDeleteCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`${API_BASE}/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    }
  });
};

// VERIFY credential
export const useVerifyCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      credentialId,
      status,
      notes
    }: {
      credentialId: string;
      status: 'VERIFIED' | 'REJECTED';
      notes: string
    }) => {
      const res = await api.post(`${API_BASE}/${credentialId}/verify`, { status, notes });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      queryClient.invalidateQueries({ queryKey: ['credential', variables.credentialId] });
      queryClient.invalidateQueries({ queryKey: ['verification-history'] });
    }
  });
};

// GET verification history
export const useVerificationHistory = (credentialId: string) => {
  return useQuery({
    queryKey: ['verification-history', credentialId],
    queryFn: async () => {
      const res = await api.get(`${API_BASE}/${credentialId}/verifications`);
      return res.data.data as CredentialVerification[];
    },
    enabled: !!credentialId
  });
};

// GET expiration alerts
export const useExpirationAlerts = (filters?: {
  urgency?: string;
  dismissed?: boolean;
}) => {
  return useQuery({
    queryKey: ['expiration-alerts', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters?.urgency) params.urgency = filters.urgency;
      if (filters?.dismissed !== undefined) params.dismissed = String(filters.dismissed);

      const res = await api.get(`${API_BASE}/alerts`, { params });
      return res.data.data as ExpirationAlert[];
    }
  });
};

// DISMISS alert
export const useDismissAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const res = await api.post(`${API_BASE}/alerts/${alertId}/dismiss`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiration-alerts'] });
    }
  });
};

// GET compliance stats
export const useComplianceStats = () => {
  return useQuery({
    queryKey: ['compliance-stats'],
    queryFn: async () => {
      const res = await api.get(`${API_BASE}/stats`);
      return res.data.data as ComplianceStats;
    }
  });
};

// GET screening results
export const useScreeningResults = (staffId?: string) => {
  return useQuery({
    queryKey: ['screening-results', staffId],
    queryFn: async () => {
      const params = staffId ? { staffId } : {};
      const res = await api.get(`${API_BASE}/screening`, { params });
      return res.data.data as ScreeningResult[];
    }
  });
};

// RUN screening
export const useRunScreening = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      staffId,
      screeningType
    }: {
      staffId: string;
      screeningType: 'OIG' | 'SAM' | 'NPDB'
    }) => {
      const res = await api.post(`${API_BASE}/screening/run`, { staffId, screeningType });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-results'] });
    }
  });
};

// UPLOAD document
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      credentialId,
      file
    }: {
      credentialId: string;
      file: File
    }) => {
      const formData = new FormData();
      formData.append('document', file);

      const res = await api.post(`${API_BASE}/${credentialId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credential', variables.credentialId] });
    }
  });
};

// GET credential timeline
export const useCredentialTimeline = (credentialId: string) => {
  return useQuery({
    queryKey: ['credential-timeline', credentialId],
    queryFn: async () => {
      const res = await api.get(`${API_BASE}/${credentialId}/timeline`);
      return res.data.data;
    },
    enabled: !!credentialId
  });
};
