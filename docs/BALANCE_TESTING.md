# Combat Balance Status

Documents validated combat balance for the spaceflight roguelike.

---

## Validated ✓

### TTK (Time-to-Kill)
- **Average:** 10.6s, range 4.0-41.3s
- No instant deaths (<2s), no tedious fights (>30s)
- No matchups with >85% win rate imbalance

### Skill Scaling
AI skill progression works for most archetypes:
- Regular beats Rookie ~74% (+24% advantage)
- Veteran beats Regular ~63% (+13% advantage)
- Ace beats Veteran ~63% (+13% advantage)
- Ace beats Rookie ~90%

**Playstyle system:** Different ships express skill differently:
- **Brawler:** Aim, composure, aggression all scale
- **Escape:** Skill via aim error multiplier (1x-3x)
- **Kiting:** Skill-based engagement range (0.7x-1.1x)

### Engagement Flow
- Ships disengage and recover (not constant damage trading)
- Shield recovery during regroup: 41-59%
- 9/11 archetypes show healthy combat flow
- Pursue+Engage time: 30-98% (varies by archetype)

### Weapon Diversity
| Type | Damage % |
|------|----------|
| Projectile | 32% |
| Beam | 13% |
| Missile | 54% |

No single type dominates. Tracking missiles (50% hit) vs dumbfire (38% hit) balanced by decoy vulnerability.

---

## Known Issues

### Lancer (beam kiter)
Hitscan beams bypass aim error system. Skill scaling doesn't work - all skill levels perform similarly. Low priority since it's a variant archetype.

### Sniper (railgun kiter)
High skill ceiling by design. Regular only beats Rookie 38%. Ace snipers dominate (76% vs Rookie). Narrow skill gaps between tiers (40% win rates).

### Scout
Too little engagement time (29%). Spends 48% of fight in regroup state. Fast hit-and-run style may need tuning.

### Striker mirrors
~50-55% for all skill matchups. Multiple weapons dilute accuracy differences. Inherent to multi-weapon slugfest design.

---

## Quick Reference

### Ship Archetypes
| Archetype | Hull | Shields | Speed | Role |
|-----------|------|---------|-------|------|
| Patrol | 44 | 44 | 90 | Intro enemy |
| Scout | 55 | 33 | 150 | Fast, fragile |
| Interceptor | 88 | 66 | 125 | Balanced |
| Striker | 132 | 88 | 100 | Heavy brawler |
| Defender | 165 | 132 | 90 | Tank |
| Bomber | 110 | 77 | 90 | Burst damage |
| Raider | 66 | 44 | 140 | Glass cannon |
| Sentinel | 110 | 110 | 100 | Beam support |

### AI Skill Levels
| Profile | Aim Error | Evade Threshold |
|---------|-----------|-----------------|
| Rookie | 0.095 rad (~5.5°) | 31% shields |
| Regular | 0.05 rad (~3°) | 25% shields |
| Veteran | 0.032 rad (~2°) | 20% shields |
| Ace | 0.008 rad (~0.5°) | 12% shields |

### Tuning Levers
- **TTK:** Hull/shield values, weapon damage, shield regen
- **Skill impact:** `aimErrorBase`, `aimErrorAngularFactor`, `minFiringAngle`
- **Engagement flow:** `evadeShieldThreshold`, `regroupShieldThreshold`, cooldowns

---

## Balance Changes Log

### v2: Speed Rebalancing (Jan 2026)

**Motivation:** Ship-to-projectile speed ratio was too low (~1.6x) compared to FreeSpace 2 (~5x), making projectiles hard to land without aim assist.

**Changes:**
- Halved all ship speeds (maxSpeed and acceleration)
- Increased hull and shields by 10% to compensate for faster TTK

**Results:**
| Metric | Before | After |
|--------|--------|-------|
| Ship speeds | 180-300 m/s | 90-150 m/s |
| Projectile/ship ratio | ~1.6x | ~3.2x |
| TTK average | 12.4s | 10.6s |
| Healthy engagement flow | 8/11 | 9/11 |
| Skill scaling (R>Rk) | +22% | +24% |
| Skill scaling (V>R) | +11% | +13% |
| Skill scaling (A>V) | +15% | +13% |

**Mission pacing (idle player):**
| Mission | Win Rate | Avg Time |
|---------|----------|----------|
| Patrol Duty (Easy) | 68% | 157s |
| Escort Mission (Medium) | 63% | 179s |
| Strike Mission (Hard) | 43% | 180s |

---

## Running Tests

```bash
npx tsx scripts/tests/combat/test-ttk-matrix.mjs
npx tsx scripts/tests/combat/test-skill-scaling.mjs
npx tsx scripts/tests/combat/test-engagement-patterns.mjs
npx tsx scripts/tests/combat/test-weapon-diversity.mjs
npx tsx scripts/tests/combat/test-decoy-missile.mjs
npx tsx scripts/tests/campaign/test-mission-pacing.mjs
```
