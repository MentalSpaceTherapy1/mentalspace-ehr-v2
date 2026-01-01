import { useState, useEffect } from 'react';
import api from '../lib/api';

export interface OnboardingProcess {
  id: string;
  staffId: string;
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string;
    department: string;
    jobTitle: string;
  };
  mentorId?: string;
  mentor?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  };
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  completionPercentage: number;
  checklists?: OnboardingChecklist[];
  milestones?: OnboardingMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingChecklist {
  id: string;
  onboardingId: string;
  category: string;
  itemName: string;
  description?: string;
  dueDate?: string;
  completedDate?: string;
  isCompleted: boolean;
  isRequired: boolean;
  assignedTo?: string;
  notes?: string;
  order: number;
}

export interface OnboardingMilestone {
  id: string;
  onboardingId: string;
  milestoneName: string;
  milestoneType: 'DAY_1' | 'WEEK_1' | 'DAY_30' | 'DAY_60' | 'DAY_90' | 'CUSTOM';
  scheduledDate: string;
  completedDate?: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
  description?: string;
  checklist?: string[];
  celebrationShown?: boolean;
}

export interface OnboardingStats {
  total: number;
  active: number;
  completed: number;
  delayed: number;
  avgCompletionDays: number;
  overdueItems: number;
}

export const useOnboarding = () => {
  const [onboardings, setOnboardings] = useState<OnboardingProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOnboardings = async (filters?: {
    status?: string;
    mentorId?: string;
    search?: string;
  }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.mentorId) params.append('mentorId', filters.mentorId);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get(`/onboarding?${params.toString()}`);
      setOnboardings(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch onboardings');
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingById = async (id: string): Promise<OnboardingProcess | null> => {
    try {
      const response = await api.get(`/onboarding/${id}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch onboarding');
      return null;
    }
  };

  const createOnboarding = async (data: Partial<OnboardingProcess>): Promise<OnboardingProcess | null> => {
    try {
      const response = await api.post('/onboarding', data);
      await fetchOnboardings();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create onboarding');
      return null;
    }
  };

  const updateOnboarding = async (id: string, data: Partial<OnboardingProcess>): Promise<OnboardingProcess | null> => {
    try {
      const response = await api.put(`/onboarding/${id}`, data);
      await fetchOnboardings();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update onboarding');
      return null;
    }
  };

  const getStats = async (): Promise<OnboardingStats | null> => {
    try {
      const response = await api.get('/onboarding/stats');
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      return null;
    }
  };

  useEffect(() => {
    fetchOnboardings();
  }, []);

  return {
    onboardings,
    loading,
    error,
    fetchOnboardings,
    getOnboardingById,
    createOnboarding,
    updateOnboarding,
    getStats,
  };
};

export const useOnboardingChecklist = (onboardingId: string) => {
  const [checklist, setChecklist] = useState<OnboardingChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/onboarding/${onboardingId}/checklist`);
      setChecklist(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch checklist');
    } finally {
      setLoading(false);
    }
  };

  const addChecklistItem = async (data: Partial<OnboardingChecklist>): Promise<OnboardingChecklist | null> => {
    try {
      const response = await api.post(`/onboarding/${onboardingId}/checklist`, data);
      await fetchChecklist();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add checklist item');
      return null;
    }
  };

  const updateChecklistItem = async (itemId: string, data: Partial<OnboardingChecklist>): Promise<OnboardingChecklist | null> => {
    try {
      const response = await api.put(`/onboarding/${onboardingId}/checklist/${itemId}`, data);
      await fetchChecklist();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update checklist item');
      return null;
    }
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean): Promise<boolean> => {
    try {
      await api.patch(
        `/onboarding/${onboardingId}/checklist/${itemId}/toggle`,
        { isCompleted }
      );
      await fetchChecklist();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle checklist item');
      return false;
    }
  };

  useEffect(() => {
    if (onboardingId) fetchChecklist();
  }, [onboardingId]);

  return {
    checklist,
    loading,
    error,
    fetchChecklist,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
  };
};

export const useOnboardingMilestones = (onboardingId: string) => {
  const [milestones, setMilestones] = useState<OnboardingMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/onboarding/${onboardingId}/milestones`);
      setMilestones(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  };

  const completeMilestone = async (milestoneId: string): Promise<boolean> => {
    try {
      await api.patch(
        `/onboarding/${onboardingId}/milestones/${milestoneId}/complete`,
        {}
      );
      await fetchMilestones();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete milestone');
      return false;
    }
  };

  const addMilestone = async (data: Partial<OnboardingMilestone>): Promise<OnboardingMilestone | null> => {
    try {
      const response = await api.post(`/onboarding/${onboardingId}/milestones`, data);
      await fetchMilestones();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add milestone');
      return null;
    }
  };

  useEffect(() => {
    if (onboardingId) fetchMilestones();
  }, [onboardingId]);

  return {
    milestones,
    loading,
    error,
    fetchMilestones,
    completeMilestone,
    addMilestone,
  };
};
