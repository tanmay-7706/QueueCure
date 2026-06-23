/**
 * socketHandlers.js — Registers Socket.io event listeners.
 *
 * Each handler follows the same pattern:
 *   1. Call the corresponding queueStore mutation (synchronous).
 *   2. Broadcast the returned snapshot to ALL connected clients.
 *
 * This guarantees single-writer semantics: each event is fully processed
 * (read → mutate → broadcast) before the next event handler runs,
 * because Node.js is single-threaded and all mutations are synchronous.
 */

const queueStore = require('./queueStore');

function registerHandlers(io, socket) {
  // ── On connect: send current state immediately ──
  socket.emit('queue:update', queueStore.getSnapshot('default'));

  // ── client:requestSync — reconnection catch-up ──
  socket.on('client:requestSync', () => {
    socket.emit('queue:update', queueStore.getSnapshot('default'));
  });

  // ── receptionist:addPatient ──
  socket.on('receptionist:addPatient', (data) => {
    const { name, doctorId = 'default' } = data || {};
    if (!name || typeof name !== 'string' || !name.trim()) return;
    const snapshot = queueStore.addPatient(name, doctorId);
    io.emit('queue:update', snapshot);
  });

  // ── receptionist:callNext ──
  socket.on('receptionist:callNext', (data) => {
    const { doctorId = 'default', requestId } = data || {};
    const result = queueStore.callNext(doctorId, requestId);

    if (result.wasIdempotent) {
      // Duplicate request — send current state to this client only
      socket.emit('queue:update', result.snapshot);
      return;
    }

    if (result.onBreak) {
      socket.emit('queue:update', result.snapshot);
      return;
    }

    if (result.emptyQueue) {
      // Still broadcast state for consistency back to the requesting client
      socket.emit('queue:update', result.snapshot);
      return;
    }

    // Normal case — broadcast to all
    io.emit('queue:update', result.snapshot);
  });

  // ── receptionist:undoLastCall ──
  socket.on('receptionist:undoLastCall', (data) => {
    const { doctorId = 'default' } = data || {};
    const result = queueStore.undoLastCall(doctorId);

    if (result.undoFailed) {
      // Still broadcast current state for consistency
      io.emit('queue:update', result.snapshot);
      return;
    }

    io.emit('queue:update', result.snapshot);
  });

  // ── receptionist:setAvgConsultTime ──
  socket.on('receptionist:setAvgConsultTime', (data) => {
    const { doctorId = 'default', minutes } = data || {};
    if (!minutes || typeof minutes !== 'number' || minutes < 1) return;
    const snapshot = queueStore.setAvgConsultTime(doctorId, minutes);
    io.emit('queue:update', snapshot);
  });

  // ── receptionist:setDoctorStatus ──
  socket.on('receptionist:setDoctorStatus', (data) => {
    const { doctorId = 'default', isOnBreak } = data || {};
    if (typeof isOnBreak !== 'boolean') return;
    const snapshot = queueStore.setDoctorStatus(doctorId, isOnBreak);
    io.emit('queue:update', snapshot);
  });

  // ── receptionist:resetSession ──
  socket.on('receptionist:resetSession', (data) => {
    const { doctorId = 'default' } = data || {};
    const snapshot = queueStore.resetSession(doctorId);
    io.emit('queue:update', snapshot);
  });
}

module.exports = { registerHandlers };
