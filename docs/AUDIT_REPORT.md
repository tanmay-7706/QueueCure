# Phase 2 Audit Report

| Requirement | Status | File:Line | Note |
| :--- | :--- | :--- | :--- |
| 1. Queue state is single module-level object | PASS | `server/src/queueStore.js:15-28` | State is encapsulated in `const state = { ... }`. Mutations happen synchronously. The `estimatedWaitMinutes` is computed in `getSnapshot` (lines 68-86). |
| 2. Wait-time logic uses rolling average correctly | PASS | `server/src/queueStore.js:57-63` | `computeAvgMinutes` handles this: `if (doc.consultDurations.length === 0) { return doc.avgConsultMinutes; }` else calculates the average of `doc.consultDurations`. |
| 3. `callNext` requestId idempotency check | PASS | `server/src/queueStore.js:107-109` | `if (requestId && state.recentRequestIds.includes(requestId)) { return { snapshot: getSnapshot(doctorId), wasIdempotent: true }; }`. Returns snapshot without mutating. |
| 4. `undoLastCall` restores exact previous state | PASS | `server/src/queueStore.js:153-179` | It restores `doc.waitingTokens.unshift(undo.calledToken);` and `doc.currentToken = undo.previousCurrentToken;` and reverts `doc.lastCallTimestamp`. |
| 5. `client:requestSync` flow | PASS | `server/src/socketHandlers.js:19-22`, `client/src/lib/socket.js:21-25` | The server replies with `socket.emit('queue:update', ...)` (to the requesting socket only, not `io.emit`). Client emits `client:requestSync` on `socket.on('connect')` which fires on initial connection and reconnects. |
| 6. Socket event names & payload shapes match | PASS | `server/src/socketHandlers.js`, `docs/SOCKET_EVENTS.md` | `receptionist:addPatient` (`{ name, doctorId }`), `receptionist:callNext` (`{ doctorId, requestId }`), `receptionist:undoLastCall` (`{ doctorId }`), `receptionist:setAvgConsultTime` (`{ doctorId, minutes }`), `client:requestSync` (`{}`). Payloads match exactly. |
| 7. Empty-queue handling | PASS | `server/src/queueStore.js:114-116`, `server/src/socketHandlers.js:46-51` | `queueStore.callNext` returns `{ emptyQueue: true }`. `socketHandlers.js` emits `queue:emptyNotice` back to the requester. No crash. |
