# Queue Cure '26

> Real-time clinic queue management — replace paper token slips with two live-synced screens.

## What is this?

Queue Cure replaces paper token slips in a clinic with two real-time synced screens:

1. **Receptionist Console** (`/`) — Add patients, call the next token, undo mistakes, set consultation time estimates.
2. **Patient Waiting-Room Display** (`/display`) — Large TV-friendly view showing the current token being served, the next tokens in line, and estimated wait time. Supports English/Hindi toggle.

Both screens update instantly via WebSocket push — zero page refreshes, zero polling.

---

## Tech Stack

- **Frontend:** React 18 + Vite, plain CSS (CSS variables for theming)
- **Backend:** Node.js + Express + Socket.io (server-authoritative state, in-memory)
- **State:** All canonical queue state lives on the server in a single module-level object. Clients only render what the server broadcasts.
- **No database, no auth, no external services** — deliberate design choices for a hackathon demo focused on real-time correctness.

---

## Wait-Time Algorithm

The estimated wait time is never hardcoded. Each doctor maintains a rolling array of the last 5 **actual** consultation durations (measured as the time between consecutive "Call Next" clicks). When no real data exists yet (cold start — e.g. beginning of the day), the system falls back to a manually-set average consultation time entered by the receptionist. Once at least one real data point is recorded, the rolling average of actual durations replaces the manual fallback entirely. The estimated wait displayed to patients is computed as `(patients ahead in queue) × (current rolling average)` and is rebroadcast to all clients on every state change — never via a client-side timer.

---

## Setup Instructions

### Prerequisites

- Node.js (any current LTS, e.g. v18+)
- npm

### 1. Start the server

```bash
cd queue-cure-26/server
npm install
npm run dev     # or: npm start
```

Server runs on `http://localhost:3001`.

### 2. Start the client

```bash
cd queue-cure-26/client
npm install
npm run dev
```

Client runs on `http://localhost:5173`.

### 3. Open both screens

- **Receptionist Console:** [http://localhost:5173/](http://localhost:5173/)
- **Patient Display:** [http://localhost:5173/display](http://localhost:5173/display)

Open them side by side to see real-time sync in action.

---

## Project Structure

```
queue-cure-26/
├── client/                  # Vite React app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ReceptionistView.jsx
│   │   │   └── PatientDisplayView.jsx
│   │   ├── components/
│   │   │   ├── Toast.jsx
│   │   │   ├── QueueList.jsx
│   │   │   └── ConnectionStatus.jsx
│   │   ├── hooks/
│   │   │   └── useQueueSocket.js
│   │   ├── lib/
│   │   │   ├── socket.js
│   │   │   └── i18n.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── ...
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── queueStore.js
│   │   └── socketHandlers.js
│   └── ...
├── docs/
│   ├── SOCKET_EVENTS.md
│   └── THOUGHT_PROCESS.md
└── README.md
```

---

## Documentation

- [Socket Event Contract](docs/SOCKET_EVENTS.md) — Mermaid sequence diagrams + full event table
- [Thought Process](docs/THOUGHT_PROCESS.md) — Design decisions, concurrency handling, edge cases

---

## Key Features

- ✅ Live queue sync across both screens (pure socket push, zero polling)
- ✅ Wait time computed from real consultation durations (rolling average of last 5)
- ✅ Cold-start fallback (manual avg until real data exists)
- ✅ Idempotent "Call Next" (UUID requestId + server-side dedup cache)
- ✅ Client-side double-click guard (button disables until server acknowledges)
- ✅ Reconnection correctness (auto-sync on reconnect via `client:requestSync`)
- ✅ Undo Last Call (reverts last "Call Next", puts patient back at front)
- ✅ Empty-queue handling (calm "No patients waiting" state, never a crash)
- ✅ English/Hindi language toggle on Patient Display
- ✅ Responsive design (laptop/tablet for receptionist, TV/mobile for display)

---

*Built for Queue Cure '26 — Wooble Hackathon*
