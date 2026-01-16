# Game Data and Balance Review

**Date:** 2026-01-16
**Scope:** Comprehensive review of all game data files and balance systems

---

## Executive Summary

The game data is well-structured with clear separation of concerns between ship classes, weapons, missiles, AI profiles, and archetypes. The codebase demonstrates mature balance considerations with documented playstyle systems to prevent skill inversion. However, several issues were identified:

**Strengths:**
- Strong type safety throughout data definitions
- Archetype validation system catches invalid weapon references
- Playstyle system addresses skill scaling edge cases
- Comprehensive test coverage for balance verification
- Well-documented economy and progression targets

**Issues Found:**
- 4 potential balance outliers (detailed below)
- 2 missing validation checks
- 1 type safety gap
- Several documentation/code mismatches

**Overall Assessment:** Good - Ready for continued development with minor corrections needed.

---

## Ship Balance Analysis

### Ship Class Stats Overview

| Ship Class | Hull | Shields | Total HP | Speed | Turn Rate | Primary Banks | Secondary Banks | Price |
|------------|------|---------|----------|-------|-----------|---------------|-----------------|-------|
| Patrol | 45 | 45 | 90 | 90 | 80 | [1,1] | [1] | 200 |
| Scout | 55 | 35 | 90 | 150 | 120 | [1,1] | [1] | 300 |
| Fighter | 90 | 65 | 155 | 125 | 100 | [1,1] | [1,1] | 400 |
| Interceptor | 75 | 50 | 125 | 138 | 110 | [2,2] | [1,2,1] | 500 |
| Raider | 65 | 45 | 110 | 140 | 110 | [3,3,1,1] | [1,1,1] | 600 |
| Bomber | 110 | 80 | 190 | 90 | 75 | [2] | [2,2,2,1,1,1,1] | 700 |
| Sentinel | 110 | 110 | 220 | 100 | 90 | [3,2,2] | [2,2,1] | 750 |
| Striker | 130 | 90 | 220 | 100 | 80 | [2,2,2,1,1] | [1] | 800 |
| Defender | 165 | 130 | 295 | 90 | 70 | [2,2] | [2,2,1,1,1] | 900 |

### Balance Observations

**Well-Balanced:**
- Fighter serves as solid baseline (155 HP, 125 speed)
- Raider glass cannon role clear (110 HP but 140 speed, 4 primary banks)
- Defender tank role evident (295 HP, slowest at 90 speed)
- Price correlates with capability

**Potential Issues:**

1. **Scout vs Patrol Survivability** (Minor)
   - Both have 90 total HP, but Scout costs 50% more (300 vs 200)
   - Scout compensates with +67% speed (150 vs 90) and +50% turn rate
   - **Assessment:** Acceptable - speed premium justified

2. **Sentinel vs Striker Symmetry** (Design Question)
   - Both have 220 total HP
   - Sentinel has 110/110 (balanced), Striker has 130/90 (hull-heavy)
   - Different weapon profiles justify similar survivability
   - **Assessment:** Intentional design differentiation

3. **Bomber Secondary Capacity** (Potential Concern)
   - `src/data/ships.ts:191` - Bomber has 7 secondary banks vs Defender's 5
   - Bank sizes: [2,2,2,1,1,1,1] = 10 total capacity slots
   - This is appropriate for missile-focused role
   - **Assessment:** Working as intended

### Ship Hardpoint Analysis

Hardpoint counts match bank definitions for all ships - validation passes.

---

## Weapon Balance Analysis

### Primary Weapons DPS Comparison

| Weapon | Category | Damage | Fire Rate | DPS | Range | Ammo | Heat/Shot |
|--------|----------|--------|-----------|-----|-------|------|-----------|
| Plasma | Energy | 16 | 8/s | 128 | 800 | Inf | 5 |
| Pulse | Energy | 12 | 10/s | 120 | 500 | Inf | 5 |
| Ion | Energy | 10 | 5.5/s | 55 | 700 | Inf | 6 |
| Autocannon | Ballistic | 9 | 15.4/s | 138.5 | 400 | 200 | 1 |
| Slug Cannon | Ballistic | 45 | 2.5/s | 112.5 | 1000 | 100 | 6 |
| Railgun | Ballistic | 80 | 1/s | 80 | 2000 | 20 | 3 |
| Gyrojet | Ballistic | 200* | 4/s | 33-200* | 2000 | 60 | 5 |
| Flak | Ballistic | 0+40** | 4/s | 160** | 600 | 200 | 4 |
| Red Laser | Beam | 120/s | Cont | 120 | 400 | Inf | 15/s |
| Green Laser | Beam | 80/s | Cont | 80 | 800 | Inf | 12/s |
| Blue Laser | Beam | 50/s | Cont | 50 | 1200 | Inf | 10/s |
| Lightning | Beam | 50/s | Pulse | 50 | 300 | Inf | 20/s |
| Torch | Beam | 30/s | Cont | 30 | 200 | Inf | 25/s |
| Nuclear Lance | Beam | 500 | Inst | N/A | 3000 | 1 | 30 |

