# UI Specification

This document describes the campaign UI screens for the spaceflight game. Use this as a reference when implementing new UI.

## Overview

The game has 6 screens managed by a state machine:

| Screen | Purpose |
|--------|---------|
| **Hangar** | Squadron management hub - view ships, manage loadouts, prepare for missions |
| **Store** | Equipment shop - buy/sell hulls, weapons, ammo, and scrap |
| **Contracts** | Mission selection - choose from available contracts |
| **Mission** | 3D combat gameplay (not covered here - uses WebGL renderer) |
| **Results** | Post-mission debrief and salvage display |
| **Game Over** | Campaign ended - final stats and restart option |

## Navigation Flow

```
Hangar ←→ Store
   ↓
Contracts
   ↓
Mission (3D gameplay)
   ↓
Results → Hangar (victory) or Game Over (player ship destroyed)
```

---

## Screen: Hangar

### Purpose
Central hub for squadron management. Player reviews their ships, manages weapon loadouts, and prepares for the next mission.

### Data Displayed
- **Credits** (top corner) - current balance
- **Current Sector** - campaign progress indicator
- **Ship List** - all owned ships showing:
  - Pilot name (or "You" for player ship)
  - Pilot skill level (for wingmen)
  - Ship class
  - Hull percentage and damage amount
- **Storage Inventory** - items not equipped:
  - Unassigned pilots (name + skill)
  - Stored hulls (class + hull %)
  - Stored weapons (name + category)
  - Stored ammo (type + count)
- **Scrap Inventory** - salvaged scrap by ship class, with conversion option
- **Deploy Panel** (conditional) - when pilots AND hulls available, shows pilot+hull combinations

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Select ship | Click ship in list | Opens loadout panel in sidebar |
| Deselect ship | Click selected ship again | Closes loadout panel |
| Deploy wingman | Click "Deploy" on pilot+hull combo | Creates new ship, removes pilot and hull from storage |
| Convert scrap | Click "Convert" | Consumes 100 scrap + fee, creates new hull |
| Resupply | Click "Resupply" | Refills all ammo, costs credits |
| Open store | Click "Equipment Store" | Navigates to Store screen |
| Select contract | Click "Select Contract" | Navigates to Contracts screen |

### Loadout Panel (Sidebar)
When a ship is selected, shows:
- Ship name and class
- Primary weapon banks (weapon type, ammo if finite)
- Secondary weapon banks (missile/decoy type, count)
- Actions: Unequip, Swap weapons, Load/unload ammo

### States
- **Default** - No ship selected, shows inventory and action buttons
- **Ship Selected** - Loadout panel visible in sidebar
- **Low Credits** - Resupply button disabled if can't afford
- **Fully Supplied** - Resupply button shows "Fully Supplied" and is disabled

---

## Screen: Store

### Purpose
Equipment shop for buying and selling ships, weapons, and ammunition.

### Data Displayed
- **Credits** (top corner)
- **Category Tabs** - Hulls, Primaries, Missiles, Ammo, Scrap
- **Item List** - items in selected category showing:
  - Item name
  - Stock count (in brackets)
  - Price (buy price for purchasable items, sell price for scrap)
- **Detail Panel** (when item selected):
  - Item name and stats
  - Buy/sell prices
  - Store stock count
  - Player storage count
  - Buy/Sell buttons (with bulk options for consumables)

### Categories
| Category | Items | Buy/Sell |
|----------|-------|----------|
| Hulls | Ship classes (interceptor, striker, etc.) | Both |
| Primaries | Primary weapons (plasma, autocannon, etc.) | Both |
| Missiles | Secondary weapons (seeker, torpedo, decoy) | Both |
| Ammo | Ammunition for ballistic weapons | Both |
| Scrap | Salvaged ship parts | Sell only |

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Change category | Click category tab | Shows items in that category |
| Select item | Click item in list | Shows detail panel |
| Buy item | Click "Buy" | Deducts credits, adds to storage, decrements stock |
| Sell item | Click "Sell" | Adds credits, removes from storage, increments stock |
| Buy bulk | Click "Buy ×10/×100" | Bulk purchase (missiles/ammo only) |
| Sell bulk | Click "Sell ×10/×100" | Bulk sell (missiles/ammo/scrap only) |
| Go back | Click "← Back" | Returns to Hangar |

