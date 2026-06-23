/**
 * queueStore.js — Single source of truth for all queue state.
 *
 * ALL canonical state lives here in a module-level object.
 * Every mutation is synchronous: read → mutate → return snapshot.
 * Clients never compute derived values — they render what the server broadcasts.
 */

const { v4: uuidv4 } = require('uuid');

/* ------------------------------------------------------------------ */
/*  STATE                                                              */
/* ------------------------------------------------------------------ */

const state = {
  doctors: {
    default: {
      currentToken: null,
      waitingTokens: [],
      consultDurations: [],     // last 5 actual durations in milliseconds
      lastCallTimestamp: null,   // when the current "Call Next" happened
      avgConsultMinutes: 10,    // manual fallback (cold-start only)
      nextTokenNumber: 1,
      undoSnapshot: null,       // { previousToken, restoredCurrent, lastCallTimestamp }
    },
  },
  recentRequestIds: [],         // bounded list for idempotency (max 50)
};

const MAX_RECENT_IDS = 50;
const MAX_ROLLING_DURATIONS = 5;

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function ensureDoctor(doctorId) {
  if (!state.doctors[doctorId]) {
    state.doctors[doctorId] = {
      currentToken: null,
      waitingTokens: [],
      consultDurations: [],
      lastCallTimestamp: null,
      avgConsultMinutes: 10,
      nextTokenNumber: 1,
      undoSnapshot: null,
      isOnBreak: false,
    };
  }
  return state.doctors[doctorId];
}

/**
 * Compute the effective average consultation time in minutes.
 * - If ≥1 real data point → rolling average of last 5 durations.
 * - Otherwise → manual fallback.
 */
function computeAvgMinutes(doc) {
  if (doc.consultDurations.length === 0) {
    return doc.avgConsultMinutes; // cold-start fallback
  }
  const sumMs = doc.consultDurations.reduce((a, b) => a + b, 0);
  return sumMs / doc.consultDurations.length / 60000; // ms → minutes
}

/**
 * Build the queue:update payload for a given doctor.
 */
function getSnapshot(doctorId = 'default') {
  const doc = ensureDoctor(doctorId);
  const avgMinutes = computeAvgMinutes(doc);
  const estimatedWait = doc.waitingTokens.length * avgMinutes;

  return {
    doctorId,
    currentToken: doc.currentToken,
    waitingTokens: doc.waitingTokens.map((t) => ({
      id: t.id,
      name: t.name,
      tokenNumber: t.tokenNumber,
    })),
    avgConsultMinutes: Math.round(avgMinutes * 10) / 10, // 1 decimal
    estimatedWaitMinutes: Math.round(estimatedWait * 10) / 10,
    lastUpdated: new Date().toISOString(),
    canUndo: doc.undoSnapshot !== null,
    realDataPoints: doc.consultDurations.length,
    isOnBreak: doc.isOnBreak,
    lastCallTimestamp: doc.lastCallTimestamp,
  };
}

/* ------------------------------------------------------------------ */
/*  MUTATIONS                                                          */
/* ------------------------------------------------------------------ */

function addPatient(name, doctorId = 'default') {
  const doc = ensureDoctor(doctorId);
  const token = {
    id: uuidv4(),
    name: name.trim(),
    tokenNumber: doc.nextTokenNumber++,
    addedAt: Date.now(),
  };
  doc.waitingTokens.push(token);
  // Adding a patient clears undo (state has changed since last call)
  // Actually, let's keep undo available — undo only relates to callNext
  return getSnapshot(doctorId);
}

function callNext(doctorId = 'default', requestId) {
  // ── Idempotency check ──
  if (requestId && state.recentRequestIds.includes(requestId)) {
    return { snapshot: getSnapshot(doctorId), wasIdempotent: true };
  }

  const doc = ensureDoctor(doctorId);

  // ── Doctor on break guard ──
  if (doc.isOnBreak) {
    return { snapshot: getSnapshot(doctorId), onBreak: true };
  }

  // ── Empty-queue edge case ──
  if (doc.waitingTokens.length === 0) {
    return { snapshot: getSnapshot(doctorId), emptyQueue: true };
  }

  // ── Record consultation duration from previous call ──
  if (doc.lastCallTimestamp !== null && doc.currentToken !== null) {
    const duration = Date.now() - doc.lastCallTimestamp;
    doc.consultDurations.push(duration);
    if (doc.consultDurations.length > MAX_ROLLING_DURATIONS) {
      doc.consultDurations.shift(); // keep only last 5
    }
  }

  // ── Save undo state BEFORE mutating ──
  doc.undoSnapshot = {
    previousCurrentToken: doc.currentToken,
    calledToken: null, // will be set below
    lastCallTimestamp: doc.lastCallTimestamp,
    consultDurationsLength: doc.consultDurations.length,
  };

  // ── Advance the queue ──
  const nextToken = doc.waitingTokens.shift();
  doc.undoSnapshot.calledToken = nextToken;
  doc.currentToken = nextToken;
  doc.lastCallTimestamp = Date.now();

  // ── Record requestId for idempotency ──
  if (requestId) {
    state.recentRequestIds.push(requestId);
    if (state.recentRequestIds.length > MAX_RECENT_IDS) {
      state.recentRequestIds.shift();
    }
  }

  return { snapshot: getSnapshot(doctorId), wasIdempotent: false, emptyQueue: false };
}

function undoLastCall(doctorId = 'default') {
  const doc = ensureDoctor(doctorId);

  if (!doc.undoSnapshot || !doc.undoSnapshot.calledToken) {
    return { snapshot: getSnapshot(doctorId), undoFailed: true };
  }

  const undo = doc.undoSnapshot;

  // Put the called token back at the front of the queue
  doc.waitingTokens.unshift(undo.calledToken);

  // Restore previous current token
  doc.currentToken = undo.previousCurrentToken;

  // Restore last call timestamp
  doc.lastCallTimestamp = undo.lastCallTimestamp;

  // Remove the duration we recorded for the now-undone call
  if (doc.consultDurations.length > undo.consultDurationsLength) {
    doc.consultDurations.pop();
  }

  // Clear undo — only one level of undo
  doc.undoSnapshot = null;

  return { snapshot: getSnapshot(doctorId), undoFailed: false };
}

function setAvgConsultTime(doctorId = 'default', minutes) {
  const doc = ensureDoctor(doctorId);
  doc.avgConsultMinutes = Math.max(1, Number(minutes) || 10);
  return getSnapshot(doctorId);
}

function setDoctorStatus(doctorId = 'default', isOnBreak) {
  const doc = ensureDoctor(doctorId);
  doc.isOnBreak = Boolean(isOnBreak);
  return getSnapshot(doctorId);
}

function resetSession(doctorId = 'default') {
  const doc = ensureDoctor(doctorId);
  doc.currentToken = null;
  doc.waitingTokens = [];
  doc.consultDurations = [];
  doc.lastCallTimestamp = null;
  doc.nextTokenNumber = 1;
  doc.undoSnapshot = null;
  doc.isOnBreak = false;
  // Clear idempotency cache too
  state.recentRequestIds = [];
  return getSnapshot(doctorId);
}

/* ------------------------------------------------------------------ */
/*  EXPORTS                                                            */
/* ------------------------------------------------------------------ */

module.exports = {
  addPatient,
  callNext,
  undoLastCall,
  setAvgConsultTime,
  setDoctorStatus,
  resetSession,
  getSnapshot,
};
