# UI Specification

This document describes the campaign UI screens for the spaceflight game. Use this as a reference when implementing new UI.

## Overview

The game has 6 screens managed by a state machine:

| Screen | Purpose |
|--------|---------|
| **Squadron** | Unified pilot and ship management - view deployed pilots, manage loadouts, hire recruits |
| **Store** | Equipment shop - buy/sell hulls, weapons, ammo, and scrap |
| **Contracts** | Mission selection - choose from available contracts |
| **Mission** | 3D combat gameplay (not covered here - uses WebGL renderer) |
| **Results** | Post-mission debrief and salvage display |
| **Game Over** | Campaign ended - final stats and restart option |

## Navigation Flow

```
Squadron ←→ Store ←→ Contracts
                        ↓
                 Mission (3D gameplay)
                        ↓
                 Results → Squadron (victory) or Game Over (player ship destroyed)
```

## Global Navigation Bar

The Squadron, Store, and Contracts screens share a **persistent navigation bar** at the top of the screen. This provides consistent navigation without back buttons.

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│  [SQUADRON]  [STORE]  [CONTRACTS]                 SECTOR 1   1250cr  │
└──────────────────────────────────────────────────────────────────────┘
```

### Requirements
- **Position**: Fixed at top of viewport, always visible
- **Tabs**: Three navigation tabs - Squadron, Store, Contracts
- **Active State**: Current screen's tab is highlighted (primary color, underline or background)
- **Inactive State**: Other tabs are dimmed but clearly clickable
- **Right Side**: Sector indicator and credits display (moved from individual screens)
- **No Back Buttons**: Navigation is purely through tabs, no "← Back" buttons
- **No Duplicate Titles**: The nav bar IS the header; screens should NOT repeat titles like "SQUADRON" or "EQUIPMENT STORE" below the nav bar

### Tab Behavior
| Tab | Destination | Notes |
|-----|-------------|-------|
| SQUADRON | Squadron screen | Pilot and ship management (unified) |
| STORE | Store screen | Equipment shop |
| CONTRACTS | Contracts screen | Mission selection, launches mission on contract click |

### Screen-Specific Actions
Actions that are specific to each screen should be placed **within the screen content**, not in the navigation bar:
- **Squadron**: NO toolbar row - maximizes vertical space for viewers
- **Store**: Resupply button + Buy/Sell buttons in detail panel
- **Contracts**: Mission details and accept button in detail panel

---

## Consistent Screen Layout

All three main screens (Squadron, Store, Contracts) MUST use consistent layout dimensions:

### Fixed Content Width
- **Maximum content width**: 1200px (centered on larger screens)
- **Minimum content width**: 800px
- **Horizontal padding**: 24px on each side
- **ALL THREE SCREENS** (Squadron, Store, Contracts) MUST use identical max-width

### Height Constraints
- **No scrolling required** for core interface on standard desktop viewport (1080p)
- Each screen must fit within `100vh - 56px` (nav bar height)
- Individual panels may scroll internally, but the overall layout must not

### Fixed Panel Widths (CRITICAL)
All panel/column widths must be **CSS fixed values**, not content-dependent:
- Panels must NOT expand when content changes (e.g., selecting an item with long description)
- Use `overflow-y: auto` for internal scrolling when content exceeds panel height
- Use `overflow: hidden` with text truncation for single-line content

### Three-Column Grid (when applicable)
When a screen uses a three-column layout:
```
┌────────────────────────────────────────────────────────┐
│ [Left Panel]  │  [Center Panel]   │  [Right Panel]    │
│   240px       │      1fr          │     280px         │
│   fixed       │   flexible        │     fixed         │
└────────────────────────────────────────────────────────┘
```

All column widths must be **fixed** - content within columns should not cause layout shifts.

---

## Screen: Squadron

### Purpose
Unified pilot and ship management hub. Players can view deployed pilot-ship pairs, manage loadouts, view pilot stats, deploy available pilots to ships/hulls, and hire new recruits.

### Layout
Three-column grid:
- **Left (240px)**: Unified list (DEPLOYED, AVAILABLE, RECRUITS sections)
- **Center (flex)**: Tabbed viewer [LOADOUT][PILOT] or pilot/recruit viewer
- **Right (280px)**: Ship stats panel (when ship is selected)

### Unified List (Left Panel)
The list is divided into sections:

**DEPLOYED Section** - Pilot-ship pairs showing:
- Pilot name
- Ship class
- Weapon status (e.g., "2/2" primary, "4/8" secondary)
- Commander highlighted with amber border

**AVAILABLE Section** - Unassigned pilots showing:
- Pilot name
- "Available" status
- Commander highlighted with amber border

**RECRUITS Section** - Hireable pilots showing:
- Pilot name
- Skill level
- Hire price
- Dimmed if unaffordable

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Select deployed | Click deployed item | Shows tabbed viewer with LOADOUT/PILOT tabs |
| Select available | Click available pilot | Shows pilot viewer with assignment options |
| Select recruit | Click recruit | Shows recruit viewer with hire option |
| Switch tab | Click LOADOUT or PILOT tab | Switches between loadout and pilot views |
| Equip weapon | Click empty hardpoint slot | Opens weapon picker |
| Unequip weapon | Click filled hardpoint slot | Returns weapon to storage |
| Assign to ship | Click ship button in viewer | Assigns pilot to available ship |
| Deploy with hull | Click hull card in viewer | Creates new ship from stored hull |
| Hire recruit | Click "Hire" button | Deducts credits, adds pilot to AVAILABLE |
| Change ship | Click "Change Ship" button | Opens ship picker to swap ships |

*Navigation via global nav bar (see Global Navigation Bar section)*

### Tabbed Viewer (Center Panel - Deployed Selection)
When a deployed pilot-ship pair is selected, shows tabs:

**[LOADOUT] Tab** - Ship schematic with:
- Ship class and pilot name in header
- Primary weapon banks (above ship icon)
- Secondary weapon banks (below ship icon)
- Change Ship button
- Click hardpoints to equip/unequip weapons

**[PILOT] Tab** - Pilot career stats:
- Pilot name and rank
- Career stats (missions, victories, kills, assists, damage dealt/received)
- Currently assigned ship with preview
- Change Ship and View Loadout buttons

### Pilot Viewer (Center Panel - Available Pilot Selection)
When an available (unassigned) pilot is selected, shows:
- Pilot name and rank
- Career stats
- Assignment options:
  - "Assign to ship:" - buttons for ships without pilots
  - "Deploy with hull:" - hull cards for stored hulls

### Recruit Viewer (Center Panel - Recruit Selection)
When a recruit is selected, shows:
- Recruit name and skill level badge
- Price to hire
- Skill description
- Fresh stats (0 kills, 0 missions)
- **[Hire Pilot]** button (disabled if can't afford)

### Ship Stats Panel (Right Column)
When a ship is selected (via deployed item), shows:
- Ship class
- Hull points
- Shields and regen rate
- Speed, Turn Rate, Acceleration
- Primary Banks (count with colored dots)
- Secondary Banks (count with colored dots)
- Heat Capacity and Cooling Rate

### States
- **Default** - No selection, center shows placeholder, right shows placeholder
- **Deployed Selected** - Tabbed viewer in center, ship stats in right
- **Available Selected** - Pilot viewer with assignment options, no ship stats
- **Recruit Selected** - Recruit viewer with hire button, no ship stats

---

## Screen: Store

### Purpose
Equipment shop for buying and selling ships, weapons, and ammunition. Also contains the Resupply function.

### Layout - Three-Panel Fixed Width
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Categories: Hulls | Primaries | Missiles | Ammo | Scrap]         [Resupply]    │
├────────────────────┬─────────────────────────────────┬──────────────────────────┤
│ [Item List]        │      [Detail Panel]             │   [Storage Panel]        │
│   280px FIXED      │         1fr flexible            │      280px FIXED         │
│   scroll if needed │      scroll if needed           │    scroll if needed      │
│                    │                                 │                          │
│  ○ Interceptor     │    ┌─────────────────────┐     │  Ship Hulls (2)          │
│  ● Striker (sel)   │    │  Item Preview Icon  │     │   - Interceptor ★        │
│  ○ Bomber          │    │  + Abbreviation     │     │   - Striker              │
│                    │    └─────────────────────┘     │                          │
│                    │    Stats                       │  Weapons                 │
│                    │    - Hull: 120                 │   - Plasma ×2            │
│                    │    - Shields: 80               │   - Autocannon ×1 ★      │
│                    │                                 │                          │
│                    │    In Storage: 1               │  Ammo                    │
│                    │    [Buy (700cr)] [Sell]        │   - Autocannon ×100      │
└────────────────────┴─────────────────────────────────┴──────────────────────────┘
```
★ = item highlighted when selected in store list (synchronized selection)

