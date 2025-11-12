import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  userName: string;
  message: string;
  timestamp: Date;
  isLocal: boolean;
}

interface ChatPanelProps {
  socket: Socket | null;
  sessionId: string;
  userName: string;
}

export default function ChatPanel({
  socket,
  sessionId,
  userName,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: {
      userName: string;
      message: string;
      timestamp: string;
    }) => {
      console.log('💬 Received chat message:', data);

      const newMessage: Message = {
        id: `${Date.now()}-${Math.random()}`,
        userName: data.userName,
        message: data.message,
        timestamp: new Date(data.timestamp),
        isLocal: false,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Show notification if panel is closed or minimized
      if (!isOpen || isMinimized) {
        setUnreadCount((prev) => prev + 1);
        toast.success(`${data.userName}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`, {
          duration: 3000,
          icon: '💬',
        });
      }
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [socket, isOpen, isMinimized]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Send message
  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !sessionId) return;

    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      userName,
      message: inputMessage.trim(),
      timestamp: new Date(),
      isLocal: true,
    };

    // Add to local messages
    setMessages((prev) => [...prev, newMessage]);

    // Emit to socket
    socket.emit('chat:send', {
      sessionId,
      userName,
      message: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    });

    // Clear input
    setInputMessage('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Open panel and clear unread
  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 left-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 z-40"
        title="Open Chat"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`fixed ${
        isMinimized ? 'bottom-24 left-6' : 'bottom-6 left-6'
      } bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[32rem]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold">Session Chat</h3>
          {unreadCount > 0 && !isMinimized && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setIsMinimized(!isMinimized);
              if (isMinimized) setUnreadCount(0);
            }}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100%-8rem)]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isLocal ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.isLocal
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {!msg.isLocal && (
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        {msg.userName}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isLocal ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send Message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {inputMessage.length}/500 characters
            </p>
          </div>
        </>
      )}
    </div>
  );
}
