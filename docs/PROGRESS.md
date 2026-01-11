# Implementation Progress

## Completed Phases

### Phase 2: Basic Flight ✅
ECS framework, core components, input/physics/collision/damage systems, basic renderer, game loop.

### Phase 3: Combat Variety ✅
Weapons (projectiles, missiles, beams, decoys), shields, AI (states, behaviors, profiles), targeting, HUD, visual effects.

### Phase 4: Campaign Loop ✅
- **4.1 Minimal Loop**: Screen state machine, hangar/contracts/results UI, campaign controller
- **4.2 Mission Pacing**: Wave-based spawning, wingman threat prioritization, balance targets (Easy 60-80%, Medium 40-60%, Hard 20-40% win rates, 90s+ avg time)
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
- Skill distribution scales by sector (interpolated between endpoints):
  - Sector 1: 50% rookie, 35% regular, 12% veteran, 2.5% ace, 0.5% elite (avg ~1.7)
  - Sector 5: 5% rookie, 15% regular, 35% veteran, 30% ace, 15% elite (avg ~3.4)
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

## Phase 5: Content & Polish (In Progress)

### 5.1 Save System & Game Flow ✅
- **Title Screen**: Main menu with New Game, Continue, Settings (`src/ui/screens/title.ts`)
- **Save System**: 3 save slots with localStorage persistence and versioning (`src/campaign/save-system.ts`)
- **Settings Screen**: Configurable key bindings with click-to-rebind UI (`src/ui/screens/settings.ts`)
- **Pause Menu**: Modal accessible from campaign screens via Escape key (`src/ui/screens/pause-menu.ts`)
- **Key Bindings**: Configurable controls stored in localStorage (`src/input/key-bindings.ts`)

### 5.2 Sector Progression ✅
- **Sector System**: 5 sectors with progressive difficulty (`src/campaign/types.ts:18-24`)
- **Sector Advancement**: Manual via "Advance to Sector X" button on contracts screen (`src/ui/screens/contracts.ts`)
  - Confirmation modal shows target sector and enemy skill levels (`src/ui/screens/sector-advance-modal.ts`)
  - Players can skip ahead at any time (risk/reward tradeoff)
- **Store Progression**: Items unlock by sector tier (`src/campaign/store/store-unlocks.ts`)
  - Sector 1: Basic ships (patrol, scout, fighter), basic weapons (pulse, ion, plasma), basic missiles
  - Sector 2: Mid-tier (interceptor, raider, autocannon, blue/green laser, dart, cluster)
  - Sector 3: Advanced (bomber, sentinel, red laser, lightning, torch, torpedo)
  - Sector 4: Elite (striker, defender, railgun, nuke)
  - Sector 5: Ultimate (nuclear lance)

### 5.3 Mission Content ✅
- **41 Total Missions** across all 5 sectors (`src/ui/screens/missions/`)
  - Sector 1: 9 missions (Frontier - Green/Rookie/Regular enemies, 2,500-4,600 cr)
  - Sector 2: 8 missions (Contested Zone - Rookie/Regular/Veteran enemies, 3,200-5,800 cr)
  - Sector 3: 8 missions (Warzone - Regular/Veteran/Ace enemies, 4,200-6,650 cr)
  - Sector 4: 8 missions (Core Systems - Veteran/Ace enemies, 5,900-9,550 cr)
  - Sector 5: 8 missions (Endless - Ace enemies, 8,350-13,050 cr)
- **Elite Archetypes** for late-game (`src/factories/enemy-archetypes.ts`)
  - titan: Striker with railguns
  - juggernaut: Defender with nukes
  - wraith: Sentinel with nuclear lance
  - behemoth: Bomber with heavy ordnance
  - phantom: Interceptor elite dogfighter
  - specter: Elite sniper raider

### 5.4 Remaining (Planned)
Procedural contracts, more ship classes, sound/music.
