# Implementation Progress

Tracks actual implementation status with file references as evidence.
**Last updated:** 2026-01-03 (Heat locking hysteresis + ship heat differentiation)

---

## Phase 2: Slice 1 - Basic Flight ✅

- [x] ECS Framework → `src/core/ecs.ts`
- [x] PRNG → `src/core/prng.ts`
- [x] Transform component → `src/components/transform.ts`
- [x] Physics component → `src/components/physics.ts`
- [x] Health component → `src/components/health.ts`
- [x] Faction component → `src/components/faction.ts`
- [x] Input system → `src/systems/input.ts`
- [x] Physics system → `src/systems/physics.ts`
- [x] Collision system → `src/systems/collision.ts`
- [x] Damage system → `src/systems/damage.ts`
- [x] Cleanup system → `src/systems/cleanup.ts`
- [x] Mission system → `src/systems/mission.ts`
- [x] Basic renderer → `src/rendering/renderer.ts`
- [x] Game loop → `src/game.ts`

---

## Phase 3: Slice 2 - Combat Variety

### 3.1 Weapon Components
- [x] PrimaryWeapons → `src/components/weapons.ts:38-43`
- [x] SecondaryWeapons → `src/components/weapons.ts:46-53`
- [x] Heat → `src/components/heat.ts:7-41`
- [x] Ammo (inline in PrimaryWeapon) → `src/components/weapons.ts:19-20`
- [x] Decoy component → `src/components/decoy.ts:14-21`

### 3.2 Weapon Systems
- [x] WeaponSystem → `src/systems/weapons.ts:41-80`
- [x] ProjectileSystem → `src/systems/projectiles.ts:16-69`
- [x] MissileSystem → `src/systems/missiles.ts:21-117`
- [x] BeamSystem → `src/systems/beams.ts:42-88`
- [x] Bank linking (linked/single mode) → `src/systems/weapons.ts:130-132` (toggle), `src/systems/weapons.ts:179-214` (linked firing), `src/systems/beams.ts:93-124` (linked beams), `src/components/weapons.ts:43` (linked field)
- [x] DecoySystem → `src/systems/decoys.ts:16-49` (movement, lifetime, missile collision)
- [x] Missile seduction by decoys → `src/systems/missiles.ts:52-64` (50% chance within 200 units)
- [x] Missile destructibility → `src/systems/weapon-spawning.ts:290` (1 HP, destroyed by any hit)
- [x] Nuke AoE destroys projectiles → `src/systems/missiles.ts:366-400`
- [x] Bank size scaling → `src/components/weapons.ts:21,42,184-188,225-227` (bankSize field, WeaponBankSpec, getEffectiveHeat), `src/systems/weapons.ts:202` (projectile heat scaling), `src/systems/beams.ts:125,170` (beam heat scaling), `src/components/missile.ts:149-159` (missile count scaling)
- [x] Heat locking with hysteresis → `src/components/heat.ts:12-17` (threshold constants), `src/components/heat.ts:24` (weaponsLocked flag), `src/components/heat.ts:54-63` (weapon lock at 100%, unlock at 95%), `src/systems/physics.ts:127-141` (afterburner lock at 95%, unlock at 50%)
- [x] Per-ship heat differentiation → `src/factories/ship.ts:52` (afterburnerHeatRate in ShipStats), `src/factories/ship.ts:57-226` (7 ship archetypes with unique heat profiles)

### 3.3 Shield System
- [x] Shields component → `src/components/shields.ts:7-29`
- [x] Shield regeneration → `src/components/shields.ts:53-58`
- [x] Shield system → `src/systems/shields.ts:14-21`

### 3.4 AI Implementation
- [x] AI state enum → `src/components/ai.ts:8-15`
- [x] AIControlled component → `src/components/ai.ts:17-24`
- [x] Aim error component → `src/components/aim-error.ts:11-23`
- [x] Aim error system → `src/systems/aim-error.ts:11-14`
- [x] AI system (Idle/Pursue/Engage) → `src/systems/ai.ts:58-110`
- [x] AI Evade state → `src/systems/ai-behaviors.ts:82-121` (breaks away, ship-relative barrel roll)
- [x] AI Protect state → `src/systems/ai-behaviors.ts:124-178` (aggressively engages threats, 400-unit leash)
- [x] AI Regroup state → `src/systems/ai-behaviors.ts:181-223` (ship-relative loop to recover)
- [x] AI primary weapon firing → `src/systems/weapons.ts:90-104` (with aim error, always linked)
- [x] AI missile firing policy → `src/systems/weapons.ts:107-122` (fires when locked in Engage state)
- [x] AI decoy usage → `src/systems/weapons-ai.ts:99-123` (launches when targeted by missiles, 2s cooldown)
- [x] Max-3-on-human constraint → `src/systems/ai.ts:41-50`

