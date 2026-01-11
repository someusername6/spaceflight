# Store Stock System Design

## Overview

This document describes the redesigned store stock system that replaces the previous "unlock-based" filtering with a "sector-based restocking with per-mission trickle" system.

## Goals

1. **Sector-based restocking**: Store restocks fresh when advancing to a new sector
2. **Per-mission trickle**: Small amounts of stock added after each mission
3. **Capacity-scaled quantities**: Stock amounts reflect item consumption rates
4. **Probabilistic ship/weapon restocking**: Major items have random chance to restock
5. **Sustainable endless mode**: Sector 5 remains playable indefinitely via trickle

## System Components

### Base Stock (on sector entry)

When entering a new sector, the store is completely restocked with sector-appropriate items.

**Ships:**
```
stock = SHIP_BASE + sectorsAvailable × SHIP_SECTOR_BONUS
```

**Primaries:**
```
stock = PRIMARY_BASE + sectorsAvailable × PRIMARY_SECTOR_BONUS
```

**Missiles (capacity-scaled):**
```
stock = MISSILE_BASE_LOADS × capacity × (1 + sectorsAvailable × AVAILABILITY_BONUS)
```

**Ammo (consumption-scaled):**
```
stock = AMMO_BASE_REFILLS × baseAmmo × (1 + sectorsAvailable × AVAILABILITY_BONUS)
```

### Per-Mission Trickle

After each mission (win or lose), stock is replenished:

**Ships & Primaries (probabilistic):**
- Each item type has a chance to add +1 stock
- Probability decreases for higher-tier items
- Uses seeded PRNG for determinism

```
probability = TRICKLE_PROB_BASE - (unlockSector - 1) × TRICKLE_PROB_DECAY
```

**Missiles (guaranteed, capacity-scaled):**
```
trickle = MISSILE_TRICKLE_LOADS × capacity
```

**Ammo (guaranteed, consumption-scaled):**
```
trickle = AMMO_TRICKLE_REFILLS × baseAmmo
```

### Stock Caps (consumables only)

To prevent infinite accumulation if players don't buy consumables, missiles and ammo have maximum stock limits. Ships and primaries are NOT capped (they're expensive and trickle slowly).

**Missile cap:**
```
cap = baseStock + (MISSIONS_PER_SECTOR × tricklePerMission)
    = (MISSILE_BASE_LOADS × capacity × bonus) + (8 × MISSILE_TRICKLE_LOADS × capacity)
```

**Ammo cap:**
```
cap = baseStock + (MISSIONS_PER_SECTOR × tricklePerMission)
    = (AMMO_BASE_REFILLS × baseAmmo × bonus) + (8 × AMMO_TRICKLE_REFILLS × baseAmmo)
```

The cap represents "one sector's worth" of supply - base stock plus 8 missions of trickle. This is generous enough that players won't notice during normal play, but prevents degenerate accumulation in extended sessions.

**Example caps (Sector 1):**
| Item | Base | Cap | Reasoning |
|------|------|-----|-----------|
| Autocannon ammo | 2,400 | 4,800 | 24 reloads, enough for a sector |
| Seeker missiles | 160 | 288 | 36 loads, generous but bounded |

## Item Data Reference

### Missiles
| Missile | Capacity | Unlock Sector |
|---------|----------|---------------|
| rocket | 12 | 1 |
| seeker | 8 | 1 |
| swarm | 20 | 1 |
| decoy | 6 | 1 |
| dart | 10 | 2 |
| cluster | 10 | 2 |
| torpedo | 4 | 3 |
| nuke | 2 | 4 |

### Ammo Weapons
| Weapon | Base Ammo | Unlock Sector |
|--------|-----------|---------------|
| autocannon | 200 | 1 |
| slugCannon | 40 | 2 |
| flak | 50 | 2 |
| gyrojet | 30 | 3 |
| railgun | 20 | 4 |
| nuclearLance | 1 | 5 |

### Ships
| Ship | Unlock Sector |
|------|---------------|
| patrol | 1 |
| scout | 1 |
| fighter | 1 |
| interceptor | 2 |
| raider | 2 |
| bomber | 3 |
| sentinel | 3 |
| striker | 4 |
| defender | 4 |

