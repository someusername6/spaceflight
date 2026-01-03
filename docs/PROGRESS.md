# Implementation Progress

Tracks actual implementation status with file references as evidence.
**Last updated:** 2026-01-03

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
- [x] BeamSystem → `src/systems/beams.ts:40-190`

### 3.3 Shield System
- [x] Shields component → `src/components/shields.ts:7-29`
- [x] Shield regeneration → `src/components/shields.ts:53-58`
- [x] Shield system → `src/systems/shields.ts:14-21`

### 3.4 AI Implementation
- [x] AI state enum → `src/components/ai.ts:8-15`
- [x] AIControlled component → `src/components/ai.ts:17-24`
- [x] Aim error component → `src/components/aim-error.ts:11-23`
- [x] Aim error system → `src/systems/aim-error.ts:11-14`
- [x] AI system → `src/systems/ai.ts:50-75` (state machine: Idle/Pursue/Engage)
- [x] AI weapon firing → `src/systems/weapons.ts:78-105` (with aim error)
- [x] Max-3-on-human constraint → `src/systems/ai.ts:31-48`

### 3.5 Targeting System
- [x] Targeting component → `src/components/targeting.ts:7-31`
- [x] Lock-on progress → `src/systems/weapons.ts:141-171`
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
- [x] Lead indicator → `src/rendering/lead-calculation.ts:16-68` (intercept calculation), `src/rendering/reticles.ts:206-238` (rendering with range check)
- [x] Lock-on indicator (visual) → `src/rendering/reticle-drawing.ts:99-132`, `src/rendering/reticles.ts:201-205`
- [ ] Weapon banks display
- [ ] Allied health bars
- [ ] Target camera + stats
- [ ] 2D radar

### 3.7 Visual Effects
- [x] Beam rendering → `src/rendering/renderer.ts:159-201`
- [ ] Projectile trails
- [ ] Missile exhaust
- [ ] Explosions
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
| 3.2 Weapon Systems | 4 | 4 | 100% |
| 3.3 Shield System | 3 | 3 | 100% |
| 3.4 AI Implementation | 7 | 7 | 100% |
| 3.5 Targeting System | 4 | 4 | 100% |
| 3.6 HUD Implementation | 9 | 13 | 69% |
| 3.7 Visual Effects | 1 | 5 | 20% |
| 3.8 Dust Particles | 1 | 1 | 100% |
| **Phase 3 Total** | **33** | **41** | **80%** |
