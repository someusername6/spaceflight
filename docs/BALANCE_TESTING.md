# Combat Balance Status

Documents validated combat balance for the spaceflight roguelike.

---

## Validated ✓

### TTK (Time-to-Kill)
- **Average:** 8.6s, range 4.8-21.5s
- No instant deaths (<2s), no tedious fights (>30s)
- No matchups with >85% win rate imbalance

### Skill Scaling
AI skill progression works for most archetypes:
- Regular beats Rookie ~65%
- Veteran beats Regular ~60%
- Ace beats Veteran ~55%
- Ace beats Rookie ~80%

**Playstyle system:** Different ships express skill differently:
- **Brawler:** Aim, composure, aggression all scale
- **Escape:** Skill via aim error multiplier (1x-3x)
- **Kiting:** Skill-based engagement range (0.7x-1.1x)

### Engagement Flow
- Ships disengage and recover (not constant damage trading)
- Shield recovery during regroup: 50-82%
- Pursue+Engage time: 38-72% (leaves room for tactical decisions)

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
High skill ceiling by design. Rookie snipers can't solo brawlers (0% win rate) - may need team support. Ace snipers dominate (96% win rate).

### Striker mirrors
~50-55% for all skill matchups. Multiple weapons dilute accuracy differences. Inherent to multi-weapon slugfest design.

---

## Quick Reference

### Ship Archetypes
| Archetype | Hull | Shields | Speed | Role |
|-----------|------|---------|-------|------|
| Scout | 50 | 30 | 300 | Fast, fragile |
| Interceptor | 80 | 60 | 250 | Balanced |
| Striker | 120 | 80 | 200 | Heavy brawler |
| Defender | 150 | 120 | 180 | Tank |
| Bomber | 100 | 70 | 180 | Burst damage |
| Raider | 60 | 40 | 280 | Glass cannon |
| Sentinel | 100 | 100 | 200 | Beam support |

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

## Running Tests

```bash
npx tsx scripts/tests/combat/test-ttk-matrix.mjs
npx tsx scripts/tests/combat/test-skill-scaling.mjs
npx tsx scripts/tests/combat/test-engagement-patterns.mjs
npx tsx scripts/tests/combat/test-weapon-diversity.mjs
npx tsx scripts/tests/combat/test-decoy-missile.mjs
```
