# Ships

## Overview

Ships are small, single-pilot fighters. Each has distinct characteristics making it suited for different roles. No ship is universally best.

## Ship Stats

| Stat | Description | Range |
|------|-------------|-------|
| Hull | Hit points after shields depleted | 50-200 |
| Shields | Regenerating protection | 30-150 |
| Shield Regen | Points per second when regenerating | 5-20 |
| Regen Delay | Seconds after damage before regen starts | 2-5 |
| Max Speed | Maximum velocity (m/s) | 150-300 |
| Acceleration | How quickly reaches max speed | 50-150 |
| Turn Rate | Degrees per second (pitch/yaw) | 60-120 |
| Roll Rate | Degrees per second (roll) | 90-180 |
| Angular Accel | How fast rotation spins up/down (deg/sec²) | 400-1200 |
| Max Heat | Heat capacity before overheating | 80-150 |
| Cooling | Heat dissipated per second | 10-25 |
| AB Heat Rate | Heat generated per second while afterburning | 25-60 |
| Primary Banks | Number of primary weapon slots | 1-5 |
| Secondary Banks | Number of secondary weapon slots | 1-6 |

### Angular Acceleration

Controls rotational inertia - how quickly a ship reaches its turn/roll rate when input is pressed, and how quickly it stops rotating when input is released.

- **High values (1000+):** Snappy, responsive controls. Light fighters.
- **Low values (400-600):** Heavy, sluggish feel. Bombers and heavy ships.
- **Default (800):** Balanced feel, ~0.125s to reach full turn rate.

## Hitbox Multiplier

- AI ships: 1.5x model size (easier to hit)
- Player ship: 0.8x model size (harder to hit)

This makes human gameplay viable against AI.

## Ship Roster

### Role Summary

| Ship | Focus | Primary Banks | Secondary Banks | Playstyle |
|------|-------|---------------|-----------------|-----------|
| Scout | Guns | 2 | 1 | Fast gun platform, minimal missiles |
| Interceptor | Balanced | 3 | 2 | Jack of all trades |
| Striker | Guns | 5 | 1 | Maximum gun DPS, one emergency missile |
| Bomber | Missiles | 1 | 6 | Missile boat, token gun for cleanup |
| Defender | Missiles | 2 | 4 | Tanky missile platform |
| Raider | Guns | 4 | 2 | Fast gun-focused glass cannon |
| Sentinel | Balanced | 3 | 4 | Long-range support, beams + missiles |

### Scout

Fast, fragile gun platform.

| Stat | Value |
|------|-------|
| Hull | 50 |
| Shields | 30 |
| Shield Regen | 8 |
| Regen Delay | 2s |
| Max Speed | 300 |
| Acceleration | 150 |
| Turn Rate | 120 |
| Roll Rate | 180 |
| Angular Accel | 1100 |
| Max Heat | 80 |
| Cooling | 15 |
| AB Heat Rate | 25 |
| Primary Banks | 2 (size 1, 1) |
| Secondary Banks | 1 (size 1) |

**Role:** Gun-focused hit and run. Minimal missiles, relies on speed and guns.
**Focus:** GUNS
**Heat Profile:** Low capacity but cheap afterburner - can boost frequently for hit-and-run tactics.

### Interceptor

Balanced fighter, jack of all trades.

| Stat | Value |
|------|-------|
| Hull | 80 |
| Shields | 60 |
| Shield Regen | 10 |
| Regen Delay | 3s |
| Max Speed | 250 |
| Acceleration | 100 |
| Turn Rate | 100 |
| Roll Rate | 150 |
| Angular Accel | 800 |
| Max Heat | 100 |
| Cooling | 18 |
| AB Heat Rate | 40 |
| Primary Banks | 3 (size 1, 1, 2) |
| Secondary Banks | 2 (size 1, 2) |

**Role:** Default starting ship. Good at everything, great at nothing.
**Focus:** BALANCED
**Heat Profile:** Balanced capacity and afterburner cost - the baseline for comparison.

### Striker

Heavy gun platform, maximum primary firepower.

| Stat | Value |
|------|-------|
| Hull | 120 |
| Shields | 80 |
| Shield Regen | 12 |
| Regen Delay | 3s |
| Max Speed | 200 |
| Acceleration | 80 |
| Turn Rate | 80 |
| Roll Rate | 120 |
| Angular Accel | 600 |
| Max Heat | 150 |
| Cooling | 25 |
| AB Heat Rate | 60 |
| Primary Banks | 5 (size 2, 2, 2, 1, 1) |
| Secondary Banks | 1 (size 1) |

