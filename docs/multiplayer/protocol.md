# Network Protocol

## Transport Options

Rollback netcode requires **reliable delivery** of inputs - missing inputs cause permanent desync.

| Option | Pros | Cons |
|--------|------|------|
| **TCP/WebSocket** | Reliable + ordered, simple | Head-of-line blocking can cause stalls |
| **WebRTC DataChannel (reliable ordered)** | P2P, reliable + ordered | Similar to TCP |
| **WebRTC DataChannel (unreliable) + custom reliability** | No head-of-line blocking, handles out-of-order | More complexity |

**Recommendation**: Start with WebRTC DataChannel in reliable ordered mode. The input buffer design handles out-of-order arrival, so we can switch to unreliable + custom reliability later if head-of-line blocking causes stalls.

## Topology Options (Needs Decision)

### Game Formation

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **(A) Direct connect** | Host shares IP/code with friends | No server infrastructure | NAT traversal issues, no matchmaking |
| **(B) Matchmaking server** | Server handles lobby, then P2P | Easier discovery, server assists NAT | Need to run matchmaking server |
| **(C) Dedicated server** | Server hosts all game traffic | Enables host migration, consistent | Most infrastructure, server costs |

### Communication Topology

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **(A) Star (through host)** | All traffic routes through host | Simple, host is authoritative | Host has latency advantage |
| **(B) P2P mesh** | Clients connect directly to each other | Lower latency between peers | More connections, complex |
| **(C) Relay server** | All traffic through server | Consistent latency, no NAT issues | Requires server, added latency |

### Host Migration

Only feasible with options (B) or (C) above. With (A), if host disconnects, game ends.

## Message Types

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

// Game control (host only)
interface PauseMessage { type: 'PAUSE'; reason: 'player_disconnect' | 'host_pause'; }
interface ResumeMessage { type: 'RESUME'; }
interface DropPlayerMessage { type: 'DROP_PLAYER'; playerId: number; replaceWithAI: boolean; }
```

## Bandwidth Estimates

| Message | Size | Frequency | Bandwidth (per player) |
|---------|------|-----------|------------------------|
| InputMessage | ~10 bytes | 60/sec | 600 B/s |
| StateHashMessage | ~12 bytes | 1/sec | 12 B/s |
| Total baseline | - | - | ~2.5 KB/s (4 players) |

State snapshots for desync recovery are larger (~50KB) but rare.