*Gyrojet damage scales with speed (33 at launch, 200 at max)
**Flak shrapnel: 10 pieces x 4 damage = 40 potential damage

### DPS Efficiency Analysis

**Top DPS by Category:**
- Energy: Plasma (128 DPS)
- Ballistic: Autocannon (138.5 DPS) - range-limited
- Beam: Red Laser (120 DPS) - range-limited

**Identified Issues:**

1. **Ion Cannon Underperformance** - `src/data/weapons.ts:119-127`
   - 55 DPS vs Plasma's 128 DPS (-57%)
   - Ion effect (shield regen suppression) may not compensate
   - **Recommendation:** Consider buff to 14-15 damage or faster fire rate

2. **Gyrojet Theoretical vs Practical DPS** - `src/data/weapons.ts:181-197`
   - Advertised 200 damage only at max speed after 2.5s acceleration
   - Practical close-range DPS ~33-50 due to speedDamageScale
   - Unique weapon role is intentional but may confuse players
   - **Assessment:** Working as designed, could use tooltip clarification

3. **Lightning vs Blue Laser Overlap** - `src/data/weapons.ts:229-241`
   - Both deal 50 DPS
   - Lightning: 300m range, pulse, 5 degree autoaim
   - Blue Laser: 1200m range, continuous
   - **Assessment:** Differentiated by range/autoaim - acceptable

### Ammo Economy

| Weapon | Ammo | Price/Round | Full Loadout Cost |
|--------|------|-------------|-------------------|
| Autocannon | 200 | 0.1 | 20 |
| Slug Cannon | 100 | 1 | 100 |
| Gyrojet | 60 | 2 | 120 |
| Flak | 200 | 2 | 400 |
| Railgun | 20 | 5 | 100 |
| Nuclear Lance | 1 | 50 | 50 |

**Assessment:** Ammo costs scale appropriately with weapon power. Autocannon is cheap to sustain, Flak is expensive reflecting area denial capability.

---

## Missile Balance Analysis

### Missile Stats Comparison

| Missile | Lock | Speed | Turn | Range | Damage | Fire Rate | Capacity | Price |
|---------|------|-------|------|-------|--------|-----------|----------|-------|
| Rocket | No | 600 | 0 | 1000 | 50 | 0.5s | 12 | 5 |
| Starburst | No | 600 | 0 | 1000 | 0+320* | 0.5s | 12 | 10 |
| Cluster | No | 400 | 60 | 1200 | 24** | 0.8s | 10 | 8 |
| Seeker | Yes | 400 | 90 | 2000 | 60 | 1.0s | 8 | 15 |
| Dart | Yes | 600 | 120 | 800 | 30 | 0.5s | 10 | 10 |
| Swarm | Yes | 400 | 100 | 600 | 16** | 0.1s | 20 | 7 |
| Torpedo | Yes | 200 | 30 | 4000 | 150 | 2.0s | 4 | 40 |
| Nuke | Yes | 150 | 20 | 3000 | 300 | 3.0s | 2 | 100 |
| Decoy | No | 50 | 0 | 0 | 0 | 0.5s | 6 | 20 |

*Starburst: 80 shrapnel x 4 damage = 320 max potential
**Cluster fires 3x8 damage; Swarm fires 8x2 damage

### Damage/Cost Efficiency

| Missile | Total Damage | Full Cost | Damage/Credit |
|---------|--------------|-----------|---------------|
| Rocket | 600 (12x50) | 60 | 10.0 |
| Seeker | 480 (8x60) | 120 | 4.0 |
| Dart | 300 (10x30) | 100 | 3.0 |
| Torpedo | 600 (4x150) | 160 | 3.75 |
| Nuke | 600 (2x300) | 200 | 3.0 |

**Identified Issues:**

1. **Rocket Efficiency vs Homing** (Intentional)
   - Rockets have 2-3x better damage/credit than homing missiles
   - Balanced by requiring direct aim (no tracking)
   - **Assessment:** Working as intended

2. **Dart vs Seeker Overlap** - `src/data/missiles.ts:98-121`
   - Dart: 30 damage, 600 speed, 120 turn, 2s lock
   - Seeker: 60 damage, 400 speed, 90 turn, 4s lock
   - Different niches: Dart for fast targets, Seeker for guaranteed hits
   - **Assessment:** Acceptable differentiation

