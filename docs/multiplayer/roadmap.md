# Multiplayer Implementation Roadmap

This roadmap breaks implementation into phases, each scoped to complete in a single Claude Code context window. Phases build incrementally and are independently testable.

## Prerequisites

- **rollback-netcode library** (`~/project/rollback-netcode`) - Ready with all core features:
  - Rollback engine with snapshot buffer, input prediction
  - Host-authority desync detection (mesh + host mode)
  - LagReport, DisconnectReport, DropPlayer messages
  - Spectator role support
  - Pause with reasons, resume countdown
  - Ping/Pong for RTT measurement

---

## Phase 1: World Serialization

**Goal:** Implement full ECS world serialization for snapshots and desync recovery.

**Note:** This phase is substantial. If it exceeds context window, split into:
- **Phase 1a:** Core components (Transform, Velocity, Health, Ship, AI, Player) + world state
- **Phase 1b:** Combat components (Weapon, Projectile, Missile) + mission-specific (Convoy, Station)

### Deliverables

1. **SerializedWorld format** (`src/core/world-serialization.ts`)
   - Define interfaces for all serializable components
   - Entity ID mapping strategy (stable across serialize/deserialize)

2. **Critical world state** (often overlooked):
   - `world.prng` state - PRNG must be serialized for determinism
   - `world.systemState` - wave timers, mission state, targeting state
   - Entity ID allocator state - ensures new entities get consistent IDs

3. **Component serializers** - For each component type:
   - Transform, Velocity, Physics
   - Health, Shields, Armor
   - Weapon, WeaponState, Ammo
   - Ship, AI, Player
   - Projectile, Missile, Explosion
   - Mission-specific (Convoy, Station, etc.)

4. **World serialize/deserialize functions**
   ```typescript
   function serializeWorld(world: World): Uint8Array
   function deserializeWorld(data: Uint8Array, world: World): void
   ```

5. **State hash function**
   ```typescript
   function computeWorldHash(world: World): number
   ```

6. **Tests** (`scripts/tests/serialization/`)
   - Round-trip: serialize → deserialize → compare
   - Hash stability: same state → same hash
   - PRNG state: verify PRNG produces same sequence after restore
   - Performance: measure snapshot size and time

7. **Message size investigation**
   - Measure typical snapshot sizes for various battle scenarios
   - Investigate WebRTC DataChannel message size limits (~16KB reliable, varies by browser)
   - If snapshots exceed limits, implement chunking or compression (e.g., pako/gzip)
   - Document findings for Phase 2 integration

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/core/world-serialization.ts` | Create - main serialization module |
| `src/core/component-serializers.ts` | Create - per-component serialize/deserialize |
| `src/core/world-hash.ts` | Create - deterministic state hashing |
| `scripts/tests/serialization/test-world-serialization.mjs` | Create |
| `scripts/tests/serialization/test-world-hash.mjs` | Create |

### Success Criteria

- [x] All gameplay-affecting components serialize correctly
- [x] PRNG state serializes and restores correctly
- [x] System state (waves, mission) serializes correctly
- [x] Round-trip preserves exact state (hash matches)
- [x] Snapshot size ~50KB for typical battle (16.7KB achieved)
- [x] Serialization time <5ms for 60fps budget (0.05ms achieved)

---

## Phase 2: Rollback Engine Integration

**Goal:** Integrate rollback-netcode library with spaceflight simulation.

### Deliverables

1. **Game interface adapter** (`src/multiplayer/game-adapter.ts`)
   - Implement `Game` interface from rollback-netcode
   - Wire up serialize/deserialize from Phase 1
   - Wire up step function to world.tick()
   - Wire up hash function

2. **Multi-player input source** (`src/input/network-input-source.ts`)
   - InputSource implementation for remote players
   - Maps player IDs to input values per tick

3. **Multiplayer game loop** (`src/multiplayer/multiplayer-game.ts`)
   - Create Session from rollback-netcode
   - Integrate with existing game loop
   - Handle rollback events (logging, metrics)

4. **Input serialization format** (`src/multiplayer/input-format.ts`)
   ```typescript
   interface SerializedInput {
     thrust: number;      // -1 to 1
     yaw: number;         // -1 to 1
     pitch: number;       // -1 to 1
     roll: number;        // -1 to 1
     firing: boolean;
     firingSecondary: boolean;
     targetEntityId: number | null;  // stable entity ID
     weaponGroup: number;
   }

   function serializeInput(input: InputState): Uint8Array
   function deserializeInput(data: Uint8Array): InputState
   ```
   - Compact binary format (~12 bytes per input)
   - Used as `TInput` type parameter for Game interface

5. **Local testing harness**
   - Two game instances with rollback-netcode's `LocalTransport`
   - Verify inputs sync correctly
   - Verify rollback triggers on delayed input

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/multiplayer/game-adapter.ts` | Create - Game interface implementation |
| `src/multiplayer/multiplayer-game.ts` | Create - multiplayer game loop |
| `src/input/network-input-source.ts` | Create - network input source |
| `src/multiplayer/input-format.ts` | Create - input serialization |
| `src/multiplayer/index.ts` | Create - module exports |
| `scripts/tests/multiplayer/test-rollback-integration.mjs` | Create |

