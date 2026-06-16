/**
 * socket.js — Socket.io client singleton.
 *
 * Connects to the server on port 3001.
 * On every `connect` event (including reconnects), auto-emits
 * `client:requestSync` so the client always catches up to current state.
 */

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// On every connect (including reconnects), request the full current state
socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  socket.emit('client:requestSync', {});
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.warn('[Socket] Connection error:', err.message);
});

export default socket;
