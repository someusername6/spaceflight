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

## State Transition Cooldowns

To prevent rapid state oscillation:

| Transition | Cooldown |
|------------|----------|
| EVADE → PURSUE | 5s |
| REGROUP → PURSUE | 8s |
| Any → EVADE | 2s (can't spam evade) |

## Aim Error System

**Core concept:** AI doesn't miss randomly—it aims at the wrong spot consistently, then adjusts.

### Error Calculation

```
aimTarget = leadPosition + errorVector
errorVector = baseError + speedError
```

Where:
- `baseError`: Fixed magnitude error, direction changes slowly
- `speedError`: Scales with target velocity

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| baseErrorMagnitude | 15m | Constant aim offset |
| speedErrorScale | 0.1 | Error per m/s of target speed |
| errorRotationSpeed | 30°/s | How fast error direction changes |

### Example

Target moving at 200 m/s:
- Base error: 15m
- Speed error: 200 * 0.1 = 20m
- Total error: ~25m (vector sum)

At 300m range, this makes hitting a fast target notably harder.

### Difficulty Scaling

| Difficulty | baseError | speedScale | Notes |
|------------|-----------|------------|-------|
| Easy | 25m | 0.15 | Very forgiving |
| Normal | 15m | 0.10 | Default |
| Hard | 8m | 0.05 | Challenging |
| Elite | 3m | 0.02 | Near-perfect |

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
