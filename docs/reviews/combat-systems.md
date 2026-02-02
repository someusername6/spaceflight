# Combat Systems Review

**Last updated:** February 2026

## Overview

Combat in Spaceflight operates through an ECS-based weapon system with 14 primary weapons across 3 categories, 9 secondary weapons (missiles/countermeasures), and layered damage mechanics through shields and hull.

## Primary Weapons

### Energy Weapons (Infinite Ammo)

| Weapon | Damage | Fire Rate | Range | Heat | DPS | Notes |
|--------|--------|-----------|-------|------|-----|-------|
| **Pulse** | 12 | 10/s | 500m | 1.8 | 120 | Fast firing, short range |
| **Plasma** | 16 | 8/s | 800m | 2.5 | 128 | Standard balanced option |
| **Ion** | 10 | 5.5/s | 700m | 2.0 | 55 | 8s ionization effect |

**Key mechanics:**
- Infinite ammo makes them economically sustainable
- No autoaim assistance
- Ion's shield disruption doubles regen delay (3s → 6s)

### Ballistic Weapons (Finite Ammo)

| Weapon | Damage | Fire Rate | Range | Heat | Ammo | Autoaim | Special |
|--------|--------|-----------|-------|------|------|---------|---------|
| **Autocannon** | 9 | 15/s | 400m | 0.5 | 600 | - | Volume fire |
| **Slug Cannon** | 45 | 2.5/s | 1000m | 4.0 | 80 | 0.5° | Heavy punch |
| **Railgun** | 80 | 1/s | 2000m | 8.0 | 30 | 2° | Sniper weapon |
| **Flak** | 10×8 | 4/s | 600m | 3.0 | 60 | - | Proximity burst |
| **Gyrojet** | 35-200 | 4/s | 2000m | 3.0 | 40 | - | Accelerating rockets |

**Key mechanics:**
- Ammo costs create ongoing economic pressure
- Autoaim provides aim assistance within cone
- Flak detonates at 50m proximity, spawns 8 shrapnel projectiles
- Gyrojet damage scales with projectile velocity (starts slow, accelerates)

### Beam Weapons (Continuous)

| Weapon | DPS | Range | Heat/s | Autoaim | Special |
|--------|-----|-------|--------|---------|---------|
| **Blue Laser** | 50 | 1200m | 12 | - | Long range kiting |
| **Green Laser** | 80 | 800m | 18 | - | Balanced beam |
| **Red Laser** | 120 | 400m | 25 | - | Close range burst |
| **Lightning** | 50 | 300m | 10 | 5° | Pulse discharge |
| **Torch** | 30 | 200m | 8 | - | +35 heat/s to target |
| **Nuclear Lance** | 500 | 3000m | 30 | - | Single shot, piercing |

**Key mechanics:**
- Beams apply damage continuously via DPS
- Heat generation creates sustain limits
- Lightning fires in pulses rather than continuous
- Torch injects heat into target (disruption weapon)
- Nuclear Lance: 1 ammo, instant kill potential

## Secondary Weapons

### Dumbfire Missiles

| Missile | Damage | Speed | Range | Notes |
|---------|--------|-------|-------|-------|
| **Rocket** | 50 | 600 | 1000m | No tracking, fast |
| **Starburst** | 80 shrapnel | 400 | 800m | Area denial burst |
| **Cluster** | 30×3 | 400 | 1200m | Triple warhead |

### Homing Missiles

| Missile | Damage | Speed | Range | Turn Rate | Lock Time |
|---------|--------|-------|-------|-----------|-----------|
| **Dart** | 30 | 600 | 800m | 120°/s | 2.0s |
| **Seeker** | 60 | 400 | 2000m | 90°/s | 4.0s |
| **Swarm** | 20×8 | 500 | 600m | 100°/s | 3.0s |

### Heavy Ordnance

