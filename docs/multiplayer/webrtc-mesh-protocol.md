# WebRTC Mesh Protocol

This document describes how clients establish and maintain the WebRTC mesh network for multiplayer games.

## Overview

Players form a fully-connected mesh where each player has a direct WebRTC connection to every other player. The signaling server only relays connection setup messages (SDP offers/answers, ICE candidates) - all game traffic flows directly peer-to-peer.

```
     Host ←────────→ Guest A
       ↑ ╲          ╱ ↑
       │   ╲      ╱   │
       │     ╲  ╱     │
       │      ╳       │
       │    ╱   ╲     │
       │  ╱       ╲   │
       ↓ ╱          ╲ ↓
Guest B ←────────→ Guest C
```

## Key Files

| File | Purpose |
|------|---------|
| `src/multiplayer/networking/webrtc-mesh.ts` | Mesh manager - orchestrates all peer connections |
| `src/multiplayer/networking/peer-connection.ts` | Individual RTCPeerConnection management |
| `src/multiplayer/networking/mesh-signaling.ts` | SDP offer/answer and ICE candidate handling |
| `src/multiplayer/networking/reconnection.ts` | Exponential backoff retry logic |
| `src/multiplayer/networking/signaling-client.ts` | HTTP client for signaling server |

## Mesh Formation

### Who Initiates Connections

**Rule: The joining player initiates connections to all existing peers.**

When a guest joins:
1. Signaling server returns list of existing peers (including host)
2. Guest creates RTCPeerConnection for each existing peer
3. Guest creates SDP offer for each peer
4. Guest sends offers via signaling server
5. Existing peers receive offers, create answers
6. Mesh completes when all data channels open

This asymmetric approach ensures only one SDP offer exists per peer pair.

### Connection Initiator for Reconnection

**Rule: Lower peer ID initiates reconnection (tie-breaker).**

When a connection fails mid-session:
1. Both peers detect the failure
2. Peer with lexicographically lower ID becomes initiator
3. Only one peer creates a new offer
4. This prevents dual-offer deadlock

See `webrtc-mesh.ts:320-336`:
```typescript
// Tie-breaker: lower peer ID becomes the initiator
const shouldInitiate = this.localPeerId < peerId;
this.createPeer(peerId, shouldInitiate);
```

## Data Channels

Each peer connection has two data channels:

| Channel | Config | Purpose |
|---------|--------|---------|
| `reliable` | `ordered: true` | Game inputs, state sync, protocol messages |
| `unreliable` | `ordered: false, maxRetransmits: 0` | Reserved for future optimization |

A peer is considered "connected" only when both channels are open.

## Signaling Flow

```
Guest                    Signaling Server                    Host
  │                            │                               │
  │ POST /rooms/:code/join     │                               │
  │ ─────────────────────────> │                               │
  │                            │                               │
  │ { hostId, existingPeers }  │                               │
  │ <───────────────────────── │                               │
  │                            │                               │
  │ [Create RTCPeerConnection] │                               │
  │ [Create DataChannels]      │                               │
  │ [Create SDP Offer]         │                               │
  │                            │                               │
  │ POST /rooms/:code/signals  │                               │
  │ { type: 'offer', ... }     │                               │
  │ ─────────────────────────> │                               │
  │                            │ GET /rooms/:code/signals      │
  │                            │ <──────────────────────────── │
  │                            │                               │
  │                            │ [Receive Offer]               │
  │                            │ [Set Remote Description]      │
  │                            │ [Create SDP Answer]           │
  │                            │                               │
  │                            │ POST /rooms/:code/signals     │
  │                            │ { type: 'answer', ... }       │
  │                            │ <──────────────────────────── │
  │                            │                               │
  │ GET /rooms/:code/signals   │                               │
  │ ─────────────────────────> │                               │
  │                            │                               │
  │ [Receive Answer]           │                               │
  │ [Set Remote Description]   │                               │
  │                            │                               │
  │ ═══════════ ICE Candidates exchanged ═══════════════════  │
  │                            │                               │
  │ ═══════════════ WebRTC Connection Established ══════════  │
```

## ICE Candidate Buffering

ICE candidates may arrive before the remote SDP description is set. The peer connection buffers these:

```typescript
// mesh-signaling.ts
if (state.remoteDescriptionSet) {
  await state.connection.addIceCandidate(iceCandidate);
} else {
  state.iceCandidateBuffer.push(iceCandidate);
}
```

Buffered candidates are processed after `setRemoteDescription()` completes.

## Reconnection

When a connection fails or disconnects:

### Retry Logic

1. Connection state changes to `failed` or `disconnected`
2. ReconnectionManager checks retry count (max 5 attempts)
3. Schedules retry with exponential backoff + jitter
4. Tie-breaker determines who initiates

### Exponential Backoff

```
Attempt 1: 500ms + 0-250ms jitter
Attempt 2: 1000ms + 0-500ms jitter
Attempt 3: 2000ms + 0-1000ms jitter
Attempt 4: 4000ms + 0-2000ms jitter
Attempt 5: 8000ms + 0-4000ms jitter
(capped at 16000ms max delay)
```

Jitter prevents synchronized reconnection attempts ("thundering herd").

### Reconnection Callbacks

```typescript
onReconnecting(peerId)       // Connection lost, will retry
onReconnectionAttempt(peerId) // Starting retry attempt
onReconnectionFailed(peerId)  // All retries exhausted
```

## Mesh Timeout

When forming the initial mesh, a timeout ensures players don't wait indefinitely:

- **Timeout:** 30 seconds (configurable via `meshTimeoutMs`)
- **On timeout:** `onMeshFailed` callback with list of missing peers
- **Success:** `onMeshComplete` callback when all expected peers connected

## Connection State Tracking

The mesh tracks three sets of peers:

| Set | Purpose |
|-----|---------|
| `peers` | All peer connections (Map<peerId, PeerState>) |
| `_connectedPeers` | Currently connected peers (Set<peerId>) |
| `expectedPeers` | Peers we're trying to connect to (Set<peerId>) |

`isMeshComplete()` returns true when all expected peers are in connected set.

## Cleanup

When disposing the mesh:

1. Cancel mesh timeout
2. Reset reconnection manager (clears all retry timers)
3. Close all data channels
4. Close all RTCPeerConnections
5. Clear all tracking sets

```typescript
dispose(): void {
  clearTimeout(this.meshTimeoutId);
  this.reconnectionManager.reset();
  for (const state of this.peers.values()) {
    cleanupPeerConnection(state);
  }
  this.peers.clear();
  this._connectedPeers.clear();
  this.expectedPeers.clear();
}
```

## Debugging Tips

### Check Connection State

```typescript
// In browser console
mesh.connectedPeers  // Set of connected peer IDs
mesh.isMeshComplete()  // Are all expected peers connected?
```

### Common Issues

| Symptom | Likely Cause |
|---------|--------------|
| Mesh never completes | Firewall blocking WebRTC, STUN server unreachable |
| One peer can't connect | Symmetric NAT on one side |
| Frequent disconnects | Unstable network, WebRTC timeout |
| ICE candidates not arriving | Signaling server polling issue |

### Logs

Enable debug logging to see mesh formation:
```
[Mesh] Reconnect: attempting to peer-abc (initiator: true)
[Mesh] Reconnect: scheduling attempt 2/5 to peer-abc in 1234ms
```
