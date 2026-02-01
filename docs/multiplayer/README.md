# Multiplayer

4-player online co-op multiplayer for Spaceflight. Each player connects from their own machine (no local split-screen).

## Approach

**Rollback netcode** - All clients simulate deterministically, predicting remote inputs and rolling back to correct mispredictions when actual inputs arrive. This gives local players zero input lag while handling network latency gracefully.

## Decisions

| Topic | Decision | Notes |
|-------|----------|-------|
| **Netcode model** | Rollback | Simulate optimistically; rollback on misprediction |
| **Connection** | Signaling server | Room codes, no IP/password sharing |
| **Communication topology** | Fully connected mesh | Direct P2P between all players; host authoritative for campaign/desync |
| **Host migration** | Not supported | If host disconnects, session ends |
| **Max players** | 4 | Host + 3 guests |
| **Disconnect handling** | Pause game | Any player can pause; host can kick and replace with AI |
| **Spectator mode** | Supported | Tab through ships with replay-like camera controls |
| **Reward distribution** | Shared ownership | All credits/items belong to campaign (host) |
| **Guest permissions** | Configurable | Host controls ship editing and store access per player |
| **Kicked players** | Blocked by callsign | Cannot rejoin same session with same callsign |

## Documentation

| Document | Contents |
|----------|----------|
| [architecture.md](architecture.md) | Client architecture, codebase state |
| [netcode.md](netcode.md) | Rollback algorithm, prediction, snapshots, input buffering |
| [protocol.md](protocol.md) | Network messages, signaling flow, message types |
| [webrtc-mesh-protocol.md](webrtc-mesh-protocol.md) | WebRTC mesh formation, reconnection, tie-breakers |
| [ux.md](ux.md) | Player-facing flows: hosting, joining, lobby, permissions, pause |

## AWS Signaling Server

The production signaling server runs on AWS Lambda. See `server/signaling-aws/README.md` for deployment, monitoring, and operations.
