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
| Flak | 4 | 350 m/s | 400ms | 600m | 15 + shrapnel | 50 |

**Fantasy:**
- Autocannon: Spray of bullets, high rate
- Railgun: Long-range precision, high damage
- Flak: Proximity-fused shrapnel burst

### Flak Cannon Mechanics

The Flak cannon fires proximity-fused projectiles that explode into shrapnel:

1. **Projectile Phase:** Red glowing sphere flies toward enemies
2. **Detonation Trigger:** Explodes when any enemy enters 80-unit radius
3. **Shrapnel Burst:** Spawns 8 shrapnel projectiles in all directions
   - Shrapnel Speed: 450 m/s
   - Shrapnel Range: 120m
   - Shrapnel Damage: 8 per hit

The projectile does NOT explode based on time or distance - only on enemy proximity. This makes it effective against clustered enemies and ineffective against isolated targets at extreme range.

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
| Nuke | Yes | 1 | 150 m/s | 20°/s | 3000m | 300 | AoE, friendly fire, smart detonation |

**Fantasy:**
- Rocket: Fire-and-forget, no lock hassle
- Seeker: Reliable tracking
- Dart: Quick strike
- Cluster: Chaos, area control
- Swarm: Overwhelm point defense
- Torpedo: Capital ship killer
- Nuke: Game-changer, risky

### Nuke Smart Detonation

The Nuke missile has intelligent detonation logic:

1. **Collision Detonation:** Explodes immediately on direct hit with any enemy
2. **Proximity Detonation:** When out of range, checks for enemies within AoE radius
   - If enemies are within 150-unit AoE radius: triggers explosion
   - If no enemies in range: missile expires without explosion (wasted)

This prevents nukes from detonating harmlessly in empty space while ensuring they always detonate when they can deal damage. The AoE explosion deals 50% damage with linear falloff from center to edge.

### Decoys

| Property | Value |
|----------|-------|
| Launch direction | Bottom of ship + downward bias |
| Speed | 50 m/s |
| Lifetime | 10 seconds |
| Seduce range | 200 units |
| Seduce chance | 50% per missile in range |
| Collision | Destroys missile on contact |
| Keybind | C (dedicated key) |

**Mechanics:**
- Launch from the bottom of the ship with a downward-biased random direction
- Missiles within 200-unit range have a 50% chance to be seduced each tick
- Seduced missiles retarget to the decoy and track it instead
- Direct collision with a missile destroys both the decoy and the missile
- Works against missiles from any faction (including friendly missiles)

**Usage:** Deploy when locked, missiles in flight, or preemptively when engaging.

**AI Behavior:** AI ships with decoys equipped will automatically launch them when targeted by missiles (2-second cooldown between launches).

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

Ships can toggle between two firing modes:

**Single Mode (default):**
- Fires only the currently selected weapon
- Use weapon cycling to switch between weapons
- Lower heat generation per shot

**Linked Mode:**
- Fires all primary weapons simultaneously
- All projectile weapons fire at once
- All beam weapons fire at once
- Heat from all weapons accumulates together
- Cooldown display shows the slowest weapon's fire rate

AI ships always fire in linked mode (all weapons together).

## Bank Sizes

Ships have weapon banks of different sizes (1, 2, or 3). Bank size affects weapon performance:

### Scaling Rules

| Weapon Type | Bank Size Effect | Formula | Example (Size 2) |
|-------------|------------------|---------|------------------|
| **Energy** (Plasma, Pulse, Ion) | Reduced heat per shot | `heat / size` | Plasma: 8 → 4 heat |
| **Ballistic** (Autocannon, Railgun, Flak) | Increased ammo | `ammo × size` | Autocannon: 200 → 400 |
| **Beam** (Lasers, Lightning) | Reduced heat per second | `heat / size` | Red Laser: 15 → 7.5/s |
| **Nuclear Lance** | Additional shots | `ammo = size` | 1 → 2 shots |
| **Missiles** (all types) | Increased count | `count × size` | Seeker: 8 → 16 |
| **Decoys** | Increased count | `count × size` | 4 → 8 decoys |

### Gameplay Effect

- **Size 1:** Base values - heat-limited, ammo-limited
- **Size 2:** 2× efficiency - sustain fire twice as long, or carry twice the ammo
- **Size 3:** 3× efficiency - maximum sustained fire / ammo capacity

### Strategic Implications

Bank sizes are fixed per ship archetype. Players choose which weapon to mount in which bank:

- **Put energy weapons in large banks:** Sustain fire longer before overheating
- **Put ballistic weapons in large banks:** Carry more ammo for extended engagements
- **Put best missiles in large banks:** More ordnance for critical strikes

This creates equipment-fitting decisions that define loadout strategy

## Friendly Fire

All weapons have friendly fire enabled:

- **Projectiles:** Damage any ship except the owner
- **Missiles:** Damage any ship on collision except the owner
- **Nuke AoE:** Damages all ships within blast radius (including friendlies)
- **Flak Shrapnel:** Damages all ships within range (including friendlies)
- **Beams:** Damage any ship except the firer

**Trigger vs Damage distinction:**
- Flak explosion only *triggers* when enemies are in proximity
- Nuke end-of-range explosion only *triggers* when enemies are in AoE
- But once triggered, the resulting damage affects all ships

## Balance Philosophy

- Energy weapons: Infinite but heat-limited
- Ballistic weapons: Finite but cooler
- Missiles: High damage, limited, require positioning
- Beams: Require tracking skill, reward aim
- Heat forces engagement rhythm
- No weapon should be universally best
- Friendly fire adds tactical depth and risk/reward
