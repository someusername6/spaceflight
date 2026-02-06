# Multiplayer & Networking Review

## Overview

The multiplayer layer implements a WebRTC mesh-based peer-to-peer architecture with a signaling server for connection setup. The system is organized into three main sub-layers:

1. **Networking** (`src/multiplayer/networking/`) -- WebRTC mesh formation, signaling, and transport
2. **Protocol** (`src/multiplayer/protocol/`) -- Binary message encoding/decoding, type-safe routing
3. **Lobby/Campaign Integration** (`src/campaign/handlers/lobby-*.ts`, `src/multiplayer/`) -- Lobby state, permissions, campaign sync, action processing

The architecture follows a host-authoritative model where the host validates all guest actions, manages campaign state, and broadcasts updates. The protocol uses a custom binary format in the `0x80-0x98` byte range to coexist with rollback-netcode's internal messages. Overall, the code is well-structured, well-documented, and demonstrates strong engineering discipline. Multiple issues from the previous review have been fixed. The remaining issues are mostly low severity.

## Previous Review Fix Verification

### FIXED: `dismissPilot`/`spendXP` host-only bypass
**Status**: Fixed in `src/multiplayer/action-validation.ts:113-118`

The `validateActionPermission()` function now receives a `hostPlayerId` parameter (line 52) and checks `if (playerId !== hostPlayerId)` for both `dismissPilot` (line 114) and `spendXP` (line 118), returning `'Only the host can dismiss pilots'` or `'Only the host can spend XP'` respectively. The caller in `campaign-sync.ts:166` passes `this.router.getHostPeerId()` as the `hostPlayerId`. This is correct and closes the trust boundary gap.

### FIXED: `ActionRequestData` unchecked JSON.parse
**Status**: Fixed in `src/multiplayer/action-validation.ts:148-196`

A new `validateActionData()` function now validates action shape before processing. It checks:
- The action is a non-null object (line 149)
- The `type` field is in the `KNOWN_ACTION_TYPES` set (line 150-151)
- Numeric fields (`quantity`, `bankSize`, `storageIndex`, `slotIndex`, `storedShipIndex`) are non-negative integers (lines 153-193)

The validation is called in `campaign-sync.ts:179` (the `handleActionRequest` method) after permission validation and before `processAction()`.

### FIXED: `CallsignAnnounce` not validated on host
**Status**: Fixed in `src/campaign/handlers/lobby-host-handlers.ts:138-140`

`handleCallsignAnnounce()` now calls `validateCallsign(callsign)` and falls back to `'Guest'` if the callsign is invalid. This matches the validation done for `CallsignUpdate` messages.

### FIXED: `decodePlayerLeft` doesn't validate reasonByte
**Status**: Fixed in `src/multiplayer/protocol/decode.ts:172`

`decodePlayerLeft()` now throws `ProtocolError('Invalid leave reason')` when `reasonByte > 2` (line 172). This prevents silent acceptance of malformed reason bytes.

However, `decodePauseRequest()` (decode.ts:346-361) still silently maps invalid `reasonByte` values to `'lag-detected'`. See "Remaining Issues" below.

### FIXED: `action-client.ts` stale handler state
**Status**: Fixed in `src/multiplayer/action-client.ts:47-51`

A new `resetActionClient()` function resets all three pieces of module-level state: `isResponseHandlerSetUp = false`, `pendingRequests.clear()`, and `nextRequestId = 1`. It is called from `cleanupLobby()` in `lobby-session.ts:92` and from `handleSessionEndedForGuest()` in `lobby-session.ts:42`. This ensures the handler flag is reset between sessions.

### FIXED: `broadcastMessage` duplicated 3x
**Status**: Fixed in `src/campaign/handlers/lobby-broadcast.ts:1-18`

A shared `broadcastMessage(ctx, message)` utility now exists in `lobby-broadcast.ts`. Both `lobby-actions.ts:50` and `lobby-kick.ts:14` import from it. `lobby-launch-actions.ts:24` also imports from it. The duplication has been eliminated.

Note: `broadcastAndApply` still exists in two places (`lobby-actions.ts:216-229` and `lobby-kick.ts:20-30`), but with slightly different signatures -- the `lobby-kick.ts` version takes an explicit `hostPeerId` parameter while `lobby-actions.ts` uses the context's `isHost` flag to determine it. This is arguably acceptable since they serve slightly different calling conventions.

### FIXED: `session-state.ts` dead code
**Status**: Fixed -- the file no longer exists.

