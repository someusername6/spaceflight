# Rendering Module Registry

Non-deterministic rendering modules. These read from World state but never modify it.

## Core Rendering

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| renderer.ts | Three.js scene setup, entity mesh sync, beam lines | Three.js, beams.ts |
| skybox.ts | Procedural nebula generation with Perlin noise | Three.js, PRNG |
| skybox-stars.ts | Star field point generation | Three.js |
| skybox-constants.ts | Color constants for skybox | - |

## HUD System

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| hud.ts | Main HUD controller, status bars | weapon-display, reticles, radar |
| hud-styles.ts | CSS styling for HUD elements | - |

## Weapon Display

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| weapon-display.ts | Primary weapon bank display, link indicator | weapon-display-utils |
| weapon-display-secondary.ts | Secondary weapon update logic | weapon-display-utils |
| weapon-display-utils.ts | Bank element creation, signature helpers | - |
| weapon-display-styles.ts | CSS styling for weapon panels | - |

## Targeting Display

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| reticles.ts | Target reticle orchestration | reticle-drawing, lead-indicators |
| reticle-drawing.ts | Target brackets, lock indicator, off-screen arrows | - |
| lead-calculation.ts | Intercept point calculation (projectile lead) | - |
| lead-indicators.ts | Lead indicator rendering for linked/single modes | lead-calculation |

## Tactical Display

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| radar.ts | 2D tactical radar (6DOF, logarithmic scale) | - |

## Effects

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| dust.ts | Velocity dust particles around player | Three.js |
| explosions.ts | Explosion geometry and animation | Three.js |

## Shaders

Located in `shaders/` subdirectory:

| Module | Purpose |
|--------|---------|
| noise4d.glsl.ts | 4D Perlin noise for procedural generation |

## Adding a New Rendering Module

1. Add entry to the appropriate section above
2. Create file in `src/rendering/`
3. Ensure it only READS from World state, never writes
4. Keep under 300 lines (split if needed)
