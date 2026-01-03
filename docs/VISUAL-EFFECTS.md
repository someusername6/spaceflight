# Visual Effects Documentation

This document describes all weapon-related visual effects (VFX) in the game, including projectiles, beams, missiles, muzzle flashes, and impact effects.

## Overview

| Effect Type | File | Description |
|-------------|------|-------------|
| Projectile Trails | `src/rendering/trails.ts` | Fading line trails behind projectiles |
| Missile Exhaust | `src/rendering/missile-exhaust.ts` | Flickering flame cone behind missiles |
| Muzzle Flash | `src/rendering/muzzle-flash.ts` | Brief flash when weapons fire |
| Beam Rendering | `src/rendering/renderer.ts` | Continuous beam lines with fade-out |
| Shield Hit Effects | `src/rendering/shield-effects.ts` | Cyan flash when shields absorb damage |
| Explosions | `src/rendering/explosions.ts` | Expanding spheres + particles on impacts |
| Decoys | `src/rendering/renderer.ts` | Glowing spheres that seduce missiles |

---

## Primary Weapons

### Energy Weapons (Infinite Ammo)

| Weapon | Bolt Shape | Bolt Size | Trail Length | Player Color | Enemy Color |
|--------|-----------|-----------|--------------|--------------|-------------|
| **Plasma** | Sphere | 0.6 | 8 points | Green RGB(0.2, 1.0, 0.4) | Red-pink RGB(1.0, 0.2, 0.3) |
| **Pulse** | Sphere | 0.35 | 5 points | Cyan RGB(0.3, 0.9, 1.0) | Orange RGB(1.0, 0.5, 0.2) |
| **Ion** | Sphere | 0.5 | 7 points | Blue-purple RGB(0.4, 0.5, 1.0) | Magenta RGB(1.0, 0.3, 0.5) |

### Ballistic Weapons (Finite Ammo)

| Weapon | Bolt Shape | Bolt Size | Trail Length | Player Color | Enemy Color |
|--------|-----------|-----------|--------------|--------------|-------------|
| **Autocannon** | Cylinder | 0.25 | 4 points | Yellow-gold RGB(1.0, 0.85, 0.3) | Orange RGB(1.0, 0.6, 0.2) |
| **Railgun** | Cylinder | 0.2 | 14 points | White RGB(1.0, 1.0, 1.0) | Blue-white RGB(0.9, 0.9, 1.0) |
| **Flak** | Sphere | 0.4 | 6 points | Red RGB(1.0, 0.2, 0.2) | Red-orange RGB(1.0, 0.3, 0.1) |
| **Shrapnel** | Cylinder | 0.15 | 3 points | Yellow RGB(1.0, 0.9, 0.3) | Orange-yellow RGB(1.0, 0.7, 0.2) |

### Beam Weapons (Continuous)

| Weapon | Beam Color | Muzzle Glow | Notes |
|--------|-----------|-------------|-------|
| **Red Laser** | RGB(1.0, 0.2, 0.1) - Bright red | Red pulsing glow + point light | 0.15s fade-out when stopped |
| **Green Laser** | RGB(0.2, 1.0, 0.2) - Bright green | Green pulsing glow + point light | 0.15s fade-out when stopped |
| **Blue Laser** | RGB(0.2, 0.4, 1.0) - Bright blue | Blue pulsing glow + point light | 0.15s fade-out when stopped |

---

## Projectile Trails

**File:** `src/rendering/trails.ts`

Each projectile type has distinct visual characteristics:

### Visual Components

1. **Bolt Mesh:** Glowing 3D shape at projectile head
   - Spheres for energy weapons
   - Cylinders (bullet-shaped) for ballistic weapons
   - Size varies by weapon type (see tables above)

2. **Trail Line:** Fading line following the bolt
   - Length varies by weapon (3-14 position samples)
   - Ring buffer implementation for efficiency
   - Color fades from dim (oldest) to bright (newest)

3. **Blending:** Additive blending for glow effects

### Trail Behavior

- **Update Rate:** Every frame
- **Orientation:** Bolt rotates to face direction of travel
- **Cleanup:** Trail geometry disposed when projectile removed

### Weapon-Specific Appearance

| Weapon | Fantasy |
|--------|---------|
| Plasma | Medium green spheres, balanced trail |
| Pulse | Small cyan rapid-fire bolts, short trails |
| Ion | Blue-purple electric orbs |
| Autocannon | Tiny yellow streaks, short trails |
| Railgun | White piercing rounds, very long trails |
| Flak | Red spheres before explosion |
| Shrapnel | Tiny yellow fragments, minimal trails |

### Flak Explosion Effect

When a flak projectile detonates (enemy enters proximity):

1. **Detonation Flash:** Ballistic-style hit effect at explosion point
2. **Shrapnel Spawn:** 8 shrapnel projectiles spawn using golden ratio distribution
   - Golden angle ensures even spherical coverage
   - Each shrapnel has its own trail

