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

### Phase 4.1: Minimal Campaign Loop ✅

- **Campaign data types** (`src/campaign/types.ts`): OwnedShip, Contract, Pilot, CampaignState
- **Campaign state management** (`src/campaign/state.ts`): createNewCampaign, applyMissionResults, isGameOver
- **Screen state machine** (`src/ui/screens.ts`): Screen enum (HANGAR, CONTRACTS, MISSION, RESULTS, GAME_OVER), transitions
- **UI styles** (`src/ui/styles.ts`): Dark space theme CSS for campaign screens
- **Hangar UI** (`src/ui/hangar.ts`): Ship list with hull status, "Select Contract" navigation
- **Contract UI** (`src/ui/contracts.ts`): 3 hardcoded contracts (easy/medium/hard), enemy details
- **Results UI** (`src/ui/results.ts`): Victory/defeat screen, credits earned, game over screen
- **Campaign controller** (`src/campaign/controller.ts`): Orchestrates flow, spawns missions from contracts
- **Main entry** (`src/main.ts`): Now starts campaign instead of hardcoded scene

### Phase 4.2: Mission Pacing & Balance ✅

- **Wave-based spawning** (`src/campaign/controller.ts:188-207`, `src/ui/contracts.ts:20-66`): Enemies spawn in waves with delays, creating longer engagements. Easy: 3 enemies/2 waves, Medium: 4 enemies/2 waves, Hard: 5 enemies/3 waves.
- **Contract wave types** (`src/campaign/types.ts`): ContractWave with enemies array and delay between waves.
- **Wingman protection** (`src/systems/ai/ai-utils.ts:69-107`, `src/systems/ai/ai.ts`): Wingmen prioritize enemies actively targeting the player via `findNearestThreatToPlayer()`.
- **Removed Protect state** (`src/components/ai.ts`, `src/data/ai-profiles.ts`, `src/systems/ai/ai-behaviors.ts`): Replaced complex Protect state machine with simpler target prioritization in updateIdle.
- **Missile lock times** (`src/data/missiles.ts`): Doubled lock times for pacing (seeker: 4s, dart: 2s, torpedo: 7s, nuke: 10s).
- **Mission pacing tests** (`scripts/tests/campaign/test-mission-pacing.mjs`): Smoke tests measuring win rate and time for idle and AI players at each skill level.

Balance targets achieved:
- Easy: 85% regular AI win rate, ~25s avg
- Medium: 65% regular AI win rate, ~40s avg
- Hard: 45% regular AI win rate, ~55s avg

### Phase 4.3: Player Quality of Life ✅

- **Auto-targeting** (`src/systems/targeting.ts:85-95`): Player automatically targets nearest enemy at mission start, when enemies spawn, and when current target is destroyed.
- **Match speed toggle** (`src/systems/physics.ts:207-253`): M key toggles match speed mode. Throttle auto-adjusts to maintain distance to target using closing rate calculation.
- **Match speed state** (`src/components/player.ts:11-16`): Tracks matchSpeed enabled, prevTargetDistance, and prevMatchSpeedTarget for distance calculation.
- **Manual override** (`src/systems/physics.ts:176`): Throttle input (Shift/Ctrl/Z) overrides match speed while held.
- **HUD indicator** (`src/rendering/hud/hud.ts:94`, `src/rendering/hud/hud-styles.ts:36-46`): "[MATCH SPEED]" indicator above status bars when mode is active.
- **Enemy callsigns** (`src/components/ship-identity.ts:11-34`): Wave-based callsign prefixes for enemies (Draco 1, Hydra 2, etc.). Each wave uses a different prefix from a configurable pool of 16 names.
- **Wave-based callsign assignment** (`src/campaign/controller.ts:151-152`): Enemies spawned in wave 0 get "Draco", wave 1 gets "Hydra", etc. Cycles if more waves than prefixes.
- **Target camera** (`src/rendering/hud/target-camera.ts`): Picture-in-picture camera view of current target. Uses WebGLRenderTarget (160x120) to render target from behind/above, displayed in target stats panel. Far plane matches main camera (10000) to render skybox.
