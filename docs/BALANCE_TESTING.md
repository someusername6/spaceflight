# Combat Balance Testing Approach

This document describes the systematic approach to testing and balancing combat for the spaceflight roguelike.

## Philosophy

### Roguelike Balance Goals
Unlike symmetric PvP games, roguelike balance serves different goals:
1. **Asymmetric encounters are acceptable** - Player faces varied challenges
2. **Attrition matters** - Surviving with 20% health is a problem
3. **Decision-making over execution** - Which fights to take, when to run
4. **Progression changes balance** - Early game ≠ late game
5. **Some matchups should be unfavorable** - Creates meaningful choices

### Core Requirements
1. **Archetypes viable in intended roles** - Each ship type should excel at something
2. **AI difficulty scales meaningfully** - Higher skill = harder to beat
3. **Combat has engagement and disengagement** - Not constant damage trading
4. **Ships survivable in reasonable circumstances** - Time for decisions and recovery

---

## Priority 0: Fundamental Combat Feel

### 1. TTK (Time-to-Kill) Matrix ✓
**Test:** `npx tsx scripts/tests/combat/test-ttk-matrix.mjs`

Measures kill times across all archetype matchups (now includes sniper/lancer variants).

**Results (2026-01-04):**
- Overall TTK: avg=8.6s, range=4.8-21.5s ✓
- No matchups with TTK < 2s (too fast)
- No high timeout rates
- No >85% win rate imbalances

**Target Ranges:**
| Category | Archetypes | Target TTK |
|----------|------------|------------|
| Glass Cannon | Scout, Raider | 2-5s |
| Standard | Interceptor, Striker | 8-15s |
| Tanky | Defender, Sentinel | 15-25s |
| Special | Bomber | 5-10s |

**Red Flags:**
- TTK < 2s: Combat too fast for decisions
- TTK > 30s: Combat becomes tedious
- High timeout rates: Ships can't kill each other
- >85% win rate in non-mirror: Matchup too one-sided

### 2. Skill Scaling Verification ⚠️
**Test:** `npx tsx scripts/tests/combat/test-skill-scaling.mjs`

Verifies AI skill progression works across ALL archetypes.

**Results (2026-01-04):**
- Regular > Rookie: avg=74% (target ~65%) ✓
- Veteran > Regular: avg=66% (target ~60%) ✓
- Ace > Veteran: avg=60% (target ~55%) ✓
- Ace > Rookie: avg=85% (target ~80%) ✓

**Known Issues:**
- Scout has inverted/flat skill scaling:
  - Regular 54% vs Rookie (should be ~65%)
  - Ace 38% vs Veteran (should be ~55%)
  - Ace 46% vs Rookie (should be ~80%)
- Likely cause: Scout's speed makes evasion skill-independent; low damage makes aim less impactful
- Acceptable for recon role - "skill-independent escape ship"

- **Kiting archetypes (Sniper, Lancer) have broken skill scaling:**
  - Sniper: 38% R>Rk, 38% V>R, 20% A>V (inverted)
  - Lancer: 10% R>Rk, 0% V>R, 0% A>V (completely broken)
  - Root cause: AI profiles designed for brawling, not kiting
  - Higher skill → longer range → less damage → worse performance
  - Blue laser is hitscan so aim error doesn't matter for Lancer
  - **Needs design work**: kiting AI behavior should improve with skill (better range maintenance, better flee timing)

**Expected Progression:**
```
Rookie < Regular < Veteran < Ace
```

**Metrics:**
- Regular should beat Rookie ~65% of time
- Veteran should beat Regular ~60% of time
- Ace should beat Veteran ~55% of time
- Ace should beat Rookie ~80% of time

**Red Flags:**
- Any tier winning <55% against lower tier
- Inconsistent skill impact across archetypes
- Skill mattering more for some ships than others

### 3. Engagement Pattern Analysis ⚠️
**Test:** `npx tsx scripts/tests/combat/test-engagement-patterns.mjs`

Analyzes combat flow to ensure proper phases.

**Results (2026-01-04):**
- Break-offs: 1.8-4.8 per 10s (target 1-3) - slightly high for fast ships
- Shield recovery: 50-82% per regroup (target 20-50%) - exceeds target ✓
- Combat not constant: Pursue+Engage = 38-72% (target <85%) ✓

**Known Issues:**
- Scout: Only 21% engage time (too little, spends 32% pursuing)
- Sentinel: Only 17% engage time (too little, spends 34% pursuing)
- Both ships struggle to close/maintain engagement distance