### Synchronized Selection
- Selecting an item in the **store list** highlights the matching item in **storage** (if owned)
- Clicking an item in **storage** switches to the correct category tab and selects that item
- This allows quick cross-referencing between what's for sale and what's owned

### Data Displayed
- **Credits** (top corner via nav bar)
- **Category Tabs** - Hulls, Primaries, Missiles, Ammo, Scrap
- **Resupply Button** (in category bar, always visible) - Resupply all ships
- **Item List** (left panel, **280px fixed width**) - items in selected category showing:
  - Item name
  - Stock count (in brackets)
  - Price (buy price for purchasable items, sell price for scrap)
- **Detail Panel** (center panel, when item selected):
  - Item preview (category icon + abbreviation)
  - Item name and stats
  - Player storage count
  - Buy/Sell buttons (with bulk options for consumables)
- **Storage Panel** (right panel, **280px fixed width**) - player inventory:
  - Stored hulls (clickable)
  - Stored weapons grouped by type (clickable)
  - Stored ammo (clickable)
  - Stored scrap (clickable)

### Categories
| Category | Items | Buy/Sell |
|----------|-------|----------|
| Hulls | Ship classes (interceptor, striker, etc.) | Both |
| Primaries | Primary weapons (plasma, autocannon, etc.) | Both |
| Missiles | Secondary weapons (seeker, torpedo, decoy) | Both |
| Ammo | Ammunition for ballistic weapons | Both |
| Scrap | Salvaged ship parts | Sell + Convert to Hull |

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Change category | Click category tab | Shows items in that category |
| Select item | Click item in list | Shows detail panel |
| Buy item | Click "Buy" | Deducts credits, adds to storage, decrements stock |
| Sell item | Click "Sell" | Adds credits, removes from storage, increments stock |
| Buy bulk | Click "Buy ×10/×100" | Bulk purchase (missiles/ammo only) |
| Sell bulk | Click "Sell ×10/×100" | Bulk sell (missiles/ammo/scrap only) |
| Convert scrap | Click "Convert to Hull" | Consumes 100 scrap + fee, creates hull in storage |
| Resupply | Click "Resupply All" | Refills all ammo/missiles on all ships, costs credits |

