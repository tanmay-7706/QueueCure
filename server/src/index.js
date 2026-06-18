/**
 * index.js — Express + Socket.io server entry point.
 *
 * Serves on port 3001. CORS configured for the Vite dev server (port 5173).
 * On each new socket connection, registers all event handlers and sends
 * the current queue state immediately.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { registerHandlers } = require('./socketHandlers');

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// ── Root endpoint ──
app.get('/', (_req, res) => {
  res.send('🏥 Queue Cure API is running gracefully.');
});

// ── Health check endpoint ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Socket.io connection handling ──
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  registerHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ── Start server ──
server.listen(PORT, () => {
  console.log(`\n  🏥 Queue Cure '26 Server`);
  console.log(`  ─────────────────────────`);
  console.log(`  HTTP:   http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Socket.io ready for connections\n`);
});
