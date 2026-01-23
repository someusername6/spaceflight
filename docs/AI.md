# AI System

## Overview

AI ships use a Finite State Machine (FSM) with intentional imperfections to make human play viable. The AI is not meant to be optimal—it's meant to be fun to fight.

## States

### IDLE

No current objective. Waiting for target assignment.

**Behavior:** Fly straight, minimal maneuvering

**Transitions:**
- → PURSUE: Assigned a target
- → PROTECT: Assigned to protect

### PURSUE

Closing distance to target.

**Behavior:**
- Fly toward target
- Fire weapons when in range
- Use afterburner if target is far

**Transitions:**
- → ENGAGE: Within engagement range (500m)
- → EVADE: Being targeted by 2+ enemies, or missile incoming
- → REGROUP: Low shields (<20%)

### ENGAGE

Optimal combat range, actively fighting.

**Behavior:**
- Maintain distance to target (400-600m)
- Circle-strafe while firing
- Fire missiles when locked

**Transitions:**
- → PURSUE: Target moves beyond 800m
- → EVADE: Being targeted by 2+ enemies, or missile incoming, or low shields
- → REGROUP: Very low shields (<10%) or overheated

### EVADE

Breaking contact, defensive flying.

**Behavior:**
- Turn away from threats
- Deploy decoys if available
- Erratic movement (barrel rolls, direction changes)
- Do not fire (focus on survival)

**Transitions:**
- → PURSUE: No longer threatened (5s cooldown)
- → REGROUP: If shields regenerating

### PROTECT

Guarding an assigned target (ally or objective).

**Behavior:**
- Position between protectee and nearest threat
- Engage enemies targeting protectee
- Prioritize protectee's safety over kills

**Transitions:**
- → ENGAGE: Threat to protectee in range
- → EVADE: Self under heavy fire

### REGROUP

Disengaging to recover.

**Behavior:**
- Fly away from combat
- Large looping maneuver
- Let shields regenerate
- Cool down heat

**Transitions:**
- → PURSUE: Shields > 50% and heat < 50%

### REPOSITION (Burst-Disengage)

Kiting behavior for long-range ships. Only active when `preferredCombatRange > 780m` (130% of default 600m).

**Behavior:**
- Flee from target to regain distance
- Use afterburner if available
- Do not fire (focus on creating distance)

**Transitions:**
- → ENGAGE: Reposition complete (distance regained or timeout)

**Burst-Disengage Pattern:**
1. Ship engages for burst duration (2s default)
2. Transitions to REPOSITION
3. Flies away until distance > preferredCombatRange or max time reached
4. Cooldown before next burst-disengage can trigger

**Best suited for:**
- Sustained damage weapons (beams) that benefit from range
- Tanky chassis that survive long enough to reposition
- Example: Lancer (sentinel chassis + blue lasers)

**Not suited for:**
- Alpha strike weapons (railguns) - fights end too fast
- Glass cannon chassis - dies during reposition
- Close-range weapons - negates their advantage

## Distance-Flee Behavior

Alternative kiting behavior for alpha-strike ships. Configured via `fleeDistance` in ship archetypes.

**Core mechanic:**
- **Flee trigger**: Enemy within `fleeDistance` → enter EVADE
- **Return trigger**: Distance > `preferredCombatRange * 0.95` → return to ENGAGE

**Key difference from burst-disengage:**
- Burst-disengage: Time-based (engage 2s, then flee)
- Distance-flee: Distance-based (flee when too close, engage when far enough)

**Behavior:**
1. Ship enters EVADE when enemy closes within fleeDistance
2. Does NOT exit EVADE via normal cooldown (only via distance check)
3. Returns to ENGAGE when at preferred range
4. Creates a kiting loop: engage from range → flee when closed on → repeat

**Best suited for:**
- Alpha strike weapons (railguns) - maximizes time at optimal range
- Ships that need distance to be effective
- Example: Sniper (interceptor chassis + railguns, fleeDistance: 600m, preferredCombatRange: 1200m)

**Configuration (in ship-archetypes.ts):**
```typescript
sniper: createArchetype('interceptor', {
  primaryWeapons: [{ name: 'railgun', size: 2 }, ...],
  preferredCombatRange: 1200,  // Optimal engagement range
  fleeDistance: 600,           // Flee when enemy this close
}),
```

## State Transition Cooldowns

Cooldowns vary by AI profile (skilled pilots recover faster):

