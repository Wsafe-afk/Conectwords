import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(sessionToken: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  // Se configurada a variável VITE_API_URL, conecta ao servidor remoto, senão usa a origem local
  const serverUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || window.location.origin;

  socket = io(serverUrl, {
    auth: { sessionToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
