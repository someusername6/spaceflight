# Implementation Progress

## Completed Phases

### Phase 2: Basic Flight ✅
ECS framework, core components, input/physics/collision/damage systems, basic renderer, game loop.

### Phase 3: Combat Variety ✅
Weapons (projectiles, missiles, beams, decoys), shields, AI (states, behaviors, profiles), targeting, HUD, visual effects.

### Phase 4: Campaign Loop ✅
- **4.1 Minimal Loop**: Screen state machine, hangar/contracts/results UI, campaign controller
- **4.2 Mission Pacing**: Wave-based spawning, wingman threat prioritization, balance targets (Easy 80-90%, Medium 70-80%, Hard 60-70% win rates, 90s+ avg time)
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
  - Sector 3: Advanced (bomber, sentinel, red laser, lightning, torch, gyrojet, torpedo)
  - Sector 4: Elite (striker, defender, railgun, nuke)
  - Sector 5: Ultimate (nuclear lance)

### 5.3 Mission Content ✅
- **74 Total Missions** across all 5 sectors (`src/ui/screens/missions/`)
  - Sector 1: 14 missions (Frontier - Green/Rookie/Regular enemies)
  - Sector 2: 16 missions (Contested Zone - Rookie/Regular/Veteran enemies)
  - Sector 3: 16 missions (Warzone - Regular/Veteran/Ace enemies)
  - Sector 4: 15 missions (Core Systems - Veteran/Ace enemies)
  - Sector 5: 13 missions (Endless - Ace enemies)
- **Elite Archetypes** for late-game (`src/factories/enemy-archetypes.ts`)
  - titan: Striker with railguns
  - juggernaut: Defender with nukes
  - wraith: Sentinel with nuclear lance
  - behemoth: Bomber with heavy ordnance
  - phantom: Interceptor elite dogfighter
  - specter: Elite sniper raider

### 5.4 Save System Improvements ✅
- **IndexedDB Storage**: Campaign saves migrated from localStorage to IndexedDB (`src/campaign/storage/`)
  - `campaign-db.ts` - Database operations (CRUD)
  - `db-connection.ts` - Connection management
  - `campaign-autosave.ts` - Automatic save functionality
  - `checkpoint.ts` - Mission checkpoint management
- **Campaign Creation Modal**: New game configuration (`src/ui/screens/campaign-create.ts`)
  - Commander name input
  - Game mode toggle (Ironman vs Standard)
  - Aim assist selector (0-5° in 0.5° steps)
- **Replay System**: Input recording and deterministic playback (`src/replay/`)
  - `types.ts` - Replay data structures (versioned with migration support)
  - `input-recorder.ts` - Captures player inputs and deployment data
  - `mission-setup.ts` - Reconstructs world state for playback
  - `storage.ts` - IndexedDB storage with FIFO eviction
  - `gzip.ts` - Compression for replay export/import
- **Replays Screen**: Browse and manage replays (`src/ui/screens/replay/replay-list.ts`)
  - List saved replays with metadata (mission, outcome, duration, date)
  - Watch, export, delete replays
- **Settings Enhancements**: Graphics and gameplay options (`src/settings/game-settings.ts`)
  - Frame rate cap (30/60/120/uncapped)
  - Player autoaim adjustment (0-5°)
- **Logging System**: Centralized debug logging (`src/core/logger.ts`)
  - `logDebug()` - Debug-only output (controlled via localStorage)
  - `logWarn()`, `logError()` - Always-visible warnings/errors

### 5.5 Escort & Station Defense Balance ✅
- **playerThreatRatio Parameter**: Controls enemy targeting split between player/allies and objective
  - `EscortMissionData.playerThreatRatio` and `StationDefenseMissionData.playerThreatRatio`
  - Range 0-1: 0 = all enemies attack objective, 1 = all enemies attack player/allies
  - Applied via PRNG for deterministic behavior mode assignment
- **Balance Targets** (same as elimination missions):
  - Easy: 80-90% win rate, 3.0-3.5 wingman survival on wins
  - Medium: 70-80% win rate, 2.5-3.0 wingman survival on wins
  - Hard: 60-70% win rate, 2.0-2.5 wingman survival on wins
- **Recommended Ratios** (tuned per difficulty):
  - Easy: 0.15 (15% attack player/allies, 85% attack objective)
  - Medium: 0.25 (25% attack player/allies, 75% attack objective)
  - Hard: 0.35 (35% attack player/allies, 65% attack objective)
- **Victory Conditions**:
  - Escort: Binary (≥1 convoy ship escapes = victory), reward scales with convoy survival
  - Station Defense: Binary (station survives = victory), reward scales with station health
- **Implementation Files**:
  - `src/campaign/types.ts` - Type definitions
  - `src/campaign/mission/escort-launcher.ts` - Applies ratio during enemy spawn
  - `src/campaign/mission/station-defense-launcher.ts` - Applies ratio to wave spawns
  - `src/ui/screens/missions/sector*/escort.ts` - Per-mission ratio values
  - `src/ui/screens/missions/sector*/station-defense.ts` - Per-mission ratio values

### 5.6 Remaining (Planned)
Procedural contracts, more ship classes, sound/music.
