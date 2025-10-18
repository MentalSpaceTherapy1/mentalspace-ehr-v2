import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  subject: string;
  message: string;
  sentByClient: boolean;
  isRead: boolean;
  createdAt: string;
  threadId: string;
  priority: string;
  parentMessageId?: string;
}

export default function PortalMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New message form state
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<'Low' | 'Normal' | 'High' | 'Urgent'>('Normal');

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      fetchThreadMessages(selectedThread);
    }
  }, [selectedThread]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/portal/messages'
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalRefreshToken');
        localStorage.removeItem('portalClient');
        navigate('/portal/login');
      } else {
        toast.error('Failed to load messages');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    try {
      const response = await api.get(`/portal/messages/thread/${threadId}`
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setThreadMessages(response.data.data);
      }
    } catch (error: any) {
      toast.error('Failed to load conversation');
    }
  };

  const handleSendNewMessage = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSending(true);
      const response = await api.post(
        '/portal/messages',
        {
          subject: newSubject,
          message: newMessage,
          priority: newPriority,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Message sent successfully');
        setShowNewMessage(false);
        setNewSubject('');
        setNewMessage('');
        setNewPriority('Normal');
        fetchMessages();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedThread) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setIsSending(true);

      // Find the original message in the thread
      const originalMessage = threadMessages[0];
      if (!originalMessage) return;

      const response = await api.post(
        `/portal/messages/${originalMessage.id}/reply`,
        { message: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Reply sent successfully');
        setReplyText('');
        fetchThreadMessages(selectedThread);
        fetchMessages();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await api.post(
        `/portal/messages/${messageId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (error: any) {
      // Silently fail
    }
  };

  const handleThreadClick = (threadId: string) => {
    setSelectedThread(threadId);
    // Mark first unread message in thread as read
    const unreadMessage = messages.find((m) => m.threadId === threadId && !m.isRead && !m.sentByClient);
    if (unreadMessage) {
      handleMarkAsRead(unreadMessage.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US'
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US'
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: 'text-gray-500 bg-gray-100',
      Normal: 'text-blue-600 bg-blue-100',
      High: 'text-orange-600 bg-orange-100',
      Urgent: 'text-red-600 bg-red-100',
    };
    return colors[priority] || 'text-gray-500 bg-gray-100';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'Urgent') {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  // Group messages by thread and get the most recent message for each thread
  const uniqueThreads = Array.from(new Map(messages.map((m) => [m.threadId, m])).values());

  // Count unread messages
  const unreadCount = messages.filter((m) => !m.isRead && !m.sentByClient).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Secure communication with your care team
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowNewMessage(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Message
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Conversations</h3>
              {uniqueThreads.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{uniqueThreads.length} thread{uniqueThreads.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : uniqueThreads.length === 0 ? (
                <div className="p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-gray-900">No messages yet</p>
                  <p className="mt-1 text-sm text-gray-500">Start a conversation with your care team</p>
                </div>
              ) : (
                uniqueThreads.map((message) => {
                  const hasUnread = !message.isRead && !message.sentByClient;
                  return (
                    <button
                      key={message.threadId}
                      onClick={() => handleThreadClick(message.threadId)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedThread === message.threadId ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4
                          className={`text-sm font-medium flex-1 pr-2 ${
                            hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {message.subject}
                        </h4>
                        {hasUnread && (
                          <span className="inline-block w-2.5 h-2.5 bg-indigo-600 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className={`text-xs line-clamp-2 mb-2 ${hasUnread ? 'text-gray-600' : 'text-gray-500'}`}>
                        {message.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{formatDate(message.createdAt)}</span>
                        {message.priority !== 'Normal' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(message.priority)}`}>
                            {getPriorityIcon(message.priority)}
                            <span className="ml-1">{message.priority}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            {selectedThread ? (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {threadMessages[0]?.subject || 'Conversation'}
                      </h3>
                      {threadMessages[0]?.priority !== 'Normal' && (
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(threadMessages[0]?.priority)}`}>
                          {getPriorityIcon(threadMessages[0]?.priority)}
                          <span className="ml-1">{threadMessages[0]?.priority} Priority</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="ml-4 text-gray-400 hover:text-gray-600 transition-colors lg:hidden"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto bg-gray-50">
                  {threadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sentByClient ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                          msg.sentByClient
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.sentByClient ? 'bg-white/20' : 'bg-indigo-100'
                          }`}>
                            {msg.sentByClient ? (
                              <span className="text-sm font-medium text-white">You</span>
                            ) : (
                              <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs font-medium mb-1 ${
                              msg.sentByClient ? 'text-white/80' : 'text-gray-600'
                            }`}>
                              {msg.sentByClient ? 'You' : 'Care Team'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        <p
                          className={`text-xs mt-3 ${
                            msg.sentByClient ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleString('en-US'
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={isSending || !replyText.trim()}
                      className="sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSending ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[550px]">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No conversation selected</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Select a conversation from the list or start a new message
                  </p>
                  <button
                    onClick={() => setShowNewMessage(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Start New Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900">New Message</h3>
              <button
                onClick={() => {
                  setShowNewMessage(false);
                  setNewSubject('');
                  setNewMessage('');
                  setNewPriority('Normal');
                }}
                disabled={isSending}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="What is this message about?"
                  disabled={isSending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as 'Low' | 'Normal' | 'High' | 'Urgent')
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  disabled={isSending}
                >
                  <option value="Low">Low - General inquiry</option>
                  <option value="Normal">Normal - Standard question</option>
                  <option value="High">High - Important matter</option>
                  <option value="Urgent">Urgent - Needs immediate attention</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose "Urgent" only for time-sensitive matters. For emergencies, call 911.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Type your message here..."
                  disabled={isSending}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your care team will respond within 1-2 business days.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Important Note</h4>
                    <p className="mt-1 text-sm text-yellow-700">
                      This is not for emergencies. If you're experiencing a mental health crisis, please call 911 or the National Suicide Prevention Lifeline at 988.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 border-t border-gray-200 rounded-b-xl">
              <button
                onClick={() => {
                  setShowNewMessage(false);
                  setNewSubject('');
                  setNewMessage('');
                  setNewPriority('Normal');
                }}
                disabled={isSending}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewMessage}
                disabled={isSending || !newSubject.trim() || !newMessage.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSending ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Message
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
