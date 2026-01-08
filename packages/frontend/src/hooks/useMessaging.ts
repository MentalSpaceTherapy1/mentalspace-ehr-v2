import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Message {
  id: string;
  subject: string;
  body: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  senderId: string;
  senderName: string;
  recipientIds: string[];
  channelId?: string;
  threadId?: string;
  attachments?: any[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Channel {
  id: string;
  name: string;
  channelType: 'DEPARTMENT' | 'TEAM' | 'PROJECT' | 'GENERAL' | 'ANNOUNCEMENTS';
  description?: string;
  memberIds?: string[];
  adminIds?: string[];
  isPrivate?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Thread {
  id: string;
  messages: Message[];
  participants: any[];
}

export const useMessaging = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async (channelId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: Message[]; count: number }>('/messages', {
        params: { channelId },
      });
      if (response.data.success) {
        setMessages(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: Channel[]; count: number }>('/messages/channels');
      if (response.data.success) {
        setChannels(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (data: {
    subject?: string;
    body: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    recipientIds?: string[];
    recipientType?: 'INDIVIDUAL' | 'DEPARTMENT' | 'TEAM' | 'ALL_STAFF' | 'ROLE_BASED';
    channelId?: string;
    threadId?: string;
    replyToId?: string;
    messageType?: 'DIRECT' | 'BROADCAST' | 'ANNOUNCEMENT' | 'ALERT' | 'SHIFT_HANDOFF';
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Backend expects JSON, not FormData
      const payload = {
        body: data.body,
        subject: data.subject,
        priority: data.priority || 'NORMAL',
        recipientType: data.recipientType || 'INDIVIDUAL',
        recipientIds: data.recipientIds || [],
        messageType: data.messageType || 'DIRECT',
        threadId: data.threadId,
        replyToId: data.replyToId,
      };

      const response = await api.post<{ success: boolean; message: string; data: Message }>('/messages', payload);
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async (data: {
    name: string;
    channelType: 'DEPARTMENT' | 'TEAM' | 'PROJECT' | 'GENERAL' | 'ANNOUNCEMENTS';
    description?: string;
    memberIds: string[];
    adminIds: string[];
    isPrivate?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ success: boolean; message: string; data: Channel }>('/messages/channels', data);
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create channel');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await api.put(`/messages/${messageId}/read`);
    } catch (err: any) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const searchMessages = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      // Note: Backend doesn't have a dedicated search endpoint yet
      // For now, fetch all messages and filter client-side
      const response = await api.get<{ success: boolean; data: Message[]; count: number }>('/messages');
      if (response.data.success) {
        const allMessages = response.data.data || [];
        const filtered = allMessages.filter(msg =>
          msg.subject?.toLowerCase().includes(query.toLowerCase()) ||
          msg.body?.toLowerCase().includes(query.toLowerCase())
        );
        return filtered;
      }
      return [];
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search messages');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    channels,
    loading,
    error,
    fetchMessages,
    fetchChannels,
    sendMessage,
    createChannel,
    markAsRead,
    searchMessages,
  };
};
