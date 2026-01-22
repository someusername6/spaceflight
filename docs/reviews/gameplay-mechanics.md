# Gameplay Mechanics Review

## Overview

Spaceflight is a 3D space dogfight roguelike with real-time combat. Players command a squadron through procedurally generated sectors, taking contracts to earn credits and salvage.

## Core Loop

1. **Squadron Management** - Assign pilots to ships, customize loadouts
2. **Contract Selection** - Choose missions from available contracts
3. **Combat Mission** - Real-time 3D dogfighting
4. **Rewards** - Earn credits and salvage based on performance
5. **Repeat** - Progress through sectors until permadeath

## Ship Systems

### Movement Physics
- Velocity-based movement with acceleration/deceleration
- Turn rate and roll rate (degrees/second)
- Drag coefficient for coasting behavior
- Rotational inertia with smooth angular velocity

### Afterburner
- 1.5x speed multiplier when active
- Generates heat while active
- Hysteresis lockout: locks at 95% heat, unlocks at 50%
- Creates tactical decision between speed and heat management

### Heat Management
- Weapons generate heat per shot
- Afterburner generates continuous heat
- Passive cooling at configurable rate
- Thresholds:
  - 80%: Warning state
  - 95%: Afterburner locks
  - 100%: Weapons lock

## Damage System

### Damage Flow
1. Shields absorb damage first (with optional multiplier)
2. Remaining damage passes to hull (with optional multiplier)
3. Ships can have separate shield/hull damage resistances

### Shield Mechanics
- Regenerates after damage-free period (default 3s)
- Ionization effect doubles regen delay to 6s
- Visual feedback on shield hits

### Hull & Health
- Simple hull tracking with max values
- Death delay for explosion animations
- Ship destroyed when hull reaches 0

## Strengths

1. **Intuitive Physics** - Ship handling feels responsive with good inertia
2. **Heat Trade-offs** - Creates meaningful decisions about weapon/afterburner usage
3. **Layered Defense** - Shield/hull separation adds tactical depth
4. **Status Effects** - Ionization creates counter-play opportunities

## Areas for Improvement

1. **No Hull Repair** - Ships cannot repair hull damage mid-mission
2. **Limited Status Effects** - Only ionization exists; room for more debuffs
3. **No Subsystem Damage** - All damage is generic; no targeting engines/weapons

## Recommendations

1. Consider adding more status effects (EMP, sensor jamming)
2. Evaluate adding limited hull repair (consumable or slow regen)
3. Consider subsystem targeting for advanced gameplay
