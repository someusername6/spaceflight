# Campaign & Progression Review

**Last updated:** February 2026

## Overview

The campaign system provides a roguelike progression through 5 sectors of increasing difficulty. Players manage a squadron, take contracts, and balance risk/reward with permadeath mechanics.

## Campaign Structure

### Sectors

| Sector | Name | Enemy Skill | Deployment Limit | Advance Cost |
|--------|------|-------------|------------------|--------------|
| 1 | Frontier | Green-Rookie | 4 ships | - |
| 2 | Contested | Rookie-Regular | 4 ships | 1,000 cr |
| 3 | Warzone | Regular-Veteran | 5 ships | 2,000 cr |
| 4 | Core | Veteran-Ace | 5 ships | 3,000 cr |
| 5 | Endless | Veteran-Ace | 6 ships | 4,000 cr |

Sector 5 is repeatable endless mode with maximum difficulty.

### Mission Types

| Type | Victory | Defeat | Reward Scaling |
|------|---------|--------|----------------|
| **Elimination** | All enemies destroyed | Commander dies | Fixed 100% |
| **Escort** | ≥1 convoy escapes | All convoy destroyed | % convoy survived |
| **Station Defense** | Station survives | Station destroyed | % station hull |
| **Ambush** | All convoy neutralized | Any convoy escapes | 100% stopped, 50% destroyed |
| **Attack Station** | Station destroyed | Commander dies | Fixed 100% |

### Contract System

- **Pool Size:** 6 contracts per sector
- **Difficulty Mix:** 3 easy, 2 medium, 1 hard typical
- **Refresh:** Complete contracts removed, new ones added
- **Replay Mode:** Previously completed contracts available at 50% reward

## Economy

### Starting State

| Resource | Amount |
|----------|--------|
| Credits | 1,000 |
| Ships | 4 fighters |
| Pilots | 1 commander (player-controlled) + 3 regular wingmen |

### Income Sources

| Source | Expected Value |
|--------|----------------|
| Easy mission | 1,000-2,000 cr |
| Medium mission | 2,250-3,500 cr |
| Hard mission | 4,000-6,500 cr |
| Salvage | ~5% of enemy value |
| Scrap conversion | Variable |

### Expense Categories

| Category | Examples |
|----------|----------|
| Ships | 200-900 cr per chassis |
| Weapons | 80-500 cr per primary |
| Missiles | 5-100 cr per missile |
| Ammo | 0.1-50 cr per round |
| Pilots | 75-1,200 cr per hire |
| Sector advance | 1,000-4,000 cr |

### Salvage System

Per destroyed enemy:
- **Multiplier:** Random 0-10% per ship
- **Scrap:** 0-10 pieces (floor of 100 × multiplier)
- **Weapons:** Each primary has (multiplier) chance to drop
- **Ammo/Missiles:** (multiplier) % of remaining recovered

### Store System

- **Inventory:** Finite per sector, restocks after missions
- **Unlocks:** New items unlock as sectors progress
- **Storage:** Purchased items go to storage, then equip to ships
- **Selling:** All items can be sold at 50% value

## Pilot System

### Skill Levels

| Level | Hire Cost | Spawn Weight | Characteristics |
|-------|-----------|--------------|-----------------|
| Rookie | 75 cr | 35% | Conservative, high aim error |
| Regular | 200 cr | 35% | Balanced baseline |
| Veteran | 400 cr | 20% | Aggressive, accurate |
| Ace | 700 cr | 10% | Near-perfect accuracy |
| Elite | 1,200 cr | Rare | Boss-tier skill |

### Pilot Stats (Tracked)

- Kills and assists
- Missions flown/won
- Damage dealt/received
- Combat rating

### Recruitment

- Initial pool: 4 recruits
- Per mission: 3-5 new recruits
- Skill distribution scales with sector
- Commander cannot be replaced (permadeath trigger)

## Permadeath

### Ironman Mode

- Optional setting locked at campaign creation
- No save scumming possible
- Creates meaningful tension

### Death Conditions

- **Commander Death:** Campaign ends immediately
- **Wingman Death:** Pilot removed, ship lost, salvage possible
- **Mission Failure:** Return to hangar, wingmen may be lost

### Recovery Options

- **Non-Ironman:** Can restart mission
- **Emergency Save:** Recovers from browser crashes
- **Export/Import:** Manual backup possible

## Squadron Management

### Ship Assignment

- Pilots assigned to ships (1:1)
- Ships have weapon slots (size-restricted)
- Loadout persists between missions

### Deployment Selection

- Choose which ships to deploy (up to limit)
- Remaining ships stay in hangar
- Commander must always deploy

## Multiplayer

The campaign supports cooperative multiplayer where guests join the host's campaign:

### Architecture

- **Rollback Netcode:** Deterministic simulation with rollback/resimulation for lag compensation
- **WebRTC Mesh:** Peer-to-peer connections via signaling server
- **Room Codes:** 8-character codes for easy game joining

### Features

| Feature | Implementation |
|---------|----------------|
| Lobby | Host creates room, guests join via code |
| Ship Assignment | Host assigns guest pilots to squadron ships |
| Chat | In-lobby and post-mission chat |
| Spectator Mode | Watch missions without controlling a ship |
| Pause Coordination | Synchronized pause across all players |
| Reconnection | Automatic reconnect on disconnect |

### Key Files

| File | Purpose |
|------|---------|
| `src/multiplayer/` | Full multiplayer module (60+ files) |
| `src/multiplayer/networking/` | WebRTC mesh, signaling |
| `src/multiplayer/protocol/` | Message encoding/decoding |
| `src/campaign/handlers/lobby-*.ts` | Lobby screen handlers |

## Key Files

| File | Purpose |
|------|---------|
| `src/campaign/campaign-state.ts` | Main state interface |
| `src/campaign/controller.ts` | Campaign flow orchestration |
| `src/campaign/sector.ts` | Sector constants |
| `src/campaign/pilot.ts` | Pilot types and skills |
| `src/campaign/handlers/` | Screen transition handlers |
| `src/campaign/mission/` | Mission launchers |
| `src/data/prices.ts` | All economy values |

## Strengths

1. **Clear Progression:** Sectors provide milestone goals
2. **Mission Variety:** 5 types with distinct mechanics
3. **Meaningful Choices:** Squad composition matters
4. **Risk/Reward:** Difficulty selection creates tension
5. **Economic Depth:** Multiple resource management decisions
6. **Permadeath Stakes:** Commander death has weight

## Areas for Improvement

1. **Mid-Game Pacing:** Sectors 2-3 can feel similar
2. **Pilot Identity:** No personality or backstory for pilots
3. **Single Currency:** Credits are the only resource type
4. **Linear Missions:** No side objectives or branching
5. **Replay Penalty:** 50% reward makes grinding tedious
6. **Wingman AI:** Limited control over wingman behavior

## Balance Observations

| Observation | Impact |
|-------------|--------|
| **Easy missions dominant** | Optimal play is always easy mode |
| **Hard missions punishing** | Negative expected value for average players |
| **Ship loss costly** | Single loss can wipe mission profit |
| **Ace pilots expensive** | 700 cr rarely worth over 2× regular |
| **Sector advance timing** | Players often advance too early |
