# Mission Design Guide

This guide covers how to design and balance missions in Spaceflight.

## Mission Types Overview

| Type | Files | AI Behavior |
|------|-------|-------------|
| Elimination | `easy.ts`, `medium.ts`, `hard.ts` | Standard (attack player/wingmen) |
| Escort | `escort.ts` | `convoy-hunter` (prioritize convoy) |
| Station Defense | `station-defense.ts` | `station-hunter` (prioritize station) |
| Ambush | `ambush.ts` | Escort roles: `aggressive` or `defensive` |

## File Structure

Missions are defined in `src/ui/screens/missions/sector{1-5}/`:

```
sector1/
  index.ts          # Exports all missions for the sector
  easy.ts           # Elimination missions (easy difficulty)
  medium.ts         # Elimination missions (medium difficulty)
  hard.ts           # Elimination missions (hard difficulty)
  escort.ts         # Escort missions (all difficulties)
  station-defense.ts # Station defense missions (all difficulties)
  ambush.ts         # Ambush missions (all difficulties)
```

## Balance Targets

All mission types should achieve these rates per difficulty:

| Difficulty | Win Rate | Wingman Survival (on wins) |
|------------|----------|----------------------------|
| Easy | 80-90% | 3.0-3.5 of 4 |
| Medium | 70-80% | 2.5-3.0 of 4 |
| Hard | 60-70% | 2.0-2.5 of 4 |

Run balance tests with: `npx tsx scripts/tests/campaign/test-*-balance.mjs`

---

## Elimination Missions

Wave-based combat where all enemies must be destroyed.

### Contract Structure

```typescript
{
  id: 's1-mission-name',       // Unique ID: s{sector}-{slug}
  name: 'Mission Name',
  description: 'Flavor text describing the mission.',
  difficulty: 'easy',          // 'easy' | 'medium' | 'hard'
  sector: 1,
  // missionType defaults to 'elimination' when omitted
  waves: [
    {
      enemies: [
        { archetype: 'scout', skill: 'regular', count: 3 },
        { archetype: 'interceptor', skill: 'regular', count: 2 },
      ],
      delay: 0,                // Optional: seconds before wave spawns
    },
    {
      enemies: [
        { archetype: 'striker', skill: 'veteran', count: 2 },
      ],
      delay: [3, 5],           // Random delay between 3-5 seconds
    },
  ],
  reward: 500,
}
```

### Tuning Parameters

- **Enemy count**: Total enemies across all waves
- **Enemy types**: Archetypes from `src/data/ships.ts`
- **Skill levels**: `regular`, `veteran`, `ace` (from `src/data/ai-profiles.ts`)
- **Wave delays**: Breathing room between waves (0 = immediate)

### Enemy Archetypes by Sector

| Sector | Common Enemies |
|--------|----------------|
| 1 | scout, interceptor, drone |
| 2 | scout, interceptor, striker, hornet |
| 3 | striker, defender, mantis, wasp |
| 4 | phantom, scorpion, wraith, titan |
| 5 | phantom, scorpion, wraith, dragonfly, firefly, titan |

---

## Escort Missions

Protect convoy ships as they travel to an escape zone.

### Contract Structure

```typescript
{
  id: 's1-escort-name',
  name: 'Escort Mission',
  description: 'Protect the convoy to safety.',
  difficulty: 'easy',
  sector: 1,
  missionType: 'escort',
  escortData: {
    // Convoy configuration
    convoySize: 3,                    // Number of convoy ships
    convoyType: 'freighter',          // 'freighter' (tough) or 'transport' (fast)

    // Geography
    escapeZoneDistance: 6000,         // Distance to escape zone (meters)
    escapeZoneRadius: 300,            // Trigger radius
    jumpChargeTime: 10,               // Seconds to charge jump drive in zone

    // Enemy spawning
    spawnInterval: 8,                 // Seconds between spawn waves
    initialSpawnCount: 2,             // Enemies on first spawn
    spawnBatchSize: 1,                // Enemies per subsequent spawn
    maxConcurrentEnemies: 6,          // Performance cap
    enemyPool: [
      { archetype: 'scout', skill: 'regular', count: 1 },
      { archetype: 'interceptor', skill: 'regular', count: 1 },
    ],

    // Threat distribution (optional)
    playerThreatRatio: 0.15,          // 0-1: % of enemies that target player instead of convoy
  },
  reward: 800,
}
```