### Primaries
| Weapon | Unlock Sector |
|--------|---------------|
| pulse | 1 |
| ion | 1 |
| plasma | 1 |
| blueLaser | 1 |
| autocannon | 1 |
| greenLaser | 2 |
| flak | 2 |
| slugCannon | 2 |
| redLaser | 3 |
| lightning | 3 |
| torch | 3 |
| gyrojet | 3 |
| railgun | 4 |
| nuclearLance | 5 |

## Design Rationale

### Why capacity-scaled missiles?
High-capacity missiles (swarm: 20) fill more slots per unit, so you need more in stock to provide equivalent "full loads". Low-capacity missiles (nuke: 2) need fewer units to fill slots.

### Why consumption-scaled ammo?
High-fire-rate weapons (autocannon: 200 rounds) burn through ammo quickly. Low-fire-rate weapons (railgun: 20 rounds) need less stock to sustain the same gameplay time.

### Why probabilistic ships/primaries?
Creates meaningful scarcity. If you lose all fighters, you can't immediately buy more - you must adapt to what's available. Higher-tier items are rarer, making them feel valuable.

### Why guaranteed missile/ammo trickle?
These are consumables used every mission. Running out completely would be frustrating and halt gameplay. Guaranteed trickle ensures sustainability.

## Simulation Validation

The constants are validated using a simulation script that tests multiple player consumption profiles:

- **Conservative**: Low consumption, rarely loses ships
- **Balanced**: Average consumption patterns
- **Aggressive**: High consumption, loses ships frequently
- **Missile Spammer**: Heavily missile-focused playstyle
- **Gun Runner**: Heavily ammo-focused playstyle

See `scripts/simulations/stock-balance.mjs` for the simulation.

## Constants (validated via simulation)

These values were tuned using `scripts/simulations/stock-balance.mjs` with 500 runs per player profile.

```typescript
// ============ BASE STOCK (on sector entry) ============

// Ships: enough for early-game losses plus replacements
const SHIP_BASE = 5;
const SHIP_SECTOR_BONUS = 2;

// Primaries: enough to re-equip a full squad
const PRIMARY_BASE = 6;
const PRIMARY_SECTOR_BONUS = 1;

// Missiles: capacity-scaled base loads
const MISSILE_BASE_LOADS = 20;

// Ammo: consumption-scaled refills
const AMMO_BASE_REFILLS = 12;

// Bonus for items available in earlier sectors
const AVAILABILITY_BONUS = 0.25;

// ============ TRICKLE (per mission) ============

// Ships & Primaries: probability of +1 per item type
const TRICKLE_PROB_BASE = 0.40;  // S1 items: 40%
const TRICKLE_PROB_DECAY = 0.05; // -5% per unlock sector

// Missiles: guaranteed trickle = LOADS × capacity
const MISSILE_TRICKLE_LOADS = 2;

// Ammo: guaranteed trickle = REFILLS × baseAmmo
const AMMO_TRICKLE_REFILLS = 1.5;

// ============ STOCK CAPS (consumables only) ============

// Missions worth of trickle before hitting cap
const MISSIONS_PER_SECTOR = 8;

// Cap formula: base + (MISSIONS_PER_SECTOR × trickle)
// Ships and primaries are NOT capped
```

### Simulation Results

| Profile | Description | Shortage Rate |
|---------|-------------|---------------|
| Conservative | Careful, low consumption | 0.0% |
| Balanced | Average player | 1.0% |
| Aggressive | High risk, high consumption | 10.8% |
| Missile Spammer | Heavy missile user | 0.2% |
| Gun Runner | Heavy ammo user | 2.2% |

### Stock Examples

**Sector 1 (initial):**
- Ships: 5 each (patrol, scout, fighter)
- Primaries: 6 each (pulse, ion, plasma, blueLaser, autocannon)
- Missiles: rocket (240), seeker (160), swarm (400), decoy (120)
- Ammo: autocannon (2400)

**Sector 2 (initial):**
- S1 ships: 7 each
- S2 ships: 5 each (interceptor, raider)
- S1 missiles: ×1.25 bonus
- Autocannon ammo: 3000 (with 1.25 bonus)
- Flak ammo: 600

**Trickle probabilities:**
- S1 items: 40%
- S2 items: 35%
- S3 items: 30%
- S4 items: 25%
- S5 items: 20%

## Files Modified

- `src/campaign/store/store-catalog.ts` - Stock generation functions
- `src/campaign/state.ts` - Trickle application after missions
- `src/campaign/store/store-unlocks.ts` - Unlock sector constants (kept for stock tiers)
