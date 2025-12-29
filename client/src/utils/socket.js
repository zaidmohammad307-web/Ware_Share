// client/src/utils/socket.js
import { io } from 'socket.io-client';
import { getItemFromLocalStorage } from './index';

let socket = null;

export const getSocket = () => {
  if (socket) return socket;

  const baseURL =
    import.meta.env.VITE_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:4000';

  const token = getItemFromLocalStorage('token');

  socket = io(baseURL, {
    withCredentials: true,
    auth: token ? { token } : {},
    // Polling first (stable), then websocket upgrade if possible:
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    timeout: 10000,
  });

  return socket;
};
