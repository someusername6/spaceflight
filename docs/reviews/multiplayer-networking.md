# Multiplayer & Networking Review

## Overview

The multiplayer layer implements a WebRTC mesh-based peer-to-peer architecture with a signaling server for connection setup. The system is organized into three main sub-layers:

1. **Networking** (`src/multiplayer/networking/`) -- WebRTC mesh formation, signaling, and transport
2. **Protocol** (`src/multiplayer/protocol/`) -- Binary message encoding/decoding, type-safe routing
3. **Lobby/Campaign Integration** (`src/campaign/handlers/lobby-*.ts`, `src/multiplayer/`) -- Lobby state, permissions, campaign sync, action processing

The architecture follows a host-authoritative model where the host validates all guest actions, manages campaign state, and broadcasts updates. The protocol uses a custom binary format in the `0x80-0x98` byte range to coexist with rollback-netcode's internal messages. Overall, the code is well-structured, well-documented, and demonstrates strong engineering discipline. The issues found are mostly medium-to-low severity.

## Issues Found

### Security: `dismissPilot` and `spendXP` Actions Lack Server-Side Host-Only Enforcement
**File**: `src/multiplayer/action-processing.ts:152-162`
**Severity**: Medium

The `dismissPilot` and `spendXP` actions are documented as host-only (`@mp-actor host`), but `validateActionPermission()` returns `null` (allowed) for both, with comments stating "Allow - host-only check is done by isHost() in UI." This means a malicious guest who crafts an `ActionRequest` with `type: 'dismissPilot'` or `type: 'spendXP'` will pass permission validation on the host and the action will be executed. The UI hides the buttons, but the server-side (host) validation is the actual trust boundary.

The fix: return an error string like `'Only the host can dismiss pilots'` when the requesting `playerId` is not the host.

---

### Security: `ActionRequestData` Deserialized via Unchecked `JSON.parse`
**File**: `src/multiplayer/protocol/buffer-utils.ts:190-198`
**Severity**: Medium

`decodeJson<T>()` uses `JSON.parse(str) as T` which performs no runtime type validation. When decoding `ActionRequestData` in `decodeActionRequest()` (decode.ts:237), a malicious peer could send an action with unexpected fields (e.g., negative `quantity`, invalid `itemType`, or extra properties). While `processAction()` would likely fail gracefully for most cases, the `storageIndex` in `EquipAction` is only bounds-checked against `state.storedWeapons.length` -- other fields like `quantity` or `bankSize` are passed through unchecked.

Recommendation: Add runtime validation for critical `ActionRequestData` fields on the host side before calling `processAction()`, at minimum checking that `type` is a valid action type string and numeric fields are within expected ranges.

---

### Security: Chat Messages Not Validated on Host Side
**File**: `src/campaign/handlers/lobby-protocol-routing.ts:166`
**Severity**: Low

Chat messages from guests are processed via the generic `handler` (line 158-163) which calls `processLobbyMessage`. The host does not validate chat message content (length, rate limiting) before rebroadcasting. While the sender validates via `validateChatMessage()` in `lobby-actions.ts:267`, a modified client could bypass this. The `ChatMessage` is in the `Any -> All` category, so it is broadcast by each peer directly rather than relayed through the host, meaning the host cannot easily filter it. However, the host could at least validate messages it receives before forwarding context to local state.

---

### Security: `CallsignAnnounce` Callsign Not Validated on Host
**File**: `src/campaign/handlers/lobby-host-handlers.ts:121-163`
**Severity**: Low

When `handleCallsignAnnounce` processes a new guest's callsign, it passes the raw callsign string directly to `createGuestLobbyPlayer()` without running `validateCallsign()`. In contrast, `CallsignUpdate` messages (in `lobby-protocol-routing.ts:241`) properly validate format and check for conflicts. A guest could join with a callsign that violates the format rules (e.g., longer than 16 chars, special characters).

---

### Bug: `decodePlayerLeft` Does Not Validate `reasonByte` Range
**File**: `src/multiplayer/protocol/decode.ts:170-178`
**Severity**: Low

The decoder maps `reasonByte === 0` to `'disconnected'`, `1` to `'kicked'`, and anything else to `'left'`. If a malformed message contains a byte value like `255`, it silently becomes `'left'`. This is not incorrect per se (the fallback is reasonable), but the encoder uses a strict mapping of three values (encode.ts:190-191). A stricter approach would validate the byte is 0, 1, or 2 and throw a `ProtocolError` for other values.