---

## Muzzle Flash Effects

**File:** `src/rendering/muzzle-flash.ts`

### Projectile Muzzle Flash

When a projectile spawns, a brief flash appears at the weapon muzzle:

- **Duration:** 0.08 seconds
- **Shape:** Expanding sphere
- **Animation:** Scale 1.0 → 3.0, Opacity 1.0 → 0.0
- **Blending:** Additive

**Colors by Faction:**
| Faction | Flash Color |
|---------|-------------|
| Player | Green RGB(0.2, 1.0, 0.3) |
| Enemy | Orange RGB(1.0, 0.4, 0.1) |
| Neutral | Yellow RGB(1.0, 1.0, 0.3) |

### Beam Muzzle Glow

While a beam weapon is firing, a continuous glow appears at the origin:

- **Shape:** Small sphere (radius 0.8)
- **Animation:** Pulsing scale (0.8 - 1.0 range at 20Hz)
- **Light:** Point light at origin, intensity pulses
- **Color:** Matches beam color

**Glow Colors:**
| Beam Type | Glow Color |
|-----------|-----------|
| Red Laser | RGB(1.0, 0.3, 0.2) |
| Green Laser | RGB(0.3, 1.0, 0.3) |
| Blue Laser | RGB(0.4, 0.5, 1.0) |

---

## Beam Rendering

**File:** `src/rendering/renderer.ts`

Beams are rendered as lines from origin to hit point (or max range):

- **Visual:** Thick line (linewidth varies by Three.js support)
- **Color:** Based on weapon type (see Beam Weapons table)
- **Hit Point:** Beam terminates at first enemy hit

### Beam Fade-Out

When a beam stops firing, it fades out gradually instead of disappearing instantly:

- **Fade Duration:** 0.15 seconds
- **Animation:** Opacity decreases linearly from beam color to transparent
- **Trigger:** When beam's `active` flag becomes false

---

## Secondary Weapons (Missiles)

### Missile Exhaust

**File:** `src/rendering/missile-exhaust.ts`

Each missile has a flame effect at its rear:

- **Shape:** Cone pointing backward
- **Size:** Length 2.5, Radius 0.4
- **Colors:**
  - Core: Orange-yellow RGB(1.0, 0.6, 0.1)
  - Outer glow: Deep orange RGB(1.0, 0.3, 0.0)
- **Animation:** Flickering intensity (two overlapping sine waves)
- **Light:** Point light that flickers with exhaust

### Missile Types

| Missile | Speed | Turn Rate | Range | Notes |
|---------|-------|-----------|-------|-------|
| **Rocket** | 600 | 0 | 1000 | Unguided, straight flight |
| **Seeker** | 400 | 90 deg/s | 2000 | Tracking, medium maneuverability |
| **Dart** | 600 | 120 deg/s | 800 | Fast, very agile, short range |
| **Cluster** | 400 | 60 deg/s | 1200 | Multiple projectiles |
| **Swarm** | 500 | 100 deg/s | 600 | Rapid fire, low damage each |
| **Torpedo** | 200 | 30 deg/s | 4000 | Slow but high damage, long range |
| **Nuke** | 150 | 20 deg/s | 3000 | Massive AoE damage, special explosion |

### Missile Visual Appearance

**File:** `src/rendering/renderer.ts`

Each missile type has a distinctive visual appearance reflecting its combat role:

| Missile | Body Color | Size (radius × length) | Special Features | Fantasy |
|---------|-----------|------------------------|------------------|---------|
| **Rocket** | Red-orange #FF4400 | 0.6 × 2.5 | Chunky, no glow | Unguided workhorse |
| **Seeker** | Cyan #00FFCC | 0.4 × 3.0 | Sleek standard shape | Reliable tracker |
| **Dart** | Blue-white #AADDFF | 0.25 × 3.5 | Thin, glowing tip (#4488FF) | Fast precision strike |
| **Cluster** | Yellow-orange #FFAA00 | 0.35 × 2.0 | Compact, no glow | Chaos spreader |
| **Swarm** | Orange #FF8800 | 0.2 × 1.5 | Tiny, glowing body (#FF4400) | Overwhelming numbers |
| **Torpedo** | Blue-silver #6688AA | 0.7 × 4.0 | Large with 4 stabilizer fins | Capital ship killer |
| **Nuke** | Deep red #FF2200 | 0.9 × 5.0 | Massive with fins, ominous glow (#FF0000) | Game-changer |

### Visual Components

1. **Body Cone:** Main missile shape pointing forward
   - Size varies significantly by type (swarm is tiny, nuke is massive)
   - Color reflects weapon personality

