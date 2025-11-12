import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  type: 'DIRECT' | 'GROUP' | 'TEAM' | 'BROADCAST';
  description?: string;
  memberCount: number;
  unreadCount: number;
  lastMessageAt?: string;
  createdAt: string;
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
      const response = await axios.get(`${API_URL}/api/messaging/messages`, {
        params: { channelId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setMessages(response.data);
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
      const response = await axios.get(`${API_URL}/api/messaging/channels`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setChannels(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (data: {
    subject?: string;
    body: string;
    priority?: string;
    recipientIds?: string[];
    channelId?: string;
    threadId?: string;
    attachments?: File[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (data.subject) formData.append('subject', data.subject);
      formData.append('body', data.body);
      if (data.priority) formData.append('priority', data.priority);
      if (data.recipientIds) formData.append('recipientIds', JSON.stringify(data.recipientIds));
      if (data.channelId) formData.append('channelId', data.channelId);
      if (data.threadId) formData.append('threadId', data.threadId);
      if (data.attachments) {
        data.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await axios.post(`${API_URL}/api/messaging/messages`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async (data: {
    name: string;
    type: string;
    description?: string;
    memberIds: string[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/messaging/channels`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create channel');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await axios.patch(
        `${API_URL}/api/messaging/messages/${messageId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (err: any) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const searchMessages = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/messaging/messages/search`, {
        params: { query },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.data;
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