### Success Criteria

- [x] Two local sessions stay in sync over 1000 ticks
- [x] Delayed input triggers rollback and resimulation
- [x] Hash comparison detects intentional desync
- [x] No memory leaks after extended run

---

## Phase 3: Signaling Server

**Goal:** Create minimal signaling server for room management and WebRTC relay.

**Status:** ✅ Complete (local development)

### Design Philosophy

The signaling server is minimal but tracks room-level state:
- **Relays WebRTC signals** (SDP offers/answers, ICE candidates)
- **Tracks room state** (`lobby` | `playing`) to prevent mid-game joins
- **Tracks peers in room** for capacity limits and event notifications
- **Does not track callsigns** - identity managed by clients via WebRTC
- **HTTP polling** - simple, Lambda-compatible

### Deliverables

1. **Server application** (`server/signaling/`)
   - Express.js with in-memory storage (local dev)
   - Room creation (generate 8-char codes)
   - Room joining (validate code, version, capacity, state)
   - WebRTC signaling relay (SDP, ICE)

2. **Room management**
   - Track room metadata (code, hostId, gameVersion, state)
   - Track peers in room (peerId, token, joinedAt)
   - Room state (lobby vs playing) - reject joins mid-mission
   - Room expiry after inactivity

3. **Security**
   - Rate limiting (room creation, join attempts)
   - Room code format (8 chars, no ambiguous characters)
   - Token-based peer authentication

4. **Version compatibility**
   - Client sends game version in join request
   - Server compares with host's version
   - Reject with `version_mismatch` if incompatible

5. **API endpoints**
   ```
   POST   /rooms                 Create room
   DELETE /rooms/:code           Delete room (host only)
   POST   /rooms/:code/join      Join room
   POST   /rooms/:code/leave     Leave room
   POST   /rooms/:code/signals   Post WebRTC signal
   GET    /rooms/:code/signals   Get pending signals
   GET    /rooms/:code/events    Get room events
   POST   /rooms/:code/kick      Kick peer (host only)
   POST   /rooms/:code/state     Set room state (host only)
   ```

6. **Join failure reasons**
   - `invalid_room` - room doesn't exist
   - `room_full` - max players reached
   - `game_in_progress` - can't join mid-mission
   - `version_mismatch` - client version doesn't match host

### Files Created

| File | Purpose |
|------|---------|
| `server/signaling/src/index.ts` | Express server entry point |
| `server/signaling/src/routes.ts` | HTTP route handlers |
| `server/signaling/src/handlers/*.ts` | Request handler functions |
| `server/signaling/src/storage/types.ts` | Storage interface |
| `server/signaling/src/storage/memory-storage.ts` | In-memory storage |
| `server/signaling/src/types.ts` | API types |
| `server/signaling/src/auth.ts` | Token generation |
| `server/signaling/src/room-code.ts` | Room code generation |
| `server/signaling/src/rate-limiter.ts` | Rate limiting |
| `server/signaling/src/config.ts` | Configuration |
| `server/signaling/src/logger.ts` | Logging utility |

### Success Criteria

- [x] Room codes generated and validated
- [x] WebRTC signaling relayed correctly
- [x] Mid-mission join attempts rejected with `game_in_progress`
- [x] Rate limiting prevents abuse
- [x] Rooms cleaned up after expiry

### Deferred

- **AWS deployment** (DynamoDB storage, Lambda handlers, CloudFormation)
- **Kicked callsign tracking** - can be added if needed, currently kicks just remove peer

---

## Phase 4: Client Networking Layer

**Goal:** WebRTC transport in browser, connecting to signaling server.

**Status:** ✅ Complete

### Deliverables

1. **Signaling client** (`src/multiplayer/signaling-client.ts`)
   - WebSocket connection to signaling server
   - Room create/join flows
   - WebRTC signaling message handling

2. **WebRTC mesh manager** (`src/multiplayer/webrtc-mesh.ts`)
   - Create peer connections for each player
   - Handle ICE candidates
   - Establish DataChannels (reliable + unreliable)
   - **Mesh formation timeout** (10 seconds)
   - **Partial mesh failure handling** - if can't connect to all peers, abort join

3. **Transport adapter** (`src/multiplayer/transport-adapter.ts`)
   - Implement rollback-netcode `TransportAdapter` interface
   - Bridge WebRTC DataChannels to library

4. **Multiplayer session state** (`src/multiplayer/session-state.ts`)
   ```typescript
   import { PlayerId, Session } from 'rollback-netcode';

   interface MultiplayerState {
     isMultiplayer: boolean;
     isHost: boolean;
     localPlayerId: PlayerId;
     localCallsign: string;
     players: Map<PlayerId, PlayerInfo>;
     session: Session | null;  // rollback-netcode session
     roomCode: string | null;
   }
   ```

