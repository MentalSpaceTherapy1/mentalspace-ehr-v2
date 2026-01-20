import { io, Socket } from 'socket.io-client';

// Get the stored authentication token
const getStoredToken = (): string | null => {
  // Try localStorage first (primary storage for session tokens)
  const token = localStorage.getItem('token');
  if (token) return token;

  // Fallback to portalToken for client portal users
  const portalToken = localStorage.getItem('portalToken');
  if (portalToken) return portalToken;

  return null;
};

// Create socket connection
// In development, connect to local backend
// In production, use the API URL from environment or derive from current location
const getSocketUrl = () => {
  // Use explicit socket URL if provided
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // In production, derive from API URL
  if (import.meta.env.VITE_API_URL) {
    // API URL is like https://api.mentalspaceehr.com/api/v1
    // Socket URL should be https://api.mentalspaceehr.com
    const apiUrl = import.meta.env.VITE_API_URL;
    try {
      const url = new URL(apiUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      // If parsing fails, return default
    }
  }

  // Development default
  return 'http://localhost:3001';
};

const socketUrl = getSocketUrl();

let socket: Socket | null = null;
let connectionAttempted = false;

// Initialize socket connection with authentication
export const initSocket = () => {
  if (!socket && !connectionAttempted) {
    connectionAttempted = true;

    const token = getStoredToken();

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // Use credentials (cookies) for authentication
      withCredentials: true,
      // Pass auth token for session-based authentication
      auth: {
        token: token,
      },
      // Timeout for initial connection
      timeout: 20000,
      // Auto-connect is true by default
      autoConnect: true,
    });

    if (!token) {
      console.warn('[Socket.IO] No auth token found - connection may fail');
    }

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      // Log connection errors - important for debugging auth issues
      console.warn('[Socket.IO] Connection error:', error.message);
    });

    socket.on('error', (error) => {
      console.error('[Socket.IO] Error:', error);
    });
  }
  return socket;
};

// Get socket instance (initialize if needed)
export const getSocket = (): Socket | null => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Lazy-initialize socket on first use
// Note: Socket may be null if connection hasn't been attempted yet
let socketInstance: Socket | null = null;

// Initialize socket lazily to avoid connection attempts on import
export const ensureSocket = (): Socket | null => {
  if (!socketInstance) {
    socketInstance = initSocket();
  }
  return socketInstance;
};

export default { getSocket, initSocket, ensureSocket };
export { socket };

