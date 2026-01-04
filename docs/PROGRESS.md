# Implementation Progress

Tracks actual implementation status.

---

## Phase 2: Slice 1 - Basic Flight ✅

ECS framework, core components (transform, physics, health, faction), input/physics/collision/damage/cleanup/mission systems, basic renderer, game loop.

---

## Phase 3: Slice 2 - Combat Variety ✅

Weapon components and systems (projectiles, missiles, beams, decoys), shield system, AI implementation (states, behaviors, profiles, weapon selection), targeting system, HUD (status bars, reticles, radar, weapon display), visual effects (trails, explosions, lightning, nuclear lance), dust particles.

### Recent Balance Changes

- **Beam Aim Error** (`src/systems/ai/ai-movement.ts:110-130`): Beam weapons now apply aim error to ship rotation rather than beam direction, since beams are fixed-mount. Uses cached `hasBeams` flag for efficiency.
- **Beam Lead Calculation Skip** (`src/systems/ai/ai-pursuit.ts:71-98`): Beam-only ships skip lead calculation since beams are hitscan. Uses cached `hasOnlyBeams` flag.
- **Lancer Archetype Split** (`src/factories/ship-archetypes.ts:181-229`): Split lancer into three variants (green/blue/red laser). All use brawler playstyle - kiting caused severe skill inversion for beam ships.
- **Angular Velocity Aim Error** (`src/systems/aim-error.ts:40-66`): AI accuracy now affected by target's perpendicular movement. Moving perpendicular to the shooter's line of fire increases aim error, making evasion more viable.
- **Smart Evade Direction** (`src/systems/ai/ai-behaviors.ts:124-161`): Evading ships now prefer perpendicular escape (70%) with slight away bias (30%) to maximize angular velocity while still gaining distance.
- **AI Afterburner in Evade** (`src/systems/ai/ai-behaviors.ts:169-195`): AI ships now use afterburner when evading, enabling faster escape.

### Known Balance Issues

- **Sniper skill inversion**: Kiting playstyle + railgun autoaim causes lower-skill pilots to win more often (26%, 28%, 28%, 48%). Needs systemic fix to kiting skill scaling.
- **LancerBlue R>Rk inversion**: Blue laser's low DPS at range causes long fights where skill differences matter less (28% win rate).

---

## Phase 4: Slice 3 - Campaign Loop

(Not started)