**Healthy Combat Flow:**
- **Pursue:** Closing to engagement range (10-20% of fight)
- **Engage:** Active combat (40-60% of fight)
- **Evade/Regroup:** Disengaging when damaged (15-30% of fight)

**Metrics:**
- Break-off frequency: Ships should disengage 1-3 times per 10s
- Shield recovery: Should recover 20-50% shields during regroup
- Not constant combat: Pursue+Engage should be <85% of fight time

**Red Flags:**
- <10% time in disengage states: Combat is constant damage trading
- 0 break-offs: Ships fight to death without retreating
- No shield recovery during regroup: Disengaging is pointless

---

## Priority 1: Core Systems Balance

### 4. Defensive Systems ✓
**Test:** `npx tsx scripts/tests/combat/test-decoy-missile.mjs`

**Results (2026-01-04):**
- Decoy launches scale with skill: Ace 179% more than Rookie
- Higher skill = shorter fights = fewer missiles in play to seduce
- Shield recovery during regroup: 49-70% (exceeds 20-50% target)

### 5. Weapon System Diversity ✓
**Test:** `npx tsx scripts/tests/combat/test-weapon-diversity.mjs`

**Results (2026-01-04, updated after beam improvements):**
| Type | Damage % | Status |
|------|----------|--------|
| Projectile | 32% | ✓ Healthy |
| Beam | 13% | ✓ Improved (was 11%) |
| Missile | 54% | ✓ Healthy |

No single type exceeds 60% ✓

**Per-Archetype Weapon Mix:**
| Ship | Projectile | Beam | Missile |
|------|------------|------|---------|
| Scout | 33% | 10% | 57% |
| Interceptor | 43% | 12% | 45% |
| Striker | 35% | 11% | 54% |
| Defender | 40% | 8% | 51% |
| Bomber | 38% | 7% | 55% |
| Raider | 34% | 4% | 62% |
| Sentinel | 32% | 17% | 51% |

**Note:** Beam-specialized ships (Sentinel) don't yet feel beam-focused.
This is a Priority 2 issue - see "Beam Specialization" below.

### 6. Missile Economy ✓
**Test:** `npx tsx scripts/tests/combat/test-decoy-missile.mjs`

**Results (2026-01-04):**
| Type | Fired | Hit Rate | Notes |
|------|-------|----------|-------|
| Tracking (Torpedo, Seeker) | 66 | 50% | Can be decoyed |
| Dumbfire (Rocket) | 265 | 38% | Aim error only |

Tracking advantage (50% vs 38%) balances decoy vulnerability.

---

## Priority 2: Archetype Viability

### 7. Role Definition Tests
Each archetype should excel at its intended role:

| Archetype | Role | Test Scenario |
|-----------|------|---------------|
| Scout | Escape, recon | Can escape from any pursuer? |
| Interceptor | Flexible combat | Competitive in most 1v1s? |
| Striker | Sustained DPS | Highest damage over 30s? |
| Defender | Protection, durability | Survives longest under fire? |
| Bomber | Anti-capital burst | Highest burst damage? |
| Raider | Glass cannon alpha | Fastest kill when unopposed? |
| Sentinel | Area presence | Best in 1vN? |

### 8. Counter Matchups
Every archetype should have clear counters:
- Scout: Low damage, can't fight head-on
- Interceptor: Jack of all trades, master of none
- Striker: Slower, vulnerable to hit-and-run
- Defender: Low DPS, can't catch runners
- Bomber: Vulnerable to interceptors
- Raider: Dies if caught, can't sustain
- Sentinel: Slow, can be kited

### 9. Beam Specialization ✓
**Problem:** Beam-specialized ships (Sentinel) originally dealt only 17% beam damage.

**Solution (2026-01-04):**
1. Changed Sentinel primaries to all red lasers (3x redLaser)
2. Reduced missiles: seeker 8→4, removed rockets/darts, kept torpedo(2) + decoy(4)
3. **+100% beam damage buff** to all beam weapons:
   - Red laser: 60 → 120 DPS
   - Green laser: 40 → 80 DPS
   - Blue laser: 25 → 50 DPS

**Result:** Sentinel now deals **55% beam damage** with **52% win rate** (balanced)

