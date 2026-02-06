# Multiplayer & Networking Review

## Overview

The multiplayer layer implements a WebRTC mesh-based peer-to-peer architecture with a signaling server for connection setup. The system is organized into three main sub-layers:

1. **Networking** (`src/multiplayer/networking/`) -- WebRTC mesh formation, signaling, and transport
2. **Protocol** (`src/multiplayer/protocol/`) -- Binary message encoding/decoding, type-safe routing
3. **Lobby/Campaign Integration** (`src/campaign/handlers/lobby-*.ts`, `src/multiplayer/`) -- Lobby state, permissions, campaign sync, action processing

The architecture follows a host-authoritative model where the host validates all guest actions, manages campaign state, and broadcasts updates. The protocol uses a custom binary format in the `0x80-0x98` byte range to coexist with rollback-netcode's internal messages. Overall, the code is well-structured, well-documented, and demonstrates strong engineering discipline.

---

## Issues

### Design: Module-Level Mutable State in `lobby-state.ts`
**File**: `src/multiplayer/lobby-state.ts:211`
**Severity**: Low

`let nextMessageId = 1` remains module-level mutable state. The comment on line 72 explains the intentional decision ("Note: nextMessageId intentionally NOT reset here to avoid ID collisions across sessions"). This is a minor design wart but not a bug. The counter growing monotonically is harmless in practice since chat message IDs only need to be unique within a session's lifetime.

---

### Design: `CampaignSyncMessage` Sends Full Campaign State as JSON
**File**: `src/multiplayer/protocol/encode.ts:248-255`
**Severity**: Low (Performance)

Every campaign state change triggers a full `CampaignSync` broadcast with the entire `CampaignState` serialized as JSON. The `TransformingTransport`'s gzip compression mitigates bandwidth cost. Implementing delta sync would be a significant architectural change. Acceptable as-is unless profiling reveals it as a bottleneck.

---

### Performance: `stringSize()` Encodes String Twice
**File**: `src/multiplayer/protocol/buffer-utils.ts:204-206`
**Severity**: Low

`stringSize(str)` calls `textEncoder.encode(str).length`, and `writeString()` re-encodes the same string. Each string is encoded twice. For typical message sizes this is negligible, but it could be optimized for messages with many strings.

---

### Performance: `hashCampaignState` Uses Full JSON Stringification
**File**: `src/multiplayer/mission-sync.ts:48-56`
**Severity**: Low

`hashCampaignState()` calls `JSON.stringify(campaignState)` to compute a DJB2 hash. This runs once at mission start on both host and guest, so the impact is minimal.

---

### Design: `ChatMessage` Timestamp Uses `Date.now()`
**File**: `src/multiplayer/lobby-message-creators.ts:37`
**Severity**: Low

`createChatMessage()` uses `Date.now()`. Similarly, `addSystemMessage()` in `lobby-state.ts:244`, and `createSystemMessage()` in `pause-coordinator.ts:89`. This is lobby/UI code rather than game simulation, so the project rule "No `Date.now()` in game logic" does not strictly apply. Acceptable.

---

### Design: `WelcomeMessage` Includes Full `CampaignState` as JSON
**File**: `src/multiplayer/protocol/encode.ts:156-174`
**Severity**: Low

The `WelcomeMessage` embeds the entire campaign state as JSON alongside the player list. This is inherent to the design -- the guest needs the full campaign state to initialize. The 1MB `MAX_MESSAGE_SIZE` limit provides a safety boundary.

---

### Bug: `decodePauseRequest` Does Not Validate `reasonByte` Range
**File**: `src/multiplayer/protocol/decode.ts:346-361`
**Severity**: Low

While `decodePlayerLeft` throws on invalid `reasonByte > 2`, `decodePauseRequest` (line 349-354) silently maps any byte value >= 2 to `'lag-detected'`. For consistency, values other than 0, 1, or 2 should throw a `ProtocolError`.

```typescript
// decode.ts:349-354 -- reasonByte 3-255 silently maps to 'lag-detected'
const reason =
  reasonByte === 0
    ? 'player-request'
    : reasonByte === 1
      ? 'player-disconnect'
      : 'lag-detected';
```

---

### Security: `readPermission` Does Not Validate `shipEditValue` Range
**File**: `src/multiplayer/protocol/buffer-utils.ts:238-248`
**Severity**: Low

`readPermission()` maps `shipEditValue === 0` to `'none'`, `1` to `'own'`, and anything else to `'any'`. A malicious peer could send `shipEditValue = 255` and it would be decoded as `'any'` (full permissions). While this is only exploitable if a guest can forge a `PermissionUpdate` message (which is in `HOST_ONLY_MESSAGES` and rejected by the router), it would be safer to validate the byte range strictly.

---

