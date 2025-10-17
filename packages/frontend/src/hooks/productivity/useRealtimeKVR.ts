import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface KVRUpdate {
  kvr: number;
  numerator: number;
  denominator: number;
  timestamp: string;
}

export function useRealtimeKVR(userId: string) {
  const [kvr, setKVR] = useState<number | null>(null);
  const [metadata, setMetadata] = useState<{ numerator: number; denominator: number } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('Real-time KVR: Connected to WebSocket');
      setConnected(true);

      // Join user-specific room
      newSocket.emit('join', `user:${userId}`);
    });

    newSocket.on('disconnect', () => {
      console.log('Real-time KVR: Disconnected from WebSocket');
      setConnected(false);
    });

    // Listen for KVR updates
    newSocket.on('kvr:updated', (data: KVRUpdate) => {
      console.log('KVR updated:', data);
      setKVR(data.kvr);
      setMetadata({
        numerator: data.numerator,
        denominator: data.denominator,
      });
    });

    // Cleanup
    return () => {
      newSocket.emit('leave', `user:${userId}`);
      newSocket.disconnect();
    };
  }, [userId]);

  return {
    kvr,
    metadata,
    connected,
    socket,
  };
}