### 3.5 Targeting System
- [x] Targeting component → `src/components/targeting.ts:7-31`
- [x] Lock-on progress → `src/systems/weapons.ts:217-248`
- [x] Target cycling → `src/systems/targeting.ts:46-59`
- [x] Targeting system → `src/systems/targeting.ts:23-60`

### 3.6 HUD Implementation
- [x] Speed bar → `src/rendering/hud.ts:168-194`
- [x] Hull bar → `src/rendering/hud.ts:196-204`
- [x] Shields bar → `src/rendering/hud.ts:206-214`
- [x] Heat bar → `src/rendering/hud.ts:216-224`
- [x] Target reticles (corner brackets) → `src/rendering/reticle-drawing.ts:38-97`
- [x] Off-screen arrows → `src/rendering/reticle-drawing.ts:164-247`
- [x] Distance display → `src/rendering/reticle-drawing.ts:95`
- [x] Lead indicator → `src/rendering/lead-calculation.ts:16-68` (intercept calculation), `src/rendering/lead-indicators.ts` (multiple indicators in linked mode, out-of-range styling)
- [x] Lock-on indicator (visual) → `src/rendering/reticle-drawing.ts:99-132`, `src/rendering/reticles.ts:201-205`
- [x] Weapon banks display → `src/rendering/weapon-display.ts`, `weapon-display-utils.ts`, `weapon-display-styles.ts`, `weapon-display-secondary.ts` (ammo, heat, lock status for all secondaries, cooldown indicator, keyboard hints, link state [V])
- [x] Allied health bars → `src/rendering/allied-hud.ts` (wingman status, hull/shield bars, distance, critical state pulsing)
- [x] Target stats panel → `src/rendering/target-stats.ts` (callsign, ship type, hull/shield bars, distance, closure rate/aspect)
- [x] 2D radar → `src/rendering/radar.ts` (6DOF ship-relative, logarithmic scaling, faction colors)

### 3.7 Visual Effects
- [x] Beam rendering → `src/rendering/renderer.ts:159-201`
- [x] Beam fade-out → `src/rendering/renderer.ts:198-218` (0.15s fade when stopped)
- [x] Projectile trails → `src/rendering/trails.ts:42-142` (8-point ring buffer, faction colors)
- [x] Muzzle flash → `src/rendering/muzzle-flash.ts:57-158` (faction colors, beam glow)
- [x] Missile exhaust → `src/rendering/missile-exhaust.ts:42-130` (flickering cone + point light)
- [x] Explosions → `src/components/explosion.ts`, `src/systems/explosions.ts`, `src/rendering/explosions.ts`
- [x] Nuke explosion → `src/rendering/explosions.ts:243-412` (multi-stage: flash, ring, color progression, point light)
- [x] Nuke AoE damage → `src/systems/missiles.ts:175-213` (100-unit radius, linear falloff)
- [x] Shield hit effects → `src/components/shield-hit.ts`, `src/rendering/shield-effects.ts:38-132`
- [x] Weapon bank spawn offsets → `src/systems/weapon-spawning.ts:43-71` (projectiles/beams spawn from distinct positions)
- [x] Missile type visuals → `src/rendering/renderer.ts:129-188` (size, color, fins, glow per type)
- [x] Decoy visuals → `src/rendering/renderer.ts:190-203` (glowing sphere, faction colors)
- [x] Projectile hit effects → `src/rendering/projectile-hits.ts` (damage-driven: only when hull takes damage)
- [x] Damage-driven hit logic → `src/systems/damage.ts:59-108` (shield hit if shields absorb, hull hit if hull damaged)

### 3.8 Dust Particles
- [x] Dust system → `src/rendering/dust.ts:74-180`

---

## Phase 4: Slice 3 - Campaign Loop

(Not started)

---

## Summary

| Section | Done | Total | % |
|---------|------|-------|---|
| 3.1 Weapon Components | 5 | 5 | 100% |
| 3.2 Weapon Systems | 12 | 12 | 100% |
| 3.3 Shield System | 3 | 3 | 100% |
| 3.4 AI Implementation | 12 | 12 | 100% |
| 3.5 Targeting System | 4 | 4 | 100% |
| 3.6 HUD Implementation | 13 | 13 | 100% |
| 3.7 Visual Effects | 14 | 14 | 100% |
| 3.8 Dust Particles | 1 | 1 | 100% |
| **Phase 3 Total** | **64** | **64** | **100%** |
