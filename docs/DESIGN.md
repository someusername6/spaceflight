# Spaceflight - Design Document

## Vision

A space dogfighting roguelike combining the combat feel of Freespace 2 with the campaign structure of FTL/Battletech. The player leads a mercenary squadron through contracts, salvage, and permadeath progression.

## Core Experience

- **Mission duration:** 1-3 minutes each
- **Campaign duration:** 1.5-3 hours (45-90 missions)
- **Combat pacing:** Bursts of engagement separated by repositioning (heat-based)
- **Progression:** Meaningful upgrades mission-to-mission, no percentage modifiers

## What This Game IS

- A skill-based dogfighting game with roguelike progression
- Keyboard-controlled (no mouse aiming)
- Newtonian physics with drag (intuitive, not realistic)
- Single-player with future co-op multiplayer
- Web-based (runs in browser via three.js)

## What This Game Is NOT

- Not a space sim (no complex subsystems, fuel management, etc.)
- Not an MMO or persistent multiplayer
- Not procedurally generated ships (fixed archetypes)
- Not percentage-based upgrades ("10% faster")
- Not joystick/HOTAS required (keyboard only)

## Core Gameplay Loop

### Per Mission
1. Spawn with squadron (3-8 ships)
2. Complete mission objective (destroy, defend, scan, etc.)
3. Manage heat to pace engagement
4. Win or lose (lose = campaign over in single-player)

### Per Contract
1. Select contract from available options
2. Set salvage/credit ratio
3. Fly mission
4. Collect rewards and salvage
5. Return to hangar

### Campaign Loop
1. Start with 3 ships, basic loadout
2. Complete contracts, earn credits and salvage
3. Buy/sell equipment, hire pilots
4. Progress through sectors
5. Face increasing difficulty
6. Reach campaign end or die trying

## Combat Design

### Heat System
Primary balancing mechanic ensuring combat has rhythm:
- Firing weapons generates heat
- Afterburner generates heat
- Too much heat = can't fire or boost
- Heat cools over time
- Forces players to disengage, reposition, re-engage

### Shield System
Secondary pacing mechanic:
- Shields regenerate when not taking damage
- Taking damage pauses regeneration
- Encourages breaking contact to recover

### AI Constraints (Intentional)
To make human play viable:
- Max 3 enemies can target same human player
- AI aim error increases with target speed
- Allied AI prioritizes protecting human players
- Non-optimal missile/decoy policies

## Squadron

- 3-8 ships in squadron
- Player flies lead ship
- AI controls wingmen
- Future: other humans can take wingman slots (co-op)
- Permadeath: player death = campaign end
- Multiplayer: all humans dead = campaign end

## Game Modes

### Standard Mode (Default)
- **Checkpoints**: Auto-save before each mission
- **Recovery**: Failed missions can be retried from checkpoint
- **Aim assist adjustable**: Can change in settings during campaign
- **Target audience**: New players, casual play, learning the game

### Ironman Mode
- **No checkpoints**: Progress saved only at mission completion
- **True permadeath**: Commander death = immediate campaign end
- **No recovery**: Failed missions cannot be retried
- **Aim assist locked**: Cannot change aim assist during campaign
- **Target audience**: Experienced players, roguelike tension

## Progression

| Campaign % | Expected State |
|------------|----------------|
| 0% | 3 ships, basic loadout |
| 25% | 4-5 ships, upgraded weapons |
| 50% | 5-6 ships, mixed loadouts |
| 75% | 6-7 ships, facing elites |
| 100% | 7-8 ships, final challenge |

## Mission Types

Four mission types are implemented, each with distinct objectives and failure conditions:

### 1. Elimination (Default)
- **Objective:** Destroy all hostiles across multiple waves
- **Victory:** All enemies destroyed
- **Defeat:** Commander dies
- **Reward:** Fixed (100% on victory)
- **Data:** `waves: ContractWave[]` defines enemy spawns with optional delays

### 2. Escort
- **Objective:** Escort at least one convoy ship to the escape zone
- **Victory:** ≥1 convoy ship escapes
- **Defeat:** All convoy destroyed OR commander dies
- **Reward:** Scales with convoy survival (% survived = % reward)
- **Data:** `escortData: EscortMissionData` with convoy size, enemy spawn pool, distances

### 3. Station Defense
- **Objective:** Defend station until reinforcements arrive
- **Victory:** Station survives until reinforcements or all enemies defeated
- **Defeat:** Station destroyed OR commander dies
- **Reward:** Scales with station hull % remaining
- **Data:** `stationDefenseData: StationDefenseMissionData` with station type, waves, reinforcement triggers

### 4. Ambush
- **Objective:** Stop or destroy all enemy convoy ships before they escape
- **Victory:** All convoy neutralized (stopped or destroyed)
- **Defeat:** Any convoy escapes OR commander dies
- **Reward:** 100% per stopped ship, 50% per destroyed ship
- **Data:** `ambushData: AmbushMissionData` with convoy size, escort composition, distances

## Visual Style

- Simple, geometric
- Placeholder geometry (colored shapes)
- Nebula skyboxes
- Dust particles for movement sensation
- Clear, readable HUD
