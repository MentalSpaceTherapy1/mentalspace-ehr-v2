import React, { useState, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface Reaction {
  id: string;
  emoji: string;
  timestamp: number;
  x: number; // Random horizontal position
}

interface ReactionSystemProps {
  socket: Socket | null;
  sessionId: string;
  userName?: string;
}

const COMMON_REACTIONS = [
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '👏', label: 'Clapping' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '🔥', label: 'Fire' },
];

export default function ReactionSystem({
  socket,
  sessionId,
  userName = 'You',
}: ReactionSystemProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Listen for reactions from socket
  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data: { emoji: string; userName: string }) => {
      console.log('👋 Received reaction:', data);
      addReaction(data.emoji);
    };

    socket.on('reaction:received', handleReaction);

    return () => {
      socket.off('reaction:received', handleReaction);
    };
  }, [socket]);

  // Add reaction to display
  const addReaction = (emoji: string) => {
    const newReaction: Reaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      timestamp: Date.now(),
      x: Math.random() * 80 + 10, // Random position between 10% and 90%
    };

    setReactions((prev) => [...prev, newReaction]);

    // Remove reaction after animation completes (3 seconds)
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3000);
  };

  // Send reaction
  const sendReaction = (emoji: string) => {
    // Add to local display
    addReaction(emoji);

    // Emit to socket for other participants
    if (socket && sessionId) {
      socket.emit('reaction:send', {
        sessionId,
        emoji,
        userName,
      });
    }

    // Close picker
    setShowPicker(false);
  };

  return (
    <>
      {/* Reaction button */}
      <div className="fixed bottom-24 right-6 z-40">
        <div className="relative">
          {/* Picker dropdown */}
          {showPicker && (
            <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl p-4 border-2 border-gray-200 animate-in fade-in zoom-in duration-200">
              <div className="grid grid-cols-4 gap-3 mb-2">
                {COMMON_REACTIONS.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => sendReaction(reaction.emoji)}
                    className="text-3xl hover:scale-125 transition-transform duration-150 active:scale-95 p-2 rounded-lg hover:bg-gray-100"
                    title={reaction.label}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center pt-2 border-t">
                Send a quick reaction
              </p>
            </div>
          )}

          {/* Main button */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={`p-4 rounded-full shadow-lg transition-all duration-200 ${
              showPicker
                ? 'bg-blue-600 hover:bg-blue-700 text-white scale-110'
                : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
            title="Send Reaction"
          >
            <Smile className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Floating reactions */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute animate-float-up"
            style={{
              left: `${reaction.x}%`,
              bottom: '10%',
              fontSize: '3rem',
              animation: 'floatUp 3s ease-out forwards',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-100px) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-300px) scale(0.8);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: floatUp 3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