| Transition | Green | Rookie | Regular | Veteran | Ace/Elite |
|------------|-------|--------|---------|---------|-----------|
| EVADE → PURSUE | 2s | 3s | 5s | 6s | 7s |
| REGROUP → PURSUE | 1.5s | 2s | 3s | 3.5s | 4s |

Transitions also require recovery thresholds (shields/heat) to be met.

## Aim Error System

**Core concept:** AI doesn't miss randomly—it aims at the wrong spot consistently, then adjusts. Moving perpendicular to the enemy's line of fire makes you much harder to hit.

### Error Components

The AI aim error has three components:

1. **Base Error** - Constant angular offset from AI profile (radians)
2. **Drift** - Aim wanders slowly over time, changing direction every 0.5-2s
3. **Angular Velocity Error** - Additional error based on target's perpendicular movement

### Angular Velocity Formula

```
effectiveError = baseError + (angularFactor × angularVelocity)
angularVelocity = perpendicularSpeed / distance
```

Where:
- `perpendicularSpeed`: Target velocity component perpendicular to shooter's line of sight
- `distance`: Distance from shooter to target
- `angularFactor`: AI profile sensitivity (higher = more affected by movement)

### Why Perpendicular Movement Matters

A target at 500m moving at 100 m/s:
- **Moving directly toward/away**: Angular velocity ≈ 0 rad/s (easy to track)
- **Moving perpendicular**: Angular velocity = 100/500 = 0.2 rad/s (hard to track)
- **Moving diagonally**: Somewhere in between

This means evading ships should fly **perpendicular** to their attacker, not directly away!

### AI Profile Parameters

| Profile | Base Error | Angular Factor | Beam Tracking | Effect |
|---------|------------|----------------|---------------|--------|
| Green | 0.14 rad (~8°) | 0.9 | 0.5 rad/s | Worst accuracy, easily disrupted |
| Rookie | 0.095 rad (~5.5°) | 0.68 | 0.8 rad/s | Poor accuracy, very affected by movement |
| Regular | 0.05 rad (~3°) | 0.5 | 1.5 rad/s | Moderate tracking ability |
| Veteran | 0.032 rad (~2°) | 0.3 | 2.5 rad/s | Good at tracking |
| Ace | 0.008 rad (~0.5°) | 0.06 | 4.0 rad/s | Near-perfect tracking |
| Elite | 0.004 rad (~0.2°) | 0.03 | 4.0 rad/s | Superhuman accuracy |

### Example: Evading a Regular AI

Target at 400m, afterburning perpendicular at 450 m/s:
- Angular velocity = 450 / 400 = 1.125 rad/s
- Angular contribution = 0.5 × 1.125 = 0.5625 rad (capped at 0.3)
- Effective error = 0.05 + 0.3 = 0.35 rad (~20°)

This makes hitting a fast, perpendicular target very difficult!

### Implementation Files

- `src/components/aim-error.ts` - AimError component and update functions
- `src/systems/aim-error.ts` - System that calculates angular velocity each frame
- `src/data/ai-profiles.ts` - Profile definitions with aim error parameters

## AI Module Structure

The AI system is split across several files for maintainability (400 line limit):

```
src/systems/ai/
├── ai.ts                   - Main state machine and aiSystem()
├── ai-idle.ts              - IDLE state and target selection by behavior mode
├── ai-behaviors.ts         - State update functions (evade, regroup)
├── ai-movement.ts          - Shared movement utilities (turnToward, accelerateTo)
├── ai-pursuit.ts           - Target pursuit logic (pursueTarget, maintainDistanceEngage)
├── ai-reposition.ts        - Burst-disengage behavior
├── ai-utils.ts             - Entity queries (findNearestEnemy, setAITarget, etc.)
├── ai-weapon-selection.ts  - Weapon choice logic
├── ai-weapon-categories.ts - Range classification
├── ai-weapon-helpers.ts    - Weapon utility functions
├── ai-missile-selection.ts - Missile targeting
├── ai-convoy-utils.ts      - Convoy-related utilities (escort missions)
├── ai-ambush-utils.ts      - Ambush mission utilities (convoy interception)
└── ai-dps-utils.ts         - DPS calculation for attack-station role assignment
```