2. **Stabilizer Fins:** Torpedo and Nuke only
   - 4 fins arranged in cross pattern at rear
   - Gray metallic color
   - Convey heavy ordnance

3. **Glow Sphere:** Dart, Swarm, and Nuke only
   - Additive blended sphere near missile tip
   - Creates "hot" or "energized" appearance
   - Pulses with emissive color

---

## Decoys

**File:** `src/rendering/renderer.ts`

Decoys are countermeasure flares that seduce missiles away from ships:

### Visual Appearance

| Component | Description |
|-----------|-------------|
| **Inner Core** | Bright sphere (radius 0.8) |
| **Outer Glow** | Larger translucent sphere (radius 1.2) |
| **Blending** | Additive for glow effect |

### Colors by Faction

| Faction | Color |
|---------|-------|
| Player | Green #00FF00 |
| Enemy | Red #FF0000 |
| Neutral | Yellow #FFFF00 |

### Spawn Behavior

- **Position:** Below ship (local -Y direction)
- **Direction:** Random + downward bias
- **Speed:** 50 m/s
- **Lifetime:** 10 seconds

---

## Impact Effects

### Standard Explosions

**File:** `src/rendering/explosions.ts`

When missiles hit targets:

- **Shape:** Expanding sphere + particles
- **Size:** Base size 4 units
- **Duration:** 0.8 seconds
- **Color:** Orange RGB(1.0, 0.5, 0.1)
- **Particles:** 24 particles flying outward
- **Animation:**
  - Sphere: Expands (0.5 → 3.5x size), fades out
  - Particles: Fly outward at 4x speed, fade out

### Nuke Explosion

**File:** `src/rendering/explosions.ts` (variant: 'nuke')

The nuke has a unique multi-stage explosion:

1. **Initial Flash**
   - Bright white sphere
   - Duration: First 10% of explosion (0.2s)
   - Animation: Rapid expansion, quick fade

2. **Shockwave Ring**
   - Torus/ring shape
   - Color: Yellow-white
   - Animation: Expands outward 10x faster than fireball
   - Fades as it expands

3. **Main Fireball**
   - Size: 15 units (3.75x standard missile explosion)
   - Color progression: White → Yellow → Orange → Red
   - Duration: 2.0 seconds (2.5x standard)
   - Particles: 64 particles (2.7x standard), fly 2x faster

4. **Point Light**
   - Illuminates nearby geometry
   - Initial intensity: 80
   - Fades as explosion progresses

**Color Progression:**
| Progress | Color |
|----------|-------|
| 0% | White RGB(1, 1, 1) |
| 25% | Yellow-white RGB(1, 1, 0.5) |
| 50% | Orange-yellow RGB(1, 0.7, 0.2) |
| 75% | Orange-red RGB(1, 0.3, 0.1) |
| 100% | Dark red RGB(0.5, 0.1, 0.05) |

**AoE Damage:**
- Radius: 100 units
- Damage: 50% of direct hit damage with linear falloff
- Affects: All entities within radius (including friendlies)

---

## Shield Hit Effects

**File:** `src/rendering/shield-effects.ts`

When shields absorb damage:

- **Shape:** Expanding sphere at hit location
- **Color:** Cyan-blue RGB(0.3, 0.7, 1.0)
- **Size:** 3 units base, scales with damage intensity
- **Duration:** 0.3 seconds (SHIELD_HIT_DURATION)
- **Animation:** Expands (1.0 → 3.0x), fades out
- **Blending:** Additive

---

## Weapon Bank Positioning

**File:** `src/systems/weapon-spawning.ts`

When a ship has multiple weapon banks, projectiles/beams spawn from different positions:

- **Single Bank:** Spawns from ship center + forward offset
- **Multiple Banks:** Distributed laterally
  - Bank 0: Left
  - Bank 1: Right
  - Bank 2: Far left
  - Bank 3: Far right
  - etc.
- **Lateral Offset:** 1.5 units per pair

This creates a visual spread when firing multiple weapons simultaneously.

---

## Technical Notes

### Rendering Properties

All VFX use:
- **Additive Blending:** `THREE.AdditiveBlending` for glow effects
- **No Depth Write:** `depthWrite: false` to prevent z-fighting
- **Transparency:** All effects are transparent with varying opacity

### Performance Considerations

- **Object Pooling:** Geometries are reused where possible
- **Ring Buffers:** Trails use ring buffers to avoid allocations
- **Reusable Sets:** Entity tracking uses cleared Sets, not new allocations
- **Shared Geometries:** Sphere/cone geometries are cloned from shared templates

### Faction Color Scheme

| Faction | Primary Color | Use |
|---------|--------------|-----|
| Player | Green | Trails, muzzle flash |
| Enemy | Orange | Trails, muzzle flash |
| Neutral | Yellow | Trails, muzzle flash |

This consistent color scheme helps players quickly identify friend from foe during combat.
