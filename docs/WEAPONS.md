# Weapons

## Overview

Weapons are divided into **Primary** (guns, beams) and **Secondary** (missiles, decoys).

Ships have **banks** for each type:
- Primary bank size affects heat capacity (larger = fire longer) or ammo capacity
- Secondary bank size affects ammo capacity

## Primary Weapons

### Energy Weapons (Infinite Ammo)

| Weapon | Heat/Shot | Proj Speed | Fire Rate | Range | Damage | Notes |
|--------|-----------|------------|-----------|-------|--------|-------|
| Plasma | 8 | 400 m/s | 200ms | 800m | 25 | Balanced default |
| Pulse | 5 | 600 m/s | 100ms | 500m | 12 | Fast, short range |
| Ion | 6 | 400 m/s | 180ms | 700m | 15 | +50% shield dmg, disrupts locks |

**Fantasy:**
- Plasma: Reliable workhorse
- Pulse: Aggressive close-range
- Ion: Anti-shield specialist

### Ballistic Weapons (Finite Ammo)

| Weapon | Heat/Shot | Proj Speed | Fire Rate | Range | Damage | Ammo/Bank |
|--------|-----------|------------|-----------|-------|--------|-----------|
| Autocannon | 2 | 500 m/s | 65ms | 400m | 8 | 200 |
| Railgun | 3 | 2000 m/s | 800ms | 2000m | 80 | 20 |
| Flak | 2 | 400 m/s | 150ms | 300m | 5 + AoE | 60 |

**Fantasy:**
- Autocannon: Spray of bullets, high rate
- Railgun: Long-range precision, high damage
- Flak: Anti-missile, close-range area denial

### Beam Weapons (Continuous)

| Weapon | Heat/sec | Range | Damage/sec | Falloff | Notes |
|--------|----------|-------|------------|---------|-------|
| Red Laser | 15 | 400m | 60 | 1/d² | Short range, high damage |
| Green Laser | 12 | 800m | 40 | 1/d² | Medium range |
| Blue Laser | 10 | 1200m | 25 | 1/d² | Long range, low damage |
| Lightning | 20 | 300m | 50 | None | Constant damage, flickering |
| Nuclear Lance | 0 | 3000m | 500 | 1/d² | Single shot, 1 ammo |

**Fantasy:**
- Lasers: Sustained damage, requires tracking
- Lightning: Close-range burst, visual spectacle
- Nuclear Lance: One devastating shot

### Damage Falloff (Beams)

Damage = BaseDamage / max(1, (distance / minDistance)²)

Where minDistance = 100m (caps damage when very close)

## Secondary Weapons

### Missiles

| Weapon | Lock? | Count | Speed | Turn Rate | Range | Damage | Notes |
|--------|-------|-------|-------|-----------|-------|--------|-------|
| Rocket | No | 1 | 600 m/s | 0 | 1000m | 50 | Dumbfire |
| Seeker | Yes | 1 | 400 m/s | 90°/s | 2000m | 60 | Standard missile |
| Dart | Yes | 1 | 600 m/s | 120°/s | 800m | 30 | Fast, agile |
| Cluster | No | 3 | 400 m/s | 60°/s | 1200m | 25 | Auto-retarget |
| Swarm | Yes | 8 | 500 m/s | 100°/s | 600m | 10 | Overwhelming |
| Torpedo | Yes | 1 | 200 m/s | 30°/s | 4000m | 150 | Heavy hitter |
| Nuke | Yes | 1 | 150 m/s | 20°/s | 3000m | 300 | AoE, friendly fire |

**Fantasy:**
- Rocket: Fire-and-forget, no lock hassle
- Seeker: Reliable tracking
- Dart: Quick strike
- Cluster: Chaos, area control
- Swarm: Overwhelm point defense
- Torpedo: Capital ship killer
- Nuke: Game-changer, risky

### Decoys

| Property | Value |
|----------|-------|
| Launch direction | Backward + random |
| Speed | 50 m/s |
| Lifetime | 10 seconds |
| Distraction chance | 50% per missile in range |
| Collision | Destroys missile on contact |

**Usage:** Deploy when locked, missiles in flight, or preemptively when engaging.

## Lock-On System

1. Select missile weapon
2. Target enemy within range
3. Lock indicator moves toward target
4. Lock speed = weapon's `lockSpeed` (degrees/sec toward target)
5. Lock breaks if:
   - Target leaves screen
   - Target leaves range
   - Weapon changed
6. Once locked, can fire repeatedly until lock breaks

## Weapon Linking

Ships can link same-type weapons:
- 2x Plasma: Fire both simultaneously
- Cycling: Fire one, then other, then both, then next type

Example loadout cycling (2x Plasma, 1x Pulse):
1. Plasma A
2. Plasma B
3. Plasma A+B (linked)
4. Pulse

## Bank Sizes

Bank size affects:
- **Energy weapons:** Heat capacity multiplier (size 2 = 2x shots before overheat)
- **Ballistic weapons:** Ammo capacity multiplier
- **Missiles:** Ammo capacity multiplier

Standard sizes: 1 (small), 2 (medium), 3 (large)

## Balance Philosophy

- Energy weapons: Infinite but heat-limited
- Ballistic weapons: Finite but cooler
- Missiles: High damage, limited, require positioning
- Beams: Require tracking skill, reward aim
- Heat forces engagement rhythm
- No weapon should be universally best