A glob for `src/multiplayer/session-state.ts` returns no results. The preparatory dead code has been removed.

### FIXED: Stale byte range comments
**Status**: Fixed in both files.

`src/multiplayer/protocol/index.ts:8` now reads "Message type definitions (0x80-0x98 byte range)".
`src/multiplayer/protocol/messages.ts:3` now reads "These messages use byte range 0x80-0x98 to avoid conflicts".

### FIXED: `sendCallsignAnnounce` broadcasts to all
**Status**: Partially fixed with explanatory comment.

`src/campaign/handlers/lobby-protocol-routing.ts:323-324` now has a comment: "Broadcast is used because transport.send(peerId) requires knowing the host's peerId, which isn't available here. In 2-player this is equivalent to unicast." The broadcast is still used, but the design choice is now documented. This is acceptable.

### FIXED: `action-processing.ts` was over 400 lines
**Status**: Fixed via split into `action-validation.ts`.

`action-processing.ts` is now 255 lines. The permission validation (`validateActionPermission`) and data validation (`validateActionData`) were extracted to `action-validation.ts` (196 lines). Re-exports in `action-processing.ts:43-46` maintain backward compatibility.

## Remaining Issues (From Previous Review, Still Present)

### Design: Module-Level Mutable State in `lobby-state.ts`
**File**: `src/multiplayer/lobby-state.ts:211`
**Severity**: Low

`let nextMessageId = 1` remains module-level mutable state. The comment on line 72 explains the intentional decision ("Note: nextMessageId intentionally NOT reset here to avoid ID collisions across sessions"). This is a minor design wart but not a bug. The counter growing monotonically is harmless in practice since chat message IDs only need to be unique within a session's lifetime, and the counter will never overflow in realistic usage.

---

### Design: `CampaignSyncMessage` Sends Full Campaign State as JSON
**File**: `src/multiplayer/protocol/encode.ts:248-255`
**Severity**: Low (Performance)

Every campaign state change still triggers a full `CampaignSync` broadcast with the entire `CampaignState` serialized as JSON. This is unchanged. The `TransformingTransport`'s gzip compression mitigates bandwidth cost. Implementing delta sync would be a significant architectural change. This remains acceptable as-is unless profiling reveals it as a bottleneck.

---

### Performance: `stringSize()` Encodes String Twice
**File**: `src/multiplayer/protocol/buffer-utils.ts:204-206`
**Severity**: Low

`stringSize(str)` still calls `textEncoder.encode(str).length`, and `writeString()` re-encodes the same string. Each string is encoded twice. For typical message sizes this is negligible, but it could be optimized for messages with many strings.

---

### Performance: `hashCampaignState` Uses Full JSON Stringification
**File**: `src/multiplayer/mission-sync.ts:48-56`
**Severity**: Low

`hashCampaignState()` still calls `JSON.stringify(campaignState)` to compute a DJB2 hash. This runs once at mission start on both host and guest, so the impact is minimal.

---

### Maintenance: `router.ts` at 395 Lines, Near 400-Line Limit
**File**: `src/multiplayer/protocol/router.ts`
**Severity**: Low

The router file remains at 395 lines. The handler registration methods (lines 119-242) are mechanical one-liners. Adding one more message type will push this file over the 400-line limit and require extraction.

---

### Design: `ChatMessage` Timestamp Uses `Date.now()`
**File**: `src/multiplayer/lobby-message-creators.ts:37`
**Severity**: Low

`createChatMessage()` still uses `Date.now()`. Similarly, `addSystemMessage()` in `lobby-state.ts:244`, and `createSystemMessage()` in `pause-coordinator.ts:89`. This is lobby/UI code rather than game simulation, so the project rule "No `Date.now()` in game logic" does not strictly apply. Remains acceptable.

---

### Design: `WelcomeMessage` Includes Full `CampaignState` as JSON
**File**: `src/multiplayer/protocol/encode.ts:156-174`
**Severity**: Low

The `WelcomeMessage` still embeds the entire campaign state as JSON alongside the player list. This is inherent to the design -- the guest needs the full campaign state to initialize. The 1MB `MAX_MESSAGE_SIZE` limit provides a safety boundary.

## New Issues Found

### Bug: `decodePauseRequest` Does Not Validate `reasonByte` Range
**File**: `src/multiplayer/protocol/decode.ts:346-361`
**Severity**: Low

