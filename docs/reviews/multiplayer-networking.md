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
**File**: `src/multiplayer/lobby-state.ts:209`
**Severity**: Low

`let nextMessageId = 1` remains module-level mutable state. This is an intentional decision to avoid ID collisions across sessions. The counter growing monotonically is harmless in practice since chat message IDs only need to be unique within a session's lifetime.

---

### Design: `CampaignSyncMessage` Sends Full Campaign State as JSON
**File**: `src/multiplayer/protocol/encode.ts:248-255`
**Severity**: Low (Performance)

Every campaign state change triggers a full `CampaignSync` broadcast with the entire `CampaignState` serialized as JSON. The `TransformingTransport`'s gzip compression mitigates bandwidth cost. Implementing delta sync would be a significant architectural change. Acceptable as-is unless profiling reveals it as a bottleneck.

---

### Performance: `hashCampaignState` Uses Full JSON Stringification
**File**: `src/multiplayer/mission-sync.ts:48-56`
**Severity**: Low

`hashCampaignState()` calls `JSON.stringify(campaignState)` to compute a DJB2 hash. This runs once at mission start on both host and guest, so the impact is minimal.

---

### Design: `WelcomeMessage` Includes Full `CampaignState` as JSON
**File**: `src/multiplayer/protocol/encode.ts:156-174`
**Severity**: Low

The `WelcomeMessage` embeds the entire campaign state as JSON alongside the player list. This is inherent to the design -- the guest needs the full campaign state to initialize. The 1MB `MAX_MESSAGE_SIZE` limit provides a safety boundary.

---

### Design: `ChatMessage` Timestamp Uses `Date.now()`
**File**: `src/multiplayer/lobby-message-creators.ts:37`
**Severity**: Low

`createChatMessage()` uses `Date.now()`. Similarly, `addSystemMessage()` in `lobby-state.ts:244`, and `createSystemMessage()` in `pause-coordinator.ts:89`. This is lobby/UI code rather than game simulation, so the project rule "No `Date.now()` in game logic" does not strictly apply. Acceptable.

---

### Design: Pause Coordinator Reuses LaunchCountdown/LaunchAborted Message Types
**File**: `src/multiplayer/pause-coordinator.ts:116-137`
**Severity**: Low

The `PauseCoordinator` broadcasts `LaunchCountdown` and `LaunchAborted` messages for the resume countdown. These are the same message types used by the lobby launch countdown flow. If both flows could theoretically be active simultaneously, the guest handlers would conflict. Currently prevented by the state machine, but reusing message types for different semantic purposes is a maintenance risk.

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

1. **Consider dedicated ResumeCountdown message type** (Design, Low Priority -- Future): Separating pause resume messages from lobby launch messages would prevent future confusion.

2. **Consider delta sync for `CampaignSyncMessage`** (Performance, Low Priority -- Future): If profiling shows sync messages are a bandwidth bottleneck, implement delta-based sync.
