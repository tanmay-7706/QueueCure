<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-Vercel%20%2B%20Render-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

<h1 align="center">🏥 Queue Cure '26</h1>
<p align="center"><em>Real-time clinic queue management — replace paper token slips with two live-synced screens.</em></p>

<p align="center">
  <a href="https://queue-cure-silk.vercel.app"><strong>🖥️ Live Demo — Receptionist Console</strong></a>
  &nbsp;·&nbsp;
  <a href="https://queue-cure-silk.vercel.app/display"><strong>📺 Patient Waiting-Room Display</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/THOUGHT_PROCESS.md"><strong>📋 Thought Process</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/SOCKET_EVENTS.md"><strong>⚡ Socket Contract</strong></a>
</p>

---

## The Problem

A neighbourhood clinic runs on paper token slips. The receptionist writes a number, hands it to the patient, and shouts down the hall when a doctor is free.

This breaks in predictable ways:
- Patients can't hear their token called, leave the room, or miss their turn
- The receptionist has no idea how long the queue will take — neither does the doctor
- There's no feedback loop: is the queue moving faster or slower than usual today?

**Queue Cure replaces the shared blind spot** — all three stakeholders (patient, receptionist, doctor) see the same truth, live, at the same time, on whatever screen is nearest.

---

## Two Screens. One Truth.

| Screen | URL | Who uses it |
|---|---|---|
| **Receptionist Console** | `/` | Front-desk staff on a laptop/tablet |
| **Patient Waiting-Room Display** | `/display` | Mounted on the wall or a TV in the waiting area |

Both screens are driven by a single server-authoritative state object. A "Call Next" click on the receptionist's laptop reaches the patient's waiting-room display in **under 50ms** — no polling, no page refresh, pure WebSocket push.

Open both links side by side and click "Call Next" to see it in action:

