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

## State Transition Cooldowns

To prevent rapid state oscillation:

| Transition | Cooldown |
|------------|----------|
| EVADE → PURSUE | 5s |
| REGROUP → PURSUE | 8s |
| Any → EVADE | 2s (can't spam evade) |

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

| Profile | Base Error | Angular Factor | Effect |
|---------|------------|----------------|--------|
| Rookie | 0.12 rad (~7°) | 0.8 | Very affected by movement |
| Regular | 0.05 rad (~3°) | 0.5 | Moderate tracking ability |
| Veteran | 0.03 rad (~2°) | 0.3 | Good at tracking |
| Ace | 0.015 rad (~1°) | 0.15 | Excellent tracker |

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

## Missile Policy

AI fires missiles when:
1. Has lock on target
2. Target within 80% of missile range
3. Cooldown expired (varies by missile type)
4. Not currently evading

| Missile Type | Cooldown |
|--------------|----------|
| Rocket | 2s |
| Seeker | 4s |
| Dart | 3s |
| Swarm | 8s |
| Torpedo | 10s |
| Nuke | 30s |

## Decoy Policy

AI deploys decoys when:
1. Missile incoming within 500m
2. Has decoys available
3. Decoy cooldown expired (5s)

## Afterburner Policy

AI uses afterburner when:
1. In PURSUE state
2. Target beyond 1000m
3. Heat below 60%
4. Cooldown expired (3s between uses)

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
