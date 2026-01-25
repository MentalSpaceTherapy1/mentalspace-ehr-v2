import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface KVRUpdate {
  kvr: number;
  numerator: number;
  denominator: number;
  timestamp: string;
}

/**
 * Get socket URL from environment
 * Phase 4.2: Centralized socket URL derivation
 */
const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      return `${url.protocol}//${url.host}`;
    } catch {
      // If parsing fails, return default
    }
  }
  return 'http://localhost:3001';
};

export function useRealtimeKVR(userId: string) {
  const [kvr, setKVR] = useState<number | null>(null);
  const [metadata, setMetadata] = useState<{ numerator: number; denominator: number } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    /**
     * Phase 4.2: httpOnly Cookie Auth for EHR users
     *
     * This hook is used by EHR productivity features (therapists/staff).
     * Authentication is handled via httpOnly cookies (withCredentials: true).
     * No localStorage token needed - cookies are sent automatically.
     */
    const newSocket = io(getSocketUrl(), {
      withCredentials: true,
      // Note: No auth.token needed - EHR users authenticate via httpOnly cookies
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      if (import.meta.env.DEV) console.log('Real-time KVR: Connected to WebSocket');
      setConnected(true);

      // Join user-specific room
      newSocket.emit('join', `user:${userId}`);
    });

    newSocket.on('disconnect', () => {
      if (import.meta.env.DEV) console.log('Real-time KVR: Disconnected from WebSocket');
      setConnected(false);
    });

    // Listen for KVR updates
    newSocket.on('kvr:updated', (data: KVRUpdate) => {
      if (import.meta.env.DEV) console.log('KVR updated:', data);
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
