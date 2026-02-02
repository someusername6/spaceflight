# AI Systems Review

**Last updated:** February 2026

## Overview

The AI operates as a finite state machine with behavior modes for different mission types, combined with skill-based profiles that scale difficulty through accuracy, aggression, and defensive parameters.

## State Machine

6 states defined in `src/systems/ai/ai.ts`:

| State | Description |
|-------|-------------|
| **Idle** | Searching for targets based on behavior mode |
| **Pursue** | Chasing target to engagement range |
| **Engage** | Attacking while maintaining distance |
| **Evade** | Emergency escape when shields critical |
| **Regroup** | Disengaging to recover (loop pattern) |
| **Reposition** | Tactical burst-disengage for long-range ships |

State transitions are driven by shield thresholds, engagement ranges, and cooldown timers defined per skill profile.

## Skill Profiles

6 profiles in `src/data/ai-profiles.ts` with 20+ tunable parameters each:

| Level | Aim Error | Engage Range | Evade Threshold | Notes |
|-------|-----------|--------------|-----------------|-------|
| **Green** | 0.14 rad (~8°) | 400m | 35% shields | Tutorial enemy |
| **Rookie** | 0.095 rad (~5.5°) | 500m | 31% shields | Conservative, panicky |
| **Regular** | 0.05 rad (~3°) | 600m | 25% shields | Balanced baseline |
| **Veteran** | 0.032 rad (~2°) | 700m | 20% shields | Aggressive, calm |
| **Ace** | 0.008 rad (~0.5°) | 800m | 12% shields | Ice cold under pressure |
| **Elite** | 0.004 rad (~0.23°) | 800m | 12% shields | Near-perfect accuracy |

## Playstyle System

5 playstyles in `src/data/ai-playstyles.ts` address the "brave ace inversion" problem where higher-skill pilots shouldn't necessarily fight longer:

| Playstyle | Ships | Skill Expression |
|-----------|-------|------------------|
| **Brawler** | Fighter, Striker | All parameters scale normally |
| **Escape** | Scout, Raider | Constant defensive thresholds; skill via aim only |
| **Kiting** | Interceptor, Sentinel | Skill via aim error + engagement range |
| **Beam** | Lancer variant | Aggressive aim multiplier, constant defenses |
| **Gunboat** | Bomber, Defender | Constant firing angle/heat; prevents volume advantage |

## Behavior Modes

11 mission-specific behaviors in `src/systems/ai/ai-idle.ts`:

| Mode | Target Priority | Use Case |
|------|-----------------|----------|
| **standard** | Threats to player (wingmen), nearest (enemies) | Default combat |
| **defensive** | Threats to convoy within 800m | Escort convoy guard |
| **convoy-hunter** | Nearest convoy ship | Escort mission enemies |
| **station-hunter** | Enemy station | Station defense attackers |
| **station-defense** | Threats to station within 1000m | Station defense allies |
| **station-defender** | Station attackers (load-balanced) | Military station guards |
| **convoy-guard-aggressive** | Player within 600m or damage aggro | Ambush escorts |
| **convoy-guard-defensive** | Only reactive triggers | Ambush escorts |
| **convoy-interceptor** | Convoy escorts, then stop convoy | Player in ambush |
| **station-assault** | High DPS → station, low DPS → defenders | Attack station allies |

## Aiming System

### Aim Error (`src/systems/aim-error.ts`)
- Base error varies by skill (0.004-0.14 radians)
- Angular velocity contribution: faster targets harder to track
- Drift simulation: random walk within max error bounds
- Beam tracking: separate interpolated direction for lock-on feel

### Lead Calculation
- Calculates projectile intercept point using target velocity
- Applies aim error offset after lead calculation
- Skips lead for hitscan beams or close targets (<0.15 rad/s angular velocity)

## Weapon Selection

`src/systems/ai/ai-weapon-selection.ts` scores weapons based on:

1. **Range match** (+50 perfect, +25 adjacent category)
2. **Heat efficiency** (+30 when hot, scales with weapon heat cost)
3. **Ammo conservation** (+15 for infinite ammo weapons)
4. **Shield targeting** (+40 Ion bonus vs shields)
5. **Beam bonus** (+30 short range, +15 medium)
6. **DPS at close range** (weapon.damage × 0.5)

Heat-critical behavior (≥85%): Find coolest weapon under 3 heat cost.

## Strengths

1. **Layered Complexity** - State machine + behaviors + skills + playstyles
2. **Mission Awareness** - AI adapts targeting to mission objectives
3. **Smart Targeting** - Load balancing prevents overkill on single targets
4. **Meaningful Skills** - Clear skill expression visible in combat
5. **Tactical Variety** - Kiting, burst-disengage, evasion patterns
6. **Deterministic** - Seeded PRNG for replay compatibility and multiplayer readiness

## Defensive Systems

### Decoy Launch (`src/systems/weapons/weapons-ai.ts`)

AI pilots launch decoys defensively when:
- Incoming missiles are detected targeting them
- Decoy cooldown (per profile) has elapsed
- Decoys remain in inventory

Cooldown varies by skill profile, with higher-skill pilots using decoys more efficiently.

## Areas for Improvement

1. **No Formation Flying** - Wingmen operate independently
2. **Limited Coordination** - No voice callouts or squad tactics
3. **Predictable Evade** - Maneuver patterns are consistent per profile
4. **No Adaptive AI** - Doesn't learn player patterns mid-mission
5. **Simple Convoy AI** - Just flies straight to escape zone

## Balance Observations

| Concern | Details |
|---------|---------|
| **Skill Gap** | Ace aim error 12× better than rookie; may be too wide |
| **Heat Inversion** | Rookie sustains linked fire longer (95% vs 50% threshold) |
| **Kiting Dominance** | Long-range ships with ace pilots hard to catch |
| **Evade Duration** | Aces evade at 12% shields vs rookie at 31%; 2.5× fight time |

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `systems/ai/ai.ts` | 327 | Main state machine |
| `systems/ai/ai-idle.ts` | 288 | Target selection by behavior |
| `systems/ai/ai-pursuit.ts` | 156 | Chase and lead calculation |
| `systems/ai/ai-behaviors.ts` | 204 | Evade/regroup logic |
| `systems/ai/ai-reposition.ts` | 229 | Burst-disengage for kiters |
| `systems/ai/ai-weapon-selection.ts` | 227 | Weapon scoring |
| `data/ai-profiles.ts` | 300+ | Skill profile definitions |
| `data/ai-playstyles.ts` | 212 | Playstyle modifiers |