*Navigation via global nav bar (see Global Navigation Bar section)*

### Item Stats Display
- **Hulls**: Hull points, speed, weapons banks, description
- **Primaries**: Damage, fire rate, range, ammo type
- **Missiles**: Damage, tracking, speed
- **Ammo**: Compatible weapon, pack size
- **Scrap**: Ship type, conversion info

### Scrap Detail Panel
When viewing scrap in the Store, the detail panel shows sell options and hull conversion. Buttons are aligned to the bottom of the panel:

```
┌─────────────────────────────────────┐
│  STRIKER SCRAP                      │
│  ─────────────────                  │
│  In Storage: 500                    │
│                                     │
│           (flex space)              │
│                                     │
│  [Convert to Hull (100 scrap, 40 cr)]  <- full width, green
│  [Sell (2 cr)] [Sell ×10] [Sell ×100]  <- same row
└─────────────────────────────────────┘
```

- **Convert Button**: Full width, green color, shows scrap required + fee
- **Conversion Fee**: 5% of hull buy price (varies by ship class)
- **Scrap Required**: 100 scrap of matching ship type
- **Result**: Fully repaired hull added to storage

### States
- **Can't Afford** - Buy button disabled, price shown in different color
- **Out of Stock** - Buy button disabled, stock shows [0]
- **Not in Storage** - Sell button disabled
- **Can't Convert** - Convert button disabled if insufficient scrap (<100) or credits

---

## Screen: Contracts

### Purpose
Mission selection. Player chooses from available contracts with varying difficulty and rewards.

### Layout - Two-Panel Selection
The contracts screen uses a **two-click selection process** to prevent accidental mission launches:

```
┌──────────────────────────────────────────────────────────────┐
│ [Contract List]              │    [Contract Details]         │
│   280px fixed                │        1fr flexible           │
├──────────────────────────────┼───────────────────────────────┤
│ ○ Patrol Mission             │   PATROL MISSION              │
│ ● Supply Escort  (selected)  │   ────────────────            │
│ ○ Base Defense               │   Difficulty: MEDIUM          │
│ ○ Bounty Hunt                │   Reward: 500 cr              │
│                              │                               │
│                              │   Description text here...    │
│                              │                               │
│                              │   Enemies: 8 hostiles         │
│                              │   - 4x Dragonfly              │
│                              │   - 4x Firefly                │
│                              │                               │
│                              │   ┌─────────────────────────┐ │
│                              │   │    [ACCEPT MISSION]     │ │
│                              │   └─────────────────────────┘ │
└──────────────────────────────┴───────────────────────────────┘
```