The same pattern exists for `decodePauseRequest` (decode.ts:349-354) where an invalid `reasonByte` silently maps to `'lag-detected'`.

---

### Design: Module-Level Mutable State in `lobby-state.ts`
**File**: `src/multiplayer/lobby-state.ts:211`
**Severity**: Medium

`let nextMessageId = 1` is module-level mutable state shared across all lobby instances. The comment on line 72 says "Note: nextMessageId intentionally NOT reset here to avoid ID collisions across sessions." While this prevents collisions, it means the counter grows monotonically across the application lifetime. This is a minor leak of state between sessions and makes unit testing harder (tests depend on execution order). A cleaner approach would be to store the counter inside `LobbyState` itself.

---

### Design: Module-Level Mutable State in `action-client.ts`
**File**: `src/multiplayer/action-client.ts:38-51`
**Severity**: Medium

Three pieces of module-level mutable state: `nextRequestId`, `pendingRequests`, and `isResponseHandlerSetUp`. The `isResponseHandlerSetUp` flag is particularly problematic -- once set to `true`, it is never reset. If the player leaves a lobby and joins another, the old handler reference becomes stale, but `ensureResponseHandlerSetUp()` will not re-register because the flag is still `true`. The `pendingRequests` map is also never cleared on session end, meaning timed-out requests from a previous session could leak.

---

### Design: `broadcastMessage` Function Duplicated in Three Files
**File**: `src/campaign/handlers/lobby-actions.ts:357-366`, `src/campaign/handlers/lobby-kick.ts:19-28`, `src/campaign/handlers/lobby-launch-actions.ts:188-197`
**Severity**: Low

The identical `broadcastMessage(ctx, message)` helper is defined independently in three files. Similarly, `broadcastAndApply` appears in both `lobby-actions.ts:216-229` and `lobby-kick.ts:33-43`. These should be consolidated into a shared utility to avoid drift.

---

### Design: `CampaignSyncMessage` Sends Full Campaign State as JSON
**File**: `src/multiplayer/protocol/encode.ts:248-255`
**Severity**: Medium (Performance)

Every campaign state change triggers a full `CampaignSync` broadcast with the entire `CampaignState` serialized as JSON inside a binary wrapper. For a mid-campaign state with many ships, weapons, pilots, and stored items, this could be several kilobytes per sync. Since campaign actions are frequent (buy, sell, equip, resupply), this generates substantial traffic. The `TransformingTransport` provides gzip compression which helps, but a delta-sync approach would be significantly more efficient.

---

### Performance: `stringSize()` Encodes String Twice
**File**: `src/multiplayer/protocol/buffer-utils.ts:204-206`
**Severity**: Low

`stringSize(str)` calls `textEncoder.encode(str).length` to calculate the byte length. Later, `writeString()` calls `textEncoder.encode(str)` again. For messages with many strings (e.g., `WelcomeMessage` with multiple players), each string is encoded twice -- once for size calculation and once for writing. This could be optimized by pre-encoding strings and passing the `Uint8Array` to both the size calculation and the writer.

---

### Performance: `hashCampaignState` Uses Full JSON Stringification
**File**: `src/multiplayer/mission-sync.ts:48-56`
**Severity**: Low

`hashCampaignState()` calls `JSON.stringify(campaignState)` which produces a potentially large string just to compute a hash. This is called at mission start on both host and guest. For very large campaign states, this could cause a noticeable frame stutter. A more targeted hash over specific fields (credits, ships count, weapons, etc.) would be lighter.

---

### Maintenance: `router.ts` at 395 Lines, Near 400-Line Limit
**File**: `src/multiplayer/protocol/router.ts`
**Severity**: Low

The router file is 395 lines, just 5 lines under the project's 400-line maximum. Adding one more message type will push it over. The handler registration methods (lines 119-242) are mechanical and repetitive -- each is a one-liner that sets a handler in the map. These could potentially be collapsed using a generic registration method, or the methods could be generated.

---

### Maintenance: `protocol/index.ts` Comment Says Range is `0x80-0x93`, But Actual Range is `0x80-0x98`
**File**: `src/multiplayer/protocol/index.ts:8`
**Severity**: Low