### Tuning Parameters

- **convoySize**: More ships = easier (only need 1 to survive)
- **convoyType**: `freighter` has more hull, `transport` moves faster
- **escapeZoneDistance**: Longer = more time for enemies to spawn
- **spawnInterval**: Faster spawns = harder
- **maxConcurrentEnemies**: Caps total threat at any moment
- **playerThreatRatio**: Higher = more enemies attack player (wingmen die more)

### Victory/Defeat

- **Victory**: At least 1 convoy ship reaches escape zone and jumps
- **Defeat**: All convoy destroyed OR commander dies
- **Reward**: `baseReward * (convoySurvived / convoyTotal)`

---

## Station Defense Missions

Defend a station until reinforcements arrive.

### Contract Structure

```typescript
{
  id: 's1-station-defense-name',
  name: 'Station Defense',
  description: 'Hold the line until reinforcements arrive.',
  difficulty: 'medium',
  sector: 1,
  missionType: 'station-defense',
  stationDefenseData: {
    // Station configuration
    stationType: 'mining',            // 'mining' | 'refinery' | 'military'
    stationHealth: 3000,              // Override default hull (optional)
    stationShields: 1000,             // Override default shields (optional)
    stationDistance: -800,            // Z position (negative = behind player)

    // Enemy waves
    waves: [
      {
        enemies: [
          { archetype: 'scout', skill: 'regular', count: 4 },
        ],
        delay: 5,
      },
      {
        enemies: [
          { archetype: 'striker', skill: 'veteran', count: 3 },
        ],
        delay: 20,
      },
    ],

    // Reinforcement triggers (whichever happens first)
    reinforcementTime: 120,           // Seconds until reinforcements (null = health-only)
    reinforcementHealthThreshold: 0.3, // Trigger at 30% station health

    // Reinforcements
    reinforcementCount: 4,
    reinforcementPool: [
      { archetype: 'defender', skill: 'veteran', count: 2 },
      { archetype: 'striker', skill: 'veteran', count: 2 },
    ],

    // Initial allies (for military stations)
    initialAllies: [
      { archetype: 'defender', skill: 'regular', count: 2 },
    ],

    // Threat distribution (optional)
    playerThreatRatio: 0.25,          // 0-1: % of enemies that target player instead of station
  },
  reward: 1200,
}
```

### Station Types

| Type | Hull | Shields | Notes |
|------|------|---------|-------|
| `mining` | 2000 | 500 | Balanced default |
| `refinery` | 4000 | 1000 | High durability |
| `military` | 2500 | 1500 | High shields, starts with allies |

### Tuning Parameters

- **stationType**: Affects base stats and display name
- **waves**: Enemy attack waves (use delays to pace the fight)
- **reinforcementTime**: Time limit before rescue arrives
- **reinforcementHealthThreshold**: Emergency trigger if station is low
- **playerThreatRatio**: Higher = more enemies attack player (wingmen die more)

### Victory/Defeat

- **Victory**: Station survives until reinforcements OR all enemies defeated
- **Defeat**: Station destroyed OR commander dies
- **Reward**: `baseReward * (stationHealthPercent / 100)`

---

## Ambush Missions

Attack an enemy convoy before it escapes.

### Contract Structure