### Design: `broadcastAndApply` Still Duplicated in Two Files
**File**: `src/campaign/handlers/lobby-actions.ts:216-229`, `src/campaign/handlers/lobby-kick.ts:20-30`
**Severity**: Low

The `broadcastAndApply` pattern (broadcast + `processLobbyMessage` + `setLobbyState`) exists in both `lobby-actions.ts` and `lobby-kick.ts`. The two versions have slightly different signatures -- `lobby-kick.ts` takes an explicit `hostPeerId` while `lobby-actions.ts` derives it from context -- but they perform the same operation. This could drift over time.

---

### Security: Chat Messages Not Validated on Host Relay
**File**: `src/campaign/handlers/lobby-protocol-routing.ts:166`
**Severity**: Low

Chat messages from guests are processed without host-side validation of content length or rate limiting. The `validateChatMessage()` function exists in `chat-validation.ts` but is only called on the sender side (`lobby-actions.ts:267`).

Additionally, `chat-validation.ts` uses module-level state (`lastMessageTime` map at line 14) that is never cleared on lobby cleanup. The `clearAllRateLimits()` function exists (line 65) but is not called from `cleanupLobby()`.

---

### Bug: `chat-validation.ts` Rate Limit State Never Cleared on Lobby Leave
**File**: `src/multiplayer/chat-validation.ts:14`, `src/campaign/handlers/lobby-session.ts:64-96`
**Severity**: Low

The `lastMessageTime` map in `chat-validation.ts` accumulates entries for player IDs across sessions but is never cleared. The `clearAllRateLimits()` function exists but is not called from `cleanupLobby()` or `handleSessionEndedForGuest()`. This means:
1. Rate limit tracking leaks between sessions
2. If a player ID is reused, stale rate limits could block chat

---

### Design: `lobby-kick.ts` broadcastAndApply Uses Separate hostPeerId Parameter
**File**: `src/campaign/handlers/lobby-kick.ts:20-30`
**Severity**: Low

`lobby-kick.ts` defines its own `broadcastAndApply` that takes an explicit `hostPeerId` parameter. The version in `lobby-actions.ts` infers the host peer ID from `ctx.isHost ? ctx.localPlayerId : ''`. The empty string fallback in the non-host case is fragile, though it is only called from host context so this is not an actual bug.

---

### Design: Pause Coordinator Reuses LaunchCountdown/LaunchAborted Message Types
**File**: `src/multiplayer/pause-coordinator.ts:116-137`
**Severity**: Low

The `PauseCoordinator` broadcasts `LaunchCountdown` and `LaunchAborted` messages for the resume countdown. These are the same message types used by the lobby launch countdown flow. If both flows could theoretically be active simultaneously, the guest handlers would conflict. Currently prevented by the state machine, but reusing message types for different semantic purposes is a maintenance risk.

---

### Design: `PauseCoordinator` Captures `lobbyState` by Reference at Init Time
**File**: `src/multiplayer/pause-coordinator.ts:67`
**Severity**: Medium

`initPauseCoordination` destructures `lobbyContext.lobbyState` into the local `lobbyState` variable. This reference is captured in closures like `getLocalCallsign()` and `doPause()`. Since `LobbyContext.lobbyState` is replaced on every state update (immutable pattern), the captured reference becomes stale immediately after any lobby state change. This means:

- `getLocalCallsign()` always reads the callsign from the lobby state at pause coordinator initialization time, not the current state
- `doPause()` calls `lobbyPlayersToPausePlayers(lobbyState.players)` with the stale player list

In practice, lobby state rarely changes during a mission, so this is unlikely to cause visible bugs. But it is architecturally incorrect. The closures should read from `lobbyContext.lobbyState` rather than the destructured local.

---

### Design: `MultiplayerSession.pause()` and `resume()` Use Unsafe Type Assertions
**File**: `src/multiplayer/multiplayer-session.ts:270-287`
**Severity**: Low

`pause()` and `resume()` use runtime `in` checks followed by type assertions. If the `rollback-netcode` library changes the `pause`/`resume` API signature, the assertion would silently pass but with incorrect behavior. Consider properly typing this via the `Session` interface or using a version check.

---

### Design: `multiplayer-game-loop.ts` Unbounded Accumulator Can Cause Tick Spiral
**File**: `src/multiplayer/multiplayer-game-loop.ts:91-119`
**Severity**: Low

The fixed-timestep loop accumulates delta time without any upper bound. If the browser tab is backgrounded and then foregrounded, `delta` could be very large, causing hundreds or thousands of simulation ticks in a single frame. A common mitigation is capping the accumulator to a maximum (e.g., 5-10 ticks worth of time).

---

### Design: `validateActionData` Does Not Validate String Fields
**File**: `src/multiplayer/action-validation.ts:148-196`
**Severity**: Low