While `decodePlayerLeft` was fixed to throw on invalid `reasonByte > 2`, `decodePauseRequest` (line 349-354) still silently maps any byte value >= 2 to `'lag-detected'`. For consistency with the `decodePlayerLeft` fix, values other than 0, 1, or 2 should throw a `ProtocolError`.

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

`readPermission()` maps `shipEditValue === 0` to `'none'`, `1` to `'own'`, and anything else to `'any'`. A malicious peer could send `shipEditValue = 255` and it would be decoded as `'any'` (full permissions). While this is only exploitable if a guest can forge a `PermissionUpdate` message (which is in `HOST_ONLY_MESSAGES` and rejected by the router), it would be safer to validate the byte range strictly:

```typescript
// buffer-utils.ts:239-241 -- shipEditValue 2-255 all map to 'any'
const shipEdit =
  shipEditValue === 0 ? 'none' : shipEditValue === 1 ? 'own' : 'any';
```

---

### Design: `broadcastAndApply` Still Duplicated in Two Files
**File**: `src/campaign/handlers/lobby-actions.ts:216-229`, `src/campaign/handlers/lobby-kick.ts:20-30`
**Severity**: Low

While `broadcastMessage` was consolidated into `lobby-broadcast.ts`, the `broadcastAndApply` pattern (broadcast + `processLobbyMessage` + `setLobbyState`) still exists in both `lobby-actions.ts` and `lobby-kick.ts`. The two versions have slightly different signatures -- `lobby-kick.ts` takes an explicit `hostPeerId` while `lobby-actions.ts` derives it from context -- but they perform the same operation. This could drift over time.

---

### Security: Chat Messages Still Not Validated on Host Relay
**File**: `src/campaign/handlers/lobby-protocol-routing.ts:166`
**Severity**: Low

Chat messages from guests are processed via the generic `handler` (lines 158-163) which calls `processLobbyMessage` without any host-side validation of content length or rate limiting. Since `ChatMessage` uses the "Any -> All" broadcast pattern (each peer broadcasts directly), the host cannot easily intercept messages sent directly between peers. However, the host could validate messages it receives locally before applying them to lobby state. The `validateChatMessage()` function exists in `chat-validation.ts` but is only called on the sender side (`lobby-actions.ts:267`).

Additionally, `chat-validation.ts` uses module-level state (`lastMessageTime` map at line 14) that is never cleared on lobby cleanup. The `clearAllRateLimits()` function exists (line 65) but is not called from `cleanupLobby()`.

---

### Bug: `chat-validation.ts` Rate Limit State Never Cleared on Lobby Leave
**File**: `src/multiplayer/chat-validation.ts:14`, `src/campaign/handlers/lobby-session.ts:64-96`
**Severity**: Low

The `lastMessageTime` map in `chat-validation.ts` accumulates entries for player IDs across sessions but is never cleared. The `clearAllRateLimits()` function exists but is not called from `cleanupLobby()` or `handleSessionEndedForGuest()`. This means:
1. Rate limit tracking leaks between sessions
2. If a player ID is reused (unlikely with UUIDs but possible in testing), stale rate limits could block chat

---

### Design: `lobby-kick.ts` broadcastAndApply Uses Separate hostPeerId Parameter
**File**: `src/campaign/handlers/lobby-kick.ts:20-30`
**Severity**: Low

`lobby-kick.ts` defines its own `broadcastAndApply` that takes an explicit `hostPeerId` parameter (line 23). This is called at line 76 with `ctx.localPlayerId` since the caller is always the host. The version in `lobby-actions.ts:216-229` infers the host peer ID from `ctx.isHost ? ctx.localPlayerId : ''`. The empty string fallback in the non-host case means the host peer ID is not correctly identified for message processing, but since `broadcastAndApply` in `lobby-actions.ts` is only called from host context (e.g., `changePermissions` at line 290 checks `if (!ctx.isHost) return`), this is not an actual bug. Still, the empty string as a sentinel is fragile.

---

### Design: Pause Coordinator Reuses LaunchCountdown/LaunchAborted Message Types
**File**: `src/multiplayer/pause-coordinator.ts:116-137`
**Severity**: Low

The `PauseCoordinator` broadcasts `LaunchCountdown` (line 118) and `LaunchAborted` (line 135) messages for the resume countdown. These are the same message types used by the lobby launch countdown flow (`lobby-launch-actions.ts`). If both flows could theoretically be active simultaneously, the guest handlers for these messages would conflict. Currently this is prevented by the state machine (lobby launches only happen from lobby, pauses only happen in-mission), but reusing message types for different semantic purposes is a maintenance risk. Consider dedicated `ResumeCountdown`/`ResumeAborted` message types.

