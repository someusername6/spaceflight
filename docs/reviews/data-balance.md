# Game Data and Balance Review

**Date:** 2026-01-16
**Reviewer:** Claude Code (Automated)
**Scope:** Weapons, ships, missiles, AI profiles, economy

---

## Executive Summary

The game data is **well-structured** with clear separation between ship classes, weapons, missiles, AI profiles, and archetypes. The codebase demonstrates mature balance considerations with documented playstyle systems to prevent skill inversion. Type safety is strong throughout with validation systems catching invalid references.

**Overall Assessment: Excellent** - Ready for production with thoughtful balance design.

---

## 1. Weapon Balance

### Rating: Excellent

**Energy weapons (infinite ammo):**
| Weapon | Damage | Fire Rate | DPS | Range | Heat/sec | Role |
|--------|--------|-----------|-----|-------|----------|------|
| Plasma | 16 | 8/sec | 128 | 800m | 40 | Sustained DPS |
| Pulse | 12 | 10/sec | 120 | 500m | 50 | Close range |
| Ion | 10 | 5.5/sec | 55 | 700m | 33 | Shield disruptor |

**Ballistic weapons (finite ammo):**
| Weapon | Damage | Fire Rate | DPS | Range | Ammo | Role |
|--------|--------|-----------|-----|-------|------|------|
| Autocannon | 9 | 15.4/sec | 139 | 400m | 200 | Close DPS |
| Slug Cannon | 45 | 2.5/sec | 112 | 1000m | 100 | Precision |
| Railgun | 80 | 1/sec | 80 | 2000m | 20 | Sniper |
| Flak | 40 area | 4/sec | 160 | 600m | 40 | Area denial |
| Gyrojet | 200 max | 4/sec | 200 | 2000m | 60 | High risk/reward |

**Beam weapons (continuous):**
| Weapon | DPS | Range | Heat/sec | Role |
|--------|-----|-------|----------|------|
| Red Laser | 120 | 400m | 15 | Close DPS |
| Green Laser | 80 | 800m | 12 | Mid-range |
| Blue Laser | 50 | 1200m | 10 | Long range |
| Lightning | 50 | 300m | 20 | Auto-aim assist |
| Torch | 30 + heat | 200m | 25 | Heat injection |
| Nuclear Lance | 500 | 3000m | 30 | Ultimate finisher |

**Balance observations:**
- Weapons have clear roles and trade-offs
- Heat limits sustained fire appropriately
- Ammo constraints balance high-DPS ballistics

---

## 2. Ship Balance

### Rating: Excellent

**Ship class comparison:**
| Class | Hull | Shields | Total HP | Speed | Turn | Role |
|-------|------|---------|----------|-------|------|------|
| Patrol | 45 | 45 | 90 | 90 | 80 | Scout |
| Scout | 55 | 35 | 90 | 150 | 120 | Fast escape |
| Fighter | 90 | 65 | 155 | 125 | 100 | Balanced |
| Interceptor | 75 | 50 | 125 | 138 | 110 | Dogfighter |
| Raider | 65 | 45 | 110 | 140 | 110 | Glass cannon |
| Bomber | 110 | 80 | 190 | 90 | 75 | Missile boat |
| Sentinel | 110 | 110 | 220 | 100 | 90 | Support |
| Striker | 130 | 90 | 220 | 100 | 80 | Heavy guns |
| Defender | 165 | 130 | 295 | 90 | 70 | Tank |

**Balance observations:**
- Fighter is solid baseline (155 HP, 125 speed)
- Raider glass cannon role clear (low HP, high speed, many weapon banks)
- Defender tank role evident (295 HP, slowest)
- Turn rates scale appropriately with ship mass

---

## 3. Missile Balance

### Rating: Excellent

**Lock times doubled in recent balance pass:**
| Missile | Damage | Speed | Lock Time | DPS | Role |
|---------|--------|-------|-----------|-----|------|
| Rocket | 50 | 600 | N/A | 100 | Dumbfire |
| Starburst | 320 area | 600 | N/A | 160 | Area denial |
| Seeker | 60 | 400 | 4s | 60 | Standard lock-on |
| Dart | 30 | 600 | 2s | 60 | Fast lock |
| Swarm | 16 (8×2) | 400 | 2.5s | 160 | Saturation |
| Torpedo | 150 | 200 | 7s | 75 | Heavy hitter |
| Nuke | 300 area | 150 | 10s | 100 | Tactical strike |

