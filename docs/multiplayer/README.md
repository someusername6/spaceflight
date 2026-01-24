# Multiplayer

4-player online co-op multiplayer for Spaceflight. Each player connects from their own machine (no local split-screen).

## Approach

**Rollback netcode** - All clients simulate deterministically, predicting remote inputs and rolling back to correct mispredictions when actual inputs arrive. This gives local players zero input lag while handling network latency gracefully.

## Decisions

| Topic | Decision | Notes |
|-------|----------|-------|
| **Netcode model** | Rollback | Simulate optimistically; rollback on misprediction |
| **Disconnect handling** | Pause game | Host can force-drop and replace with AI |
| **Spectator mode** | Not for MVP | Can add later |
| **Reward distribution** | Shared ownership | All credits/items belong to campaign (host) |

## Needs Decision

| Topic | Options |
|-------|---------|
| **Game formation** | (A) Direct connect only, (B) Matchmaking server, (C) Dedicated server |
| **Communication topology** | (A) All through host, (B) P2P mesh, (C) Relay server |
| **Host migration** | Depends on above choices |

See [protocol.md](protocol.md) for details on these options.

## Documentation

| Document | Contents |
|----------|----------|
| [architecture.md](architecture.md) | Client architecture, codebase state, what's ready |
| [netcode.md](netcode.md) | Rollback algorithm, prediction, snapshots, input buffering |
| [protocol.md](protocol.md) | Network messages, transport options, topology |
| [ux.md](ux.md) | Player-facing flows: hosting, joining, permissions |
| [roadmap.md](roadmap.md) | Implementation phases, testing strategy |
