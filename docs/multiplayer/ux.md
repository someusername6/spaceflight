# Multiplayer UX Design

This document defines player-facing flows for multiplayer.

## Design Principles

1. **Host is commander** - Host owns the campaign save, makes strategic decisions
2. **Guests are wingmen** - Guests control assigned squadron ships
3. **Simple connection** - Room code via signaling server, no IP/password
4. **Configurable permissions** - Host controls what guests can do

## Player Roles

| Role | Controls | Default Permissions |
|------|----------|---------------------|
| **Host** | Commander ship, campaign decisions | Full (unchangeable) |
| **Guest** | Assigned wingman ship (or spectator) | View only (configurable) |

- Host's campaign save determines everything: ships, pilots, credits, sector
- Guests don't need their own campaign - they join someone else's
- Up to 3 guests (4 players total)
- Guests can be spectators (no ship assigned) or pilots (ship assigned)

---

## Entry Points

**Title screen:**
```
[Play]  [Join Game]  [Settings]  [Replays]
```

- **Play** → Load Campaign → Choose solo or host multiplayer
- **Join Game** → Enter room code + callsign → Lobby

---

## Hosting a Game

### Flow

```
Title → Play → Load Campaign → [Host Multiplayer] → Lobby (with room code)
```

When selecting "Host Multiplayer" at campaign load:
1. Signaling server generates a **room code**
2. Game starts with Lobby tab as default
3. Lobby displays room code for sharing

### Ending a Session

- Host leaves via Esc menu → "Quit to Title" (same as single player)
- All guests receive modal: "Host has ended the session"
- Guests return to title screen
- No dedicated "End Session" button

---

## Joining a Game

### Join Screen

```
┌─────────────────────────────────────────┐
│  JOIN GAME                              │
│                                         │
│  Room Code:                             │
│  ┌─────────────────────────────────────┐│
│  │ ABCD-1234                           ││
│  └─────────────────────────────────────┘│
│                                         │
│  Your callsign:                         │
│  ┌─────────────────────────────────────┐│
│  │ Maverick                            ││
│  └─────────────────────────────────────┘│
│                                         │
│  [Join]                      [Cancel]   │
└─────────────────────────────────────────┘
```