**Shared utilities in ai-movement.ts:**
- `turnToward()` - Rotate ship toward direction
- `accelerateTo()` / `decelerateToZero()` - Speed control
- `calculateEscapeDirection()` - Evade/reposition escape vector
- `isKitingShip()` - Check if ship uses distance-flee behavior
- Constants: `FLEE_RETURN_THRESHOLD`, `REPOSITION_DISTANCE_THRESHOLD`, etc.

### Evade Behavior Integration

The evade state (`AIState.Evade`) now prioritizes perpendicular escape:
- 70% perpendicular movement (maximizes angular velocity, harder to hit)
- 30% away from target (still gaining distance)
- Creates a spiral escape pattern that's both evasive and effective

## Target Selection

### Enemy AI

Priority order:
1. Current target (sticky)
2. Nearest enemy attacking an ally
3. Nearest enemy
4. Any enemy

### Allied AI (Wingmen)

Priority order:
1. Enemy attacking player (HIGHEST)
2. Enemy attacking low-health ally
3. Current target
4. Nearest enemy

### Human Targeting Cap

**Rule:** Maximum 3 enemy AI can target the same human player simultaneously.

Implementation:
- Track `playersTargetedBy` count
- When selecting target, skip human if count >= 3
- When AI changes target, update counts

## Behavior Modes

AI ships can be assigned different behavior modes that change target selection and engagement patterns. Set via `ai.behaviorMode`.

### Standard Modes

| Mode | Usage | Target Priority |
|------|-------|-----------------|
| `standard` | Default for most ships | Wingmen protect player; enemies attack nearest |
| `defensive` | Escort wingmen | Stay near convoy, protect from threats |

### Escort Mission Modes

| Mode | Usage | Target Priority |
|------|-------|-----------------|
| `convoy-hunter` | Enemies in escort missions | Prioritize convoy ships, then player squadron |

### Station Defense Mission Modes

| Mode | Usage | Target Priority |
|------|-------|-----------------|
| `station-hunter` | Enemies attacking station | Prioritize station, then player squadron |
| `station-defense` | Wingmen defending station | Stay near station, protect from threats |

### Ambush Mission Modes

| Mode | Usage | Target Priority |
|------|-------|-----------------|
| `convoy-guard-aggressive` | Enemy escorts (proactive) | Attack player/wingmen within 600m |
| `convoy-guard-defensive` | Enemy escorts (reactive) | Only engage when self or convoy is attacked |
| `convoy-interceptor` | Player wingmen | Attack escorts first, then approach convoy to stop it |

### Attack Station Mission Modes

| Mode | Usage | Target Priority |
|------|-------|-----------------|
| `station-assault-high-dps` | Allied bombers/heavy ships | Attack enemy station |
| `station-assault-low-dps` | Allied fighters/escorts | Attack enemy defenders |
| `station-defender` | Enemy defenders | Prioritize ships attacking the station |

**DPS-based role assignment:** Attack station missions use `stationAttackDpsThreshold` (typically ~100) to assign roles. Ships with DPS ≥ threshold get `station-assault-high-dps`, others get `station-assault-low-dps`.

## Missile Policy

AI uses the same lock mechanics as the player:
- Lock progress is shared across all secondary weapons
- Lock is based on current target (not weapon selection)
- Lock-requiring missiles can only fire when `lockProgress >= 1`
- Dumbfire missiles (rockets) can fire immediately

AI fires missiles when:
1. Target within missile range
2. Has ammo remaining
3. Lock requirements met (if applicable)
4. Safe distance for AoE missiles (nukes won't fire if target is too close)

AI iterates through weapons in order (like player cycling) and fires the first missile that can fire.

## Decoy Policy

AI deploys decoys when:
1. Missile incoming within 500m
2. Has decoys available
3. Decoy cooldown expired (varies by profile: Ace 0.5s, Regular 2s, Rookie 3.5s)

## Afterburner Policy

AI uses afterburner when:
1. In EVADE state (emergency escape)
2. In REPOSITION state (burst-disengage pattern)
3. Afterburner not heat-locked

Note: AI does NOT use afterburner during normal pursuit or engagement to conserve heat for combat.

## Tuning Philosophy

The following are the primary balance levers:

1. **Aim error** - Main difficulty knob
2. **Max enemies on human** - Prevents ganking
3. **State transition timing** - Aggression level
4. **Missile/decoy cooldowns** - Resource pressure

The following are NOT balance levers:
- Ship stats (hull, shields, speed)
- Weapon damage
- These should remain consistent for both player and AI
