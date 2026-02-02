# Gameplay Mechanics Review

**Last updated:** February 2026

## Overview

Spaceflight is a 3D space dogfight roguelike with real-time combat. Players command a squadron through procedurally generated sectors, taking contracts to earn credits and salvage. The core loop emphasizes squadron management and risk/reward decisions.

## Core Game Loop

```
┌─────────────────┐
│    Squadron     │◄──────────────────────────┐
│   Management    │                           │
└────────┬────────┘                           │
         │                                    │
         ▼                                    │
┌─────────────────┐                           │
│    Contract     │                           │
│   Selection     │                           │
└────────┬────────┘                           │
         │                                    │
         ▼                                    │
┌─────────────────┐                           │
│     Combat      │                           │
│    Mission      │                           │
└────────┬────────┘                           │
         │                                    │
         ▼                                    │
┌─────────────────┐                           │
│    Rewards &    │───────────────────────────┘
│    Salvage      │
└─────────────────┘
```

## Ship Physics

### Movement Model

| Parameter | Description | Typical Values |
|-----------|-------------|----------------|
| Max Speed | Maximum velocity | 100-200 m/s |
| Acceleration | Speed increase rate | 50-150 m/s² |
| Deceleration | Speed decrease rate | 30-100 m/s² |
| Turn Rate | Rotation speed | 30-90 °/s |
| Roll Rate | Banking speed | 60-180 °/s |
| Drag | Velocity damping | 0.1-0.5 |

### Afterburner System

- **Speed Multiplier:** 1.5× max speed when active
- **Heat Generation:** Continuous heat while active
- **Lockout Thresholds:**
  - Locks at 95% heat
  - Unlocks at 50% heat (hysteresis)
- **Tactical Use:** Burst speed for pursuit/escape, heat trade-off

### Physics Processing

1. Apply thrust based on throttle
2. Apply rotation based on input
3. Update velocity with acceleration
4. Apply drag coefficient
5. Clamp to max speed
6. Update position from velocity

## Heat Management

### Heat Sources

| Source | Heat Generation |
|--------|-----------------|
| Weapon fire | Per-weapon cost (0.5-30) |
| Afterburner | Continuous while active |
| Torch weapon | 35/s injected to target |

### Heat Thresholds

| Level | Effect |
|-------|--------|
| 0-79% | Normal operation |
| 80-94% | Warning state (UI indicator) |
| 95-99% | Afterburner locked |
| 100% | Weapons locked |

### Cooling

- Passive cooling at ship-specific rate
- Typical: 10-20 heat/second
- No active cooling items currently

## Targeting System

### Target Selection

- **Cycle Targets:** Next/previous hostile
- **Nearest Enemy:** Quick selection
- **Target Under Reticle:** Precise selection
- **Match Speed:** Throttle to target velocity

### Target Lock (Missiles)

| Missile Type | Lock Time | Lock Cone |
|--------------|-----------|-----------|
| Dart | 2.0s | 10° |
| Seeker | 4.0s | 15° |
| Swarm | 3.0s | 10° |
| Torpedo | 7.0s | 8° |
| Nuke | 10.0s | 5° |

Lock breaks if target leaves cone or exceeds range.

### Autoaim

Player-configurable aim assistance:
- 0° (disabled) to 5° cone
- Affects primary weapon accuracy
- Does not affect missiles

## Damage System

### Damage Flow

```
Incoming Damage
      │
      ▼
┌─────────────────────────────────────────┐
│ Shield Check                            │
│ - Absorbs up to remaining capacity      │
│ - Excess passes through                 │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ Hull Damage                             │
│ - Accumulates permanently               │
│ - Death at 0 hull                       │
└─────────────────────────────────────────┘
```

### Shield Mechanics

| Mechanic | Value |
|----------|-------|
| Regen delay | 3s after damage |
| Ionized delay | 6s (doubled) |
| Regen rate | Per-ship (5-15/s) |
| Visual | Cyan flash on hit |

### Hull Mechanics

| Mechanic | Value |
|----------|-------|
| Regeneration | None (permanent damage) |
| Death delay | 0.5s (explosion animation) |
| Visual | Orange/yellow sparks |

## Ship Classes

### Combat Ships

| Class | Hull | Shields | Speed | Role |
|-------|------|---------|-------|------|
| Scout | 55 | 35 | 180 | Fast recon |
| Interceptor | 75 | 50 | 160 | Pursuit |
| Fighter | 90 | 65 | 140 | Balanced |
| Striker | 130 | 90 | 120 | Heavy assault |
| Bomber | 110 | 80 | 100 | Ordnance delivery |
| Defender | 165 | 130 | 90 | Tank |
| Raider | 65 | 45 | 170 | Hit and run |
| Sentinel | 110 | 110 | 100 | Support |
| Patrol | 45 | 45 | 150 | Light duty |

### Support Ships

| Type | Hull | Purpose |
|------|------|---------|
| Convoy | 150 | Escort target |
| Mining Station | 500 | Defense target |
| Refinery Station | 600 | Defense target |
| Military Station | 800 | Defense/Attack target |

## Mission Mechanics

### Elimination

- Wave-based enemy spawns
- All enemies must be destroyed
- Fixed reward

### Escort

- Convoy ships fly toward escape point
- Enemies spawn perpendicular to path
- Reward scales with % convoy survived

### Station Defense

- Station under attack
- Enemies focus station
- Reward scales with % station hull

### Ambush

- Attack enemy convoy
- Convoy stops when escorts cleared
- 100% reward for stopped, 50% for destroyed

### Attack Station

- Destroy enemy station
- Initial defenders + reinforcements
- Overwhelming wave at 180s

## Controls

### Default Bindings

| Action | Key |
|--------|-----|
| Thrust | W |
| Brake | S |
| Yaw | A/D |
| Roll | Q/E |
| Afterburner | Shift |
| Fire Primary | Left Mouse |
| Fire Secondary | Right Mouse |
| Cycle Target | Tab |
| Nearest Target | T |
| Match Speed | M |

### Customization

- Full rebinding in settings
- Mouse sensitivity adjustment
- Invert Y-axis option

## Strengths

1. **Intuitive Physics:** Ships feel responsive with good inertia
2. **Heat Trade-offs:** Creates meaningful tactical decisions
3. **Layered Defense:** Shield/hull separation adds depth
4. **Mission Variety:** 5 distinct mission types
5. **Clear Feedback:** Visual/UI cues for all states

## Design Notes

- **Hull vs Shields:** Shields regenerate mid-mission; hull repairs between missions. This creates meaningful risk management.

## Areas for Improvement

1. **Limited Status Effects:** Only ionization exists
2. **No Subsystems:** All damage is generic
3. **Wingman Control:** Limited tactical commands
4. **No Stealth:** All ships always visible
