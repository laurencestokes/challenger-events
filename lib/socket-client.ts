import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    socket = io(url, {
      autoConnect: false,
      reconnection: true, // Enable auto-reconnection
      reconnectionDelay: 1000, // Start with 1 second delay
      reconnectionDelayMax: 5000, // Max 5 seconds between attempts
      reconnectionAttempts: Infinity, // Keep trying indefinitely
      timeout: 20000, // Connection timeout
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, manually reconnect
        console.log('⚠️ Server disconnected, attempting to reconnect...');
        socket?.connect();
      }
      // For all other cases, auto-reconnect will handle it
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnection attempt', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed after all attempts');
    });
  }

  return socket;
}

export function connectSocket(): void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
