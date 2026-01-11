# Economy Analysis - Player Progression

This document summarizes the game's economy for planning sector-balanced missions.

## Starting State

**Credits:** 1,000

**Squadron:** 4 fighter-class ships
- Commander (player): Ace skill
- 3 Wingmen: Regular skill

**Fighter Loadout:**
- Primary: 2x Plasma (energy, infinite ammo)
- Secondary Bank 1: 8 Seeker missiles
- Secondary Bank 2: 6 Decoy countermeasures

**Fighter Stats:** Hull 90, Shields 65

## Mission Rewards

| Difficulty | Missions | Reward Range | Avg Reward |
|------------|----------|--------------|------------|
| Easy       | 6        | 1,000-2,000  | 1,500      |
| Medium     | 8        | 2,250-3,500  | 2,750      |
| Hard       | 6        | 4,000-6,500  | 4,750      |

## Mission Win Rates (Simulation Data)

Missions are tested against sector-specific loadouts (see Simulation Test Loadouts section).

**Target Win Rates (by difficulty):**
- Easy: 60-80%
- Medium: 40-60%
- Hard: 20-40%

All missions should average 90-180s victory time.

## Ship Prices

| Ship Class | Buy | Sell | Hull | Shields |
|------------|-----|------|------|---------|
| Patrol | 200 | 100 | 45 | 45 |
| Scout | 300 | 150 | 55 | 35 |
| Fighter | 400 | 200 | 90 | 65 |
| Interceptor | 500 | 250 | 75 | 50 |
| Raider | 600 | 300 | 65 | 45 |
| Bomber | 700 | 350 | 110 | 80 |
| Sentinel | 750 | 375 | 110 | 110 |
| Striker | 800 | 400 | 130 | 90 |
| Defender | 900 | 450 | 165 | 130 |

## Weapon Prices

### Primary Weapons
| Weapon | Buy | Sell | Type |
|--------|-----|------|------|
| Pulse | 80 | 40 | Energy |
| Ion | 90 | 45 | Energy |
| Plasma | 100 | 50 | Energy |
| Autocannon | 150 | 75 | Ballistic |
| Blue Laser | 180 | 90 | Beam |
| Green Laser | 200 | 100 | Beam |
| Flak | 200 | 100 | Ballistic |
| Lightning | 220 | 110 | Beam |
| Red Laser | 250 | 125 | Beam |
| Torch | 280 | 140 | Beam |
| Railgun | 300 | 150 | Ballistic |
| Nuclear Lance | 500 | 250 | Beam |

### Secondary Weapons (per missile)
| Missile | Buy | Sell | Type |
|---------|-----|------|------|
| Swarm | 3 | 1 | Homing |
| Rocket | 5 | 2 | Dumbfire |
| Cluster | 8 | 4 | Dumbfire |
| Dart | 10 | 5 | Homing |
| Seeker | 15 | 7 | Homing |
| Decoy | 20 | 10 | Countermeasure |
| Torpedo | 40 | 20 | Heavy |
| Nuke | 100 | 50 | Heavy |

### Ammo Prices (ballistic weapons)
| Ammo Type | Buy/Round |
|-----------|-----------|
| Autocannon | 0.1 |
| Flak | 2 |
| Railgun | 5 |
| Nuclear Lance | 50 |

## Pilot Costs

| Skill Level | Hire Price | Spawn Weight |
|-------------|------------|--------------|
| Rookie | 75 | 35% |
| Regular | 200 | 35% |
| Veteran | 400 | 20% |
| Ace | 700 | 10% |

## Salvage System

Per destroyed ship:
- **Multiplier:** Random 0-10% per ship
- **Scrap:** 0-10 pieces (floor of 100 × multiplier)
- **Weapons:** Each primary has (multiplier) chance to drop
- **Ammo/Missiles:** (multiplier) % of remaining recovered

Expected average salvage: ~5% of destroyed ship value.

## Scrap System

- **Scrap per ship:** 100 pieces needed
- **Scrap value:** sell for (ship_price / 100) × 0.8 per piece
- **Conversion fee:** 5% of ship buy price to convert scrap to ship

## Expected Economics Per Mission

### Easy Mission Example
- **Reward:** ~1,500 cr
- **Win rate:** 70% average (target: 60-80%)
- **Ships lost (avg):** 0.3-1.2 per mission
- **Lost ship cost:** ~400 (hull) + 200 (weapons) + 240 (missiles) + 200 (pilot) = ~1,040 cr
- **Survivor costs:** ~120 cr consumables (missiles used)
- **Salvage income:** ~5% of enemy value