---

### Design: `PauseCoordinator` Captures `lobbyState` by Reference at Init Time
**File**: `src/multiplayer/pause-coordinator.ts:67`
**Severity**: Medium

`initPauseCoordination` destructures `lobbyContext.lobbyState` (line 67) into the local `lobbyState` variable. This reference is then captured in closures like `getLocalCallsign()` (line 78) and `doPause()` (line 188). Since `LobbyContext.lobbyState` is replaced on every state update (immutable pattern in `lobby-actions.ts:138`), the captured reference becomes stale immediately after any lobby state change. This means:

- `getLocalCallsign()` always reads the callsign from the lobby state at pause coordinator initialization time, not the current state
- `doPause()` calls `lobbyPlayersToPausePlayers(lobbyState.players)` with the stale player list

In practice, lobby state rarely changes during a mission (no new joins, no callsign changes), so this is unlikely to cause visible bugs. But it is architecturally incorrect. The closures should read from `lobbyContext.lobbyState` (which is always the latest reference) rather than the destructured local.

---

### Design: `MultiplayerSession.pause()` and `resume()` Use Unsafe Type Assertions
**File**: `src/multiplayer/multiplayer-session.ts:270-287`
**Severity**: Low

`pause()` and `resume()` use runtime `in` checks followed by type assertions:
```typescript
if ('pause' in this.session && typeof this.session.pause === 'function') {
  (this.session as { pause: () => void }).pause();
}
```

This works but is fragile. If the `rollback-netcode` library changes the `pause`/`resume` API signature, the assertion would silently pass but with incorrect behavior. The `supportsPause` getter (line 292) also uses a runtime check. Consider properly typing this via the `Session` interface or using a version check.

---

### Design: `multiplayer-game-loop.ts` Unbounded Accumulator Can Cause Tick Spiral
**File**: `src/multiplayer/multiplayer-game-loop.ts:91-119`
**Severity**: Low

The fixed-timestep loop accumulates delta time and runs ticks in a `while (state.accumulator >= TICK_MS)` loop (line 94). If the browser tab is backgrounded and then foregrounded, `delta` could be very large (seconds or minutes), causing hundreds or thousands of simulation ticks to run in a single frame. The single-player game loop likely has the same pattern, but in multiplayer this is more impactful because each tick involves rollback-netcode processing.

A common mitigation is capping the accumulator to a maximum (e.g., `Math.min(delta, MAX_FRAME_MS)` where `MAX_FRAME_MS` is 5-10 ticks worth of time). Without this, a tab restore after backgrounding could freeze the game for an extended period.

---

### Design: `validateActionData` Does Not Validate String Fields
**File**: `src/multiplayer/action-validation.ts:148-196`
**Severity**: Low

The new `validateActionData()` function validates numeric fields well but does not validate string fields like `itemId`, `shipId`, `pilotId`, `shipClass`, `commanderId`, or `category`. A malicious peer could send:
- Extremely long strings (up to the 64KB `MAX_STRING_LENGTH` protocol limit) as `itemId`
- An invalid `category` value (neither `'primary'` nor `'secondary'`)
- An `itemType` value not in the expected union

While `processAction` would likely handle these gracefully (failing to find the item or returning the original state), explicit validation of string field formats and enum values would strengthen the defense.

## Strengths

### Excellent Protocol Design
The binary protocol is well-designed with symmetric encode/decode functions, size pre-calculation, bounds checking via `ensureBytes()`, and clear separation of concerns. The exhaustive `switch` statements with `never` type checks ensure compile-time safety when new message types are added. The `HOST_ONLY_MESSAGES` set provides a clean trust boundary check in the router. The `GAME_MSG_MIN`/`GAME_MSG_MAX` range detection in `message-detection.ts` auto-derives from the enum values, making it maintenance-free.

### Strong Host-Authority Model
The architecture correctly implements host-authoritative state management. Guests cannot modify campaign state directly -- all changes go through `ActionRequest -> host validates -> ActionResponse + CampaignSync`. Permission validation (`validateActionPermission`) covers all action types with appropriate granularity (ship edit levels: none/own/any, plus buy/sell/convert flags). The `hostPlayerId` parameter added to `validateActionPermission` properly closes the `dismissPilot`/`spendXP` trust boundary gap.

### Clean Immutable State Pattern
`lobby-state.ts` follows a disciplined immutable update pattern where every state change produces a new object. The `setPlayer*` functions are consistent and predictable. This makes state changes easy to reason about and debug.