3. **Swarm Effective DPS** - `src/data/missiles.ts:122-134`
   - 8x2 = 16 damage per salvo, 0.1s fire rate = 160 DPS theoretical
   - Lock requirement (2.5s) limits practical usage
   - **Assessment:** High burst potential balanced by lock time

### Lock Time Analysis

Lock times were doubled in a previous balance pass (per comments):
- Seeker: 4s (was 2s)
- Dart: 2s (was 1s)
- Swarm: 2.5s (was 1.25s)
- Torpedo: 7s (was 4s)
- Nuke: 10s (was 5s)

**Assessment:** Lock times create meaningful decisions between dumbfire and homing. Player has time to react to incoming locks.

---

## Mission/Progression Analysis

### Mission Structure (5 Sectors)

| Sector | Enemy Skill Range | Easy Missions | Medium Missions | Hard Missions | Reward Range |
|--------|-------------------|---------------|-----------------|---------------|--------------|
| 1 | Green-Rookie | 4 | 4 | 6 | 1,561-4,050 |
| 2 | Rookie-Regular | TBD | TBD | TBD | TBD |
| 3 | Regular-Veteran | TBD | TBD | TBD | TBD |
| 4 | Veteran-Ace | TBD | TBD | TBD | TBD |
| 5 | Veteran-Ace | 4+ | 4+ | 5+ | 7,000-12,145 |

### Win Rate Targets (from ECONOMY.md)

| Difficulty | Target Win Rate | Avg Time Target |
|------------|-----------------|-----------------|
| Easy | 80-90% | 90-180s |
| Medium | 70-80% | 90-180s |
| Hard | 60-70% | 90-180s |

### Sector 1 Mission Analysis (Sample)

**Easy Missions:**
- 'Gnat Expectations': 15 total enemies (gnats only) - reward 1,561
- 'Ion Maiden': 8 shockers - reward 2,138
- 'Stray Scout Strut': 14 mixed embers/gnats - reward 2,158
- 'Praying for Time': 6 mantis - reward 2,619

**Hard Missions:**
- 'Rainbow in the Dark': 8 mixed enemies - reward 3,628
- 'Hunting High and Low': 10 mixed enemies - reward 4,050

**Assessment:** Reward scaling aligns with enemy count and difficulty. Wave delays (5-12s) provide breathing room.

### Sector 5 Analysis (Endgame)

Hard missions feature:
- Ace skill enemies consistently
- Elite archetypes (Phantom, Wraith, Titan, Behemoth)
- Rewards 10,000-12,000 credits
- 4 waves typically

**Potential Issue:** `src/ui/screens/missions/sector5/hard.ts:126-148`
- "Don't Stop Me Now" uses 'sparkler' archetype with ace skill
- Sparkler uses flak + starburst - high area denial
- 6 total sparklers across 4 waves
- May create unfair shrapnel saturation
- **Recommendation:** Monitor playtest data for this mission

---

## Archetype Analysis

### Player Archetypes - `src/factories/ship-archetypes.ts`

| Archetype | Base Class | Playstyle | Primary Focus |
|-----------|------------|-----------|---------------|
| fighter | Fighter | brawler | Plasma + Seekers |
| scout | Scout | escape | Pulse + Red Laser |
| interceptor | Interceptor | brawler | Green Laser x2 |
| striker | Striker | gunboat | 5 mixed weapons |
| bomber | Bomber | brawler | Plasma + 7 missile types |
| defender | Defender | brawler | Plasma + Green Laser |
| raider | Raider | brawler | Plasma + Autocannon |
| sentinel | Sentinel | brawler | Red Laser x3 |
| sniper | Raider | kiting | Railgun x2 |
| lancer | Sentinel | beam | Green Laser x3 |
| lancerBlue | Sentinel | beam | Blue Laser x3 |
| lancerRed | Sentinel | beam | Red Laser x3 |

### Enemy Archetypes Summary

**Core (S1+):** 13 archetypes
- Patrol-based: firefly, dragonfly, moth, ember, fireant (escape/beam)
- Scout-based: wasp, hornet, locust, gnat, sparkler (brawler/escape)
- Fighter-based: mantis, stinger, viper (brawler/beam)
- Raider-based: scorpion (kiting)
- Defender-based: beetle (brawler)

**Sector-specific (S1-S3):** 7 archetypes
- S1: glowworm, ember, shocker
- S2: bruiser, shredder, sparkler
- S3: rocketeer

**Elite (S4-S5):** 7 archetypes
- inferno, titan, juggernaut, wraith, behemoth, phantom, specter

### Playstyle Distribution

