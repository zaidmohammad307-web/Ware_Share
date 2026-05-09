// client/src/utils/socket.js
import { io } from 'socket.io-client';
import { getItemFromLocalStorage } from './index';

let socket = null;
let currentToken = null;
let listenersAttached = false;

const getBaseURL = () =>
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

const applyTokenToSocket = (token) => {
  if (!socket) return;
  currentToken = token || null;
  socket.auth = token ? { token } : {};

  // Reconnect to apply new auth
  try {
    if (socket.connected) socket.disconnect();
    socket.connect();
  } catch (_) {
    // ignore
  }
};

export const getSocket = () => {
  const baseURL = getBaseURL();
  const token = getItemFromLocalStorage('token');

  if (!socket) {
    currentToken = token || null;

    socket = io(baseURL, {
      withCredentials: true,
      auth: token ? { token } : {},
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 10000,
    });

    socket.on('connect_error', (err) => {
      const msg = String(err?.message || '');
      if (/unauthorized/i.test(msg) || /token/i.test(msg)) {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('token');
            window.localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth:logout'));
          }
        } catch (_) {
          // ignore
        }
      }
    });

    // Keep socket auth in sync with app auth events (only attach once)
    if (typeof window !== 'undefined' && !listenersAttached) {
      listenersAttached = true;
      window.addEventListener('auth:logout', () => applyTokenToSocket(null));
      window.addEventListener('auth:token', (e) => {
        const next = e?.detail?.token || getItemFromLocalStorage('token');
        applyTokenToSocket(next);
      });
      window.addEventListener('storage', (e) => {
        if (e?.key === 'token') {
          const next = getItemFromLocalStorage('token');
          applyTokenToSocket(next);
        }
      });
    }

    return socket;
  }

  // If token changed, update socket auth and reconnect
  if ((token || null) !== (currentToken || null)) {
    applyTokenToSocket(token || null);
  }

  return socket;
};