### Well-Organized File Structure
The codebase respects the 400-line limit consistently. Large files have been properly decomposed: `encode.ts`/`encode-mission.ts`, `messages.ts`/`messages-mission.ts`/`messages-pause.ts`, `router.ts`/`router-types.ts`/`router-send.ts`, `action-processing.ts`/`action-validation.ts`, `lobby-actions.ts`/`lobby-kick.ts`/`lobby-launch-actions.ts`/`lobby-broadcast.ts`. The decomposition boundaries are logical and documented.

### Comprehensive Documentation
The `@mp-*` JSDoc annotations on every message type and action type are exceptional. They document the actor, permission, flow, UI impact, test coverage, and implementation status. This makes the protocol self-documenting and enables automated analysis.

### Campaign State Hash Verification
The `campaignStateHash` field in `MissionStartedMessage` (mission-sync.ts) provides a valuable integrity check. Guests verify their local campaign state matches the host's before entering a mission, catching desync issues early with a clear warning.

### Robust Error Handling
The networking layer handles errors gracefully throughout: `fetchWithRetry` with exponential backoff, `SignalQueue` with configurable retries, `ReconnectionManager` with jitter to prevent thundering herds, `ProtocolError` for malformed messages, and the router's `onError` callback for handler exceptions.

### Clean Transport Abstraction
The layered transport design (`WebRTCMesh` -> `WebRTCTransport` -> `TransformingTransport`) cleanly separates concerns. The `TransformingTransport` from rollback-netcode automatically handles compression and segmentation, which is important given that `CampaignSyncMessage` and `WelcomeMessage` can be large.

### Well-Designed Reconnection
The reconnection system (reconnection.ts + peer-connection.ts) implements proper exponential backoff with jitter and a tie-breaker rule (lower peer ID initiates) to prevent dual-offer deadlock.

### Thorough Cleanup on Session End
`cleanupLobby()` in `lobby-session.ts` correctly chains cleanup of all subsystems: broadcasts `SessionEnded` (host only), runs `ctx.cleanup()` (router, sync manager, transport handlers), disconnects and disposes the connection flow, clears the multiplayer context, resets launch state, resets the action client, and clears the lobby context. The `handleSessionEndedForGuest()` path performs equivalent cleanup. This discipline prevents resource leaks across sessions.

### Effective Host-Side Callsign/Autoaim Validation
The `CallsignUpdate` handler (`lobby-protocol-routing.ts:229-271`) demonstrates the "Any -> All" validation pattern well: the host verifies sender matches `playerId` (line 233), validates format (line 241), checks for conflicts (line 250-252), and only then rebroadcasts (line 261). The `AutoaimUpdate` handler (lines 274-305) follows the same pattern with range validation. Both handlers apply the update locally for both host and guest after validation.

## Recommendations

Listed in priority order:

1. **Fix PauseCoordinator stale `lobbyState` capture** (Design, Medium Priority): Change closures in `initPauseCoordination` to read from `lobbyContext.lobbyState` instead of the destructured local variable. This is the most architecturally concerning issue because it silently uses stale data.

2. **Add accumulator cap to multiplayer game loop** (Design, Medium Priority): Add `state.accumulator = Math.min(state.accumulator, TICK_MS * MAX_CATCHUP_TICKS)` to prevent tick spirals after tab backgrounding. A value of 3-5 ticks is typical.

3. **Validate `decodePauseRequest` reasonByte range** (Bug, Low Priority): Add `if (reasonByte > 2) throw new ProtocolError('Invalid pause reason')` for consistency with the `decodePlayerLeft` fix.

4. **Call `clearAllRateLimits()` on lobby cleanup** (Bug, Low Priority): Add a call to `clearAllRateLimits()` from `chat-validation.ts` in `cleanupLobby()` and `handleSessionEndedForGuest()` to prevent rate limit state leaking between sessions.

5. **Validate string fields in `validateActionData`** (Security, Low Priority): Add checks that `category` is `'primary'` or `'secondary'`, `itemType` matches the expected union, and string IDs are non-empty and within reasonable length bounds.

6. **Consider dedicated ResumeCountdown message type** (Design, Low Priority -- Future): Separating pause resume messages from lobby launch messages would prevent any future confusion and make the protocol clearer.

7. **Consider delta sync for `CampaignSyncMessage`** (Performance, Low Priority -- Future): If profiling shows sync messages are a bandwidth bottleneck, implement delta-based sync. For now, gzip compression mitigates the cost.