### Item Stats Display
- **Hulls**: Hull points, speed, weapons banks, description
- **Primaries**: Damage, fire rate, range, ammo type
- **Missiles**: Damage, tracking, speed
- **Ammo**: Compatible weapon, pack size
- **Scrap**: Conversion rate (100 scrap + fee → 1 hull)

### States
- **Can't Afford** - Buy button disabled, price shown in different color
- **Out of Stock** - Buy button disabled, stock shows [0]
- **Not in Storage** - Sell button disabled

---

## Screen: Contracts

### Purpose
Mission selection. Player chooses from available contracts with varying difficulty and rewards.

### Data Displayed
- **Credits** (top corner)
- **Current Sector**
- **Contract List** - available missions showing:
  - Mission name
  - Difficulty badge (EASY/MEDIUM/HARD)
  - Description
  - Enemy count and composition (e.g., "8 hostiles in 5 waves (4x dragonfly, 4x firefly)")
  - Reward amount

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Accept contract | Click contract | Starts mission with selected contract |
| Go back | Click "← Back" | Returns to Hangar |

### Contract Difficulty Colors
- **Easy** - Green
- **Medium** - Yellow/Orange
- **Hard** - Red

---

## Screen: Results

### Purpose
Post-mission debrief showing combat statistics and salvage collected.

### Data Displayed
- **Result Title** - "VICTORY" (green) or "DEFEAT" (red)
- **Mission Summary**:
  - Mission name
  - Credits earned (mission reward)
  - Total credits
  - Ships remaining
  - Missions completed
- **Tab: Debrief** - Combat statistics per pilot:
  - Pilot cards showing kills, assists, damage dealt/received
  - Weapon accuracy breakdown
  - Time survived (if killed)
- **Tab: Salvage** - Items collected:
  - Scrap by ship class
  - Weapons recovered
  - Ammo recovered
  - Estimated total value

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Switch tab | Click "Debrief" or "Salvage" | Shows selected content |
| Continue | Click "Return to Hangar" / "Continue" | Returns to Hangar |

### States
- **Victory** - Shows mission reward, button says "Return to Hangar"
- **Defeat** - No reward, button says "Continue"
- **No Salvage** - Shows "No salvage collected" message

---

## Screen: Game Over

### Purpose
Campaign ended because player's ship was destroyed. Shows final stats and allows restart.

### Data Displayed
- **Title** - "GAME OVER"
- **Final Stats**:
  - "Your ship was destroyed."
  - Final credits
  - Missions completed
  - Sector reached

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Restart | Click "Start New Campaign" | Resets game, returns to Hangar with fresh state |

---

## Visual Design Notes

### Current Color Palette
| Purpose | Color |
|---------|-------|
| Primary/Accent | `#4da6ff` (cyan blue) |
| Primary Hover | `#6a9aca` |
| Success | `#44cc66` (green) |
| Warning | `#ffaa44` (orange) |
| Danger | `#cc4444` (red) |
| Panel Background | `rgba(20, 30, 50, 0.9)` |
| Text Primary | `#e0e0e0` |
| Text Secondary | `#7a9aba` |

### Typography
- Monospace font throughout (`Courier New`)
- Uppercase for labels and badges

### Layout Patterns
- Full-screen flexbox containers
- Semi-transparent bordered panels
- Two-column layouts (main + sidebar) for complex screens
- Button rows with consistent spacing

### Interactive Elements
- Buttons: Bordered, color-coded by action type
- Lists: Clickable items with hover/selected states
- Tabs: Active tab highlighted with primary color

---

## Integration Points

### State Management
All screens receive `CampaignState` and trigger updates via callbacks:
```typescript
onStateUpdate: (newState: CampaignState) => void
```

### Navigation Callbacks
Each screen has navigation callbacks:
- `onBack: () => void` - Return to previous screen
- `onSelectContracts: () => void` - Go to contracts
- `onStore: () => void` - Go to store
- `onContinue: () => void` - Proceed (context-dependent)

### Type Imports
All screen props and actions should reference types from:
- `src/campaign/types.ts` - Campaign state and data types
- `src/ui/types/` - Screen-specific prop and action interfaces