**Extensive testing showed:**
- Beam buffs up to +200% never made beams "dominant" (>65% win rate)
- Long-range kiting (blue laser, railgun) does NOT become overpowered
- Short-range high-DPS (red laser) remains optimal for beam builds
- +100% is the sweet spot: beams go from weak (41%) to balanced (52%)

**Current per-archetype beam damage:**
| Ship | Beam% | Notes |
|------|-------|-------|
| Sentinel | 55% | Beam specialist ✓ |
| Scout | 20% | Has red laser |
| Others | 7-21% | Non-beam ships stay reasonable |

---

## Priority 3: Roguelike Readiness

### 10. Multi-Encounter Survivability
**Key Question:** Can a ship fight 3-5 encounters before needing repair?

**Test Scenarios:**
- Sequential fights against Regular enemies
- Health/shield trend across fights
- Resource depletion (missiles, heat)

### 11. Risk/Reward Framework
Some fights should be avoidable. Player needs:
- Enemy composition visible before engagement
- Difficulty assessment (skill + archetype)
- Escape possibility
- Reward proportional to risk

---

## Running Tests

### Full Balance Suite
```bash
# Run all balance tests
npx tsx scripts/tests/combat/test-ttk-matrix.mjs
npx tsx scripts/tests/combat/test-skill-scaling.mjs
npx tsx scripts/tests/combat/test-engagement-patterns.mjs
npx tsx scripts/tests/combat/test-decoy-missile.mjs
npx tsx scripts/tests/combat/test-weapon-diversity.mjs

# Run existing combat simulations
npx tsx scripts/tests/combat/simulate-combat.mjs
```

### Quick Checks
```bash
# Single archetype matchup
npx tsx scripts/tests/combat/simulate-combat.mjs 1v1-interceptor-regular 50

# Skill ladder verification
npx tsx scripts/tests/combat/simulate-combat.mjs profile-rookie-vs-ace 50
```

---

## Interpreting Results

### TTK Matrix Red Flags
- **Diagonal (mirrors) not ~50/50:** Spawn bias or determinism issue
- **Row much higher than others:** That archetype kills too fast
- **Column much higher than others:** That archetype dies too fast

### Skill Scaling Red Flags
- **Flat progression:** Skill doesn't matter enough
- **Inconsistent across archetypes:** Some ships benefit more from skill
- **Inversions:** Lower skill winning more than expected

### Engagement Pattern Red Flags
- **No regroup time:** Ships never disengage
- **Too much idle:** Ships not finding each other
- **Constant engage:** No tactical ebb and flow

---

## Tuning Levers

### To adjust TTK:
- Hull/shield values in `src/data/ships.ts`
- Weapon damage in `src/data/weapons.ts`
- Shield regen rates

### To adjust skill impact:
- AI profiles in `src/data/ai-profiles.ts`
- `aimErrorBase`, `aimErrorAngularFactor`
- `engageRange`, `breakOffRange`
- `minFiringAngle`

### To adjust engagement flow:
- `evadeShieldThreshold`, `regroupShieldThreshold`
- `evadeCooldown`, `regroupMinTime`
- Shield regen rates and delays

---

## Ship Archetypes Reference

### Base Archetypes (one per ship class)
| Archetype | Hull | Shields | Speed | Turn | Role |
|-----------|------|---------|-------|------|------|
| Scout | 50 | 30 | 300 | 120 | Escape, recon |
| Interceptor | 80 | 60 | 250 | 100 | Balanced fighter |
| Striker | 120 | 80 | 200 | 80 | Heavy assault |
| Defender | 150 | 120 | 180 | 70 | Tank, protect |
| Bomber | 100 | 70 | 180 | 75 | Anti-capital |
| Raider | 60 | 40 | 280 | 110 | Glass cannon |
| Sentinel | 100 | 100 | 200 | 90 | Support, beams |

### Variant Archetypes (different loadout on existing chassis)
| Archetype | Chassis | Weapons | Combat Range | Role |
|-----------|---------|---------|--------------|------|
| Sniper | Raider | 2x railgun | 900m (flees at 400m) | Long-range alpha strike |
| Lancer | Sentinel | 3x blueLaser | 1000m | Long-range beam platform |

---

## AI Profiles Reference