**Role:** Gun-focused assault ship. Overwhelming primary firepower, single missile slot for emergencies.
**Focus:** GUNS
**Heat Profile:** Huge capacity for 5 gun banks, but expensive afterburner - save heat for guns.

### Bomber

Dedicated missile boat.

| Stat | Value |
|------|-------|
| Hull | 100 |
| Shields | 70 |
| Shield Regen | 10 |
| Regen Delay | 3s |
| Max Speed | 180 |
| Acceleration | 70 |
| Turn Rate | 75 |
| Roll Rate | 110 |
| Angular Accel | 500 |
| Max Heat | 80 |
| Cooling | 12 |
| AB Heat Rate | 55 |
| Primary Banks | 1 (size 2) |
| Secondary Banks | 6 (size 2, 2, 2, 1, 1, 1) |

**Role:** Missile-focused. Delivers massive ordnance, weak gun for cleanup only.
**Focus:** MISSILES
**Heat Profile:** Low capacity, slow cooling, expensive afterburner - deliberate and methodical.

### Defender

Tanky missile platform.

| Stat | Value |
|------|-------|
| Hull | 150 |
| Shields | 120 |
| Shield Regen | 18 |
| Regen Delay | 2.5s |
| Max Speed | 180 |
| Acceleration | 70 |
| Turn Rate | 70 |
| Roll Rate | 100 |
| Angular Accel | 550 |
| Max Heat | 100 |
| Cooling | 18 |
| AB Heat Rate | 50 |
| Primary Banks | 2 (size 2, 1) |
| Secondary Banks | 4 (size 2, 2, 1, 1) |

**Role:** Missile-focused tank. Absorbs damage while launching missiles. Light guns.
**Focus:** MISSILES
**Heat Profile:** Balanced capacity, standard afterburner cost - survives through shields, not speed.

### Raider

Glass cannon gun platform.

| Stat | Value |
|------|-------|
| Hull | 60 |
| Shields | 40 |
| Shield Regen | 6 |
| Regen Delay | 4s |
| Max Speed | 280 |
| Acceleration | 120 |
| Turn Rate | 110 |
| Roll Rate | 160 |
| Angular Accel | 1000 |
| Max Heat | 140 |
| Cooling | 22 |
| AB Heat Rate | 35 |
| Primary Banks | 4 (size 2, 2, 1, 1) |
| Secondary Banks | 2 (size 1, 1) |

**Role:** Gun-focused glass cannon. Fast, deadly, fragile. Limited missiles.
**Focus:** GUNS
**Heat Profile:** High capacity for 4 gun banks, cheap afterburner - commits hard to speed and aggression.

### Sentinel

Long-range support with beam focus.

| Stat | Value |
|------|-------|
| Hull | 100 |
| Shields | 100 |
| Shield Regen | 15 |
| Regen Delay | 3s |
| Max Speed | 200 |
| Acceleration | 90 |
| Turn Rate | 90 |
| Roll Rate | 130 |
| Angular Accel | 700 |
| Max Heat | 130 |
| Cooling | 22 |
| AB Heat Rate | 45 |
| Primary Banks | 3 (size 3, 2, 1) |
| Secondary Banks | 4 (size 2, 2, 1, 1) |

**Role:** Balanced support. Large primary banks favor beam weapons. Good missile capacity.
**Focus:** BALANCED (beam-optimized)
**Heat Profile:** High capacity for sustained beams, moderate afterburner cost - maintains range, doesn't rush.

## Starting Squadron

New campaign starts with:
- 1x Interceptor (player)
- 2x Scout (wingmen)

## Acquisition

Ships are acquired through:
1. **Salvage:** Collect enough scrap of a ship type
2. **Purchase:** Buy outright with credits
3. **Mission reward:** Some contracts offer ships

## Bank Size Reference

| Size | Energy Heat Cap | Ballistic Ammo | Missile Ammo |
|------|-----------------|----------------|--------------|
| 1 | 1x | 1x | 1x |
| 2 | 2x | 2x | 2x |
| 3 | 3x | 3x | 3x |

Example: Plasma in size-2 bank = 2x shots before overheat

## Pilots

Ships require pilots. Pilots have:
- Name (generated)
- Skill level (affects AI accuracy when flying as wingman)

Pilots can be:
- Hired (costs credits)
- Lost (if ship destroyed)
- Reassigned between ships