5. **Connection state UI** (basic)
   - Connection status display
   - Error handling and retry

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/multiplayer/signaling-client.ts` | Create |
| `src/multiplayer/webrtc-mesh.ts` | Create |
| `src/multiplayer/transport-adapter.ts` | Create |
| `src/multiplayer/session-state.ts` | Create - multiplayer state management |
| `src/multiplayer/connection-state.ts` | Create - connection UI state |

### Success Criteria

- [x] Connect to signaling server
- [x] Create room and get code
- [x] Join room with code
- [x] Establish WebRTC mesh (2-4 players)
- [x] Mesh formation times out after 10s if incomplete
- [x] Partial mesh failure returns to join screen with error
- [x] DataChannels working for message passing
- [x] MultiplayerState tracks all session info

---

## Phase 5: Game Protocol Layer

**Goal:** Game-specific messages on top of rollback-netcode transport.

**Status:** ✅ Complete

**Note:** The following messages are already handled by rollback-netcode and should NOT be reimplemented:
- Input, InputAck (mission inputs)
- Hash, Sync, SyncRequest, StateSync (desync detection/recovery)
- Pause, Resume, ResumeCountdown (pause flow)
- LagReport, DisconnectReport, DropPlayer (lag/disconnect handling)
- Ping, Pong (RTT measurement)
- PlayerJoined, PlayerLeft (basic join/leave - but we extend with callsign)

This phase implements **game-specific** messages only.

### Deliverables

1. **Game message types** (`src/multiplayer/protocol/messages.ts`)
   ```typescript
   // Lobby messages (game-specific)
   Welcome          // Host → new guest: playerId, campaignState, players
   PlayerJoinedExt  // Extends library's PlayerJoined with callsign
   PlayerLeftExt    // Extends library's PlayerLeft with reason
   ChatMessage      // Any → all: text chat
   ReadyState       // Any → all: ready toggle
   PermissionUpdate // Host → all: permission changes
   ShipAssignment   // Host → all: player ↔ ship mapping

   // Campaign messages
   CampaignSync     // Host → guests: full campaign state
   ActionRequest    // Guest → host: buy/sell/equip/etc
   ActionResponse   // Host → guest: success/failure

   // Mission flow
   ContractAccepted // Host → all: contract selected
   LaunchCountdown  // Host → all: countdown tick
   LaunchAborted    // Host → all: countdown cancelled
   MissionStarted   // Host → all: seed + contractId
   MissionEnded     // Host → all: outcome
   SessionEnded     // Host → all: session terminating

   // Additional messages (not in original plan)
   KickNotification      // Host → kicked player: notify of kick with reason
   CallsignAnnounce      // New peer → host: announce callsign after mesh forms
   CallsignChangeRequest // Any → host: request callsign change
   CallsignChanged       // Host → all: broadcast callsign update
   ```

2. **Message encoding** (`src/multiplayer/protocol/encode.ts`, `decode.ts`)
   - Binary encoding for efficiency
   - Type-safe encode/decode functions
   - Message type byte prefix to distinguish from rollback-netcode messages
   - **Byte range:** Uses 0x80-0x93 for 20 game messages (rollback-netcode uses 0x00-0x7F internally)

3. **Host-guest router** (`src/multiplayer/protocol/router.ts`)
   - Route messages based on type
   - Enforce host-only actions (15 of 20 message types are host-only)
   - ActionRequest/Response pattern

4. **Campaign state sync** (`src/multiplayer/campaign-sync.ts`)
   - Serialize campaign state for guests
   - Apply sync updates to guest UI
   - Permission validation for all action types
   - Action processing with proper error handling

### Files Created

| File | Purpose |
|------|---------|
| `src/multiplayer/protocol/types.ts` | Enums, shared types, action types |
| `src/multiplayer/protocol/messages.ts` | 20 message type definitions |
| `src/multiplayer/protocol/encode.ts` | Binary encoding functions |
| `src/multiplayer/protocol/decode.ts` | Binary decoding functions |
| `src/multiplayer/protocol/buffer-utils.ts` | Buffer read/write utilities |
| `src/multiplayer/protocol/router.ts` | Message routing with host-only validation |
| `src/multiplayer/protocol/index.ts` | Barrel exports |
| `src/multiplayer/action-processing.ts` | Permission validation + action execution |
| `src/multiplayer/campaign-sync.ts` | CampaignSyncManager class |
| `scripts/tests/multiplayer/protocol-test-helpers.mjs` | Shared test utilities |
| `scripts/tests/multiplayer/test-encoding-lobby.mjs` | Encoding tests (lobby/action messages) |
| `scripts/tests/multiplayer/test-encoding-session.mjs` | Encoding tests (session/callsign messages) |
| `scripts/tests/multiplayer/test-protocol-validation.mjs` | Message type + permission validation tests |
| `scripts/tests/multiplayer/test-protocol-router.mjs` | MessageRouter dispatch + send tests |
| `scripts/tests/multiplayer/test-protocol-sync.mjs` | Additional permission + action tests |
| `scripts/tests/multiplayer/test-protocol-manager.mjs` | CampaignSyncManager tests |

### Success Criteria

- [x] All game-specific message types defined (20 types, 0x80-0x93)
- [x] Clear separation from rollback-netcode messages (byte range 0x80+)
- [x] Round-trip encoding preserves data (tested for all 20 types)
- [x] Router correctly enforces host-only actions (15 host-only types validated)
- [x] Campaign state syncs to guests (CampaignSyncManager handles host/guest modes)

---

## Phase 6: Join Game Flow

**Goal:** UI for joining multiplayer games and hosting.

### Deliverables

1. **Title screen changes** (`src/ui/screens/title.ts`)
   - Add "Join Game" button
   - Route to join screen

2. **Join screen** (`src/ui/screens/join-game.ts`)
   - Room code input (8 characters)
   - Callsign input (persisted in localStorage)
   - Join button with loading state
   - Error display:
     - "Invalid room code"
     - "Room is full"
     - "Callsign already in use"
     - "Callsign has been kicked"
     - "Game in progress"
     - "Version mismatch" (with host version shown)
     - "Could not connect to all players"

3. **Campaign load changes** (`src/ui/screens/campaign-select.ts`)
   - "Host Multiplayer" option when loading campaign
   - Creates room via signaling server
   - Transitions to lobby with room code displayed

4. **Connection flow** (`src/multiplayer/connection-flow.ts`)
   - Orchestrate: Signaling → WebRTC mesh → Session start
   - Progress indicators for each step
   - Error recovery and user-friendly messages
   - On success: transition to lobby screen

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/ui/screens/join-game.ts` | Create - join game screen |
| `src/ui/screens/title.ts` | Modify - add Join Game button |
| `src/ui/screens/campaign-select.ts` | Modify - add Host Multiplayer option |
| `src/multiplayer/connection-flow.ts` | Create - orchestrate connection |