| Playstyle | Count | Purpose |
|-----------|-------|---------|
| brawler | 15+ | Standard combat, full skill scaling |
| escape | 6 | Hit-and-run, constant defensive thresholds |
| beam | 5 | Beam focus, prevents brave-ace inversion |
| kiting | 4 | Range maintenance, skill via range/aim |
| gunboat | 2 | Multi-weapon, constant firing constraints |

**Assessment:** Good variety of playstyles prevents skill scaling inversions.

---

## Specific Issues Found

### Critical Issues

None identified.

### High Priority Issues

1. **Ion Cannon Balance** - `src/data/weapons.ts:119-127`
   - Problem: 55 DPS is significantly lower than alternatives
   - Impact: May be avoided by players despite unique shield suppression
   - Recommendation: Increase damage to 14 (77 DPS) or reduce fire rate to 0.15s (66.7 DPS)

### Medium Priority Issues

2. **Missing Ammo Validation for Gyrojet** - `src/data/prices.ts:54`
   - Gyrojet ammo price is 2 cr/round (file shows 2, but ECONOMY.md shows 3)
   - Inconsistency between code and documentation
   - **File:** `src/data/prices.ts:54` vs `docs/ECONOMY.md:92`

3. **Archetype Bank Size Validation Gap** - `src/factories/archetype-validation.ts:57-63`
   - Validates weapon SIZE fits bank, but not COUNT
   - E.g., could specify count: 20 missiles in bank size 2
   - Count should be <= bankSize * baseCapacity
   - **Recommendation:** Add count validation

### Low Priority Issues

4. **Sparkler Mission Density** - `src/ui/screens/missions/sector5/hard.ts:126-148`
   - 6 ace sparklers with flak + starburst could create shrapnel overload
   - Needs playtest verification

5. **Scout Engagement Time** - Per BALANCE_TESTING.md:53
   - Only 29% engagement time, 48% regroup
   - May feel frustrating to fight against
   - Already documented as known issue

6. **Sniper Skill Ceiling** - Per BALANCE_TESTING.md:49
   - Regular only beats Rookie 38% (target should be ~55%+)
   - High variance by design but could use tuning

---

## Type Safety Analysis

### Strong Points

- All data files use TypeScript interfaces
- `ShipClassName`, `WeaponName`, `MissileName` types derived from data
- Archetype validation at startup
- Contract types fully defined with wave structure

### Gaps

1. **Skill Level String Validation** - `src/campaign/types.ts:30`
   - `SkillLevel = ProfileName` but missions use arbitrary strings
   - No compile-time check that mission skill values are valid
   - **Recommendation:** Add union type validation

2. **Archetype Reference Validation** - `src/ui/screens/missions/*.ts`
   - Mission enemy archetypes are strings, not validated at compile time
   - Runtime error if archetype doesn't exist
   - **Recommendation:** Create `ArchetypeName` union type

---

## Recommendations Summary

### Balance Adjustments

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| High | Ion Cannon DPS | Increase damage 10->14 or fire rate 0.18->0.15 |
| Medium | Sparkler missions | Reduce count or spread across more waves |
| Low | Scout engagement | Consider lowering regroupShieldThreshold |

### Code Quality

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| Medium | Ammo count validation | Add to archetype-validation.ts |
| Medium | Skill level types | Create validated union type |
| Low | Archetype name types | Generate from ENEMY_ARCHETYPES keys |

### Documentation

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| Medium | Gyrojet ammo price | Sync ECONOMY.md with prices.ts |
| Low | Weapon DPS table | Add to BALANCE_TESTING.md |

---

## Test Coverage Assessment

### Balance Tests Available

| Test File | Purpose | Runs |
|-----------|---------|------|
| test-ttk-matrix.mjs | Time-to-kill all matchups | 50/matchup |
| test-skill-scaling.mjs | Skill progression verification | 50/matchup |
| test-weapon-diversity.mjs | Damage type distribution | 30/archetype |
| test-sector-balance.mjs | Mission win rates | 30/mission |
| test-engagement-patterns.mjs | Combat flow analysis | - |

### Coverage Gaps

- No automated test for missile hit rates
- No test for ammo consumption rates
- No test for heat management efficiency
- Economy tests (progression simulation) not visible

---

## Conclusion

The game's data architecture is solid with good separation of concerns. The playstyle system is a sophisticated solution to skill scaling problems. Main areas for improvement are:

1. Ion Cannon needs DPS buff to be competitive
2. Add archetype count validation
3. Strengthen type safety for skill/archetype references
4. Sync documentation with code values

The balance tests provide good coverage and the documented known issues show mature development practices. The game is in good shape for continued iteration.