| Profile | Aim Error | Angular Factor | Engage Range | Evade Threshold | minFiringAngle | combatRangeMultiplier |
|---------|-----------|----------------|--------------|-----------------|----------------|----------------------|
| Rookie | 0.095 rad | 0.68 | 500m | 31% shields (panics early) | 45° | 0.8x |
| Regular | 0.05 rad | 0.5 | 600m | 25% shields | 24° | 1.0x |
| Veteran | 0.032 rad | 0.3 | 700m | 20% shields | 18° | 1.15x |
| Ace | 0.008 rad | 0.06 | 800m | 12% shields (ice cold) | 14° | 1.3x |

---

## Version History

- **2026-01-04:** Initial testing framework created
  - TTK matrix test
  - Skill scaling verification
  - Engagement pattern analysis
  - Fixed angular velocity pursuit anomaly for Ace pilots

- **2026-01-04:** Skill scaling fixes
  - Made dumbfire rockets use aim error (skill affects missile accuracy)
  - Inverted defensive thresholds (rookies panic early, aces stay calm)
  - Fixed aim error to start at random value instead of 0
  - Iteratively tuned profiles across 5 iterations to hit targets
  - Final result: Regular > Rookie +19%, Veteran > Regular +13%, Ace > Veteran +5%

- **2026-01-04:** Defensive systems analysis (Priority 1 complete)
  - Created test-defensive-systems.mjs for decoys, missiles, and weapon diversity
  - Decoy skill scaling verified: Ace launches 179% more decoys than Rookie
  - Weapon diversity healthy: Projectile 37.5%, Beam 11%, Missile 51.5%
  - Missile economy balanced: Tracking 50% hit rate, Dumbfire 38%
  - Noted: Beam damage low at 11%, may need investigation

- **2026-01-04:** Beam weapon balance improvements
  - Red laser range: 400m → 500m (still shortest, now usable at typical ranges)
  - Blue laser damage: 25 → 30 DPS (still lowest, but competitive)
  - Ship beam reassignments:
    - Scout: Added red laser (replaces one pulse) - fast brawler role
    - Striker: Changed red → green laser (medium range for heavy assault)
    - Defender: Replaced pulse with green laser (sustained defensive fire)
  - Added preferredCombatRange system for AI engagement
  - Dynamic range calculation based on shortest-range weapon
  - Result: Beam damage ~15% (up from ~11%)

- **2026-01-04:** Raider balance adjustments (BIGGER PRIMARIES variant)
  - Primary weapon sizes increased: plasma(2→3), autocannon(2→3)
  - Missile counts reduced: dart(4→2), rocket(4→2)
  - Result: Missile dependency reduced from 66% to ~62%

- **2026-01-04:** Ship loadout validation system
  - Added ARCHETYPE_WEAPON_SPECS with expected bank counts AND sizes
  - Validation runs on module load AND ship creation
  - Catches both static errors and runtime modifications
  - Prevents accidental weapon bank additions (must replace instead)

- **2026-01-04:** Sentinel beam specialization (Priority 2 complete)
  - Changed Sentinel primaries: blueLaser(3) + greenLaser(2) + plasma(1) → 3x redLaser
  - Reduced missiles: seeker 8→4, removed rockets/darts, kept torpedo(2) + decoy(4)
  - **+100% beam damage buff**: red 60→120, green 40→80, blue 25→50 DPS
  - Tested boost levels from -50% to +200% to find optimal balance
  - Key findings:
    - Beams never become dominant even at +200% (peak 64% win rate)
    - Long-range kiting (blue laser, railgun) underperforms vs close-range
    - +100% is sweet spot: Sentinel goes from weak (41%) to balanced (52%)
  - Result: 55% beam damage with 52% win rate (balanced, exceeds 40-50% target)

- **2026-01-04:** Ballistic weapon balance (Priority 2 continued)
  - **Autocannon**: 8 → 9 damage (+12.5%, was +25% but too strong)
    - 138 DPS, competitive with red laser (120 DPS) but finite ammo
    - Close-range brawler fantasy achieved
  - **Railgun**: 80 → 160 damage (+100%), 0.8s → 1.0s fire rate
    - 160 DPS with 120 damage per shot (alpha strike)
    - Functions as "anti-capital" weapon: 72% vs Bomber, 52% vs Striker
    - Weak vs fast movers (14-32% vs Interceptor) - intentional counterplay
    - 2000m range useful for first-strike, but AI doesn't kite (future enhancement)
  - **Flak**: 15 → 30 damage (+100%), 0.4s → 0.25s fire rate (+60%)
    - 120 DPS with 100m AoE radius
    - Rapid-fire area denial fantasy achieved
    - Tournament: 14% → 43% win rate after fire rate buff
  - Created test-ballistic-builds.mjs for variant loadout testing
  - Key findings:
    - Autocannon stacking (3x banks) is very strong but has ammo limits
    - Railgun excels vs slow targets, struggles vs agile - realistic sniper behavior
    - Flak needed fire rate buff, not just damage - rapid fire fits fantasy better
  - Kiting AI attempted but reverted - needs proper design (strafe or burst-disengage)