### Data Displayed
- **Credits** (top corner)
- **Current Sector**
- **Contract List** (left panel) - available missions showing:
  - Mission name
  - Difficulty badge (EASY/MEDIUM/HARD)
  - Selected state indicator
- **Contract Details** (right panel, when contract selected):
  - Mission name (large)
  - Difficulty badge with color
  - Description
  - Enemy count and composition (e.g., "8 hostiles in 5 waves (4x dragonfly, 4x firefly)")
  - Reward amount
  - **Accept Mission button** (prominent, launches mission)

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Select contract | Click contract in list | Shows contract details in right panel |
| Deselect | Click selected contract again | Hides details panel |
| Accept mission | Click "Accept Mission" button | Starts mission with selected contract |

**Important**: Clicking a contract in the list does NOT launch the mission. The player must click the Accept button to confirm.

*Navigation via global nav bar (see Global Navigation Bar section)*

### Contract Difficulty Colors
- **Easy** - Green
- **Medium** - Yellow/Orange
- **Hard** - Red

---

## Screen: Results

### Purpose
Post-mission debrief showing combat statistics and rewards collected. Styled consistently with Squadron/Store/Contracts screens.

### Layout Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│  [DEBRIEF]  [REWARDS]                              SECTOR 1   5000cr  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Scrollable Content Area]                                           │
│                                                                      │
│  Debrief tab:                                                        │
│    - Mission duration header                                         │
│    - Pilot cards in 2-column responsive grid                         │
│                                                                      │
│  Rewards tab:                                                        │
│    - VICTORY/DEFEAT title banner                                     │
│    - Contract reward line item                                       │
│    - Salvage subsections (scrap, weapons, ammo)                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                     [RETURN TO HANGAR]                               │
└──────────────────────────────────────────────────────────────────────┘
```

### Layout Requirements
- **Max-width**: 1200px centered (same as Squadron/Store)
- **Tab Bar**: Results-specific tabs (Debrief/Rewards), not main navigation
- **Status Display**: Sector/credits in top-right (read-only, no navigation)
- **Scrollable Content**: Content pane scrolls, NOT the whole screen
- **Fixed Button**: Continue button anchored at bottom of screen
- **Height**: Full viewport minus tab bar height

### Data Displayed
- **Tab Bar**: Debrief and Rewards tabs (active tab highlighted)
- **Status**: Current sector and total credits (top-right)
- **Tab: Debrief** - Combat statistics per pilot:
  - Mission duration header
  - Pilot cards in responsive 2-column grid (max-width per card ~450px)
  - Each card shows: callsign, archetype, KIA/Survived status
  - Stats: kills, assists, damage dealt, hull remaining
  - Weapon breakdown table with accuracy stats
- **Tab: Rewards** - Mission outcome and items collected:
  - Victory/Defeat title banner (styled like result-title)
  - Contract reward section (mission name + credits earned)
  - Salvage subsection:
    - Scrap by ship class
    - Weapons recovered
    - Ammo recovered
    - Estimated total value

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Switch tab | Click "Debrief" or "Rewards" | Shows selected content |
| Continue | Click "Return to Squadron" / "Continue" | Returns to Squadron |

### States
- **Victory** - Shows mission reward, button says "Return to Squadron"
- **Defeat** - No reward shown, button says "Continue"
- **No Salvage** - Shows "No salvage collected" message

### Style Notes
- Tab bar styled similarly to nav-bar (amber/cyan theme)
- Pilot cards have colored top border (player=amber, wingman=cyan, KIA=red)
- Content area has panel background with scanline effect
- Status display matches nav-bar status styling

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
| Restart | Click "Start New Campaign" | Resets game, returns to Squadron with fresh state |

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

## Visual Interface Requirements

### Ship Viewer Component

The Squadron screen features a **central ship viewer** as a technical schematic with hardpoints positioned around the ship icon (visible in the LOADOUT tab).

#### Layout - Schematic Diagram Style
Hardpoints are positioned **above and below** the ship SVG with connecting lines, like a technical diagram showing actual mounting points on the hull. Primary weapons are at the FRONT (top), secondary weapons at the BACK (bottom).

**Close Button Placement**: The close button (X) must be positioned so it does NOT overlap any text content (ship class, pilot name). Place it in the top-right corner with adequate padding, or integrate it into the header row.

```
┌─────────────────────────────────────────────────────────────┐
│  [Ship List]     │      SHIP VIEWER          │  [Storage]  │
│                  │                           │             │
│  - Player Ship   │      PRIMARY (front)      │  Weapons    │
│  - Wingman 1     │   [■]  [■]  [■■]  [■]     │  Ammo       │
│  - Wingman 2     │     │    │    │    │      │  Missiles   │
│                  │     └────┼────┼────┘      │             │
│                  │          ╔════╗           │             │
│                  │          ║    ║           │             │
│                  │          ╚════╝           │             │
│                  │     ┌────┼────┼────┐      │             │
│                  │     │    │    │    │      │             │
│                  │   [◆]  [◆◆] [◆]  [◆]      │             │
│                  │     SECONDARY (back)      │             │
│                  │   [Pilot Name] [Stats]    │             │
│  [Deploy Panel]  │   [Swap Hull] [Unassign]  │  [Scrap]    │
└─────────────────────────────────────────────────────────────┘
```

#### Hardpoint Diagram Requirements

**Ship Icon** (center):
- **Size**: 100×100px (compact to leave room for hardpoints above/below)
- **Format**: SVG file per ship class
- **Fallback**: Ship class abbreviation text

**Primary Banks** (TOP - front of ship):
- **Absolutely positioned** at specific X-coordinates per ship class
- Arranged in a horizontal row ABOVE the ship icon
- Connecting lines go DOWN to the ship's front edge
- Slot states: Empty (outline), Filled (solid with weapon abbreviation)

**Secondary Banks** (BOTTOM - back of ship):
- **Absolutely positioned** at specific X-coordinates per ship class
- Arranged in a horizontal row BELOW the ship icon
- Connecting lines go UP to the ship's rear edge
- Shows count (e.g., `4/8` missiles loaded)

**Connecting Lines** (Vertical + 45° Diagonal):
- Lines are composed of TWO segments:
  1. **Vertical segment**: From slot toward the ship
  2. **45-degree diagonal segment**: Angling to the attachment point on ship edge
- Line thickness: 1-2px
- Color: Dim border color, brighter when slot is filled
- Creates "schematic/blueprint" visual effect with angled routing

```
Connector line geometry (primary/top):

    [SLOT]
       │
       │
        ╲
         ╲●──[ship front]