The `validateActionData()` function validates numeric fields well but does not validate string fields like `itemId`, `shipId`, `pilotId`, `shipClass`, `commanderId`, or `category`. A malicious peer could send extremely long strings or invalid enum values. While `processAction` would likely handle these gracefully, explicit validation would strengthen the defense.

---

## Strengths

### Excellent Protocol Design
The binary protocol is well-designed with symmetric encode/decode functions, size pre-calculation, bounds checking via `ensureBytes()`, and clear separation of concerns. The exhaustive `switch` statements with `never` type checks ensure compile-time safety when new message types are added. The `HOST_ONLY_MESSAGES` set provides a clean trust boundary check in the router. The `GAME_MSG_MIN`/`GAME_MSG_MAX` range detection auto-derives from the enum values, making it maintenance-free.

### Strong Host-Authority Model
The architecture correctly implements host-authoritative state management. Guests cannot modify campaign state directly -- all changes go through `ActionRequest -> host validates -> ActionResponse + CampaignSync`. Permission validation covers all action types with appropriate granularity (ship edit levels: none/own/any, plus buy/sell/convert flags).

### Clean Immutable State Pattern
`lobby-state.ts` follows a disciplined immutable update pattern where every state change produces a new object. The `setPlayer*` functions are consistent and predictable.

### Well-Organized File Structure
Large files have been properly decomposed: `encode.ts`/`encode-mission.ts`, `messages.ts`/`messages-mission.ts`/`messages-pause.ts`, `router.ts`/`router-types.ts`/`router-send.ts`, `action-processing.ts`/`action-validation.ts`, `lobby-actions.ts`/`lobby-kick.ts`/`lobby-launch-actions.ts`/`lobby-broadcast.ts`. The decomposition boundaries are logical and documented.

### Comprehensive Documentation
The `@mp-*` JSDoc annotations on every message type and action type are exceptional. They document the actor, permission, flow, UI impact, test coverage, and implementation status. This makes the protocol self-documenting.

### Campaign State Hash Verification
The `campaignStateHash` field in `MissionStartedMessage` provides a valuable integrity check. Guests verify their local campaign state matches the host's before entering a mission, catching desync issues early.

### Robust Error Handling
The networking layer handles errors gracefully throughout: `fetchWithRetry` with exponential backoff, `SignalQueue` with configurable retries, `ReconnectionManager` with jitter to prevent thundering herds, `ProtocolError` for malformed messages, and the router's `onError` callback for handler exceptions.

### Clean Transport Abstraction
The layered transport design (`WebRTCMesh` -> `WebRTCTransport` -> `TransformingTransport`) cleanly separates concerns. The `TransformingTransport` from rollback-netcode automatically handles compression and segmentation.

### Well-Designed Reconnection
The reconnection system implements proper exponential backoff with jitter and a tie-breaker rule (lower peer ID initiates) to prevent dual-offer deadlock.

### Thorough Cleanup on Session End
`cleanupLobby()` correctly chains cleanup of all subsystems: broadcasts `SessionEnded`, runs `ctx.cleanup()`, disconnects and disposes the connection flow, clears the multiplayer context, resets launch state, resets the action client, and clears the lobby context.

### Effective Host-Side Callsign/Autoaim Validation
The `CallsignUpdate` and `AutoaimUpdate` handlers demonstrate the "Any -> All" validation pattern well: verify sender, validate format, check for conflicts, and only then rebroadcast.

---

## Recommendations

Listed in priority order:

1. **Fix PauseCoordinator stale `lobbyState` capture** (Design, Medium Priority): Change closures in `initPauseCoordination` to read from `lobbyContext.lobbyState` instead of the destructured local variable.

2. **Add accumulator cap to multiplayer game loop** (Design, Medium Priority): Add `state.accumulator = Math.min(state.accumulator, TICK_MS * MAX_CATCHUP_TICKS)` to prevent tick spirals after tab backgrounding.

3. **Validate `decodePauseRequest` reasonByte range** (Bug, Low Priority): Add `if (reasonByte > 2) throw new ProtocolError('Invalid pause reason')` for consistency.

4. **Call `clearAllRateLimits()` on lobby cleanup** (Bug, Low Priority): Add a call from `cleanupLobby()` and `handleSessionEndedForGuest()` to prevent rate limit state leaking between sessions.

5. **Validate string fields in `validateActionData`** (Security, Low Priority): Add checks that `category`, `itemType`, and string IDs are valid and within reasonable length bounds.

6. **Consider dedicated ResumeCountdown message type** (Design, Low Priority -- Future): Separating pause resume messages from lobby launch messages would prevent future confusion.

7. **Consider delta sync for `CampaignSyncMessage`** (Performance, Low Priority -- Future): If profiling shows sync messages are a bandwidth bottleneck, implement delta-based sync.
