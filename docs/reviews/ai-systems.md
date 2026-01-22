# AI Systems Review

## State Machine

The AI operates as a finite state machine with 6 states:

| State | Description |
|-------|-------------|
| **Idle** | Searching for targets based on behavior mode |
| **Pursue** | Chasing target to engagement range |
| **Engage** | Attacking while maintaining distance |
| **Evade** | Emergency escape when shields critical |
| **Regroup** | Disengaging to recover (loop pattern) |
| **Reposition** | Tactical retreat for long-range ships |

## Skill Levels

5 skill levels with distinct profiles:

| Level | Accuracy | Engagement | Defensive |
|-------|----------|------------|-----------|
| **Rookie** | Poor (5.5°) | Conservative | Panicky (31% shields) |
| **Regular** | Moderate (3°) | Standard | Balanced (25% shields) |
| **Veteran** | Good (2°) | Aggressive | Calm (20% shields) |
| **Ace** | Excellent (0.5°) | Very aggressive | Ice cold (12% shields) |
| **Elite** | Near-perfect (0.23°) | Very aggressive | Ice cold (12% shields) |

## Behavior Modes

Mission-specific behaviors:

| Mode | Target Priority |
|------|-----------------|
| **standard** | Threats to player (wingmen), nearest (enemies) |
| **defensive** | Threats to convoy within 800m |
| **convoy-hunter** | Nearest convoy ship |
| **station-hunter** | Enemy station |
| **station-defense** | Threats to station within 1000m |
| **station-defender** | Station attackers (load-balanced) |

## Aiming System

### Aim Error
- Base error varies by skill (0.008-0.095 radians)
- Drift causes wobble (0.004-0.06 rad/s)
- Target movement increases error
- Beam tracking speed varies (0.8-4.0 rad/s)

### Lead Calculation
- Calculates projectile intercept point
- Applies aim error offset
- Skips lead for hitscan/close targets

## Weapon Selection

Smart selection based on:
1. Heat state (switch to cooler weapons when hot)
2. Range match (prefer weapons suited to distance)
3. Ammo conservation (prefer infinite when angle bad)
4. Shield targeting (Ion bonus vs shields)
5. Beam bonus at short/medium range

## Strengths

1. **Layered Complexity** - State machine + behaviors + skills
2. **Mission Awareness** - AI adapts to mission type
3. **Smart Targeting** - Load balancing prevents overkill
4. **Meaningful Skills** - Clear skill expression in combat
5. **Tactical Variety** - Kiting, burst-disengage, evasion

## Areas for Improvement

1. **No Formation Flying** - Wingmen don't fly in formation
2. **Limited Coordination** - No voice callouts or squad tactics
3. **Predictable Patterns** - Evade maneuver is consistent
4. **No Learning** - AI doesn't adapt to player patterns
5. **Convoy AI Simple** - Just flies straight to escape

## Balance Concerns

1. **Elite vs Ace Gap** - Elite is only slightly better than Ace
2. **Rookie Too Weak** - 5.5° error makes them nearly harmless
3. **Kiting Dominance** - Long-range ships hard to catch
4. **Station Strafing** - AI missile approach can be exploited

## Recommendations

1. Add formation flying for wingmen
2. Implement squad callouts ("I'm hit!", "Engaging target")
3. Vary evade patterns based on attacker position
4. Consider adaptive difficulty (hidden rubber banding)
5. Make convoy take evasive action when attacked