The module doc comment says "Message type definitions (0x80-0x93 byte range)" but the actual `GameMessageType` enum goes up to `AutoaimUpdate = 0x98`. Similarly, `messages.ts:3` says "0x80-0x93". These comments are stale since new message types were added.

---

### Maintenance: `messages.ts` Comment Says Range is `0x80-0x93`, Repeated
**File**: `src/multiplayer/protocol/messages.ts:3`
**Severity**: Low

Same stale comment as above.

---

### Design: `ChatMessage` Timestamp Uses `Date.now()`
**File**: `src/multiplayer/lobby-message-creators.ts:37`
**Severity**: Low

`createChatMessage()` uses `Date.now()` for the timestamp. The project rules state "No `Date.now()` in game logic", though this is lobby/UI code rather than game simulation logic, so it's arguably acceptable. However, `addSystemMessage()` in `lobby-state.ts:244` also uses `Date.now()`. If lobby state is ever replayed or tested deterministically, this would be a problem. Using a clock abstraction would be more robust.

---

### Design: `sendCallsignAnnounce` Broadcasts Instead of Sending to Host
**File**: `src/campaign/handlers/lobby-protocol-routing.ts:323-335`
**Severity**: Low

`sendCallsignAnnounce()` calls `transport.broadcast()` which sends the `CallsignAnnounce` message to all connected peers. Since `CallsignAnnounce` is designed as "New peer -> Host" (per the message doc), it should only be sent to the host. In a 2-player scenario this is equivalent, but with 3+ players, other guests would receive a `CallsignAnnounce` they don't handle (no handler is registered on guests for this message type). While harmless (the router will call the handler which is only set on host), it's unnecessary traffic.

---

### Design: `WelcomeMessage` Includes Full `CampaignState` as JSON
**File**: `src/multiplayer/protocol/encode.ts:156-174`
**Severity**: Low

The `WelcomeMessage` embeds the entire campaign state as a JSON string alongside the player list. This means the initial message to a joining guest can be quite large. Combined with the `TransformingTransport`'s compression, this is likely manageable, but it's worth noting that this is a single large message that must fit within the 1MB `MAX_MESSAGE_SIZE` limit.

---

### Bug: Potential Race in `wireMessageHandlers` Transport Ordering
**File**: `src/campaign/handlers/lobby-protocol-routing.ts:313`
**Severity**: Low

`wireToTransport` is called at line 313 at the end of `wireMessageHandlers()`. However, `sendCallsignAnnounce()` is called at line 355 in `setupLobbyScreenForGuest()` AFTER `wireMessageHandlers()` completes. If the host's `Welcome` response arrives between the router being wired and the guest processing it, the timing should be fine since JavaScript is single-threaded. However, the ordering dependency is implicit and fragile -- the guest sends the announce, then the host responds, and the guest's router must be wired to receive the response. This works because `sendCallsignAnnounce` uses the raw transport (not the router), and the router is already wired by then. Still, the implicit ordering deserves a comment.

---

### Design: `isResponseHandlerSetUp` Flag Never Resets Between Sessions
**File**: `src/multiplayer/action-client.ts:51-80`
**Severity**: Medium

As noted above, the `isResponseHandlerSetUp` flag persists across lobby sessions. When a guest leaves a lobby and joins a new one, the old router reference captured by the `onActionResponse` handler in `ensureResponseHandlerSetUp()` still holds. The new session creates a new router, but the flag prevents re-registering the handler. This means `ActionResponse` messages in the new session will never reach the pending request callbacks, causing all guest actions to time out.

This is likely masked by the fact that `cleanupLobby()` disposes the router, and the lobby handlers file re-creates everything. But the module-level `isResponseHandlerSetUp` stays `true`, so the next session's `ensureResponseHandlerSetUp()` is a no-op.

---

### Design: `session-state.ts` Appears Unused (Preparatory Code)
**File**: `src/multiplayer/networking/session-state.ts:5-14`
**Severity**: Low

The file's own comment says "This module is PREPARATORY for Phase 5." The types and functions are exported from the networking index but do not appear to be imported by any lobby or session code in the current codebase (the actual session state is managed by `LobbyContext`). This is dead code that should either be integrated or removed.

## Strengths