### Replacement Cost Formula
From `prices.ts`:
```
Per lost ship: 1040 (ship 400 + weapons 200 + missiles 240 + pilot 200)
Per survivor: ~120 consumables used
Salvage: ~5% of destroyed enemy ship value
```

## Projected Progression

### After 3 Easy Missions (typical early game)
**Income:**
- 3 × 1,500 = 4,500 cr rewards
- ~200-400 cr salvage

**Expenses:**
- 0-1 ships lost (~500 cr average)
- 3 × 4 × 120 = 1,440 cr missiles/consumables

**Net:** ~3,000-3,500 cr profit
**Total credits:** ~4,000-4,500 cr

### After 5-6 Missions (mid-campaign)
- Enough to upgrade 1-2 ships to better classes
- Can afford better weapons (railgun, lasers)
- May have hired 1-2 replacement pilots

### Key Thresholds

| Credits | Capability |
|---------|------------|
| 400 | Replace 1 fighter |
| 600-900 | Upgrade to better ship class |
| 1,000+ | Buy advanced weapons |
| 2,000+ | Full squadron rebuild |

## Economics Per Difficulty

Each sector has 3 difficulty levels. Economics assuming starting-loadout player:

### Easy Difficulty
```
Reward: 1,250 cr avg (70% win rate → expected: 875 cr)
Ships lost: 0.8 per mission
Replacement: 832 cr
Consumables: 384 cr (3.2 survivors × 120)
Salvage: +150 cr
───────────────────────────────────────────────────────
Net per mission: -191 cr
```

### Medium Difficulty
```
Reward: 1,750 cr avg (50% win rate → expected: 875 cr)
Ships lost: 1.2 per mission
Replacement: 1,248 cr
Consumables: 336 cr (2.8 survivors × 120)
Salvage: +200 cr
───────────────────────────────────────────────────────
Net per mission: -173 cr
```

### Hard Difficulty
```
Reward: 2,250 cr avg (30% win rate → expected: 675 cr)
Ships lost: 1.8 per mission
Replacement: 1,872 cr
Consumables: 264 cr (2.2 survivors × 120)
Salvage: +250 cr
───────────────────────────────────────────────────────
Net per mission: -947 cr (LOSS for average player)
```

**Key Insight:** Hard difficulty has negative expected value for average players. It only pays off for:
- Skilled players who beat the odds
- Players with accumulated scrap (reduces replacement costs)
- Players with upgraded ships (higher survival)

This creates natural risk/reward dynamics.

---

## Sector Checkpoint Definitions

**Design Principle:** Define the EXPECTED player state at each sector boundary, then balance missions against these checkpoints.

**Assumptions:**
- 8 missions required per sector to advance
- Cautious player mix: 5 easy, 2 medium, 1 hard per sector
- Players upgrade rather than hoard cash

---

### Sector 1: Frontier (Starting)

**Checkpoint State:**
| Attribute | Value |
|-----------|-------|
| Credits | 1,000 |
| Ships | 4 fighters |
| Pilots | 1 ace (commander) + 3 regular |
| Weapons | Plasma + Seekers |
| Squadron Value | ~4,400 cr |

**Rewards by Difficulty:**
- Easy: 1,000-1,500 cr
- Medium: 1,500-2,000 cr
- Hard: 2,000-2,500 cr

**Enemy Skill Range:** Green to Rookie

---

### Sector 2: Contested Zone

**Progression from Sector 1:**
- 8 missions completed
- Net profit: ~2,000 cr after replacements
- Typical purchases: 1 ship upgrade, 1-2 weapons, 1 pilot

**Checkpoint State:**
| Attribute | Value |
|-----------|-------|
| Credits | 1,500-2,500 |
| Ships | 3-4 ships (1-2 upgraded to interceptor/defender) |
| Pilots | Mix of regular/veteran |
| Weapons | Some railguns or lasers |
| Squadron Value | ~6,000-8,000 cr |

**Rewards by Difficulty:**
- Easy: 2,000-2,500 cr
- Medium: 2,500-3,500 cr
- Hard: 3,500-4,500 cr

**Enemy Skill Range:** Rookie to Regular

---

### Sector 3: Warzone

**Checkpoint State:**
| Attribute | Value |
|-----------|-------|
| Credits | 2,000-4,000 |
| Ships | 4 ships (2-3 upgraded classes) |
| Pilots | Mostly veteran, some ace |
| Weapons | Advanced loadouts (beams, railguns) |
| Squadron Value | ~10,000-14,000 cr |

**Rewards by Difficulty:**
- Easy: 3,500-4,500 cr
- Medium: 4,500-5,500 cr
- Hard: 5,500-7,000 cr

**Enemy Skill Range:** Regular to Veteran

---

### Sector 4: Core Systems

