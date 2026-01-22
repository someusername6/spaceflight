# Combat Systems Review

## Weapon Categories

### Energy Weapons (Infinite Ammo)
| Weapon | Damage | Fire Rate | Range | Special |
|--------|--------|-----------|-------|---------|
| Plasma | 16 | 8/s | 800m | Standard energy |
| Pulse | 12 | 10/s | 500m | Fast firing |
| Ion | 10 | 5.5/s | 700m | Ionizes shields (8s) |

### Ballistic Weapons (Finite Ammo)
| Weapon | Damage | Fire Rate | Range | Special |
|--------|--------|-----------|-------|---------|
| Autocannon | 9 | 15/s | 400m | High fire rate |
| Slug Cannon | 45 | 2.5/s | 1000m | Autoaim 0.5° |
| Railgun | 80 | 1/s | 2000m | Extreme range, Autoaim 2° |
| Flak | 40 (10×4) | 4/s | 600m | Proximity detonation |
| Gyrojet | 200 max | 4/s | 2000m | Accelerates, damage scales with speed |

### Beam Weapons (Continuous)
| Weapon | DPS | Range | Special |
|--------|-----|-------|---------|
| Red Laser | 120 | 400m | Shortest range, most heat |
| Green Laser | 80 | 800m | Balanced |
| Blue Laser | 50 | 1200m | Longest range |
| Lightning | 50 | 300m | Pulse beam, 5° autoaim |
| Torch | 30 | 200m | Injects 35 heat/sec to target |
| Nuclear Lance | 500 | 3000m | Single shot, massive damage |

## Missile Systems

### Dumbfire (No Lock)
- **Rocket**: Basic 50 damage
- **Starburst**: 80 shrapnel for area denial
- **Cluster**: 3 missiles per shot

### Homing (Requires Lock)
- **Seeker**: Standard homing, 4s lock
- **Dart**: Fast, light, 2s lock
- **Swarm**: 8 missiles per shot, rapid fire

### Heavy
- **Torpedo**: Slow, powerful (150 dmg), 7s lock
- **Nuke**: 300 damage with 100m AoE, 10s lock

### Countermeasures
- **Decoy**: 50% chance to seduce missiles within 200m

## Weapon Balance Assessment

### Strengths
1. **Diverse Options** - 11 primaries, 9 secondaries with distinct roles
2. **Range Tiers** - Clear short/medium/long range weapons
3. **Trade-offs** - Heat vs damage, ammo vs infinite, tracking vs damage
4. **Unique Mechanics** - Gyrojet acceleration, Torch heat injection, Flak proximity

### Balance Concerns

1. **Nuclear Lance Dominance**
   - 500 damage at 3000m range is extremely powerful
   - Limited only by single ammo and 30 heat
   - May overshadow other long-range options

2. **Torch Underperformance**
   - 30 DPS + 35 heat injection at only 200m range
   - Very risky to use; requires sustained close contact
   - Heat injection gimmick rarely decisive

3. **Gyrojet Complexity**
   - Speed-scaled damage is hard to intuit
   - Gentle tracking (2°/s) often insufficient
   - May be too complex for its niche

4. **Flak Consistency**
   - Proximity detonation at 50m can miss fast targets
   - Shrapnel spread is random
   - Inconsistent damage output

### Missile Balance

1. **Swarm Overwhelming** - 8 missiles at 0.1s fire rate floods defenses
2. **Torpedo Speed** - 200 m/s is very slow; easily evaded
3. **Decoy Reliability** - 50% chance feels random; skilled play not rewarded

## Recommendations

1. **Nuclear Lance**: Add longer cooldown or reduce damage
2. **Torch**: Increase range to 300m or boost heat injection
3. **Gyrojet**: Simplify damage scaling or increase tracking
4. **Torpedo**: Increase speed to 300 m/s
5. **Decoys**: Consider deterministic seduction (distance/angle based)
