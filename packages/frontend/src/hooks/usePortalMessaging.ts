import { useState, useCallback } from 'react';
import api from '../lib/api';

export interface PortalMessage {
  id: string;
  clientId: string;
  subject: string;
  message: string;
  sentByClient: boolean;
  sentBy?: string;
  recipientId?: string;
  threadId?: string;
  parentMessageId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  readDate?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
}

interface PortalInboxResponse {
  messages: PortalMessage[];
  unreadCount: number;
  totalCount: number;
}

export const usePortalMessaging = () => {
  const [portalMessages, setPortalMessages] = useState<PortalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalInbox = useCallback(async (options?: {
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (options?.isRead !== undefined) params.isRead = options.isRead;
      if (options?.limit) params.limit = options.limit;
      if (options?.offset) params.offset = options.offset;

      const response = await api.get<{ success: boolean; data: PortalInboxResponse }>(
        '/client-portal/portal-messages/inbox',
        { params }
      );

      if (response.data.success) {
        setPortalMessages(response.data.data.messages);
        setUnreadCount(response.data.data.unreadCount);
        setTotalCount(response.data.data.totalCount);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch portal messages');
      console.error('Error fetching portal inbox:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: { unreadCount: number } }>(
        '/client-portal/portal-messages/unread-count'
      );
      if (response.data.success) {
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  const replyToMessage = useCallback(async (messageId: string, replyText: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ success: boolean; data: PortalMessage }>(
        `/client-portal/portal-messages/${messageId}/reply`,
        { message: replyText }
      );
      if (response.data.success) {
        // Refresh inbox after reply
        await fetchPortalInbox();
        return response.data.data;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reply');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPortalInbox]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const response = await api.put<{ success: boolean }>(
        `/client-portal/portal-messages/${messageId}/read`
      );
      if (response.data.success) {
        // Update local state
        setPortalMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, isRead: true, readDate: new Date().toISOString() } : msg
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Failed to mark message as read:', err);
    }
  }, []);

  return {
    portalMessages,
    unreadCount,
    totalCount,
    loading,
    error,
    fetchPortalInbox,
    fetchUnreadCount,
    replyToMessage,
    markAsRead,
  };
};
