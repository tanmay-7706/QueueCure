# Socket Event Contract

All socket event names, payloads, and flows used by Queue Cure '26.

---

## Event Table

### Client → Server

| Event Name | Payload | Description |
|---|---|---|
| `receptionist:addPatient` | `{ name: string, doctorId: string }` | Add a new patient to the queue |
| `receptionist:callNext` | `{ doctorId: string, requestId: string }` | Call the next patient. `requestId` is a client-generated UUID for idempotency |
| `receptionist:undoLastCall` | `{ doctorId: string }` | Revert the last "Call Next" action |
| `receptionist:setAvgConsultTime` | `{ doctorId: string, minutes: number }` | Update the manual average consultation time (cold-start fallback) |
| `receptionist:setDoctorStatus` | `{ doctorId: string, isOnBreak: boolean }` | Pause or resume the queue for a doctor break |
| `client:requestSync` | `{}` | Sent automatically on connect/reconnect to get current full state |

### Server → All Clients (broadcast)

| Event Name | Payload | Description |
|---|---|---|
| `queue:update` | See payload below | Broadcast after every mutation and on every new connection |

#### `queue:update` Payload

```json
{
  "doctorId": "string",
  "currentToken": { "id": "string", "name": "string", "tokenNumber": 12 },
  "waitingTokens": [{ "id": "string", "name": "string", "tokenNumber": 13 }],
  "avgConsultMinutes": 8,
  "estimatedWaitMinutes": 24,
  "lastUpdated": "2026-06-17T00:00:00.000Z",
  "canUndo": true,
  "realDataPoints": 3,
  "isOnBreak": false
}
```

`currentToken` is `null` when no patient is being served.

---

## Sequence Diagrams

### Normal Flow — "Call Next" Action

```mermaid
sequenceDiagram
    participant R as Receptionist Client
    participant S as Server
    participant P as Patient Display

    R->>R: Click "Call Next" (button disables immediately)
    R->>S: receptionist:callNext { doctorId, requestId }
    S->>S: Check requestId idempotency
    S->>S: Record consultation duration (if previous call exists)
    S->>S: Shift next token → currentToken
    S->>S: Recompute estimatedWaitMinutes
    S-->>R: queue:update (broadcast)
    S-->>P: queue:update (broadcast)
    R->>R: Re-render + re-enable "Call Next" button
    P->>P: Re-render with pulse animation on token number
```

### Reconnection Flow — Client Catches Up to Current State

```mermaid
sequenceDiagram
    participant C as Client (R or P)
    participant S as Server

    C->>C: Network drops (disconnect event)
    Note over C: Socket.io auto-reconnects
    C->>S: connect event fires
    C->>S: client:requestSync {}
    S->>S: Read current state from queueStore
    S-->>C: queue:update (full current state, to this socket only)
    C->>C: Re-render with correct state
```

### Add Patient Flow

```mermaid
sequenceDiagram
    participant R as Receptionist Client
    participant S as Server
    participant P as Patient Display

    R->>S: receptionist:addPatient { name, doctorId }
    S->>S: Create token with sequential number
    S->>S: Append to waitingTokens
    S->>S: Recompute estimatedWaitMinutes
    S-->>R: queue:update (broadcast)
    S-->>P: queue:update (broadcast)
    R->>R: Clear input + show toast confirmation
    P->>P: Re-render waiting list
```

### Idempotent "Call Next" — Duplicate Request Handling

```mermaid
sequenceDiagram
    participant R as Receptionist Client
    participant S as Server

    R->>S: receptionist:callNext { doctorId, requestId: "abc-123" }
    S->>S: Process normally, cache requestId "abc-123"
    S-->>R: queue:update (broadcast)

    Note over R: Network hiccup triggers retry
    R->>S: receptionist:callNext { doctorId, requestId: "abc-123" }
    S->>S: requestId "abc-123" found in cache → NO-OP
    S-->>R: queue:update (current state, to this socket only)
```

### Doctor Break Flow

```mermaid
sequenceDiagram
    participant R as Receptionist Client
    participant S as Server
    participant P as Patient Display

    R->>S: receptionist:setDoctorStatus { isOnBreak: true }
    S->>S: Set doc.isOnBreak = true
    S-->>R: queue:update (broadcast, isOnBreak: true)
    S-->>P: queue:update (broadcast, isOnBreak: true)
    R->>R: Show "Queue Paused" button, disable Call Next
    P->>P: Show break screen, hide estimated wait

    Note over R: Receptionist tries Call Next during break
    R->>S: receptionist:callNext { doctorId, requestId }
    S->>S: isOnBreak guard → blocked
    S-->>R: queue:update (current state, to this socket only)

    R->>S: receptionist:setDoctorStatus { isOnBreak: false }
    S->>S: Set doc.isOnBreak = false
    S-->>R: queue:update (broadcast, isOnBreak: false)
    S-->>P: queue:update (broadcast, isOnBreak: false)
    R->>R: Resume normal Call Next button
    P->>P: Resume normal serving display
```
