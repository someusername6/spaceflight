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
- **Kiting Aim Error Multiplier** (`src/data/ai-playstyles.ts:34-40`): Kiting playstyle applies 4x tiered aim error (ace 1x, rookie 4x) to overcome railgun's 2° autoaim. This creates meaningful skill differentiation for sniper archetype.
- **Angular Velocity Aim Error** (`src/systems/aim-error.ts:40-66`): AI accuracy now affected by target's perpendicular movement. Moving perpendicular to the shooter's line of fire increases aim error, making evasion more viable.
- **Smart Evade Direction** (`src/systems/ai/ai-behaviors.ts:124-161`): Evading ships now prefer perpendicular escape (70%) with slight away bias (30%) to maximize angular velocity while still gaining distance.
- **AI Afterburner in Evade** (`src/systems/ai/ai-behaviors.ts:169-195`): AI ships now use afterburner when evading, enabling faster escape.

### Known Balance Issues

- **Sniper skill scaling** (`src/data/ai-playstyles.ts:34-40`): Sniper uses 4x tiered aim error for kiting playstyle. This creates good A>V differentiation (34-48%) but makes regular-skill snipers weak in TTK matrix (~5% win rate). This is **intentional** - sniper is a high-skill-ceiling precision archetype. The railgun's 2° autoaim creates a binary threshold: ace (0.5° error) hits consistently, while lower skills (4-22° error) miss frequently. Thematically appropriate for a precision weapon.

- **LancerBlue R>Rk weakness** (`src/factories/ship-archetypes.ts:197-212`): Blue laser's heavy damage falloff at range (50 DPS base / distance factor) causes long fights where skill differences matter less. R>Rk at 30-40%. Brawler playstyle helps but blue laser is inherently weak at the ranges where skill would differentiate.

- **Striker mirror variance** (`src/factories/ship-archetypes.ts:96-105`): Striker skill scaling hovers around 50-55% for all matchups (R>Rk, V>R, A>V), making mirrors near coin-flips. This is **inherent** to striker's design: 5 primary weapons (plasma, autocannon, greenLaser, 2x pulse) dilute per-shot accuracy differences, high tankiness (200 HP) extends fights, and equal slow speed (200 m/s) prevents decisive chases. Unlike sniper where skill clearly differentiates (ace hits, rookie misses), striker's multi-weapon DPS averages out skill differences. Thematically appropriate for a heavily-armed slugfest brawler.

---

## Phase 4: Slice 3 - Campaign Loop

(Not started)