- **2026-01-04:** Autoaim system and skill ladder tuning
  - **Railgun autoaim**: 2° FOV correction (FreeSpace-style "smart round")
    - Projectiles correct toward intercept point if aim is within 2° cone
    - Applies equally to AI (after aim error) and players (fair, not cheating)
    - Extends effective firing threshold: ace 14° + 2° = 16° effective
  - **minFiringAngle rebalanced** for skill ladder at low autoaim FOV:
    - Rookie: 45° (unchanged - wastes ammo at bad angles)
    - Regular: 35° → 24° (more selective)
    - Veteran: 24° → 18° (closer to ace, prevents outperforming ace)
    - Ace: 12° → 14° (slightly looser for kiting viability)
  - **combatRangeMultiplier** added to AI profiles:
    - Scales preferred engagement distance by skill
    - Ace: 1.3x (engages 30% farther - precision viable at range)
    - Veteran: 1.15x, Regular: 1.0x, Rookie: 0.8x (engages closer)
  - **Skill ladder verified at 2° FOV**:
    - Win rate vs same-skill: ace (33%) > veteran (18%) > regular (7%) > rookie (0%)
    - Hit rate: ace (8%) > veteran (4%) ≈ regular (3%) > rookie (0%)
  - Key insight: Original minFiringAngle gap (ace 12° vs veteran 24°) caused
    veteran to fire more in kiting scenarios, outperforming ace. Narrowing
    the gap while giving ace slightly looser threshold fixed the ladder.

- **2026-01-04:** Priority 0 verification and variant archetypes
  - **Added sniper and lancer** to balance test suite
    - Sniper: Raider chassis + 2x railgun, 900m range, flees at 400m
    - Lancer: Sentinel chassis + 3x blueLaser, 1000m range
  - **Priority 0 test results documented**:
    - TTK Matrix: ✓ Healthy (avg=8.6s for base archetypes)
    - Skill Scaling: ⚠️ Scout has inverted skill ladder (acceptable for recon role)
    - Engagement Patterns: ⚠️ Scout/Sentinel engage too little (17-21%)
  - **Kiting variant findings**:
    - Sniper/Lancer have clear counters: Defender 100%/98% win rate (tanks and closes)
    - Many timeouts in kiter vs kiter matchups (both want range, low DPS)
    - Skill scaling broken: AI profiles designed for brawling, not kiting
    - Lancer especially bad: hitscan beams + longer range = skill doesn't help

- **2026-01-04:** Playstyle-based skill expression system
  - **Added playstyle field** to archetype definitions (brawler, escape, kiting)
  - **Created getProfileForPlaystyle()** function in ai-profiles.ts
  - **Key insight**: Several base profile parameters cause skill INVERSION:
    1. Lower minFiringAngle = more selective = fewer shots = less damage
    2. Lower evadeShieldThreshold = stays longer = counterproductive for escape/kiting
    3. Higher combatRangeMultiplier = farther range = less DPS for kiters
    4. Higher fleeDistanceMultiplier = flee earlier = less engagement time
  - **Solution**: For escape/kiting, use CONSTANT values for these parameters
    so skill comes purely from aim error (for projectile weapons)
  - **Results after fix**:
    - Brawlers: All working well (56-100% higher skill win rates)
    - Scout: R>Rk 70% ✓, V>R 46%, A>V 30% (improved from 0%, still imperfect)
    - Sniper: Still inverted (32-40% range) - railgun autoaim equalizes aim
    - Lancer: Completely broken (0%) - beams are hitscan, aim doesn't matter
  - **Key finding**: Skill scales correctly vs brawlers (typical opponents):
    - Scout vs Interceptor: Rookie 33% → Ace 89% ✓
    - Sniper vs Interceptor: Rookie 2% → Ace 39% ✓
  - **Mirror matches are fundamentally different** - both ships using same
    tactics means skill expression is limited
  - **Future work needed**:
    - Beam skill expression (tracking stability, heat management)
    - Railgun skill expression (reduce autoaim or add other differentiator)