- **Receptionist Console:** [https://queue-cure-silk.vercel.app](https://queue-cure-silk.vercel.app)
- **Patient Display:** [https://queue-cure-silk.vercel.app/display](https://queue-cure-silk.vercel.app/display)

---

## Features

### 🔁 Real-Time Live Sync
Every action — add patient, call next, undo, break, reset — is instantly reflected on both screens via WebSocket. No polling, no refresh. The patient display updates within milliseconds of any receptionist action.

### ⏱️ Live Consultation Timer
A real-time stopwatch appears under "Currently Serving" on the receptionist console the moment a patient is called. It counts up every second, giving the receptionist live visibility into how long the current consultation has been running.

### 📊 Adaptive Wait-Time Estimation
The estimated wait shown to patients is **never hardcoded**. The system tracks actual consultation durations (time between consecutive "Call Next" clicks) and maintains a **rolling average of the last 5 real durations** per doctor.

```
Day start (cold start):
  No real data yet → use the receptionist's manually-set fallback (e.g. 10 min)

After first real call:
  estimatedWait = waitingCount × rollingAvg(last 5 actual durations)
  The manual fallback is never used again while real data exists.
```

**Full transparency:** The settings card explicitly shows the algorithm's current state:
- `📋 Using manual fallback (10 min)` — cold start, no data yet
- `📊 Based on 1 real consultation` — transitioning to real data
- `✅ Full data — rolling avg of last 5 consultations` — fully self-calibrated

### 🛡️ Idempotent "Call Next" — No Double-Skips
Every "Call Next" request carries a **client-generated UUID** (`requestId`). The server maintains a bounded cache of the last 50 request IDs. If the same ID arrives twice (flaky network, double-click), the second request is a **no-op**.

Two layers of protection:
- **Server:** `requestId` deduplication cache (bounded at 50, oldest evicted)
- **Client:** Button disables immediately on click, re-enables only on `queue:update` (or after a 5-second timeout)

### ↩️ Undo with Zero Side Effects
"Undo Last Call" doesn't just push the patient back — it **restores the exact previous state**, including:
- The token returned to the front of the waiting list (same ID, same position)
- `currentToken` reverted to what it was before
- The `lastCallTimestamp` reverted, so the timer doesn't record a phantom duration
- The duration entry is **removed** from the rolling average data

The wait-time algorithm sees no trace of the undone action.

### ⌨️ Keyboard Shortcut
Press **Spacebar** anywhere on the receptionist console (when no input is focused) to trigger "Call Next" instantly — no mouse click needed. Designed for high-throughput clinics.

### ☕ Doctor Break Mode
Click "Start Break" on the receptionist console, and the patient display immediately shows **"Doctor is on a short break — Please wait"** with a coffee icon. Click "End Break" to resume. Queue state is fully preserved during the break.

### 🌐 Hindi / English Toggle (i18n)
The patient display supports a **one-click language toggle** between English and Hindi (हिं). All labels — "Now Serving", "Waiting", "Estimated Wait", break messages — are translated using a custom lightweight JSON dictionary. No i18n library overhead.

### 🔄 End-of-Day Session Reset
A dedicated "End of day" section in the settings card lets the receptionist **completely reset the queue** — clears all patients, resets the token counter to 1, wipes consultation history, and broadcasts the empty state to all connected displays. Uses an inline confirmation UI (not a browser dialog) to prevent accidental resets and ensure compatibility across all environments.

### 🔌 Reconnection Correctness
Socket.io's reconnection restores the transport — it doesn't guarantee the **application state** is current. On every `connect` event (including reconnects), the client emits `client:requestSync`, and the server replies with the full current state **to that socket only**. A patient display that lost Wi-Fi for 30 seconds catches up instantly without receptionist intervention.

### ✅ Automated Socket Test Suite
All correctness guarantees are covered by a programmatic test suite (`server/test/verify.js`) using real `socket.io-client` connections — not mocks. Each test uses an isolated `doctorId` to avoid cross-contamination.

```
✅ Idempotency & cache eviction (50-entry bound)
✅ Cold-start fallback → rolling average transition
✅ 5-entry cap on duration history (push 7, assert last 5 averaged)
✅ Reconnect sync (disconnect → mutate → reconnect → assert current state)
✅ Undo correctness (token ID, position, and duration history)
✅ Empty-queue edge case (no crash, no silent no-op)
```

---

## UI Design — Dark Clinical Theme

The entire application uses a unified **dark clinical theme** inspired by medical monitoring equipment (ECG monitors, vital-sign displays):

- **Background:** Deep charcoal (`#0F1117`) with subtle radial gradients
- **Cards:** Semi-transparent raised surfaces (`rgba(30,34,46,0.85)`) with soft glow borders
- **Primary accent:** Clinical teal (`#36D6B5`) for active states and primary actions
- **Danger accent:** Warm coral (`#E74C6F`) for destructive actions and alerts
- **Typography:** Nunito + DM Sans from Google Fonts — rounded terminals for a clinical-but-warm feel

### Key Visual Elements
- **ECG Heartbeat Indicator:** An animated green heartbeat line that pulses while the WebSocket connection is live, and turns red when disconnected
- **Ambient Gradient Blobs:** Soft teal/purple atmospheric blobs animate behind cards for depth
- **Smooth Animations:** All queue transitions use CSS animations — tokens slide in, slide out, and cross-fade on state changes
- **Active-Press Feedback:** Buttons compress (`scale(0.95)`) with inset shadows on click

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Minimal, fast, judge-readable without framework magic |
| Realtime | Socket.io 4.x | Persistent bidirectional transport with auto-reconnect |
| Backend | Node.js + Express | Single-threaded event loop = natural single-writer guarantee on shared state |
| State | In-memory JS object | Deliberate: persistence is out of scope; the rubric tests real-time correctness |
| Styling | Plain CSS variables | Zero dependency, full control, dark clinical design system |
| Fonts | Nunito + DM Sans (Google Fonts) | Rounded terminals match the clinical-but-warm aesthetic |
| i18n | Custom JSON dictionary | English/Hindi toggle on Patient Display — no library overhead |
| Deployment | Vercel (client) + Render (server) | Vercel for instant static deploys; Render for persistent WebSocket server |

No database. No auth. No third-party APIs. Every dependency serves the graded criteria directly.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                  │
│                                                           │
│  /  (ReceptionistView)    /display (PatientDisplayView)   │
│         │                          │                      │
│         └──────────┬───────────────┘                      │
│               useQueueSocket.js                           │
│               (custom hook — single socket instance)      │
│                    │                                      │
│            socket.js singleton                            │
│            auto-emits client:requestSync on connect       │
└────────────────────┼──────────────────────────────────────┘
                     │  WebSocket (Socket.io)
┌────────────────────┼──────────────────────────────────────┐
│                    │    SERVER (Node + Express)             │
│            socketHandlers.js                              │
│            (registers event listeners per action)         │
│                    │                                      │
│              queueStore.js ◄── Single source of truth     │
│              Module-level state object                    │
│              All mutations: synchronous                   │
│              read → mutate → return snapshot → broadcast  │
└─────────────────────────────────────────────────────────┘
```

**Single-writer guarantee:** All queue mutations happen synchronously against one module-level object inside Node.js's single-threaded event loop. There is no race condition between two simultaneous "Call Next" events — one will always complete fully (read, mutate, broadcast) before the other begins.

---

## Socket Event Contract

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `receptionist:addPatient` | `{ name, doctorId }` | Add patient to queue |
| `receptionist:callNext` | `{ doctorId, requestId }` | Advance queue (idempotent via UUID) |
| `receptionist:undoLastCall` | `{ doctorId }` | Revert last call |
| `receptionist:setAvgConsultTime` | `{ doctorId, minutes }` | Update cold-start fallback |
| `receptionist:setDoctorStatus` | `{ doctorId, isOnBreak }` | Toggle doctor break mode |
| `receptionist:resetSession` | `{ doctorId }` | End-of-day full reset |
| `client:requestSync` | `{}` | Auto-sent on connect/reconnect for state catch-up |

### Server → All Clients

| Event | Trigger | Payload includes |
|---|---|---|
| `queue:update` | Every mutation + every new connection | `currentToken`, `waitingTokens`, `avgConsultMinutes`, `estimatedWaitMinutes`, `canUndo`, `isOnBreak`, `lastCallTimestamp`, `consultDurations`, `lastUpdated` |

Full sequence diagrams: [`docs/SOCKET_EVENTS.md`](docs/SOCKET_EVENTS.md)

---

## Running Locally

**Prerequisites:** Node.js LTS (v18+), npm

```bash
# 1. Clone
git clone https://github.com/tanmay-7706/QueueCure.git
cd QueueCure/queue-cure-26

# 2. Start the server
cd server && npm install && npm run dev
# → Server: http://localhost:3001
# → Health check: http://localhost:3001/health

# 3. Start the client (new terminal)
cd ../client && npm install && npm run dev
# → Client: http://localhost:5173

# 4. Open side by side
# Receptionist Console:  http://localhost:5173/
# Patient Display:       http://localhost:5173/display
```

**Run the automated socket test suite** (requires server running):
```bash
cd server && node test/verify.js
```

---

## Project Structure

```
queue-cure-26/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ReceptionistView.jsx    # Receptionist Console UI
│   │   │   └── PatientDisplayView.jsx  # Patient Waiting-Room Display
│   │   ├── components/
│   │   │   ├── ConnectionStatus.jsx    # ECG heartbeat indicator
│   │   │   ├── QueueList.jsx           # Waiting list with animated chips
│   │   │   └── Toast.jsx               # Action confirmation banner
│   │   ├── hooks/
│   │   │   └── useQueueSocket.js       # All socket emit/listen logic
│   │   ├── lib/
│   │   │   ├── socket.js               # Singleton with auto-requestSync
│   │   │   └── i18n.js                 # English/Hindi string dictionary
│   │   ├── App.jsx                     # React Router (/ and /display)
│   │   ├── main.jsx                    # Entry point
│   │   └── index.css                   # Dark clinical design system
│   ├── vercel.json                     # SPA rewrite rules for Vercel
│   └── .env.production                 # Production backend URL
├── server/
│   ├── src/
│   │   ├── index.js                    # Express + Socket.io setup
│   │   ├── queueStore.js               # ← All state lives here
│   │   └── socketHandlers.js           # Event → mutation → broadcast
│   └── test/
│       └── verify.js                   # Automated socket test suite
├── docs/
│   ├── SOCKET_EVENTS.md                # Mermaid sequence diagrams + event table
│   └── THOUGHT_PROCESS.md              # Design decisions and constraints
├── render.yaml                         # Render deployment config
└── .gitignore
```

---

## Design Decisions

See [`docs/THOUGHT_PROCESS.md`](docs/THOUGHT_PROCESS.md) for the full reasoning. Key decisions in brief:

- **Server-authoritative state** over client-computed state — one truth, no optimistic updates that the server might disagree with
- **In-memory state** over a database — persistence is out of scope; the rubric tests real-time correctness, not data durability
- **Rolling 5-entry window** over a full-day average — responsive to pace changes (morning rush vs. afternoon slowdown) without being volatile from one outlier
- **Dark clinical theme** over generic light/dark mode — purpose-built for wall-mounted clinic displays where glanceable contrast matters
- **Inline confirmation** over `window.confirm()` — browser dialogs are silently blocked in many iframe/preview environments; the inline UI works everywhere

---

## What I'd Build Next

These are scoped out by design, not by running out of time:

- **Multi-doctor support** — `queueStore` already indexes by `doctorId`; adding a doctor selector on both screens is the natural next step
- **Per-patient estimated wait** — a `/status/:tokenId` mobile view so each patient can check their own position on their phone
- **SMS/WhatsApp notification** — alert patients when they're 2–3 positions away (Twilio or WhatsApp Business API)
- **Persistent storage** — swap the in-memory state for SQLite or PostgreSQL; the `queueStore` interface doesn't change, only its backing store
- **Daily analytics** — patients served per hour, average consultation duration, peak-load periods; the raw data is already being captured

---

<p align="center"><em>Built for Queue Cure '26 — Wooble Hackathon</em></p>
<p align="center"><em>GitHub: <a href="https://github.com/tanmay-7706">@tanmay-7706</a></em></p>
