# Rendering & Audio Review

**Last updated:** February 2026

## Overview

The rendering system uses Three.js for 3D graphics with extensive visual effects for weapons, explosions, and environmental elements. The game currently has no audio implementation.

## 3D Rendering

### Engine Configuration

| Setting | Value |
|---------|-------|
| Renderer | Three.js WebGLRenderer |
| FOV | 60° |
| Near clip | 1 |
| Far clip | 50,000 |
| Interpolation | Hermite (position), SLERP (rotation) |

### Lighting Setup

| Light | Color | Intensity | Purpose |
|-------|-------|-----------|---------|
| Ambient | #505050 | 0.6 | Base illumination |
| Directional | #ffffff | 1.4 | Sun shadow/highlight |

Directional light position derived from procedural skybox sun.

### Ship Models

14 ship geometry definitions in `ship-geometries.ts`:

**Combat Ships (9):**
- scout, interceptor, fighter, striker
- bomber, defender, raider, sentinel, patrol

**Structures (5):**
- convoy, station-mining, station-refinery
- station-military, station-turret

**Geometry Format:**
- Embedded position/normal/index arrays
- Hull collision data for physics
- Faction-based coloring (Green/Red/Yellow)

## Visual Effects

### Projectile System

| Weapon Type | Geometry | Trail Length |
|-------------|----------|--------------|
| Energy (Plasma, Pulse, Ion) | Sphere | 5-8 points |
| Ballistic (Autocannon, Slug) | Cylinder | 3-15 points |
| Special (Gyrojet) | Capsule | 10 points |

**Trail Implementation:**
- Ring buffer for position history
- Color fades from dim (old) to bright (new)
- Object pooling for performance

### Beam Weapons

| Beam | Visual | Special |
|------|--------|---------|
| Red/Green/Blue Laser | Line2 | 0.15s fade-out |
| Lightning | Midpoint displacement | Jagged electric effect |
| Nuclear Lance | Line + origin flash | Impact ring effect |

**Line2 Usage:** Provides consistent cross-platform line width.

### Explosions

**Standard Explosion:**
- Dual-layer: expanding sphere + radiating particles
- 24 particles, 0.8s duration
- Orange color (#FF8010)

**Nuclear Explosion:**
- Multi-stage: flash → shockwave ring → fireball
- 64 particles, 2.0s duration
- Color progression: white → yellow → orange → red
- Point light for illumination

### Shield Effects

- Cyan-blue flash at impact point
- Expands (1.0 → 3.0×) and fades
- 0.3s duration
- Multiple simultaneous hits supported

### Missile Exhaust

- Glowing cone at missile rear
- Flickering intensity (overlapping sine waves)
- Point light follows missile
- Color: orange-yellow core, deep orange glow

### Muzzle Flash

| Event | Duration | Animation |
|-------|----------|-----------|
| Projectile fire | 0.08s | Expand + fade |
| Beam active | Continuous | Pulsing glow |

Colors match weapon type.

## Skybox Generation

Procedural skybox from seed (`src/rendering/skybox/`):

### Components

1. **Stars:** Point sprites at random positions
2. **Nebulae:** 4D Perlin noise for seamless cubemap
3. **Sun:** Directional light source with glow

### Technical Details

| Parameter | Value |
|-----------|-------|
| Resolution | 2048×2048 per face |
| Noise | 4D Perlin for seamlessness |
| Generation | One-time at mission start |

## HUD Rendering

### Technologies

| Element | Technology |
|---------|------------|
| Menus | HTML/CSS overlay |
| Reticles | Canvas 2D |
| Radar | Canvas 2D |
| Target camera | WebGL PiP |

### HUD Elements

| Location | Content |
|----------|---------|
| Bottom center | Status bars (shields, hull, heat, speed) |
| Top right | Target info + camera |
| Bottom left | Radar (150×150 px) |
| Top left | Wingman/convoy/station status |
| Bottom right | Weapon banks |

## Performance Optimizations

### Object Pooling

| Effect | Pool Size |
|--------|-----------|
| Explosions | 20 |
| Muzzle flashes | 50 |
| Projectile trails | 100 |

### Geometry Caching

- Ship meshes built once, cloned for instances
- Shared geometries for projectiles
- Lazy initialization on first use

### Rendering Optimizations

| Technique | Purpose |
|-----------|---------|
| Interpolation | Smooth 60fps independent of physics tick |
| Dust tiling | Infinite space with finite particles |
| Frustum culling | Skip off-screen objects |
| LOD (planned) | Reduce detail at distance |

## Audio System

### Current Status

**No audio system is implemented.** This is a significant gap in the game experience.

### Missing Audio Categories

| Category | Examples |
|----------|----------|
| Weapon sounds | Fire, impact, reload |
| Explosions | Size-scaled detonations |
| Engine sounds | Thrust, afterburner |
| Ambient | Space hum, radio chatter |
| Music | Combat, menu, victory/defeat |
| UI | Button clicks, notifications |

### Recommended Implementation

```
Web Audio API
     │
     ├── SFX Manager
     │   ├── Weapon sounds (positional)
     │   ├── Explosion sounds (positional)
     │   └── UI sounds (2D)
     │
     └── Music Manager
         ├── Ambient tracks
         ├── Combat intensity
         └── Stingers (victory/defeat)
```

**Spatial audio** would enhance combat awareness by indicating threat directions.

## Key Files

| File | Purpose |
|------|---------|
| `src/rendering/renderer.ts` | Core scene management |
| `src/rendering/ship-geometries.ts` | Ship model data |
| `src/rendering/effects/` | Visual effect systems |
| `src/rendering/hud/` | HUD elements |
| `src/rendering/skybox/` | Procedural skybox |
| `src/rendering/interpolation.ts` | Smooth motion |

## Strengths

1. **Visual Variety:** Each weapon type has distinct visuals
2. **Procedural Skybox:** Infinite variety from seeds
3. **Good Performance:** Pooling and caching throughout
4. **Smooth Motion:** Hermite interpolation prevents jitter
5. **Deterministic Generation:** Replay-safe visuals

## Areas for Improvement

1. **No Audio:** Critical gap in game feel
2. **No Post-Processing:** No bloom, HDR, or glow
3. **Limited LOD:** All detail levels rendered always
4. **Fixed Resolution:** No dynamic scaling
5. **No Shadows:** Ships don't cast shadows