**Checkpoint State:**
| Attribute | Value |
|-----------|-------|
| Credits | 3,000-6,000 |
| Ships | 5 ships (mostly upgraded) |
| Pilots | Veteran/ace mix |
| Weapons | Full advanced loadouts |
| Squadron Value | ~16,000-22,000 cr |

**Rewards by Difficulty:**
- Easy: 5,000-6,500 cr
- Medium: 6,500-8,000 cr
- Hard: 8,000-10,000 cr

**Enemy Skill Range:** Veteran to Ace

---

### Sector 5: Endless / Final

**Checkpoint State:**
| Attribute | Value |
|-----------|-------|
| Credits | 4,000-10,000 |
| Ships | 5-6 ships (fully upgraded) |
| Pilots | Ace |
| Weapons | Best available |
| Squadron Value | ~25,000-35,000 cr |

**Rewards by Difficulty:**
- Easy: 7,000-9,000 cr
- Medium: 9,000-12,000 cr
- Hard: 12,000-15,000 cr

**Enemy Skill Range:** Veteran to Ace

---

## Simulation Test Loadouts

To validate mission balance, test each sector's missions against these reference loadouts.

**Player skill progression:** The "player" ship (first in list) represents human skill level,
which improves as they progress through the campaign: Regular → Veteran → Ace.

### Sector 1 Test Loadout (New Player)
- 4x Fighter (all regular skill)

### Sector 2 Test Loadout (Improving Player)
- 1x Fighter (veteran)
- 1x Fighter (regular)
- 1x Interceptor (regular)
- 1x Defender (regular)

### Sector 3 Test Loadout (Solid Player)
- 1x Interceptor (veteran)
- 1x Interceptor (regular)
- 2x Defender (regular)

### Sector 4 Test Loadout (Skilled Player)
- 1x Striker (ace)
- 1x Striker (veteran)
- 2x Defender (veteran)
- 1x Sentinel (regular)

### Sector 5 Test Loadout (Master Player)
- 2x Striker (ace)
- 2x Defender (ace)
- 2x Sentinel (ace)

---

## Mission Design Guidelines

### Per-Sector Enemy Scaling

| Sector | Base Enemy Skill | Strong Enemies | Wave Count |
|--------|------------------|----------------|------------|
| 1 | Green | Rookie | 4-5 |
| 2 | Rookie | Regular | 5-6 |
| 3 | Regular | Veteran | 5-6 |
| 4 | Veteran | Ace | 6-7 |
| 5 | Veteran | Ace | 6-8 |

### Target Win Rates (by difficulty)

| Difficulty | Target Win Rate | Avg Time |
|------------|-----------------|----------|
| Easy | 60-80% | 90-180s |
| Medium | 40-60% | 90-180s |
| Hard | 20-40% | 90-180s |

Each sector should have all three difficulties available. Missions are balanced against the sector-specific test loadout (see above), NOT a universal 4x Regular loadout.

### Reward Formula

```
reward = expected_replacement_cost - expected_salvage + profit_margin
```

Where:

**Expected Replacement Cost:**
- `ships_lost × avg_ship_value + consumables_used`

**Average Ship Value** (per lost ship):
- Ship hull: chassis price (e.g., fighter = 400 cr)
- Primary weapons: sum of equipped primary prices
- Secondary weapons: full missile/decoy loadout at mission start
- Pilot: hire cost by skill (rookie 75, regular 200, veteran 400, ace 700)

**Consumables Used** (by ALL ships, survivors and lost):
- Missiles fired × missile price
- Decoys deployed × decoy price

**Expected Salvage:**
- `enemy_value × 0.05` (5% of total enemy composition value)
- Enemy value = sum of all enemy ships (hull + weapons + missiles)

**Profit Margin:**
- Easy: 500 cr
- Medium: 750 cr
- Hard: 1,000 cr

**Calculation Method:**
Run `npx tsx scripts/tests/campaign/calculate-rewards.mjs [sector]` to compute
recommended rewards based on simulation data (30 runs per mission).

---

## Campaign Flow

### Mission Flow

Each mission follows this sequence:

1. **Squadron** - Manage pilots, ships, equipment
2. **Contracts** - View available missions, select one
3. **Squad Selection** - Choose which ships to deploy
4. **Launch** - Confirm loadout
5. **Mission** - Play the combat mission
6. **Results** - Show kills, salvage, rewards
7. **Return to Squadron**

### Sector Transition

Players can advance to the next sector at any time via the "Skip Ahead" button. There is no minimum contract requirement.

Each sector increases difficulty and unlocks new equipment in the store.

### Permadeath

**Single Player:**
- Commander ship destroyed = Campaign Over
- Show final stats, offer new run

Wingmen can die and be replaced. Only the commander's death ends the campaign.
