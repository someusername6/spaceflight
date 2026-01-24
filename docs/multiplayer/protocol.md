# Network Protocol

## Transport

Rollback netcode requires **reliable delivery** of inputs - missing inputs cause permanent desync.

**Decision**: WebRTC DataChannel in reliable ordered mode. The input buffer design handles out-of-order arrival, so we can switch to unreliable + custom reliability later if head-of-line blocking causes stalls.

## Topology

**Game Formation**: Signaling server generates room codes and relays WebRTC connection info. No direct IP sharing required.

**Communication**: Fully connected mesh - Each player has direct WebRTC connections to all other players. Host is authoritative for campaign state and desync recovery.

**Host Migration**: Not supported - If host disconnects, session ends.

## Signaling Flow

```
1. Host creates room:
   Host → Server: CREATE_ROOM
   Server → Host: ROOM_CREATED { roomCode, hostId }

2. Guest joins:
   Guest → Server: JOIN_ROOM { roomCode, callsign }
   Server validates: room exists, not full, callsign available, not kicked
   Server → Guest: ROOM_JOINED { hostId, existingPlayers[] }
   Server → All existing players: GUEST_JOINING { guestId, callsign }

3. WebRTC mesh formation (for each existing player P):
   Server → Guest: PREPARE_OFFER { peerId: P.id }
   Guest creates SDP offer for P
   Guest → Server: SDP_OFFER { peerId: P.id, sdp }
   Server → P: SDP_OFFER { peerId: Guest.id, sdp }
   P creates SDP answer
   P → Server: SDP_ANSWER { peerId: Guest.id, sdp }
   Server → Guest: SDP_ANSWER { peerId: P.id, sdp }
   (ICE candidates exchanged similarly via ICE_CANDIDATE messages)

4. Connection confirmation:
   Each player reports success: Player → Server: PEER_CONNECTED { peerId }
   Once all connections established:
   Server → All: PLAYER_CONNECTED { playerId: Guest.id, callsign }

   Partial mesh failure: If guest cannot connect to all existing players within
   timeout (10s), guest receives JOIN_FAILED and returns to join screen.
   Existing session continues unaffected. Full mesh is required.

5. Player kicked:
   Host → Server: CALLSIGN_KICKED { callsign }
   Server stores kicked callsign for this room
   (Checked on subsequent JOIN_ROOM attempts)
```

### Post-Signaling Flow

After signaling completes and mesh is established:

1. Host receives `PLAYER_CONNECTED` from signaling server
2. Host sends `Welcome` to new guest over WebRTC with:
   - Assigned `playerId`
   - Current `campaignState`
   - List of all `players` (including new guest)
3. Host broadcasts `PlayerJoined` to other existing guests
4. New guest is now fully connected and can interact

## Message Types

### Mission Messages (During Gameplay)

```typescript
// Input broadcast (every tick)
interface InputMessage {
  type: 'INPUT';
  tick: number;
  playerId: number;
  input: number; // 18-bit encoded input
}

// Input acknowledgment (only needed with unreliable transport)
interface InputAck {
  type: 'INPUT_ACK';
  playerId: number;
  lastReceivedTick: number;
}

// Determinism verification (periodic, e.g., every 60 ticks)
// All clients send to host; host compares and detects desync
interface StateHashMessage {
  type: 'STATE_HASH';
  tick: number;
  hash: number;
}

// Desync recovery (host-initiated after detecting hash mismatch)
interface SyncRequest { type: 'SYNC_REQUEST'; tick: number; }
interface SyncResponse { type: 'SYNC_RESPONSE'; tick: number; worldState: SerializedWorld; }

// Full state push (host sends authoritative state to desynced client)
interface StatePush { type: 'STATE_PUSH'; tick: number; worldState: SerializedWorld; }

// Skill levels for AI replacement
type SkillLevel = 'rookie' | 'regular' | 'veteran' | 'ace' | 'elite';

// Lag detection (sent to host when remote player's inputs fall behind)
interface LagReport { type: 'LAG_REPORT'; laggyPlayerId: number; ticksBehind: number; }

// Disconnect detection (sent to host when connection to peer lost)
interface DisconnectReport { type: 'DISCONNECT_REPORT'; peerId: number; }

// Game control (host broadcasts these)
interface PauseMessage { type: 'PAUSE'; pausedBy: number; reason: 'player_request' | 'player_disconnect' | 'excessive_lag'; }
interface ResumeCountdown { type: 'RESUME_COUNTDOWN'; secondsRemaining: number; }
interface ResumeMessage { type: 'RESUME'; }
interface DropPlayerMessage { type: 'DROP_PLAYER'; playerId: number; aiSkill: SkillLevel; }
```