### Success Criteria

- [x] Can navigate to join screen from title
- [x] Room code + callsign validated
- [x] All error cases display appropriate messages
- [x] Successful join transitions to lobby (placeholder - returns to title until Phase 7)
- [x] Host can create room from campaign load
- [x] Host transitions to lobby with room code visible (room-created screen)

---

## Phase 7: Lobby Tab

**Goal:** Full lobby tab with players, chat, and room code.

### Deliverables

1. **Tab structure change**
   - Multiplayer mode uses: `LOBBY | SQUADRON | STORE | CONTRACTS`
   - LOBBY is default/first tab for multiplayer
   - Single-player mode unchanged

2. **Lobby screen** (`src/ui/screens/lobby/lobby.ts`)
   - Tab in multiplayer screen structure
   - Room code panel (host only, with copy button)
   - Players panel (left side)
   - Chat panel (right side)

3. **Players panel** (`src/ui/screens/lobby/players-panel.ts`)
   - List all connected players
   - Show: callsign, ship assignment or "(Spectator)", ping, ready status
   - Host indicator (★)
   - Self indicator (highlight or marker)

4. **Chat panel** (`src/ui/screens/lobby/chat-panel.ts`)
   - Chat log with scrolling (auto-scroll to bottom)
   - Input field with send button
   - System messages from events (joins, leaves, ready changes)
   - Basic send functionality (polish in Phase 13)

5. **Ready toggle**
   - Ready/Unready button below players panel
   - Visual indicator (✓/✗) in players panel
   - Network sync of ready state via ReadyState message

6. **Host popover** (`src/ui/screens/lobby/host-popover.ts`)
   - Appears on hover over guest row (host only)
   - Kick button (UI only - shows "Kick" but actual enforcement in Phase 13)
   - Permission toggles (UI only - enforcement in Phase 8)

### Files to Create

| File | Action |
|------|--------|
| `src/ui/screens/lobby/lobby.ts` | Create - main lobby screen |
| `src/ui/screens/lobby/players-panel.ts` | Create |
| `src/ui/screens/lobby/chat-panel.ts` | Create |
| `src/ui/screens/lobby/host-popover.ts` | Create |
| `src/ui/screens/lobby/index.ts` | Create - exports |
| `src/ui/screens/tabs.ts` | Modify - add LOBBY tab for multiplayer |

### Success Criteria

- [x] LOBBY screen appears after successful connection (host or guest)
- [x] Lobby renders correctly with two-column layout (players left, chat right)
- [x] Room code displays for host with copy button
- [x] Players list updates on join/leave with system messages
- [x] Players show: callsign, ping, ready status (✓/✗), host indicator (★), self highlight
- [x] Chat messages send and display (with timestamps)
- [x] Ready state syncs across players
- [x] Host sees popover on guest hover (buttons non-functional until Phase 8/13)
- [x] Back button returns to title with proper cleanup
- [x] CallsignAnnounce handshake prevents race conditions

---

## Phase 8: Permissions & Ship Assignment

**Goal:** Permission system, ship assignment, and pilot roster integration.

### Deliverables

