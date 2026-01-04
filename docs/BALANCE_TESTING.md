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

### 1. TTK (Time-to-Kill) Matrix
**Test:** `npx tsx scripts/tests/combat/test-ttk-matrix.mjs`

Measures kill times across all 7×7 archetype matchups.

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

### 2. Skill Scaling Verification
**Test:** `npx tsx scripts/tests/combat/test-skill-scaling.mjs`

Verifies AI skill progression works across ALL archetypes.

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

### 3. Engagement Pattern Analysis
**Test:** `npx tsx scripts/tests/combat/test-engagement-patterns.mjs`

Analyzes combat flow to ensure proper phases.

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

### 9. Beam Specialization (TODO)
**Problem:** Beam-specialized ships (Sentinel) only deal 17% beam damage.
Ships should feel like their weapon specialty is their primary damage source.

**Target:** Sentinel should deal 40-50% beam damage to feel beam-focused.

**Possible approaches (within bank count constraints):**
- Reduce missile counts on beam ships (e.g., seeker 8→4)
- Swap non-beam primaries for beams (Sentinel's plasma → beam)
- Further buff beam DPS for sustained engagement advantage

**Constraint:** Non-beam ships should stay at 10-15% beam. Beams should not
become the only viable build - they should be a specialization, not dominant.

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

| Archetype | Hull | Shields | Speed | Turn | Role |
|-----------|------|---------|-------|------|------|
| Scout | 50 | 30 | 300 | 120 | Escape, recon |
| Interceptor | 80 | 60 | 250 | 100 | Balanced fighter |
| Striker | 120 | 80 | 200 | 80 | Heavy assault |
| Defender | 150 | 120 | 180 | 70 | Tank, protect |
| Bomber | 100 | 70 | 180 | 75 | Anti-capital |
| Raider | 60 | 40 | 280 | 110 | Glass cannon |
| Sentinel | 100 | 100 | 200 | 90 | Support, beams |

---

## AI Profiles Reference

| Profile | Aim Error | Angular Factor | Engage Range | Evade Threshold |
|---------|-----------|----------------|--------------|-----------------|
| Rookie | 0.095 rad | 0.68 | 500m | 31% shields (panics early) |
| Regular | 0.05 rad | 0.5 | 600m | 25% shields |
| Veteran | 0.032 rad | 0.3 | 700m | 20% shields |
| Ace | 0.008 rad | 0.06 | 800m | 12% shields (ice cold) |

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