```typescript
{
  id: 's1-ambush-name',
  name: 'Convoy Raid',
  description: 'Intercept the enemy convoy before it escapes.',
  difficulty: 'hard',
  sector: 1,
  missionType: 'ambush',
  ambushData: {
    // Convoy configuration
    convoySize: 2,                    // Number of convoy ships
    convoyType: 'transport',          // 'freighter' or 'transport'

    // Geography (convoy travels from +Z to -Z)
    convoyStartDistance: 500,         // Where convoy starts (+Z behind player)
    escapeZoneDistance: 3500,         // Where convoy escapes (-Z)
    escapeZoneRadius: 300,            // Trigger radius
    convoyStopDistance: 500,          // Distance to stop convoy (no escorts + player nearby)

    // Escort configuration
    escorts: [
      {
        archetype: 'defender',
        skill: 'veteran',
        count: 3,
        role: 'defensive',            // Stays near convoy, reacts to threats
      },
      {
        archetype: 'interceptor',
        skill: 'veteran',
        count: 2,
        role: 'aggressive',           // Proactively engages player
      },
    ],
  },
  reward: 1500,
}
```

### Escort Roles

| Role | Behavior |
|------|----------|
| `defensive` | Stays near convoy, only engages when threatened |
| `aggressive` | Proactively attacks player within ~600m |

### Tuning Parameters

- **convoySize**: More ships = harder (all must be neutralized)
- **escapeZoneDistance**: Longer distance = more time to intercept
- **convoyStopDistance**: How close player must be to "stop" a convoy ship
- **escorts**: Total firepower protecting the convoy

### Victory/Defeat

- **Victory**: All convoy ships neutralized (stopped or destroyed)
- **Defeat**: Any convoy escapes OR commander dies
- **Reward**: `baseReward * ((stoppedCount + destroyedCount * 0.5) / totalConvoy)`

### Stopping vs Destroying

- **Stopped**: No escorts within `convoyStopDistance` AND player within `convoyStopDistance`
- **Destroyed**: Convoy ship hull reaches 0

Stopped ships pay 100% credit (cargo captured), destroyed pay 50% (cargo lost).

---

## Reward Guidelines by Sector

| Sector | Easy | Medium | Hard |
|--------|------|--------|------|
| 1 | 400-600 | 700-1000 | 1200-1600 |
| 2 | 800-1200 | 1400-2000 | 2400-3200 |
| 3 | 1600-2400 | 2800-4000 | 4800-6400 |
| 4 | 3200-4800 | 5600-8000 | 9600-12000 |
| 5 | 4000-6000 | 7000-10000 | 12000-15000 |

## playerThreatRatio Tuning

The `playerThreatRatio` parameter (0-1) controls what percentage of enemies target the player/wingmen instead of the objective:

| Value | Effect |
|-------|--------|
| 0.0 | All enemies attack objective (convoy/station) |
| 0.15 | Light pressure on player - Easy difficulty |
| 0.25 | Moderate threat to player - Medium difficulty |
| 0.35 | Significant danger to player - Hard difficulty |
| 1.0 | All enemies attack player (objective largely ignored) |

Increase ratio to make wingmen die more often (matching elimination mission survival rates).

---

## Creating a New Mission Type

See `CLAUDE.md` for the full checklist of files to modify. Key steps:

1. Define types in `src/campaign/types.ts`
2. Create launcher in `src/campaign/mission/{type}-launcher.ts`
3. Add contract rendering in `src/ui/screens/contracts-rendering.ts`
4. Add results display in `src/ui/screens/results/results.ts`
5. Create mission files in each sector
6. Update replay system if needed

---

## Testing Missions

### Quick Playtest

1. Start a campaign, advance to the relevant sector
2. Find your mission in the contracts list
3. Play through to verify victory/defeat conditions work

### Balance Testing

```bash
# Test specific mission balance
npx tsx scripts/tests/campaign/test-escort-balance.mjs
npx tsx scripts/tests/campaign/test-station-defense-balance.mjs
npx tsx scripts/tests/campaign/test-ambush-balance.mjs

# Run all balance tests
npx tsx scripts/tests/run-tests.mjs --balance
```

Balance tests run simulations and report win rates and survival statistics.
