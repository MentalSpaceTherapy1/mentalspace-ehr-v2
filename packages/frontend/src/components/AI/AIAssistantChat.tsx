/**
 * AI Personal Assistant Chat Component
 *
 * A comprehensive AI chat interface that provides access to clinical and
 * operational data. Features include conversation management, real-time
 * streaming responses, and suggested queries.
 *
 * Features:
 * - Full conversation history
 * - Real-time streaming responses
 * - Conversation sidebar with history
 * - Suggested queries based on context
 * - Data source badges showing what was accessed
 * - Pin and archive conversations
 *
 * @component
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  MessageCircle,
  History,
  Plus,
  Pin,
  PinOff,
  Archive,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  Database,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import api from '../../lib/api';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  dataSourcesAccessed?: string[];
  isError?: boolean;
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string | null;
  topic: 'CLINICAL' | 'OPERATIONAL' | 'REPORTING' | 'GENERAL';
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: { messages: number };
}

interface AIAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialClientName?: string;
}

// ============================================================================
// SUGGESTED QUERIES
// ============================================================================

const SUGGESTED_QUERIES = {
  clinical: [
    "What clients are due for a progress note?",
    "Show me clients with GAD-7 scores above 15",
    "Which treatment plans need updating?",
    "List clients who haven't been seen in 30+ days",
  ],
  operational: [
    "What's the no-show rate this month?",
    "How many appointments do we have today?",
    "Show me pending charges waiting for submission",
    "What's our revenue compared to last month?",
  ],
  reporting: [
    "Generate a summary of this week's appointments",
    "Show me productivity metrics for the team",
    "What's our collection rate this quarter?",
    "List credentials expiring in the next 90 days",
  ],
  general: [
    "How do I create a group session?",
    "What reports are available?",
    "Help me understand the billing workflow",
    "What's the process for adding a new client?",
  ],
};

// ============================================================================
// TOPIC BADGES
// ============================================================================

const TopicBadge = ({ topic }: { topic: string }) => {
  const colors: Record<string, string> = {
    CLINICAL: 'bg-blue-100 text-blue-800',
    OPERATIONAL: 'bg-green-100 text-green-800',
    REPORTING: 'bg-purple-100 text-purple-800',
    GENERAL: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[topic] || colors.GENERAL}`}>
      {topic.charAt(0) + topic.slice(1).toLowerCase()}
    </span>
  );
};

// ============================================================================
// DATA SOURCE BADGES
// ============================================================================

const DataSourceBadges = ({ sources }: { sources: string[] }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {sources.map((source) => (
        <span
          key={source}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
        >
          <Database className="w-3 h-3 mr-1" />
          {source}
        </span>
      ))}
    </div>
  );
};

// ============================================================================
// MESSAGE COMPONENT
// ============================================================================

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-indigo-600 ml-2'
              : isError
              ? 'bg-red-100 mr-2'
              : 'bg-gradient-to-br from-purple-500 to-blue-500 mr-2'
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : isError
              ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
          }`}
        >
          {/* Streaming indicator */}
          {message.isStreaming && (
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}

          {/* Message text with markdown-like formatting */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>

          {/* Data sources */}
          {!isUser && message.dataSourcesAccessed && (
            <DataSourceBadges sources={message.dataSourcesAccessed} />
          )}

          {/* Timestamp */}
          <div
            className={`text-xs mt-2 ${
              isUser ? 'text-indigo-200' : 'text-gray-400'
            }`}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONVERSATION LIST ITEM
// ============================================================================

const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  onPin,
  onArchive,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {conversation.isPinned && <Pin className="w-3 h-3 text-indigo-500" />}
            <span className="text-sm font-medium text-gray-900 truncate">
              {conversation.title || 'New conversation'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <TopicBadge topic={conversation.topic} />
            <span className="text-xs text-gray-400">
              {conversation._count?.messages || 0} messages
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="absolute right-2 top-2 flex gap-1 bg-white rounded shadow-sm border p-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title={conversation.isPinned ? 'Unpin' : 'Pin'}
          >
            {conversation.isPinned ? (
              <PinOff className="w-3 h-3 text-gray-500" />
            ) : (
              <Pin className="w-3 h-3 text-gray-500" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Archive"
          >
            <Archive className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-100 rounded"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIAssistantChat({
  isOpen,
  onClose,
  initialClientId,
  initialClientName,
}: AIAssistantChatProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/ai/assistant/conversations');
      if (response.data.success) {
        setConversations(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err.response?.data?.message || err.message || err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch single conversation with messages
  const fetchConversation = useCallback(async (id: string) => {
    try {
      const response = await api.get(`/ai/assistant/conversations/${id}`);
      if (response.data.success) {
        const conv = response.data.data;
        setActiveConversation(conv);
        setMessages(
          conv.messages?.map((m: any) => ({
            id: m.id,
            role: m.role.toLowerCase(),
            content: m.content,
            createdAt: m.createdAt,
            dataSourcesAccessed: m.dataSourcesAccessed,
            isError: m.isError,
          })) || []
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation:', err.response?.data?.message || err.message || err);
      setError('Failed to load conversation');
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when conversation changes
  useEffect(() => {
    if (activeConversation) {
      inputRef.current?.focus();
    }
  }, [activeConversation]);

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);
    setError(null);

    // Add streaming placeholder
    const streamingId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: streamingId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await api.post('/ai/assistant/chat', {
        message: userMessage.content,
        conversationId: activeConversation?.id || null,
      });

      if (response.data.success) {
        const { conversationId, messageId, content, topic, dataSourcesAccessed } = response.data.data;

        // Update streaming message with actual response
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  id: messageId,
                  content,
                  dataSourcesAccessed,
                  isStreaming: false,
                }
              : m
          )
        );

        // Update or set active conversation
        if (!activeConversation || activeConversation.id !== conversationId) {
          setActiveConversation({
            id: conversationId,
            title: null,
            topic,
            isPinned: false,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          // Refresh conversations list
          fetchConversations();
        }
      }
    } catch (err: any) {
      console.error('Failed to send message:', err.response?.data?.message || err.message || err);
      // Remove streaming placeholder and show error
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== streamingId)
          .concat({
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: err.response?.data?.message || 'Failed to send message. Please try again.',
            createdAt: new Date().toISOString(),
            isError: true,
          })
      );
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  // Pin conversation
  const pinConversation = async (id: string, pinned: boolean) => {
    try {
      await api.patch(`/ai/assistant/conversations/${id}/pin`, { pinned: !pinned });
      fetchConversations();
      if (activeConversation?.id === id) {
        setActiveConversation((prev) => (prev ? { ...prev, isPinned: !pinned } : null));
      }
    } catch (err: any) {
      console.error('Failed to pin conversation:', err.response?.data?.message || err.message || err);
    }
  };

  // Archive conversation
  const archiveConversation = async (id: string) => {
    try {
      await api.patch(`/ai/assistant/conversations/${id}/archive`);
      fetchConversations();
      if (activeConversation?.id === id) {
        startNewConversation();
      }
    } catch (err: any) {
      console.error('Failed to archive conversation:', err.response?.data?.message || err.message || err);
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await api.delete(`/ai/assistant/conversations/${id}`);
      fetchConversations();
      if (activeConversation?.id === id) {
        startNewConversation();
      }
    } catch (err: any) {
      console.error('Failed to delete conversation:', err.response?.data?.message || err.message || err);
    }
  };

  // Use suggested query
  const useSuggestedQuery = (query: string) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Chat Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-4xl bg-white shadow-2xl">
        {/* Sidebar - Conversation History */}
        <div
          className={`${
            showSidebar ? 'w-72' : 'w-0'
          } transition-all duration-300 border-r bg-gray-50 flex flex-col overflow-hidden`}
        >
          {showSidebar && (
            <>
              {/* Sidebar Header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">History</span>
                  </div>
                  <button
                    onClick={startNewConversation}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="New conversation"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={fetchConversations}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={activeConversation?.id === conv.id}
                      onClick={() => fetchConversation(conv.id)}
                      onPin={() => pinConversation(conv.id, conv.isPinned)}
                      onArchive={() => archiveConversation(conv.id)}
                      onDelete={() => deleteConversation(conv.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white border rounded-r-lg shadow-sm hover:bg-gray-50"
          style={{ marginLeft: showSidebar ? '288px' : '0' }}
        >
          {showSidebar ? (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Lisa</h2>
                <p className="text-sm text-indigo-100">Your intelligent practice assistant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-gray-500 mb-6">
                    I can answer questions about clients, appointments, billing, reports, and more.
                    Just ask me anything!
                  </p>

                  {/* Initial context if provided */}
                  {initialClientName && (
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      Currently viewing: <strong>{initialClientName}</strong>
                    </div>
                  )}

                  {/* Suggested Queries */}
                  <div className="space-y-4">
                    {Object.entries(SUGGESTED_QUERIES).map(([category, queries]) => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {category}
                        </h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {queries.slice(0, 2).map((query) => (
                            <button
                              key={query}
                              onClick={() => useSuggestedQuery(query)}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                            >
                              {query}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-2 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t bg-white p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything about your practice..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={1}
                  style={{
                    minHeight: '48px',
                    maxHeight: '120px',
                    height: 'auto',
                  }}
                  disabled={isSending}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isSending}
                className={`p-3 rounded-xl transition-all ${
                  inputValue.trim() && !isSending
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
