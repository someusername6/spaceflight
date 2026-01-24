# Multiplayer UX Design

This document covers player-facing flows for multiplayer. **Status: TBD**

## Open Questions

### Hosting

- How does a player create a multiplayer game?
- What information is shown (join code, link, QR code)?
- Can they set a password or player limit?
- Is the host always the "commander" (campaign owner)?

### Joining

- How does a player enter a join code?
- What do they see in the lobby while waiting?
- How do they signal "ready"?
- Can they see other players' ships/loadouts?

### Permissions

- What can non-host players do on campaign screens?
  - Squadron management: view only? suggest changes?
  - Store: can they buy/sell? or only host?
  - Contracts: can they vote? or host decides?
- How are permissions communicated in the UI?

### During Mission

- Can any player pause, or only host?
- What happens when someone pauses?
- How is "player X paused" communicated?

### Disconnect/Rejoin

- What happens when a player disconnects mid-mission?
  - Game pauses immediately?
  - Grace period before AI takeover?
- Can a disconnected player rejoin?
  - Same mission? Only between missions?
- What happens to their ship if they can't rejoin?

### Campaign Flow

- Can players join mid-campaign, or only at start?
- If a player leaves permanently, what happens to their pilot slot?
- How are mission results shown to all players?

## Design Principles (Proposed)

1. **Host is commander** - Host owns the campaign save, makes final decisions
2. **Minimize friction** - Easy to create/join, no account required
3. **Clear feedback** - Always obvious who's in control, what's happening
4. **Graceful degradation** - Disconnects don't lose progress if avoidable