1. **Permission system** (`src/multiplayer/permissions.ts`)
   - Permission types: shipEdit (none/own/any), canBuy, canSell, canConvertScrap
   - Default permissions for new players (none, no buy/sell/convert)
   - Host always has full permissions (not changeable)
   - Store permissions in MultiplayerState per player

2. **Permission enforcement**
   - Squadron tab respects permissions
   - Store tab respects permissions
   - ActionRequest validates permissions server-side (host)
   - Reject with ActionResponse { success: false, error: "Permission denied" }

3. **Ship assignment** (`src/multiplayer/ship-assignment.ts`)
   - Assign player to ship (UI in Squadron tab)
   - Unassign player (becomes spectator)
   - Host always assigned to commander ship (cannot change)
   - ShipAssignment message broadcast on changes

4. **Pilot roster integration**
   - When player joins, create pilot entry in roster
   - Pilot name = callsign
   - Skill level shown as "Player" (like Commander)
   - Pilot appears in Squadron tab ship details
   - **On permanent disconnect/kick:** Pilot remains in roster, reverts to AI (Regular skill)
   - **On session end:** All guest pilots removed from roster

5. **UI restrictions**
   - Disable/hide buttons based on permissions
   - Show permission indicator in UI (what you can/can't do)
   - Permission changes logged in chat

6. **Wire up host popover** (from Phase 7)
   - Permission toggles now functional
   - Changes broadcast via PermissionUpdate message

### Files Created/Modified

| File | Action |
|------|--------|
| `src/multiplayer/permissions.ts` | Create - permission defaults and types |
| `src/multiplayer/ship-assignment.ts` | Create - assignment logic, player pilots |
| `src/multiplayer/context-permissions.ts` | Create - UI permission helpers (canBuy, canSell, canEditShip) |
| `src/multiplayer/multiplayer-context.ts` | Modify - context management (split from permissions) |
| `src/campaign/handlers/lobby-context.ts` | Create - central context object for lobby state |
| `src/campaign/handlers/lobby-actions.ts` | Create - state modifications with side effects |
| `src/campaign/handlers/lobby-handlers.ts` | Modify - setup/cleanup using context pattern |
| `src/campaign/handlers/lobby-protocol-routing.ts` | Modify - message handling with context |
| `src/ui/screens/squadron/bind-events.ts` | Modify - permission checks for ship changes |
| `src/ui/screens/squadron/hardpoint.ts` | Modify - permission checks for loadout edits |
| `src/ui/screens/store/store-bind.ts` | Modify - permission checks for buy/sell |
| `src/ui/screens/store/detail.ts` | Modify - disable buttons based on permissions |

### Success Criteria

- [x] Permissions enforced on all actions (client and host validation)
- [x] UI reflects current permissions (buttons disabled appropriately)
- [x] Ship assignment works correctly
- [x] Host cannot be unassigned from commander ship
- [x] Player pilots appear in roster with "Player" skill
- [x] Permission changes sync and log in chat

---

## Phase 9: Contract & Launch Flow

**Goal:** Host-controlled contract selection and launch countdown.

### Deliverables

1. **Host-only contract actions**
   - Accept contract (host only)
   - Refresh contracts (host only)
   - Advance sector (host only)
   - Guests see buttons as disabled/greyed
   - Actions broadcast via ContractAccepted message

2. **Ready state integration**
   - Launch button checks all players ready (from Phase 7)
   - Launch blocked with message: "Waiting for all players to ready"
   - Accept contract not blocked by ready state

3. **Launch flow** (`src/multiplayer/launch-flow.ts`)
   - Launch button (enabled only when all ready)
   - 10-second countdown with LaunchCountdown messages
   - Chat messages: "10... 9... 8..." etc.
   - Abort on any player becoming unready
   - LaunchAborted message with reason
   - **Esc menu during countdown:** Disabled
   - Only explicit "Cancel" button or "Unready" can abort; pressing Esc is like pressing unready.

4. **Mission start sync** (`src/multiplayer/mission-sync.ts`)
   - MissionStarted message with seed + contractId
   - All clients initialize world identically using:
     - Same seed (from message)
     - Same campaignState (from CampaignSync)
     - Same contractId (from message)
   - No world state transmitted (reconstructed deterministically)
   - All clients start at tick 0

5. **Room state update**
   - Notify signaling server: room state → "playing"
   - Prevents new joins mid-mission

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/ui/screens/contracts.ts` | Modify - host-only actions, launch button |
| `src/multiplayer/launch-flow.ts` | Create - countdown logic |
| `src/multiplayer/mission-sync.ts` | Create - mission initialization |

### Success Criteria

- [x] Only host can accept/refresh contracts and advance sector
- [x] Launch blocked until all players ready
- [x] Countdown displays in chat (10... 9... 8...)
- [x] Unready player aborts countdown with message
- [x] Mission starts identically on all clients (verify with hash)
- [x] Room state updated to prevent mid-mission joins

---

## Phase 10: Multi-Player Mission Runtime

**Goal:** Multiple players controlling ships in mission.

### Deliverables

1. **Multi-player entity setup** (`src/multiplayer/mission-setup.ts`)
   - Each player's ship has Player component with owner ID
   - Map PlayerId → ship entity for input routing
   - Spectators have no ship entity (or ship with no Player component)

2. **Input routing integration**
   - Local player: keyboard input via existing InputSource
   - Remote players: inputs come from rollback-netcode session
   - Session.tick(localInput) handles local input
   - Engine provides remote inputs via its internal input buffer
   - Spectators: call session.tick() with no input (spectator role)

3. **Spectator camera** (`src/ui/screens/mission/spectator-camera.ts`)
   - Activate for players without ships (or destroyed ships)
   - Tab through friendly ships (same controls as replay)
   - Camera modes from replay (chase, cockpit, free)
   - Auto-switch when followed ship destroyed
   - If no ships remain, free cam at last position

4. **HUD updates**
   - Player callsigns above friendly ships (nameplates)
   - Target indicator shows "[Callsign]'s target" for coordination
   - Local player HUD unchanged
   - Spectator HUD: minimal, shows followed ship info

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/multiplayer/mission-setup.ts` | Create - multi-player mission init |
| `src/ui/screens/mission/spectator-camera.ts` | Create - spectator controls |
| `src/systems/input.ts` | Modify - route inputs by player ID |
| `src/ui/screens/mission/hud.ts` | Modify - player nameplates, target info |
| `src/components/player.ts` | Modify - add ownerId field if needed |

### Success Criteria

- [x] Each player controls only their assigned ship
- [x] Remote player ships move correctly (via rollback)
- [x] Spectators can tab through ships
- [x] Spectator camera modes work (Chase/Orbit/Free)
- [x] HUD shows player callsigns above ships
- [x] Target sharing visible ("[Player]'s target")

---

## Phase 11: Mission Pause & Disconnect

**Goal:** Multiplayer pause menu, disconnect handling, and player drop.

### Deliverables

1. **Multiplayer pause screen** (`src/ui/screens/mission/multiplayer-pause.ts`)
   - Triggered by any player pressing Escape
   - Layout: Players panel (left), Chat panel (right)
   - Shows who paused: "Paused by: [Callsign]"
   - Ready/Unready button
   - Settings button (local only, same as single player)
   - "Quit to Title" for guests (with confirmation)

2. **Ready-to-resume flow** (`src/multiplayer/pause-flow.ts`)
   - All players start unready when paused
   - 5-second countdown when all ready
   - ResumeCountdown messages: "5... 4... 3... 2... 1..."
   - Abort on any player becoming unready
   - Uses rollback-netcode's pause/resume with PauseReason

3. **LagReport event handling**
   - Subscribe to `session.on('lagReport', ...)`
   - Host receives lag reports from all players
   - Auto-pause when **majority** of players report same laggy player (e.g., 2 of 3, 3 of 4)
   - PauseReason: ExcessiveLag
   - Show in pause screen: "[Callsign] is lagging"

4. **Disconnect handling** (`src/multiplayer/disconnect-handler.ts`)
   - Auto-pause on player disconnect (PauseReason: PlayerDisconnect)
   - "Disconnected" status in player list
   - Host can wait for reconnection or drop player
   - Uses rollback-netcode's DisconnectReport flow

5. **Drop player** (`src/multiplayer/drop-player.ts`)
   - Host-only action from pause screen
   - AI skill selection dropdown (Rookie → Elite, default: Regular)
   - Uses rollback-netcode's DropPlayer message
   - Ship becomes AI-controlled (add AI component, remove Player)
   - Dropped player removed from session

6. **Guest voluntary quit**
   - "Quit to Title" in pause menu
   - Confirmation: "Your ship will be controlled by AI. Leave?"
   - On confirm: send leave, ship → AI (Regular skill), disconnect

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/ui/screens/mission/multiplayer-pause.ts` | Create |
| `src/multiplayer/pause-flow.ts` | Create - pause/resume logic |
| `src/multiplayer/drop-player.ts` | Create - AI replacement |
| `src/multiplayer/disconnect-handler.ts` | Create - disconnect handling |
| `src/multiplayer/lag-handler.ts` | Create - lag report handling |

### Success Criteria

- [ ] Any player can pause with Escape
- [ ] Pause screen shows all players with ready status
- [ ] Resume requires all ready + 5s countdown
- [ ] LagReport events trigger auto-pause when appropriate
- [ ] Disconnect triggers pause with "Disconnected" status
- [ ] Host can drop player with AI skill selection
- [ ] Guest can quit voluntarily with AI replacement
- [ ] Dropped/quit player's ship becomes AI-controlled

---

## Phase 12: Debrief & Session Management

**Goal:** Multiplayer debrief and session lifecycle.

### Deliverables

1. **Multiplayer debrief** (`src/ui/screens/results/multiplayer-results.ts`)
   - Same layout as single player results
   - Chat footer at bottom (persistent across debrief tabs)
   - All players can view results
   - Host has "Continue" button → returns all to lobby
   - Guests see "Waiting for host..." instead of Continue

2. **Chat footer** (`src/ui/screens/results/chat-footer.ts`)
   - Compact chat at bottom of debrief screen
   - Same functionality as lobby chat
   - Separate chat history from lobby (fresh for debrief)

3. **Session end handling**
   - Host quit (any screen) → SessionEnded message → all guests kicked
   - Campaign end (ironman commander death) → SessionEnded → all return to title
   - Guest quit from debrief → just disconnect (no AI needed, mission over)

4. **Return to lobby flow**
   - Host clicks Continue → MissionEnded acknowledged
   - Clear mission state on all clients
   - Reset ready states to unready
   - Fresh chat history for lobby
   - Room state → "lobby" (allows new joins again)

5. **Session cleanup** (`src/multiplayer/session-lifecycle.ts`)
   - Proper resource cleanup on session end
   - Network connection teardown
   - State reset for potential new session

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/ui/screens/results/multiplayer-results.ts` | Create or modify existing |
| `src/ui/screens/results/chat-footer.ts` | Create |
| `src/multiplayer/session-lifecycle.ts` | Create |

### Success Criteria

- [ ] Debrief shows for all players simultaneously
- [ ] Chat works during debrief (separate history)
- [ ] Host Continue returns all to lobby
- [ ] Guests wait for host to continue
- [ ] Host quit ends session for all with message
- [ ] Campaign end (ironman death) ends session
- [ ] Return to lobby resets state correctly
- [ ] Room state allows new joins after returning to lobby

---

## Phase 13: Polish & Edge Cases

**Goal:** Final polish, edge cases, and quality of life.

### Deliverables

1. **Kick system** (`src/multiplayer/kick-system.ts`)
   - Wire up kick button from Phase 7 host popover
   - Kick from lobby: player removed, callsign blocked
   - Kick from pause menu: same + ship → AI
   - CALLSIGN_KICKED message to signaling server
   - Kicked player sees: "You have been kicked"
   - Attempt to rejoin with kicked callsign: "Callsign has been kicked"

2. **Player stats tracking** (`src/multiplayer/player-stats.ts`)
   - Stats stored by callsign in campaign save
   - Track: kills, assists, missions flown, missions won, damage dealt, damage received
   - Stats persist across reconnections (same callsign)
   - Display in Squadron tab pilot details

3. **Chat polish** (`src/multiplayer/chat-system.ts`)
   - Rate limiting: 1 message per second per player
   - Max 200 characters per message
   - System message formatting (italics or different color)
   - Full system message coverage:
     - Join/leave/disconnect
     - Ready state changes
     - Ship assignments
     - Equipment changes
     - Store transactions
     - Permission changes
     - Contract/sector actions
     - Kick events

4. **Auto-unready triggers**
   - Equipment change to player's ship (by anyone)
   - Ship reassignment
   - Opening Esc menu (pre-mission only)
   - Becoming unready broadcasts ReadyState message

5. **Error recovery**
   - Graceful degradation on network issues
   - User-friendly error messages throughout
   - **Reconnection:** Out of scope for v1. Brief disconnects trigger pause; if player doesn't reconnect within timeout, they can be dropped. Full reconnection with state sync is a future enhancement.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/multiplayer/kick-system.ts` | Create |
| `src/multiplayer/player-stats.ts` | Create |
| `src/multiplayer/chat-system.ts` | Create or enhance from Phase 7 |
| `src/ui/screens/lobby/chat-panel.ts` | Modify - rate limiting, formatting |

### Success Criteria

- [ ] Kicked players cannot rejoin with same callsign
- [ ] Kick shows appropriate message to kicked player
- [ ] Stats persist correctly across sessions
- [ ] Chat rate limiting works (1 msg/sec)
- [ ] All system events generate chat messages
- [ ] Auto-unready triggers on equipment/assignment changes
- [ ] Error messages are clear and actionable

---

## Phase 14: Testing & Multiplayer Replay

**Goal:** Comprehensive testing and multiplayer replay support.

### Deliverables

1. **Multiplayer replay support**
   - Extend replay format for multiple players:
     ```typescript
     interface MultiplayerReplayData {
       players: Array<{
         playerId: string;  // PlayerId as string for JSON
         callsign: string;
         shipEntityId: number;
         joinTick: number;
         leaveTick: number | null;
       }>;
       // Array format for JSON serialization (Map not directly serializable)
       inputs: Array<{
         playerId: string;
         tickInputs: Array<{ tick: number; input: SerializedInput }>;
       }>;
     }
     ```
   - Tick-indexed inputs for each player
   - Player join/leave ticks (for ships appearing/disappearing)
   - Initial assignment mapping (PlayerId → ship entity)
   - Replay playback shows all ships
   - Camera can follow any player's ship

2. **Determinism tests**
   - Multi-player replay determinism (all players' inputs)
   - Hash stability across sessions
   - Verify identical state on host and guests

3. **Network simulation tests**
   - Artificial latency injection (50ms, 100ms, 200ms)
   - Packet loss simulation (1%, 5%)
   - Jitter testing (variable latency)
   - Verify rollback frequency is reasonable

4. **Desync tests**
   - Intentional desync injection (modify guest state)
   - Verify detection (hash mismatch event)
   - Verify recovery (state push restores sync)
   - Measure recovery time

5. **Integration tests**
   - Full 4-player session flow
   - Join → lobby → ready → mission → debrief → repeat
   - Edge cases: disconnect mid-mission, kick, spectator mode
   - Host migration NOT supported (verify clean failure)

6. **Performance benchmarks**
   - Snapshot size measurements (target: ~50KB)
   - Serialization time (target: <5ms)
   - Rollback frequency under various latencies
   - Memory usage over extended session

### Files to Create

| File | Action |
|------|--------|
| `src/replay/multiplayer-replay.ts` | Create - multiplayer replay support |
| `scripts/tests/multiplayer/test-determinism.mjs` | Create |
| `scripts/tests/multiplayer/test-network-sim.mjs` | Create |
| `scripts/tests/multiplayer/test-desync.mjs` | Create |
| `scripts/tests/multiplayer/test-integration.mjs` | Create |
| `scripts/tests/multiplayer/test-performance.mjs` | Create |

### Success Criteria

- [ ] Multiplayer replays save and play back correctly
- [ ] All determinism tests pass
- [ ] System handles 200ms latency gracefully
- [ ] Desync detected and recovered automatically
- [ ] Full session flow works end-to-end
- [ ] Performance meets targets (50KB snapshots, <5ms serialize)

---

## Phase Dependencies

```
Phase 1 (Serialization)
    │
    ▼
Phase 2 (Rollback Integration)
    │
    ├─────────────────────────────────┐
    ▼                                 ▼
Phase 3 (Server)                Phase 5 (Protocol)
    │                                 │
    ▼                                 │
Phase 4 (Networking)                  │
    │                                 │
    └────────────────┬────────────────┘
                     ▼
              Phase 6 (Join Flow)
                     │
                     ▼
              Phase 7 (Lobby Tab)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Phase 8 (Permissions)  Phase 9 (Launch)
          │                     │
          └──────────┬──────────┘
                     ▼
              Phase 10 (Mission)
                     │
                     ▼
              Phase 11 (Pause/Disconnect)
                     │
                     ▼
              Phase 12 (Debrief)
                     │
                     ▼
              Phase 13 (Polish)
                     │
                     ▼
              Phase 14 (Testing & Replay)
```

**Note:** Phases 3-4 and Phase 5 can run in parallel after Phase 2. They converge at Phase 6.

---

## Estimated Scope Per Phase

| Phase | New Files | Modified Files | Estimated Complexity |
|-------|-----------|----------------|---------------------|
| 1. Serialization | 4 | 0 | Medium-High (may need split) |
| 2. Rollback | 5 | 1 | Medium |
| 3. Server | 6 | 0 | Medium |
| 4. Networking | 5 | 0 | Medium |
| 5. Protocol | 5 | 0 | Medium |
| 6. Join Flow | 2 | 3 | Low-Medium |
| 7. Lobby Tab | 6 | 1 | Medium |
| 8. Permissions | 2 | 4 | Medium |
| 9. Launch Flow | 2 | 2 | Low-Medium |
| 10. Mission | 2 | 4 | Medium |
| 11. Pause/Disconnect | 5 | 1 | Medium-High |
| 12. Debrief | 3 | 1 | Low-Medium |
| 13. Polish | 4 | 2 | Medium |
| 14. Testing & Replay | 6 | 1 | Medium |

---

## Notes for Implementation

### Starting a Phase

Each phase should begin by:
1. Reading this roadmap and the specific phase section
2. Reading relevant design docs (`protocol.md`, `netcode.md`, `ux.md`)
3. Reading files from previous phases that this phase depends on
4. Creating the deliverables in order listed
5. Running tests before marking complete

### Context Window Management

If a phase is too large for one context window:
1. Split into sub-phases (e.g., "Phase 1a: Core Components", "Phase 1b: Combat Components")
2. Focus on core deliverables first, polish later
3. Leave clear TODO comments for follow-up
4. Document what was completed vs. remaining

### Testing Strategy

Each phase should include:
- Unit tests for new functions
- Integration test demonstrating the feature works
- Manual test instructions if UI is involved

### Key Integration Points

These require extra attention as they span multiple systems:

| Integration | Phases | Notes |
|-------------|--------|-------|
| Rollback ↔ World | 1, 2 | Game adapter wires serialize/step/hash |
| Session ↔ UI | 4, 6, 7 | MultiplayerState drives all UI |
| Permissions ↔ Actions | 5, 8 | Both client checks and host validation |
| Inputs ↔ Entities | 2, 10 | Map PlayerId to ship entity |
| Pause ↔ Library | 11 | Use rollback-netcode pause with PauseReason |
| Lag ↔ Pause | 11 | LagReport events trigger auto-pause |