### Lobby Messages

```typescript
// Connection (validation happens during signaling; these are post-WebRTC)
// Host sends welcome with current state after mesh established
interface Welcome { type: 'WELCOME'; playerId: number; campaignState: CampaignState; players: PlayerInfo[]; }
// Host broadcasts membership changes
interface PlayerJoined { type: 'PLAYER_JOINED'; playerId: number; callsign: string; }
interface PlayerLeft { type: 'PLAYER_LEFT'; playerId: number; reason: 'disconnect' | 'kicked' | 'quit'; }

// Chat (broadcast to all via mesh; system messages generated locally from events)
interface ChatMessage { type: 'CHAT'; playerId: number; text: string; timestamp: number; }

// Ready state
interface ReadyState { type: 'READY_STATE'; playerId: number; ready: boolean; }

// Permissions (host → guest)
interface PermissionUpdate {
  type: 'PERMISSION_UPDATE';
  playerId: number;
  shipEdit: 'none' | 'own' | 'any';
  canBuy: boolean;
  canSell: boolean;
  canConvertScrap: boolean;
}

// Ship assignment
interface ShipAssignment { type: 'SHIP_ASSIGNMENT'; playerId: number; shipId: string | null; }

// Campaign state sync (host → guests)
interface CampaignSync { type: 'CAMPAIGN_SYNC'; campaignState: CampaignState; }

// Contract flow
interface ContractAccepted { type: 'CONTRACT_ACCEPTED'; contractId: string; contractName: string; }
interface LaunchCountdown { type: 'LAUNCH_COUNTDOWN'; secondsRemaining: number; }
interface LaunchAborted { type: 'LAUNCH_ABORTED'; reason: string; }
interface MissionStarted {
  type: 'MISSION_STARTED';
  seed: number;           // PRNG seed for deterministic simulation
  contractId: string;     // Clients use campaignState + contractId to initialize world
}
interface MissionEnded { type: 'MISSION_ENDED'; outcome: MissionOutcome; }

// Guest action requests (guest → host)
interface ActionRequest {
  type: 'ACTION_REQUEST';
  requestId: number;
  action:
    | { type: 'buy'; itemId: string; quantity: number }
    | { type: 'sell'; itemId: string; quantity: number }
    | { type: 'convertScrap'; scrapType: string }
    | { type: 'equip'; shipId: string; slot: string; itemId: string }
    | { type: 'unequip'; shipId: string; slot: string }
    | { type: 'assignShip'; shipId: string }
    | { type: 'resupply'; shipId: string; slot: string; quantity: number };
}

// Action response (host → guest)
interface ActionResponse {
  type: 'ACTION_RESPONSE';
  requestId: number;
  success: boolean;
  error?: string; // "Insufficient credits", "Permission denied", etc.
}

// Session control
interface SessionEnded { type: 'SESSION_ENDED'; reason: 'host_quit' | 'campaign_ended'; }

// Ping (for latency display)
interface Ping { type: 'PING'; timestamp: number; }
interface Pong { type: 'PONG'; timestamp: number; }
```

### Player Info Structure

```typescript
interface PlayerInfo {
  playerId: number;
  callsign: string;
  shipId: string | null; // null = spectator
  ready: boolean;
  permissions: {
    shipEdit: 'none' | 'own' | 'any';
    canBuy: boolean;
    canSell: boolean;
    canConvertScrap: boolean;
  };
}
```

### Campaign State Structure

```typescript
// Sent to guests in Welcome and CampaignSync
interface CampaignState {
  sector: number;
  credits: number;
  ships: ShipState[];
  storage: StorageState;
  pilots: PilotState[];
  contracts: ContractSummary[];
  acceptedContract: string | null;
}

// Mission outcome for debrief
interface MissionOutcome {
  victory: boolean;
  rewardCredits: number;
  rewardItems: string[];
  salvage: SalvageItem[];
  playerStats: PlayerMissionStats[];
}
```

