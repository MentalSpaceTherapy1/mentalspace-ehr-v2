import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  UserPlus,
  UserMinus,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Circle,
  AlertTriangle,
  MessageCircle,
  Smile,
  Wifi,
  WifiOff,
  Clock,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { Socket } from 'socket.io-client';

interface ActivityEvent {
  id: string;
  type: 'join' | 'leave' | 'video-on' | 'video-off' | 'audio-on' | 'audio-off' | 'screen-share-start' | 'screen-share-stop' | 'recording-start' | 'recording-stop' | 'emergency' | 'chat' | 'reaction' | 'network-quality';
  userName?: string;
  message: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

interface SessionActivityFeedProps {
  socket: Socket | null;
  sessionId: string;
}

export default function SessionActivityFeed({
  socket,
  sessionId,
}: SessionActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (eventsEndRef.current && isOpen && !isMinimized) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, isOpen, isMinimized]);

  // Add initial session start event
  useEffect(() => {
    addEvent('join', 'Session started', <Clock className="w-4 h-4" />, 'text-green-500');
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleParticipantJoined = (data: { userName: string }) => {
      addEvent('join', `${data.userName} joined`, <UserPlus className="w-4 h-4" />, 'text-green-500', data.userName);
    };

    const handleParticipantLeft = (data: { userName: string }) => {
      addEvent('leave', `${data.userName} left`, <UserMinus className="w-4 h-4" />, 'text-red-500', data.userName);
    };

    const handleChatMessage = (data: { userName: string }) => {
      addEvent('chat', `${data.userName} sent a message`, <MessageCircle className="w-4 h-4" />, 'text-blue-500', data.userName);
    };

    const handleReaction = (data: { userName: string; emoji: string }) => {
      addEvent('reaction', `${data.userName} reacted ${data.emoji}`, <Smile className="w-4 h-4" />, 'text-yellow-500', data.userName);
    };

    const handleEmergency = (data: { userName: string }) => {
      addEvent('emergency', `${data.userName} activated emergency protocol`, <AlertTriangle className="w-4 h-4" />, 'text-red-600', data.userName);
    };

    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);
    socket.on('chat:message', handleChatMessage);
    socket.on('reaction:received', handleReaction);
    socket.on('emergency:activated', handleEmergency);

    return () => {
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      socket.off('chat:message', handleChatMessage);
      socket.off('reaction:received', handleReaction);
      socket.off('emergency:activated', handleEmergency);
    };
  }, [socket]);

  // Add event to feed
  const addEvent = (
    type: ActivityEvent['type'],
    message: string,
    icon: React.ReactNode,
    color: string,
    userName?: string
  ) => {
    const newEvent: ActivityEvent = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      userName,
      message,
      timestamp: new Date(),
      icon,
      color,
    };

    setEvents((prev) => [...prev, newEvent]);
  };

  // Public methods to be called from parent component
  useEffect(() => {
    // Expose addEvent method to window for parent component to call
    (window as any).addSessionActivity = (
      type: ActivityEvent['type'],
      message: string,
      iconType?: string
    ) => {
      let icon: React.ReactNode;
      let color: string;

      switch (iconType || type) {
        case 'video-on':
          icon = <Video className="w-4 h-4" />;
          color = 'text-green-500';
          break;
        case 'video-off':
          icon = <VideoOff className="w-4 h-4" />;
          color = 'text-gray-500';
          break;
        case 'audio-on':
          icon = <Mic className="w-4 h-4" />;
          color = 'text-green-500';
          break;
        case 'audio-off':
          icon = <MicOff className="w-4 h-4" />;
          color = 'text-gray-500';
          break;
        case 'screen-share-start':
          icon = <MonitorUp className="w-4 h-4" />;
          color = 'text-blue-500';
          break;
        case 'screen-share-stop':
          icon = <MonitorX className="w-4 h-4" />;
          color = 'text-gray-500';
          break;
        case 'recording-start':
          icon = <Circle className="w-4 h-4 fill-current" />;
          color = 'text-red-500';
          break;
        case 'recording-stop':
          icon = <Circle className="w-4 h-4" />;
          color = 'text-gray-500';
          break;
        case 'network-quality':
          icon = message.includes('poor') ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />;
          color = message.includes('poor') ? 'text-red-500' : 'text-green-500';
          break;
        default:
          icon = <Activity className="w-4 h-4" />;
          color = 'text-gray-500';
      }

      addEvent(type, message, icon, color);
    };

    return () => {
      delete (window as any).addSessionActivity;
    };
  }, []);

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-40 right-6 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200 z-40 group"
        title="Session Activity"
      >
        <Activity className="w-5 h-5" />
        <span className="absolute -left-40 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Session Activity
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed ${
        isMinimized ? 'top-40 right-6' : 'top-6 right-6'
      } bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-80 h-[28rem]'
      }`}
      style={{ marginTop: isMinimized ? '0' : '28rem' }} // Position below Quick Notes if both are open
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Activity Feed</h3>
            <p className="text-xs opacity-80">{events.length} events</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
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
            title="Close Activity Feed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Events List */}
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No activity yet
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className={`flex-shrink-0 ${event.color}`}>
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 break-words">
                        {event.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={eventsEndRef} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
