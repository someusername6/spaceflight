# Implementation Progress

Tracks actual implementation status with file references as evidence.
**Last updated:** 2026-01-03 (AI Evade/Protect/Regroup states)

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

### 3.2 Weapon Systems
- [x] WeaponSystem → `src/systems/weapons.ts:41-80`
- [x] ProjectileSystem → `src/systems/projectiles.ts:16-69`
- [x] MissileSystem → `src/systems/missiles.ts:21-117`
- [x] BeamSystem → `src/systems/beams.ts:42-88`
- [x] Bank linking (linked/single mode) → `src/systems/weapons.ts:130-132` (toggle), `src/systems/weapons.ts:179-214` (linked firing), `src/systems/beams.ts:93-124` (linked beams), `src/components/weapons.ts:43` (linked field)

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
- [x] AI Evade state → `src/systems/ai-behaviors.ts:74-103` (breaks away, erratic movement)
- [x] AI Protect state → `src/systems/ai-behaviors.ts:106-155` (positions between ally and threat)
- [x] AI Regroup state → `src/systems/ai-behaviors.ts:158-196` (loops away to recover)
- [x] AI primary weapon firing → `src/systems/weapons.ts:94-114` (with aim error, always linked)
- [ ] AI missile firing policy
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
- [ ] Allied health bars
- [ ] Target camera + stats
- [x] 2D radar → `src/rendering/radar.ts` (6DOF ship-relative, logarithmic scaling, faction colors)

### 3.7 Visual Effects
- [x] Beam rendering → `src/rendering/renderer.ts:159-201`
- [ ] Projectile trails
- [ ] Missile exhaust
- [x] Explosions → `src/components/explosion.ts:11-17`, `src/systems/explosions.ts:11-26`, `src/rendering/explosions.ts:99-143`
- [ ] Shield hit effects

### 3.8 Dust Particles
- [x] Dust system → `src/rendering/dust.ts:74-180`

---

## Phase 4: Slice 3 - Campaign Loop

(Not started)

---

## Summary

| Section | Done | Total | % |
|---------|------|-------|---|
| 3.1 Weapon Components | 4 | 4 | 100% |
| 3.2 Weapon Systems | 5 | 5 | 100% |
| 3.3 Shield System | 3 | 3 | 100% |
| 3.4 AI Implementation | 10 | 11 | 91% |
| 3.5 Targeting System | 4 | 4 | 100% |
| 3.6 HUD Implementation | 11 | 13 | 85% |
| 3.7 Visual Effects | 2 | 5 | 40% |
| 3.8 Dust Particles | 1 | 1 | 100% |
| **Phase 3 Total** | **40** | **46** | **87%** |
