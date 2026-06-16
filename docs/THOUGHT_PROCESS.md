# Thought Process — Queue Cure '26

---

## 1. Problem, in My Own Words

A neighborhood clinic runs on paper token slips: a receptionist writes a number on a scrap, hands it to the patient, and shouts the next number down the hall when a doctor is free. This "system" breaks in predictable ways — patients don't hear their number, they have no idea how long they'll wait, the receptionist can lose track after a busy morning, and there's no data to tell the doctor whether the queue is moving faster or slower than usual. The real pain isn't "we need software," it's that every stakeholder — patient, receptionist, doctor — is making decisions in the dark because none of them share a single, reliable, live view of who's waiting, who's being served, and how long things are taking. Queue Cure replaces that shared blind spot with two real-time synced screens: one for the receptionist to manage the queue, and one for the waiting room to see the queue, both looking at exactly the same truth at exactly the same time.

---

## 2. Constraints I Accepted vs. Pushed On, and Why

**Deliberately accepted — in scope:**

- **Single doctor, single queue.** The hackathon brief is about proving real-time correctness, not building a production multi-tenant clinic management system. One queue is enough to demonstrate all the concurrency, idempotency, and reconnection guarantees that the rubric grades on. Multi-doctor is a clean stretch goal (see Section 4) because the `queueStore` already indexes by `doctorId`.

- **In-memory state, no database.** This is a single-session demo app. Persisting to a database adds complexity (migrations, connection pooling, transaction handling) that doesn't serve any of the four graded criteria. The server's `queueStore` module is the sole source of truth, and every restart gives a clean slate. This is a deliberate design choice, not an oversight — if a reviewer asks, the answer is: "persistence is out of scope because the rubric tests real-time correctness, not data durability."

- **No auth, no payments, no multi-tenancy.** These are explicitly out of scope per the brief and don't contribute to any of the four weighted criteria.

**Deliberately pushed on — out of scope:**

- **QR codes, voice/TTS announcements, SMS notifications.** Each of these depends on something outside my control during a live demo — camera/scanner hardware, audio permissions, or a third-party telephony API actually responding in a few seconds. For a clinic's real-time queue, the one thing that has to be bulletproof is the sync itself; every additional integration is one more thing that can silently fail in front of a doctor mid-consultation. I'd rather ship a system that does fewer things with total reliability than one that demos five features with any chance of one of them glitching.

- **Full i18n library.** A simple JSON dictionary of English/Hindi string mappings is sufficient. Using a full i18n library (react-intl, i18next) would add dependency weight for no measurable benefit in this context.

---

## 3. Key Decisions and Reasoning

### Why server-authoritative state

All canonical queue state lives on the server in a single module-level JavaScript object (`queueStore.js`). Clients never compute derived values — they only render what the server broadcasts via `queue:update`. This guarantees that:

1. There is exactly one truth. Two browser tabs, two different devices, a laptop and a wall-mounted TV — all see the same data because they all received the same broadcast.
2. There are no race conditions between clients. If two receptionists somehow both hit "Call Next" at the same time (or one request retries), the server processes them sequentially (Node.js single-threaded event loop) against the same object, and each client gets the result.
3. The patient display can never show a "locally optimistic" state that the server later disagrees with.

### Wait-time algorithm: rolling average + cold-start fallback

This is the most important technical detail in the project (25% of the grade).

- **Rolling average:** Each doctor keeps an array of the last 5 actual consultation durations. A "duration" is the time from one "Call Next" to the next "Call Next" — this measures actual consultation time, not a guess.
- **Cold start:** At the start of the day, there are no data points. The receptionist sets a manual `avgConsultMinutes` value (e.g. 10 minutes) that serves as the fallback.
- **Transition:** The moment the first real "Call Next" → "Call Next" duration is recorded, the system switches from the manual fallback to the rolling average. The manual value is never used again unless all real data is cleared.
- **Estimated wait:** `estimatedWaitMinutes = (number of patients in waitingTokens) × (current rolling average)`. This is recomputed and broadcast on *every* state change — never on a client-side timer. The patient display shows the last-computed value, which is always fresh because it was just broadcast. This 5-entry cap and cold-start fallback were rigorously verified via an automated programmatic script asserting the cap and average.

Why 5 and not 10 or 20? A small window makes the estimate responsive to changes in consultation pace (morning rush vs. afternoon slowdown) without being too volatile from a single outlier.

### Idempotent "Call Next" — double-click and network-retry protection

The `callNext` event includes a `requestId` — a client-generated UUID. The server maintains a bounded cache of the last 50 request IDs. If the same `requestId` arrives twice (because the client retried on a flaky network, or because the user double-clicked before the button disabled), the server recognizes the duplicate and returns the current state without mutating — no patient gets skipped.

On the client side, the "Call Next" button is disabled immediately on click and only re-enabled when the next `queue:update` arrives (or after a 5-second timeout that surfaces an error state). This is belt-and-suspenders: the client prevents accidental double-clicks, and the server prevents accidental double-mutations. This dual-layer idempotency was confirmed via an automated programmatic test simulating rapid duplicate `requestId` transmissions.

### Reconnection sync

Socket.io's built-in reconnection establishes the transport, but it doesn't guarantee the client's *application state* is current. On every `connect` event (including reconnects), the client emits `client:requestSync`, and the server responds with the full `queue:update` payload for the current state. This means a patient display that lost Wi-Fi for 10 seconds — or a receptionist who closed and reopened their laptop — catches up to the correct state instantly, without needing to refresh the page.

### Empty-queue edge case

On the common path, the receptionist's own screen already shows zero patients waiting, so the client shows a calm 'No patients waiting' message before a request is even sent. The harder case is two receptionist tabs open at once: if Tab A calls the last patient a split second before Tab B clicks 'Call Next' on its still-slightly-stale view, the request still reaches the server while the queue is genuinely empty. The server detects this, makes no change to state, and sends the current snapshot straight back — so Tab B's screen immediately corrects itself instead of appearing to do nothing. This was verified directly against the server with an automated test that bypasses the UI entirely.

### Undo Last Call

The "Undo Last Call" button stores the state from immediately before the most recent "Call Next" action (the previous `currentToken`, the called token, and the timestamp). Clicking undo restores the called patient to the front of the queue and reverts `currentToken` to whatever it was before. Only one level of undo is supported — this covers the receptionist's most common mistake ("I clicked too fast") without adding undo/redo complexity.

---

## 4. What I'd Do with More Time

These are deliberately scoped out — not "ran out of time for," but "would build in a subsequent iteration":

- **Multi-doctor support:** The `queueStore` already keys state by `doctorId`. Adding a doctor selector to both screens and broadcasting per-doctor state would enable independent queues — a natural next step for a clinic with multiple doctors.

- **SMS / WhatsApp notifications:** When a patient's token is 2–3 positions away, send them a notification so they don't have to sit in the waiting room. Requires a telephony API (Twilio, WhatsApp Business) and patient phone number capture.

- **Persistent storage:** Replace the in-memory state with SQLite or PostgreSQL for crash recovery and multi-day continuity. The `queueStore` module's interface wouldn't change — only its backing store.

- **Analytics dashboard:** Track daily throughput (patients served per hour), average wait times over the day, and peak-load hours. This data is already being computed (rolling consultation durations) — it just isn't being stored or visualized yet.

- **Per-patient wait-time estimates:** The current display shows one estimated wait for the *next* token. With a per-patient view (e.g., via a patient's phone scanning a QR code), each patient could see their own estimated wait based on their position in the queue.