| Missile | Damage | Speed | Range | Turn Rate | Lock Time | Special |
|---------|--------|-------|-------|-----------|-----------|---------|
| **Torpedo** | 150 | 200 | 4000m | 30°/s | 7.0s | Slow but powerful |
| **Nuke** | 300 | 150 | 3000m | 20°/s | 10.0s | 100m AoE, damages all |

### Countermeasures

| Item | Effect | Notes |
|------|--------|-------|
| **Decoy** | 50% missile seduction | 200m radius, 10s lifetime |

## Damage System

### Damage Flow

```
Incoming Damage
      │
      ▼
┌─────────────┐     Shield absorbs up to remaining capacity
│   Shields   │────► Excess passes through
└─────────────┘
      │
      ▼
┌─────────────┐     Hull damage accumulates
│    Hull     │────► Death at 0 hull
└─────────────┘
```

### Shield Mechanics

- **Regeneration:** Begins 3s after last damage (6s if ionized)
- **Regen Rate:** Per-ship stat, typically 5-15 per second
- **Visual Feedback:** Cyan flash on shield hits

### Hull Mechanics

- **No Regeneration:** Hull damage is permanent for the mission
- **Death Delay:** 0.5s for explosion animation
- **Visual Feedback:** Orange/yellow sparks on hull hits

## Weapon Selection Logic (AI)

AI scores weapons based on combat situation (`ai-weapon-selection.ts`):

1. **Range Match:** +50 perfect, +25 adjacent category
2. **Heat Efficiency:** +30 when hot, scales with weapon heat cost
3. **Ammo Conservation:** +15 for infinite ammo weapons
4. **Shield Targeting:** +40 Ion bonus vs shields
5. **Beam Bonus:** +30 short range, +15 medium
6. **DPS Factor:** weapon.damage × 0.5

Heat-critical behavior (≥85%): Find coolest weapon under 3 heat cost.

## Weapon Bank System

Ships have multiple weapon banks with different configurations:

- **Single Bank:** Fires from ship center
- **Multiple Banks:** Distributed laterally (left/right alternating)
- **Linked Fire:** All weapons fire together (higher DPS, more heat)
- **Cycling Fire:** Banks fire sequentially (sustained, cooler)

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/data/weapons.ts` | ~180 | Weapon definitions |
| `src/data/missiles.ts` | ~120 | Missile definitions |
| `src/systems/weapons.ts` | ~200 | Firing logic |
| `src/systems/beam-system.ts` | ~150 | Beam damage processing |
| `src/systems/projectiles.ts` | ~120 | Projectile movement |
| `src/systems/missiles.ts` | ~180 | Missile tracking |
| `src/systems/damage.ts` | ~100 | Damage application |
| `src/systems/shields.ts` | ~80 | Shield regeneration |

## Strengths

1. **Weapon Diversity:** 14 primaries + 9 secondaries with distinct roles
2. **Clear Trade-offs:** Heat vs damage, ammo vs infinite, range vs power
3. **Tactical Depth:** Linked/cycling fire, weapon selection, heat management
4. **Unique Mechanics:** Gyrojet acceleration, Torch heat injection, Flak proximity
5. **Visual Clarity:** Distinct projectile/beam visuals per weapon type

## Balance Observations

| Concern | Analysis |
|---------|----------|
| **Nuclear Lance** | 500 damage at 3000m is dominant; 1 ammo + 30 heat is only limit |
| **Torch Range** | 200m range is very risky; heat injection rarely decisive |
| **Torpedo Speed** | 200 m/s is easily evaded; may need 250-300 m/s |
| **Decoy Reliability** | 50% random chance; skilled play not rewarded |
| **Swarm Volume** | 8 missiles at 0.1s rate can overwhelm defenses |

## Areas for Improvement

1. **Weapon Progression:** No clear upgrade path within categories
2. **Counter-Play:** Limited options against specific weapon types
3. **Status Effects:** Only ionization exists; room for more debuffs
4. **Ammo Economy:** Some weapons burn through ammo too quickly
5. **Beam Visibility:** Thin lines can be hard to track in combat