### Excellent Protocol Design
The binary protocol is well-designed with symmetric encode/decode functions, size pre-calculation, bounds checking via `ensureBytes()`, and clear separation of concerns. The exhaustive `switch` statements with `never` type checks ensure compile-time safety when new message types are added. The `HOST_ONLY_MESSAGES` set provides a clean trust boundary check in the router.

### Strong Host-Authority Model
The architecture correctly implements host-authoritative state management. Guests cannot modify campaign state directly -- all changes go through `ActionRequest -> host validates -> ActionResponse + CampaignSync`. Permission validation (`validateActionPermission`) covers all action types with appropriate granularity (ship edit levels: none/own/any, plus buy/sell/convert flags).

### Clean Immutable State Pattern
`lobby-state.ts` follows a disciplined immutable update pattern where every state change produces a new object. The `setPlayer*` functions are consistent and predictable. This makes state changes easy to reason about and debug.

### Well-Organized File Structure
The codebase respects the 400-line limit consistently. Large files have been properly decomposed: `encode.ts`/`encode-mission.ts`, `messages.ts`/`messages-mission.ts`/`messages-pause.ts`, `router.ts`/`router-types.ts`/`router-send.ts`. The decomposition boundaries are logical and documented.

### Comprehensive Documentation
The `@mp-*` JSDoc annotations on every message type and action type are exceptional. They document the actor, permission, flow, UI impact, test coverage, and implementation status. This makes the protocol self-documenting and enables automated analysis.

### Campaign State Hash Verification
The `campaignStateHash` field in `MissionStartedMessage` (mission-sync.ts) provides a valuable integrity check. Guests verify their local campaign state matches the host's before entering a mission, catching desync issues early with a clear warning.

### Robust Error Handling
The networking layer handles errors gracefully throughout: `fetchWithRetry` with exponential backoff, `SignalQueue` with configurable retries, `ReconnectionManager` with jitter to prevent thundering herds, `ProtocolError` for malformed messages, and the router's `onError` callback for handler exceptions.

### Clean Transport Abstraction
The layered transport design (`WebRTCMesh` -> `WebRTCTransport` -> `TransformingTransport`) cleanly separates concerns. The `TransformingTransport` from rollback-netcode automatically handles compression and segmentation, which is important given that `CampaignSyncMessage` and `WelcomeMessage` can be large.

### Well-Designed Reconnection
The reconnection system (reconnection.ts + peer-connection.ts) implements proper exponential backoff with jitter and a tie-breaker rule (lower peer ID initiates) to prevent dual-offer deadlock. The `Math.random()` usage is correctly annotated as acceptable for networking infrastructure.

## Recommendations

Listed in priority order:

1. **Fix `dismissPilot`/`spendXP` host-only validation** (Security, High Priority): Add server-side checks in `validateActionPermission()` that verify the requesting player is the host for these action types. This is the most important fix because it's a trust boundary violation.

2. **Fix `action-client.ts` stale handler issue** (Design, High Priority): Either reset `isResponseHandlerSetUp` when leaving a lobby, or restructure the module to not use module-level state. Consider clearing `pendingRequests` and resetting `nextRequestId` on cleanup.

3. **Add runtime validation for `ActionRequestData`** (Security, Medium Priority): Validate the `type` field matches a known action type, and check numeric fields are non-negative integers where appropriate, before passing to `processAction()`.

4. **Validate callsign in `handleCallsignAnnounce`** (Security, Low Priority): Run `validateCallsign()` on the incoming callsign to match the validation done for `CallsignUpdate`.

5. **Consolidate duplicated `broadcastMessage`/`broadcastAndApply` helpers** (Maintenance, Low Priority): Extract to a shared utility module like `lobby-broadcast.ts` to prevent drift between the three copies.

6. **Update stale byte range comments** (Maintenance, Low Priority): Update the `0x80-0x93` references in `messages.ts` and `protocol/index.ts` to reflect the actual range `0x80-0x98`.

7. **Consider delta sync for `CampaignSyncMessage`** (Performance, Low Priority -- Future): This is a significant architectural change. For now, the gzip compression in `TransformingTransport` mitigates the cost. If profiling shows sync messages are a bottleneck, implement delta-based sync.

8. **Clean up or integrate `session-state.ts`** (Maintenance, Low Priority): Either integrate the preparatory session state module or remove it to reduce confusion about where session state lives.
