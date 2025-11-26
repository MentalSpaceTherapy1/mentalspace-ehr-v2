import { io, Socket } from 'socket.io-client';

// Create socket connection
// In development, connect to local backend
// In production, use environment variable or default to same origin
const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

// Initialize socket connection
export const initSocket = () => {
  if (!socket) {
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      // Connection established
    });

    socket.on('disconnect', () => {
      // Connection lost
    });

    socket.on('error', (error) => {
      // Socket error - errors are handled by reconnection logic
    });
  }
  return socket;
};

// Get socket instance (initialize if needed)
export const getSocket = (): Socket => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Export socket instance (will be initialized on first use)
const socketInstance = getSocket();

export default socketInstance;
export { socketInstance as socket };