**Note:** `ShipState`, `StorageState`, `PilotState`, `ContractSummary`, `SalvageItem`, and `PlayerMissionStats` mirror the game's existing data structures. See implementation for details.

### Player Identity

- **Host** is always playerId 0
- **Guests** get playerId 1, 2, 3 in join order
- `guestId` from signaling is temporary (used only during WebRTC setup)
- `playerId` is assigned by host and sent in `Welcome`
- If player disconnects and rejoins, they get a new playerId
- Callsign links stats across reconnections, not playerId

## Bandwidth Estimates (Mesh Topology, 4 Players)

Per-player bandwidth (each player sends to 3 others, receives from 3 others):

| Message | Size | Frequency | Send | Receive |
|---------|------|-----------|------|---------|
| InputMessage | ~10 bytes | 60/sec × 3 peers | 1.8 KB/s | 1.8 KB/s |
| StateHashMessage | ~12 bytes | 1/sec (to host only) | 12 B/s | 36 B/s (host) |
| Ping/Pong | ~16 bytes | 1/sec × 3 peers | 48 B/s | 48 B/s |
| **Total baseline** | - | - | **~1.9 KB/s** | **~1.9 KB/s** |

State snapshots for desync recovery are larger (~50KB) but rare.

## Message Routing

With fully connected mesh, messages route as follows:

| Message | Sender | Recipients | Notes |
|---------|--------|------------|-------|
| `InputMessage` | Any pilot | All others | Broadcast via mesh |
| `StateHashMessage` | All | Host only | Host compares hashes |
| `LagReport` | Any | Host only | Host decides to pause |
| `DisconnectReport` | Any | Host only | Host declares official disconnect |
| `ChatMessage` | Any | All others | Broadcast via mesh |
| `PlayerJoined` | Host | All guests | Host is authority for membership |
| `PlayerLeft` | Host | All guests | Host declares disconnects |
| `Welcome` | Host | New guest | Initial state on join |
| `PermissionUpdate` | Host | All guests | Everyone sees permissions |
| `ShipAssignment` | Host | All guests | Everyone sees assignments |
| `CampaignSync` | Host | All guests | Campaign state is host-owned |
| `ActionRequest` | Guest | Host only | Guest requests action (buy, equip, etc.) |
| `ActionResponse` | Host | Requesting guest | Success/failure response |
| `ReadyState` | Any | All others | Broadcast via mesh |
| `PauseMessage` | Host | All guests | Host coordinates pause |
| `ResumeCountdown` | Host | All guests | Unpause countdown |
| `ResumeMessage` | Host | All guests | Game resumes |
| `ContractAccepted` | Host | All guests | Contract selection |
| `LaunchCountdown` | Host | All guests | Pre-mission countdown |
| `LaunchAborted` | Host | All guests | Countdown cancelled |
| `MissionStarted` | Host | All guests | Includes seed for determinism |
| `MissionEnded` | Host | All guests | Includes outcome for debrief |
| `SessionEnded` | Host | All guests | Host quit or campaign ended |
| `DropPlayerMessage` | Host | All guests | Player replaced with AI |
| `Ping/Pong` | Any | Each peer | Per-connection latency |

**System messages** (e.g., "Jax joined") are generated locally from received events, not transmitted.

## CampaignSync Triggers

Host broadcasts `CampaignSync` after any event that modifies campaign state:
- Successful `ActionRequest` (buy, sell, equip, assign, etc.)
- `MissionEnded` (rewards applied)
- Contract accepted or refreshed
- Sector advanced

Guests update their local UI from received `CampaignSync`. They do not modify campaign state locally.

## Chat Limits

- Max message length: 200 characters
- Rate limit: 1 message per second per player

**Chat history lifecycle:**
- Lobby chat clears when mission starts
- Debrief has separate chat
- Returning to lobby from debrief starts fresh chat

## Security Considerations

- Room codes: 8 characters, ~1 trillion combinations
- Signaling server rate limits: 1 join attempt per IP per second
- Kicked callsigns: Host sends `CALLSIGN_KICKED` to server; server stores per room and rejects on `JOIN_ROOM`
- No authentication beyond room code
