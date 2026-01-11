# Campaign System

## Overview

The campaign is a roguelike progression through sectors, completing contracts, acquiring ships and equipment, with permadeath ending the run.

## Campaign Structure

### Sectors

Campaign is divided into 5-7 sectors, each containing:
- 8-12 available contracts
- Unique faction presence
- Escalating difficulty
- Sector-specific rewards

### Progression

| Sector | Difficulty | New Content |
|--------|------------|-------------|
| 1 | Tutorial | Basic enemies, simple missions |
| 2 | Easy | More enemy variety |
| 3 | Medium | Elite enemies appear |
| 4 | Hard | Complex missions |
| 5 | Very Hard | Multi-wave missions |
| 6 | Extreme | Boss encounters |
| 7 | Final | Campaign climax |

### Sector Transition

Move to next sector when:
- Completed minimum contracts (3-5)
- OR pursued by faction (FTL-style pressure)
- OR chose to advance early

## Contracts

### Contract Generation

Each sector generates contracts with:
- Mission type (from DESIGN.md list)
- Enemy composition
- Reward (credits)
- Salvage rights (percentage)
- Optional modifiers

### Reward Slider

When accepting a contract:
```
[More Credits] ◆━━━━━━━━━● [More Salvage]
     80/20        50/50        20/80
```

- Left: More credits, less salvage chance
- Right: Less credits, more salvage chance

### Contract Difficulty Indicators

- Enemy count: 3-20
- Enemy types: icons
- Special conditions: badges
- Estimated duration: 1-3 min

## Economy

### Income Sources

1. **Contract rewards** - Primary income
2. **Salvage sale** - Sell unwanted scrap/equipment
3. **Equipment sale** - Sell owned equipment at discount

### Expenses

1. **Ships** - 2000-8000 credits
2. **Weapons** - 200-2000 credits
3. **Ammo/Missiles** - 10-100 credits per unit
4. **Pilots** - 500-1500 credits to hire

### Pricing Reference

| Item | Buy | Sell |
|------|-----|------|
| Scout | 2000 | 800 |
| Interceptor | 3000 | 1200 |
| Striker | 5000 | 2000 |
| Defender | 5500 | 2200 |
| Raider | 4500 | 1800 |
| Sentinel | 6000 | 2400 |
| Plasma | 400 | 160 |
| Railgun | 800 | 320 |
| Seeker (x10) | 200 | 80 |
| Pilot (hire) | 1000 | - |

### Contract Rewards

| Sector | Base Reward | Modifier Range |
|--------|-------------|----------------|
| 1 | 500 | 0.8-1.2 |
| 2 | 800 | 0.8-1.3 |
| 3 | 1200 | 0.7-1.4 |
| 4 | 1800 | 0.7-1.5 |
| 5 | 2500 | 0.6-1.6 |
| 6 | 3500 | 0.6-1.8 |
| 7 | 5000 | 0.5-2.0 |

## Salvage System

### How Salvage Works

1. Destroy enemy ship
2. Roll for salvage (based on contract %)
3. If successful, gain one of:
   - Ship scrap (toward building that ship type)
   - Weapon (from enemy loadout)
   - Ammo (partial from enemy)

### Scrap Accumulation

Ships require scrap to build:
- Scout: 3 scrap
- Interceptor: 4 scrap
- Striker: 6 scrap
- Defender: 6 scrap
- Raider: 5 scrap
- Sentinel: 7 scrap

Can also sell scrap: 200 credits per scrap

### Salvage Probabilities

Base chance per destroyed enemy:
- 20% salvage rights → 20% chance per enemy
- 50% salvage rights → 50% chance per enemy
- 80% salvage rights → 80% chance per enemy

What you get (if salvage succeeds):
- 50% chance: Ship scrap
- 30% chance: Weapon
- 20% chance: Ammo bundle

## Progression Pacing

### Squadron Size Caps (Per Sector)

To prevent rushing to maximum squadron size, squadron slots are unlocked by sector:

| Sector | Max Ships | Max Pilots | Notes |
|--------|-----------|------------|-------|
| 1 | 3 | 3 | Starting squadron |
| 2 | 4 | 4 | First expansion slot |
| 3 | 5 | 5 | Mid-game growth |
| 4 | 6 | 6 | - |
| 5 | 7 | 7 | Near full strength |
| 6-7 | 8 | 8 | Maximum capacity |

**Enforcement:**
- Cannot hire pilots beyond sector cap
- Cannot build/buy ships beyond sector cap
- Extra scrap/ships found as rewards are stored but cannot be deployed

### Store Availability by Sector

Not all ships/weapons available immediately:

| Sector | Available Ships | Available Weapons |
|--------|-----------------|-------------------|
| 1 | Scout, Interceptor | Plasma, Pulse, Autocannon, Rocket, Seeker |
| 2 | + Raider | + Ion, Flak, Dart |
| 3 | + Striker | + Railgun, Cluster, Red Laser |
| 4 | + Bomber | + Torpedo, Green Laser, Swarm |
| 5 | + Defender | + Blue Laser, Lightning |
| 6+ | + Sentinel | + Nuclear Lance, Nuke |

**Note:** Enemy ships may have weapons you can't buy yet. Salvaging them is valuable.

### Target Curve

| Missions | Sector | Expected State |
|----------|--------|----------------|
| 0 | 1 | 3 ships, 3 pilots, basic loadout |
| 15 | 2 | 4 ships, first weapon upgrade |
| 30 | 3 | 5 ships, mixed loadouts |
| 45 | 4 | 6 ships, lost & recovered 1+ |
| 60 | 5 | 7 ships, specialized builds |
| 75 | 6 | 8 ships, optimal loadouts |
| 90 | 7 | Campaign complete |

### Meaningful Progress Per Mission

Each mission should provide:
- Enough credits for 1 minor purchase (ammo, small weapon)
- OR significant progress toward major purchase
- OR salvage progress toward new ship

### Death Spiral Prevention

If player has:
- Only 1 ship remaining
- Less than 500 credits

Then:
- Offer "desperate contract" with guaranteed minimum reward
- Reduce enemy count/difficulty
- Increase salvage chance

## Hangar

### Layout

```
┌─────────────────────────────────────────────┐
│  SQUADRON                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Ship 1│ │Ship 2│ │Ship 3│ │ + Add│       │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────────────┤
│  SELECTED SHIP: Interceptor                 │
│  ┌────────────────────────────────────────┐ │
│  │ [Hull: 80] [Shields: 60]               │ │
│  │                                        │ │
│  │ Primary Banks:                         │ │
│  │ [1: Plasma] [2: Plasma] [3: ___]      │ │
│  │                                        │ │
│  │ Secondary Banks:                       │ │
│  │ [1: Seeker x10] [2: ___] [3: ___]     │ │
│  │                                        │ │
│  │ Pilot: Jake "Maverick" Chen           │ │
│  └────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  STORAGE                                    │
│  [Pulse] [Railgun] [Seeker x5] [Scrap: 2]  │
├─────────────────────────────────────────────┤
│  Credits: 2,450                             │
│  [STORE] [CONTRACTS] [LAUNCH]               │
└─────────────────────────────────────────────┘
```

### Interactions

- Drag equipment from storage to ship banks
- Drag equipment from ship to storage
- Click ship to select
- Click + to add ship (if have scrap or credits)
- Click pilot to reassign

## Mission Flow

1. **Hangar** - Manage squadron, equipment
2. **Contracts** - View available, select one
3. **Briefing** - Mission details, adjust salvage slider
4. **Launch** - Confirm loadout
5. **Mission** - Play the mission
6. **Results** - Show kills, salvage, rewards
7. **Return to Hangar**

## Permadeath

### Single Player
- Player ship destroyed = Campaign Over
- Show stats, offer new run

### Multiplayer (Future)
- Player can respawn in wingman ship
- All human players dead = Campaign Over
- Host controls campaign decisions