- Room code: 8 characters (e.g., `ABCD-1234`)
- Callsign persisted in localStorage for convenience
- Connection errors shown inline:
  - "Invalid room code"
  - "Room is full"
  - "Game in progress" (can't join mid-mission)
  - "Callsign already in use" (another connected player has it)
  - "Callsign has been kicked from this session"
  - "Could not connect to all players" (partial mesh failure after timeout)

### Callsign Rules

- Length validation only (min 1, max 20 characters)
- Must be unique among currently connected players
- Kicked callsigns cannot rejoin the same session
- Same callsign across sessions inherits stats

---

## Player Identity

- When joining, player enters their **callsign**
- Callsign appears in:
  - Chat messages
  - Pilot roster (as pilot name)
  - In-game wingman/ship labels
- Callsign persisted in localStorage for convenience on rejoin
- Stats tracked by callsign in campaign save

---

## Tab Structure (Multiplayer)

```
LOBBY | SQUADRON | STORE | CONTRACTS
```

- **LOBBY** is the default/first tab for all multiplayer participants
- All four tabs visible to all players
- Interaction on Squadron/Store/Contracts governed by permissions

---

## Lobby Tab

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  LOBBY                                                             │
├────────────────────────────────────────────────────────────────────┤
│  ROOM CODE (host only)                                             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  ABCD-1234                                           [Copy] │   │
│  └────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────┬────────────────────────────────┤
│                                   │                                │
│  PLAYERS                          │  CHAT                          │
│  ┌─────────────────────────────┐  │  ┌────────────────────────────┐│
│  │ ★ Commander (Host)          │  │  │ Jax joined                 ││
│  │   Interceptor · Plasma/Seeker│  │  │ Commander: welcome         ││
│  │   Ping: --                   │  │  │ Jax assigned to Striker    ││
│  │   Ready: ✓                   │  │  │ Jax bought 2 Torpedos (200)││
│  ├─────────────────────────────┤  │  │ Jax: thx, ready when u are ││
│  │ ● Jax                       │  │  │ Jax marked ready            ││
│  │   Striker · Autocannon/Torp │  │  │ Commander accepted contract ││
│  │   Ping: 45ms                │  │  │   "Convoy Ambush" (Hard)    ││
│  │   Ready: ✓                  │  │  │ 10...                       ││
│  ├─────────────────────────────┤  │  │ 9...                        ││
│  │ ● Vega                      │  │  │                             ││
│  │   (Spectator)               │  │  │                             ││
│  │   Ping: 62ms                │  │  │                             ││
│  │   Ready: ✓                  │  │  │                             ││
│  └─────────────────────────────┘  │  ├────────────────────────────┤│
│                                   │  │ [______________] [Send]     ││
│  [Ready] / [Unready]              │  └────────────────────────────┘│
│                                   │                                │
└───────────────────────────────────┴────────────────────────────────┘
```

### Room Code Panel (Host Only)

- Displays room code for sharing
- [Copy] button for easy sharing

### Players Panel

Shows for each connected player:
- Player name (host marked with ★)
- Assigned ship + loadout summary, or "(Spectator)" if unassigned
- Ping (-- for host/self)
- Ready status (✓ or ✗)

**Note:** The lobby shows *players*, not ships. Ships without players are not shown here (they appear in Squadron tab).

### Chat Log

The chat log displays:

**Player events:**
- Join/disconnect ("Jax joined", "Jax disconnected")
- Ready state changes ("Jax marked ready", "Jax marked unready")

**Ship/equipment changes:**
- Assignment ("Jax assigned to Striker", "Vega unassigned from Striker")
- Equipment ("Jax equipped Torpedo x4", "Jax unequipped Plasma Cannon")
- Resupply actions

**Store transactions:**
- Purchases ("Jax bought 2 Torpedoes for 200 cr")
- Sales ("Jax sold Plasma Cannon for 150 cr")
- Scrap conversions ("Jax converted 3 Fighter scrap into Fighter")

**Host actions:**
- Permission changes ("Commander set Jax to: edit own ship, buy")
- Contract accept ("Commander accepted contract: Convoy Ambush")
- Contract refresh ("Commander refreshed contracts")
- Sector advance ("Commander advanced to Sector 3")
- Player kick ("Commander kicked Jax")

**Mission flow:**
- Countdown ("10... 9... 8... 7... 6... 5... 4... 3... 2... 1... Launch!")
- Countdown abort ("Jax marked unready - launch aborted")

**Player messages:**
- Regular chat messages from any player

**Chat limits:**
- Max 200 characters per message
- Rate limited to 1 message per second per player

**Chat history lifecycle:**
- Lobby chat clears when mission starts
- Debrief chat is a new, separate chat
- Returning to lobby from debrief starts fresh lobby chat

### Host Popover

When host hovers over a guest's player row, a popover appears with:
- **Kick** button
- **Permission toggles** (see Permissions section)

---

## Permissions

### Ship Editing (One Toggle, Three Levels)

| Level | Can Do |
|-------|--------|
| None | View only |
| Own ship | Change own equipment, change own ship assignment, using storage |
| Any ship | Change anyone's equipment, change anyone's ship assignment, using storage |

### Store (Three Independent Toggles)

| Permission | Can Do |
|------------|--------|
| Buy | Purchase items from store |
| Sell | Sell items to store |
| Convert scrap | Convert ship scrap into ships |

### Resupply Behavior

- Without store permissions: resupply only from storage, only on ships player can edit
- With Buy permission: resupply from store (costs credits)

### Defaults

- **New players:** None (ship editing), no Buy, no Sell, no Convert scrap
- **Host:** Any ship, Buy, Sell, Convert scrap (not changeable)

### Permission Change Effects

- All permission changes logged in chat
- Changes take effect immediately

---

## Host-Only Actions

The following actions can only be performed by the host:

| Action | Location | Chat Message |
|--------|----------|--------------|
| Accept contract | Contracts tab | "Commander accepted contract: [name]" |
| Launch mission | Contracts tab | Triggers countdown |
| Refresh contracts | Contracts tab | "Commander refreshed contracts" |
| Advance sector | Contracts tab | "Commander advanced to Sector [N]" |
| Kick player | Lobby/Pause (popover) | "Commander kicked [player]" |
| Change permissions | Lobby (popover) | "Commander set [player] to: [permissions]" |

These buttons are visible to guests but disabled/greyed out.

---

## Player Pilots in Roster

### Creation

- Human players appear in Squadron roster as pilots
- Skill level shown as "Player" (like Commander)
- Created when player joins with their callsign

### Stats Tracking

Stats tracked by callsign across missions (persist in campaign save):
- Kills
- Assists
- Missions flown
- Missions won
- Damage dealt
- Damage received

If a player reconnects with the same callsign (even in a later session), stats resume.

### No XP/Injury Mechanics

- No XP tracking for human pilots
- Ship destruction: human pilot always ejects safely
- No injury mechanics
- No retirement mechanics
- Ready to fly next mission immediately (or spectate)

### Reconnection

- If player disconnects and reconnects with same callsign, stats resume
- New pilot entry created in roster
- Must be reassigned to a ship (or can spectate)

---

## Ship Assignment & Deployment

### Assignment Rules

- **Host must always pilot commander ship** - Cannot unassign; this constraint is not changeable
- New guests arrive **unassigned** (spectator)
- Guests can be assigned to ships or remain as spectators
- Ships can only be deployed if assigned to a player OR an AI pilot
- AI pilots behave identically to single player

### Who Can Assign

- Host (always)
- Any player with "Any ship" permission
- Self, if player has "Own ship" or "Any ship" permission

### Assignment Changes

- Assignment changes logged in chat
- Reassignment causes that player to become unready

### Spectators

- Players without a ship assignment are spectators
- Spectators can participate in chat and view all screens
- During missions, spectators use camera follow mode (see Spectator Mode)

---

## Ready Mechanics

### Ready Toggle

- Each player (including host) has ready/unready toggle on Lobby tab
- Visual indicator in players panel
- **Host must also toggle ready**

### Auto-Unready Triggers

- Any equipment change to that player's ship (by anyone)
- Ship reassignment
- Opening Esc menu (pre-mission)

### Launch Requirements

- **Launch blocked** until all players are ready
- **Accept** (contract) not blocked by ready state

---

## Contract Flow

1. Host navigates to Contracts, selects a contract
2. Host clicks **Accept** → contract info posted to chat (not blocked by ready)
3. Host clicks **Launch** → blocked if any player not ready
4. If all ready, **10 second countdown** begins
   - Chat messages: "10... 9... 8... 7... 6... 5... 4... 3... 2... 1... Launch!"
5. Any player becoming unready during countdown → **countdown aborted**, message in chat
6. Mission starts after countdown completes

---

## During Mission

### Controls

- Each player controls only their assigned ship
- HUD shows player names above friendly ships
- Targeting shows "[PlayerName]'s target" for coordination

### Spectator Mode

Players without ships (spectators or players whose ship was destroyed) use replay-like camera controls:
- **Tab through ships** - Same controls as replay mode to cycle through friendly ships
- **Camera modes** - Same camera modes as replay (chase, cockpit, free, etc.)
- **Real-time only** - Cannot seek forward or backward (unlike replay)
- **No gameplay impact** - Cannot control ships or affect simulation
- **Spectators run simulation** - They compute state for desync detection, just don't provide inputs
- **Followed ship destroyed** - Auto-switch to next friendly ship in tab order; if no ships remain, camera enters free cam mode centered on last position

### Pause (Multiplayer)

**Any player can pause** by pressing Escape during mission.

**Multiplayer pause screen:**
```
┌─────────────────────────────────────────────────────────────────┐
│  PAUSED                                          Paused by: Jax │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PLAYERS                          │  CHAT                       │
│  ┌─────────────────────────────┐  │  ┌─────────────────────────┐│
│  │ ★ Commander      Ready: ✓   │  │  │ Jax paused the game    ││
│  │ ● Jax            Ready: ✗   │  │  │ Commander: what's up?  ││
│  │ ● Vega           Ready: ✓   │  │  │ Jax: brb 1 min         ││
│  └─────────────────────────────┘  │  ├─────────────────────────┤│
│                                   │  │ [___________] [Send]    ││
│  [Ready] / [Unready]  [Settings]  │  └─────────────────────────┘│
│                                                                 │
│  Resuming in: (waiting for all ready)                           │
│  or: 5... 4... 3... 2... 1...                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Pause mechanics:**
- When paused, all players start as **unready**
- Each player must toggle ready to resume
- Once all ready, **5 second countdown** to unpause
- Any player unreadying during countdown aborts it
- [Settings] opens local settings (same as single player)

**Host actions on pause screen:**
- Host can hover over guest rows to see kick option
- Kicking opens skill selector (default: Regular)
- Kicked player's ship becomes AI-controlled for rest of mission

### Player Leaves Mid-Mission

If a guest wants to leave mid-mission:
1. Press Escape → pause screen
2. "Quit to Title"
3. Confirmation: "Your ship will be controlled by AI. Leave?"
4. On confirm: disconnect, ship becomes AI with Regular skill

---

## Disconnect Handling

### Host Disconnect

Host disconnect ends the session immediately (no grace period):
- **Mid-mission or lobby** - All guests detect via WebRTC connection close
- Guests see modal: "Host disconnected. Session ended."
- Guests return to title screen
- No recovery or reconnection attempt (host migration not supported)

### Guest Disconnect Between Missions

- Pilot removed from roster
- Equipment on their ship → storage
- Message in chat: "Jax disconnected"

### Guest Disconnect Mid-Mission

- Game pauses immediately
- Pause screen shows: "Jax disconnected"
- Disconnected player shown as "Disconnected" in player list
- Host options:
  - **Wait** - remain paused for reconnection
  - **Kick** - remove player, their ship becomes AI-controlled
    - Host selects AI skill level (dropdown, default: Regular)
    - Options: Rookie, Regular, Veteran, Ace, Elite
    - AI pilot persists for remainder of mission only
    - After mission, AI pilot removed, equipment → storage
- Other players can ready up; game resumes when all connected players ready

### During Countdown (Pre-Mission)

- Countdown aborted immediately
- Message: "Jax disconnected - launch aborted"

### Reconnection

- Player can rejoin with same callsign (if not kicked)
- Stats resume from campaign save
- Arrives unassigned (spectator)
- Must be assigned to a ship to pilot

### Kicked Players

- Kicked callsigns cannot rejoin the same session
- Attempting to join with kicked callsign shows: "Callsign has been kicked from this session"
- Player must use different callsign to rejoin (and will have fresh stats)

---

## Post-Mission

### Debrief Screen

Same debrief/results screen as single player, with additions:
- **Chat footer** at bottom of screen (persistent across debrief tabs)
- All players can view results
- Host clicks "Continue" to return everyone to Lobby

### Ironman Mode + Host Death

If host's ship (commander) is destroyed in ironman mode:
- Mission is a defeat
- Debrief screen shows as normal
- After debrief, campaign ends
- Host returns to title screen
- Guests receive: "Campaign has ended" and return to title

---

## Technical Notes

### Connection Model

- Signaling server generates room codes and relays WebRTC connection info
- Room codes: 8 characters, alphabet excludes ambiguous chars (0/O, 1/I/L)
- WebRTC DataChannel for P2P communication after signaling
- Fully connected mesh: each player has direct connections to all others
- STUN server for NAT traversal

### Ping Tracking

- Each player tracks RTT to every other player via Ping/Pong messages
- Ping values stored in local `PlayerConnection` state (not synchronized)
- Displayed in lobby player list and pause screen
- Updated every second
- **Display perspective:** Shows YOUR latency TO that player (asymmetric - A's ping to B may differ from B's ping to A)
- Self shows "--" (your own row)

### Disconnect Detection

- Each player monitors their WebRTC connections to all peers
- When connection lost, player sends `DisconnectReport` to host
- Host waits briefly (500ms) for corroborating reports from others
- Host broadcasts `PlayerLeft` to declare official disconnect
- All players treat disconnected player consistently regardless of individual connection states

### Signaling Server Requirements

- Generate unique room codes
- Track room membership and relay WebRTC signaling between players
- Store kicked callsigns per room (checked on join attempts)
- Relay SDP offers/answers and ICE candidates for mesh formation
- Track connection confirmations; reject guests who can't complete full mesh
- Rate limit: 1 join attempt per IP per second
- Room expiry: rooms removed after host disconnects

### Security

- Kicked callsigns: Host notifies signaling server via `CALLSIGN_KICKED`; server rejects future joins
- Rate limiting prevents room code brute force
- No authentication required (room code is the secret)
- Full mesh required: Guests who can't connect to all players are rejected

### State Sync

- Campaign state owned by host, broadcast to guests
- Guests receive state updates for UI display
- Mission inputs sync'd via rollback netcode
- All campaign mutations are host-authoritative
