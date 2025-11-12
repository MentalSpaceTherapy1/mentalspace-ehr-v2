import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// Base API URL (relative to /api/v1)
const API_BASE = '/training';

// Types
export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  format: string;
  coverImage?: string;
  ceuCredits: number;
  creditType?: string;
  duration: number;
  required: boolean;
  prerequisites?: string[];
  instructorId?: string;
  instructorName?: string;
  instructorBio?: string;
  materials?: Material[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface Enrollment {
  id: string;
  userId: string;
  userName?: string;
  courseId: string;
  courseName?: string;
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  score?: number;
  lastAccessedAt?: Date;
  completedAt?: Date;
  certificateUrl?: string;
  enrolledAt: Date;
}

export interface CEURecord {
  id: string;
  userId: string;
  courseId: string;
  courseName?: string;
  credits: number;
  creditType: string;
  earnedAt: Date;
  expiresAt?: Date;
}

export interface ComplianceStatus {
  userId: string;
  userName: string;
  department?: string;
  requiredCourses: number;
  completedCourses: number;
  complianceRate: number;
  expiringTrainings: number;
  overdueTrainings: number;
}

export interface TrainingStats {
  totalCourses: number;
  inProgress: number;
  completed: number;
  ceuCreditsEarned: number;
  requiredPending: number;
}

// API Functions

// Courses
const fetchCourses = async (filters?: { category?: string; type?: string; format?: string; search?: string }) => {
  const { data } = await axios.get(`${API_URL}/training/courses`, {
    params: filters,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const fetchCourseById = async (courseId: string) => {
  const { data } = await axios.get(`${API_URL}/training/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const createCourse = async (courseData: Partial<Course>) => {
  const { data } = await axios.post(`${API_URL}/training/courses`, courseData, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const updateCourse = async ({ courseId, courseData }: { courseId: string; courseData: Partial<Course> }) => {
  const { data } = await axios.put(`${API_URL}/training/courses/${courseId}`, courseData, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const deleteCourse = async (courseId: string) => {
  const { data } = await axios.delete(`${API_URL}/training/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

// Enrollments
const fetchEnrollments = async (userId?: string) => {
  const res = await api.get(`${API_BASE}/enrollments`, {
    params: { userId }
  });
  return res.data.data || [];
};

const fetchEnrollmentsByCourse = async (courseId: string) => {
  const { data } = await axios.get(`${API_URL}/training/courses/${courseId}/enrollments`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const enrollUser = async ({ userId, courseId }: { userId: string; courseId: string }) => {
  const { data } = await axios.post(`${API_URL}/training/enrollments`, { userId, courseId }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const bulkEnroll = async ({ userIds, courseIds }: { userIds: string[]; courseIds: string[] }) => {
  const { data } = await axios.post(`${API_URL}/training/enrollments/bulk`, { userIds, courseIds }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const updateEnrollmentProgress = async ({ enrollmentId, progress, score }: { enrollmentId: string; progress: number; score?: number }) => {
  const { data } = await axios.put(`${API_URL}/training/enrollments/${enrollmentId}`, { progress, score }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

// CEU Tracking
const fetchCEURecords = async (userId?: string, year?: number) => {
  const { data } = await axios.get(`${API_URL}/training/ceu`, {
    params: { userId, year },
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const fetchCEUSummary = async (userId?: string, year?: number) => {
  const { data } = await axios.get(`${API_URL}/training/ceu/summary`, {
    params: { userId, year },
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

// Compliance
const fetchComplianceStatus = async (departmentId?: string) => {
  const { data } = await axios.get(`${API_URL}/training/compliance`, {
    params: { departmentId },
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

const sendComplianceReminders = async (userIds: string[]) => {
  const { data } = await axios.post(`${API_URL}/training/compliance/reminders`, { userIds }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return data;
};

// Dashboard Stats
const fetchTrainingStats = async (userId?: string) => {
  const res = await api.get(`${API_BASE}/stats`, {
    params: { userId }
  });
  return res.data.data;
};

const fetchUpcomingTrainings = async (userId?: string) => {
  const res = await api.get(`${API_BASE}/upcoming`, {
    params: { userId }
  });
  return res.data.data || [];
};

// Certificates
const downloadCertificate = async (enrollmentId: string) => {
  const { data } = await axios.get(`${API_URL}/training/certificates/${enrollmentId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    responseType: 'blob'
  });
  return data;
};

// React Query Hooks

// Courses
export const useCourses = (filters?: { category?: string; type?: string; format?: string; search?: string }) => {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => fetchCourses(filters),
  });
};

export const useCourse = (courseId: string) => {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourseById(courseId),
    enabled: !!courseId,
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCourse,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course', variables.courseId] });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};

// Enrollments
export const useEnrollments = (userId?: string) => {
  return useQuery({
    queryKey: ['enrollments', userId],
    queryFn: () => fetchEnrollments(userId),
  });
};

export const useCourseEnrollments = (courseId: string) => {
  return useQuery({
    queryKey: ['enrollments', 'course', courseId],
    queryFn: () => fetchEnrollmentsByCourse(courseId),
    enabled: !!courseId,
  });
};

export const useEnrollUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enrollUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['trainingStats'] });
    },
  });
};

export const useBulkEnroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkEnroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
};

export const useUpdateEnrollmentProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEnrollmentProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['trainingStats'] });
      queryClient.invalidateQueries({ queryKey: ['ceu'] });
    },
  });
};

// CEU Tracking
export const useCEURecords = (userId?: string, year?: number) => {
  return useQuery({
    queryKey: ['ceu', userId, year],
    queryFn: () => fetchCEURecords(userId, year),
  });
};

export const useCEUSummary = (userId?: string, year?: number) => {
  return useQuery({
    queryKey: ['ceuSummary', userId, year],
    queryFn: () => fetchCEUSummary(userId, year),
  });
};

// Compliance
export const useComplianceStatus = (departmentId?: string) => {
  return useQuery({
    queryKey: ['compliance', departmentId],
    queryFn: () => fetchComplianceStatus(departmentId),
  });
};

export const useSendComplianceReminders = () => {
  return useMutation({
    mutationFn: sendComplianceReminders,
  });
};

// Dashboard
export const useTrainingStats = (userId?: string) => {
  return useQuery({
    queryKey: ['trainingStats', userId],
    queryFn: () => fetchTrainingStats(userId),
  });
};

export const useUpcomingTrainings = (userId?: string) => {
  return useQuery({
    queryKey: ['upcomingTrainings', userId],
    queryFn: () => fetchUpcomingTrainings(userId),
  });
};

// Certificates
export const useDownloadCertificate = () => {
  return useMutation({
    mutationFn: downloadCertificate,
    onSuccess: (blob, enrollmentId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${enrollmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};