**Lock time changes documented:**
- Seeker: 2s → 4s
- Dart: 1s → 2s
- Swarm: 1.25s → 2.5s
- Torpedo: 4s → 7s
- Nuke: 5s → 10s

**Balance observation:** Lock time increase reduces missile spam effectiveness.

---

## 4. AI Profiles

### Rating: Excellent

**Skill scaling:**
| Profile | Aim Error | Lock Speed | Engage Range | Win Target |
|---------|-----------|-----------|--------------|------------|
| Green | 0.14 rad (~8°) | 0.5x | 400m | Training |
| Rookie | 0.095 rad (~5.5°) | 0.8x | 500m | Tutorial |
| Regular | 0.05 rad (~3°) | 1.5x | 600m | Baseline |
| Veteran | 0.032 rad (~2°) | 2.5x | 700m | Challenge |
| Ace | 0.008 rad (~0.5°) | 4.0x | 800m | Difficult |
| Elite | 0.004 rad (~0.23°) | 4.0x | 800m | Boss |

**Playstyle system (`src/data/ai-playstyles.ts`):**
- Brawler: Skill scales aim + aggression
- Escape: Skill scales aim only (constant thresholds prevent inversion)
- Kiting: Skill scales aim + engagement range
- Beam: Aim only (constant thresholds for beam duels)
- Gunboat: Constant firing constraints prevent volume advantage

**Design note:** Constant thresholds for escape/beam playstyles prevent "better pilots flee/lose more" inversion.

---

## 5. Economy

### Rating: Excellent

**Price structure (`src/data/prices.ts`):**
- Ships: 200-900 credits (appropriate tier progression)
- Energy weapons: 80-100 credits
- Ballistic weapons: 150-300 credits
- Beam weapons: 180-500 credits
- Missiles: 5-100 credits per unit

**Mission rewards:**
- Fixed credit rewards per mission
- Salvage provides items (weapons/ammo/scrap), not credits
- Scrap conversion: 100 scrap = 1 ship reconstruction

**Pilot hiring by sector:**
- Sector 1: ~200 credit average
- Sector 5: ~850 credit average
- Appropriate progression curve

---

## 6. Data Validation

### Rating: Excellent

**Archetype validation (`src/factories/archetype-validation.ts`):**
- Weapon names validated against `PRIMARY_WEAPONS`
- Missile names validated against `MISSILES`
- Ship classes validated against `SHIP_CLASSES`
- Bank sizes checked against ship constraints

**Type safety:**
- `WeaponName = keyof typeof PRIMARY_WEAPONS`
- `MissileName = keyof typeof MISSILES`
- `ShipClassName = keyof typeof SHIP_CLASSES`
- Compile-time validation for all references

---

## Strengths

1. **Clear weapon roles** - Each weapon has distinct purpose and trade-offs
2. **Ship class diversity** - Nine classes covering different playstyles
3. **Skill scaling without inversion** - Playstyle system prevents paradoxes
4. **Type-safe data** - Compile-time validation for all references
5. **Archetype validation** - Runtime checks for loadout validity
6. **Documented balance changes** - Lock time increases recorded in code

---

## Issues

**None critical.** Balance is well-considered.

---

## Recommendations

| Priority | Area | Recommendation |
|----------|------|----------------|
| Low | Documentation | Consider balance rationale document |

---

## Files Reviewed

- `src/data/weapons.ts` (weapon definitions)
- `src/data/ships.ts` (ship chassis stats)
- `src/data/missiles.ts` (missile definitions)
- `src/data/ai-profiles.ts` (AI difficulty tiers)
- `src/data/ai-playstyles.ts` (skill scaling per role)
- `src/data/prices.ts` (equipment pricing)
- `src/factories/archetype-validation.ts` (validation logic)