Connector line geometry (secondary/bottom):

         ╱●──[ship back]
        ╱
       │
       │
    [SLOT]
```

**IMPORTANT - Per-Ship Absolute Positioning**:
Hardpoint slots must be **positioned at absolute X coordinates**, not stacked in a flex row. This creates a visual mapping where each slot sits at the horizontal position of its actual mounting point on the ship hull.

```typescript
const HARDPOINT_POSITIONS = {
  patrol: {
    primary: [35, 65],              // 2 banks: left-center, right-center
    secondary: [50],                // 1 bank: center
  },
  interceptor: {
    primary: [20, 50, 80],          // 3 banks: left, center, right
    secondary: [25, 50, 75],        // 3 banks
  },
  striker: {
    primary: [10, 28, 50, 72, 90],  // 5 banks: spread across width
    secondary: [50],                // 1 bank: center
  },
  bomber: {
    primary: [50],                  // 1 bank: center
    secondary: [8, 22, 36, 50, 64, 78, 92], // 7 banks: full coverage
  },
  defender: {
    primary: [35, 65],              // 2 banks: offset from center
    secondary: [15, 32, 50, 68, 85], // 5 banks: spread
  },
  raider: {
    primary: [15, 38, 62, 85],      // 4 banks: evenly distributed
    secondary: [25, 50, 75],        // 3 banks
  },
  sentinel: {
    primary: [20, 50, 80],          // 3 banks
    secondary: [25, 50, 75],        // 3 banks
  },
};
```

**Implementation**:
- The `.hardpoint-row` container uses `position: relative` and spans full width
- Each `.schematic-slot` uses `position: absolute` with `left: var(--slot-x)`
- CSS custom property `--slot-x` is set per-slot from HARDPOINT_POSITIONS data
- Primary row is ABOVE ship icon, secondary row is BELOW

#### Compact Stats Display
Below the ship diagram, show minimal stats in a single row:
```
[Pilot: Alpha 1]  Hull: 80/80  Shields: 60  Speed: 250
```

### Weapon Icons

- **Aspect ratio**: 3:1 (width:height)
- **Size**: 48×16px recommended for slot display
- **Format**: SVG per weapon type
- **Naming**: `weapon-{weaponType}.svg` (e.g., `weapon-plasma.svg`, `weapon-seeker.svg`)
- **Fallback**: Weapon abbreviation text (3 letters) if SVG not found

**Display Locations** (icons must appear in all these places):
- Squadron ship viewer hardpoint slots (LOADOUT tab)
- Store item list and detail panel
- Weapon picker dropdown

### Ship Icons

- **Aspect ratio**: 1:1 (square)
- **Size**: 48×48px recommended for list display, 200×200px for viewer
- **Format**: SVG per ship class
- **Naming**: `ship-{shipClass}.svg` (e.g., `ship-interceptor.svg`)
- **Fallback**: Ship class abbreviation text (3 letters) if SVG not found

**Display Locations** (icons must appear in all these places):
- Squadron unified list (deployed items)
- Squadron ship viewer (large central display in LOADOUT tab)
- Squadron pilot viewer (stored hulls section)
- Store hulls category list and detail panel

### Bank Size Visualization

Instead of just numbers, bank sizes should be shown visually:

**Option A - Capacity Bars**:
```
Bank 1: ████████░░ (8/10 ammo loaded)
```

**Option B - Slot Grid**:
```
Bank ×3: [■][■][■]  (3 linked guns)
```

**Option C - Power Indicator**:
```
[PLASMA ×2] ══════ (damage multiplier bar)
```

### Tooltip System

Hovering over items shows detailed information:

#### Ship Tooltip
```
┌──────────────────────────┐
│ INTERCEPTOR              │
├──────────────────────────┤
│ Hull:     80             │
│ Shields:  60 (+10/s)     │
│ Speed:    250 m/s        │
│ Turn:     100°/s         │
├──────────────────────────┤
│ Primary Banks: 3 (1,1,2) │
│ Secondary Banks: 3       │
└──────────────────────────┘
```

#### Weapon Tooltip
```
┌──────────────────────────┐
│ PLASMA CANNON            │
│ Energy Weapon            │
├──────────────────────────┤
│ Damage:    25            │
│ Fire Rate: 5/s           │
│ Range:     800m          │
│ Heat:      8/shot        │
├──────────────────────────┤
│ ∞ Unlimited ammo         │
└──────────────────────────┘
```

#### Missile Tooltip
```
┌──────────────────────────┐
│ SEEKER MISSILE           │
│ Homing • Lock Required   │
├──────────────────────────┤
│ Damage:    60            │
│ Speed:     400 m/s       │
│ Tracking:  90°/s         │
│ Range:     2000m         │
├──────────────────────────┤
│ Lock Time: 4.0s          │
│ Capacity:  8 per bank    │
└──────────────────────────┘
```

### Interaction Patterns

#### Equipping Weapons
1. Click empty hardpoint slot
2. Shows available weapons from storage (filtered by category)
3. Click weapon to equip
4. Weapon icon appears in slot

#### Unequipping Weapons
1. Click filled hardpoint slot
2. Weapon returns to storage
3. Slot shows empty state

#### Loading Ammo/Missiles
1. Click ammo/count indicator on equipped weapon
2. Shows +/- buttons or slider
3. Adjust amount from storage

#### Equipping Missiles (Quantity Selection)
When equipping missiles/secondaries, the player must be able to choose how many to load:

1. Click empty secondary hardpoint slot
2. Weapon picker shows available missiles from storage
3. Each missile type row shows:
   - Missile name and icon
   - Quantity selector: `[-]  [count]  [+]`
   - Count defaults to maximum loadable (min of storage count, bank capacity)
   - Minimum: 1, Maximum: min(storage, bankCapacity)
4. Click "Equip" to load selected quantity
5. Remaining missiles stay in storage

**UI Layout for Missile Picker Item**:
```
┌──────────────────────────────────────┐
│ [SKR]  Seeker           [-] 4 [+]   │
│        (8 in storage)    [Equip]    │
└──────────────────────────────────────┘
```

This allows tactical decisions like loading fewer missiles to save weight or reserve missiles for other ships.

#### Hover States
- Hardpoint slot: Highlight border, show "Click to equip/unequip"
- Weapon in storage: Show full tooltip with stats
- Ship in list: Brief stats preview

### Asset Placeholders

Until SVG icons are provided, use text-based placeholders:

**Ships** (in square container):
```
┌─────┐
│ INT │  (Interceptor)
│ ═══ │
└─────┘
```

**Weapons** (in 3:1 container):
```
┌───────────────┐
│    PLASMA     │
└───────────────┘
```

### Viewport Layout Constraints

All main screens (Squadron, Store, Contracts) must fit within the viewport **without scrolling** on a standard desktop (1080p):

**No Page Scrolling**:
- The entire interface fits in `100vh - 56px` (below nav bar)
- No vertical scrollbar on the main container
- Individual panels may have internal scroll for lists only

**Layout Structure** (Squadron example):
```
┌─────────────────────────────────────────┐  ← Nav Bar (56px)
├─────────────────────────────────────────┤
│ [List]  │  [Tabbed Viewer]  │ [Stats]   │
│ scroll  │  NO SCROLL        │  scroll   │  ← Fills remaining height
│         │  (compact)        │           │
└─────────────────────────────────────────┘
```

**Key Requirements**:
- Ship viewer/diagram: Fixed height, compact layout with side hardpoints
- Lists only: Squadron list, ship stats may scroll if needed
- Center content: NEVER requires scrolling - use horizontal layout for hardpoints

**Column Widths** (3-column fixed layout):
- Squadron List: 240px fixed
- Tabbed Viewer: flexible (1fr) - shows placeholder when no selection
- Ship Stats: 280px fixed

The Stats column must **never shift position** when the viewer opens/closes.

**Store Screen Layout** (3-column with synchronized storage):
```
┌──────────────────────────────────────────────────────────────────┐
│ [Categories] ──────────────────────────────────  [Resupply]      │  ← Category tabs + resupply
├──────────────┬────────────────────────────┬──────────────────────┤
│ [Item List]  │    [Detail Panel]          │    [Storage Panel]   │
│   280px      │       1fr                  │        280px         │  ← Fixed widths
│   scroll     │    scroll if needed        │       scroll         │
└──────────────┴────────────────────────────┴──────────────────────┘
```

The item list and storage panel widths must be **fixed** regardless of which category is selected.
Clicking items in storage switches category and selects the item in the store list.

### Responsive Considerations

- Ship viewer scales down on smaller screens
- On narrow viewports, collapse to single-column (ship list → viewer → storage)
- Tooltips position intelligently to stay on screen
- Touch devices: Tap to show tooltip, tap elsewhere to dismiss

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

### CSS Architecture
Styles are in separate CSS files under `src/ui/styles/`:
- `index.css` - Main entry point, imports all CSS
- `theme.css` - CSS custom properties (colors, fonts)
- `screens/*.css` - Screen-specific styles
- `screens/squadron/` - Squadron screen styles (layout.css, list.css, viewer-tabs.css)
- `ship/*.css` - Ship component styles
- `store/*.css` - Store screen styles

See `docs/ARCHITECTURE.md` for full CSS file structure.

---

## Feature: Pilot Hiring (Squadron Screen)

### Purpose
Allow players to hire new pilots from the Squadron screen. Pilots are a consumable resource - they can die in combat and need to be replaced. All pilot management is unified in the Squadron screen.

### Integration Point
The Squadron screen's unified list includes a "Recruits" section showing pilots available for hire.

### Squadron Layout with Hiring
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [SQUADRON]  [STORE]  [CONTRACTS]                            SECTOR 1   1250cr  │
├────────────────────┬─────────────────────────────────┬──────────────────────────┤
│ DEPLOYED (3)       │                                 │                          │
│  ★ Commander       │    [Tabbed Viewer]              │   [Ship Stats]           │
│    Fighter  2/2 4/8│    [LOADOUT] [PILOT]            │   Hull, Shields, etc.    │
│  • Viper           │                                 │                          │
│    Fighter  2/2 4/8│                                 │                          │
│                    │                                 │                          │
│ AVAILABLE (1)      │                                 │                          │
│  • Alpha 3         │                                 │                          │
│                    │                                 │                          │
│ RECRUITS (4)       │                                 │                          │
│  ○ Vex      100 cr │                                 │                          │
│  ○ Nova     650 cr │                                 │                          │
│  ○ Rex       75 cr │                                 │                          │
│  ○ Kai      350 cr │                                 │                          │
└────────────────────┴─────────────────────────────────┴──────────────────────────┘
```

### Unified List Sections
The left panel is divided into three sections:
1. **DEPLOYED** - Pilot-ship pairs with weapon status
2. **AVAILABLE** - Unassigned pilots ready to be deployed
3. **RECRUITS** - Available pilots for hire

### Recruit Generation
- Campaign generates 3-5 hireable recruits
- Recruit pool refreshes after each mission (simulating pilots coming and going)
- Distribution weighted toward lower skills (more rookies available than aces)

### Pilot Pricing
| Skill Level | Price | Availability |
|-------------|-------|--------------|
| Rookie      | 75 cr | Common       |
| Regular     | 200 cr| Common       |
| Veteran     | 400 cr| Uncommon     |
| Ace         | 700 cr| Rare         |
| Elite       | 1200 cr| Very Rare   |

### Recruit Viewer (Right Panel)
When a recruit is selected, the right panel shows:
- Recruit name (large)
- Skill level badge with color
- Price to hire
- Skill description (what bonuses this skill level provides)
- Fresh stats (0 kills, 0 missions - they're new)
- **[Hire Pilot]** button (disabled if can't afford)

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Select recruit | Click recruit in list | Shows recruit details in right panel |
| Hire recruit | Click "Hire" button | Deducts credits, adds to YOUR PILOTS (unassigned) |
| Select your pilot | Click pilot in YOUR PILOTS | Shows existing pilot viewer (stats + assignment) |

### States
- **Can't Afford** - Hire button disabled, price shown in red/dimmed
- **Max Pilots** - Optional cap on roster size (e.g., 8 pilots max) - hire button disabled

### Data Model Changes
```typescript
// Add to CampaignState
interface CampaignState {
  // ... existing fields ...
  availableRecruits: HireablePilot[];
}

interface HireablePilot {
  id: string;
  name: string;
  skill: SkillLevel;
  price: number;
}
```

### Why Squadron, Not Store?
- **Coherent mental model**: "Squadron = all pilot and ship stuff" vs "Store = equipment stuff"
- **No duplication**: Store doesn't need a "Your Pilots" storage panel
- **Natural flow**: Lost a pilot? Go to Squadron to hire replacement and assign to ship
- **Unified workflow**: View deployed status, manage loadouts, and recruit - all in one place

---

## Feature: Squad Selection (Pre-Mission)

### Purpose
Before launching a mission, player selects which ships from their fleet to deploy. This allows tactical decisions about preserving damaged ships or fielding specific loadouts.

### Trigger
Appears as a modal/overlay after clicking "Accept Mission" on the Contracts screen, before the mission actually starts.

### Layout - Squad Selection Modal
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOY SQUADRON                                       │
│                         ────────────────                                      │
│  Select ships to deploy (max 4)                                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [✓] COMMANDER • Fighter • Hull: 100%                              [You] │ │
│  │     Loadout: Plasma ×2, Seeker ×8                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [✓] ALPHA 2 • Fighter • Hull: 85%                              Regular │ │
│  │     Loadout: Plasma ×2, Dart ×6                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [ ] ALPHA 3 • Interceptor • Hull: 45%                          Veteran │ │
│  │     Loadout: Autocannon ×2, Seeker ×8                          DAMAGED │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [✓] ALPHA 4 • Striker • Hull: 100%                              Rookie │ │
│  │     Loadout: Plasma ×3, Torpedo ×4                                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────── │
│  Deploying: 3/4 ships                                                        │
│                                                                              │
│  [Cancel]                                              [LAUNCH MISSION]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Requirements
- **Commander always deployed**: The player's ship cannot be deselected (checkbox disabled but checked)
- **Max deployment**: 4 ships maximum (configurable)
- **Ship cards show**:
  - Pilot name
  - Ship class
  - Hull percentage (highlighted if damaged <50%)
  - Pilot skill level
  - Brief loadout summary (primary weapons, secondary count)
- **Deployment counter**: Shows "Deploying: X/4 ships"
- **Launch button**: Only enabled if at least 1 ship selected

### Ship Card States
| State | Visual |
|-------|--------|
| Selected | Checkbox checked, card has cyan border |
| Unselected | Checkbox unchecked, card dimmed |
| Commander | Checkbox disabled (always checked), amber border, "[You]" badge |
| Damaged | Hull text in warning color, "DAMAGED" badge if <50% |

### User Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Toggle ship | Click card or checkbox | Selects/deselects ship for deployment |
| Cancel | Click "Cancel" | Returns to Contracts screen |
| Launch | Click "Launch Mission" | Starts mission with selected ships |

### Integration Flow
1. Player clicks "Accept Mission" on contract
2. Squad Selection modal appears
3. Player toggles ships on/off
4. Player clicks "Launch Mission"
5. Only selected ships spawn in mission
6. Non-deployed ships stay safe in hangar

### Data Flow
```typescript
// Pass selected ship IDs to mission launcher
interface MissionConfig {
  contract: Contract;
  deployedShipIds: string[]; // Only these ships spawn
}
```

### Implementation Notes
- Ships not deployed are preserved (no risk of loss)
- Non-deployed ships still consume no ammo
- Allows strategic preservation of damaged/valuable ships
- Commander ship is always in deployedShipIds
