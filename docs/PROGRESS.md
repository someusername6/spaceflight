# Implementation Progress

## Completed Phases

### Phase 2: Basic Flight ✅
ECS framework, core components, input/physics/collision/damage systems, basic renderer, game loop.

### Phase 3: Combat Variety ✅
Weapons (projectiles, missiles, beams, decoys), shields, AI (states, behaviors, profiles), targeting, HUD, visual effects.

### Phase 4: Campaign Loop ✅
- **4.1 Minimal Loop**: Screen state machine, hangar/contracts/results UI, campaign controller
- **4.2 Mission Pacing**: Wave-based spawning, wingman threat prioritization, balance targets (Easy 85%, Medium 65%, Hard 45% win rates)
- **4.3 QoL**: Auto-targeting, match speed, target camera, lead indicator smoothing, decoys targetable
- **4.4 Combat Stats**: Per-ship/weapon stats, kill/assist attribution, debrief UI
- **4.5 Campaign Economy**: Equipment inventory, loadout customization, store, item-based salvage, pilot hiring, squad selection

---

## Game Rules

**Ship Destruction:**
- Hull and equipped weapons are lost
- Pilot is KIA (removed from roster)
- Commander death = game over

**Salvage (0-10% per destroyed enemy):**
- Scrap pieces (convertible to hulls at 100 scrap + 5% fee)
- Chance to recover weapons
- Percentage of remaining ammo/missiles

**Pilot Hiring:**
- Skill distribution: 35% rookie/regular, 20% veteran, 8% ace, 2% elite
- Prices: rookie 75, regular 200, veteran 400, ace 700, elite 1200 credits
- Pool refreshes (3-5 new recruits) after each mission

**Squad Deployment:**
- Max 4 ships per mission
- Commander always deploys
- Non-deployed ships stay safe

---

## Known Balance Issues

**Sniper skill scaling**: Intentional high-skill-ceiling design. Railgun's 2° autoaim creates binary threshold - ace hits consistently, lower skills miss frequently. Regular-skill snipers weak (~5% win rate) but thematically appropriate.

**LancerBlue R>Rk weakness**: Blue laser's heavy damage falloff causes long fights where skill matters less. R>Rk at 30-40%. Inherent to weapon design.

**Striker mirror variance**: 50-55% for all skill matchups due to multi-weapon DPS averaging out accuracy differences. Thematically appropriate for slugfest brawler.

---

## Phase 5: Content & Polish (Next)

Planned: Procedural contracts, campaign progression, ship repairs, more ship classes, sound/music, save/load.
