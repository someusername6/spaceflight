# UI/UX Review

**Last updated:** February 2026

## Overview

The UI system uses a custom screen framework for campaign menus and a combination of HTML/CSS overlays and Canvas rendering for the in-game HUD. The design language features amber/cyan colors for campaign UI and green-on-black for combat HUD.

## Screen Framework

### Architecture

Custom framework in `src/ui/framework/screen.ts`:

```typescript
interface Screen {
  render(state: State): string;  // Pure HTML output
  bind(api: ScreenAPI): void;    // Event setup
  destroy?(): void;              // Cleanup
}
```

### Key Features

| Feature | Implementation |
|---------|----------------|
| Pure render | Returns HTML string |
| Auto cleanup | innerHTML replacement clears old handlers |
| Event delegation | `api.on()` for elements |
| State management | `setState()` triggers re-render |
| Modal support | `showModal()` factory |

### Event API

| Method | Scope |
|--------|-------|
| `api.on(selector, event, handler)` | Element events |
| `api.onRoot(event, handler)` | Container events |
| `api.onGlobal(event, handler)` | Window events |

All handlers auto-cleaned on re-render.

## Campaign Screens

### Title Screen

| Element | Purpose |
|---------|---------|
| Live battle background | Engaging visual, shows gameplay |
| Main menu | Play, Settings, Replays |
| Campaign status | Sector, credits display |
| Emergency recovery | Restore from browser crash |

### Settings Screen

**Tabs:**
- Gameplay (autoaim, difficulty)
- Graphics (frame rate, quality)
- Controls (key bindings)
- Data (import/export)

**Features:**
- Key capture for rebinding
- Real-time preview where applicable
- Settings persist to localStorage

### Contracts Screen

| Element | Purpose |
|---------|---------|
| Left panel | Contract list with difficulty badges |
| Right panel | Selected contract details |
| Pool counter | Shows refresh progress |
| Actions | Accept, Refresh, Advance Sector |

**Contract Card Shows:**
- Mission type icon
- Difficulty (Easy/Medium/Hard)
- Reward amount
- Brief description

### Squadron Screen

| Column | Content |
|--------|---------|
| Left | Ship list (deployed, available, recruits) |
| Center | 3D ship viewer with hardpoints |
| Right | Loadout/stats tabs |

**Features:**
- Drag-drop equipment (planned)
- SVG connector lines to hardpoints
- Pilot stat tracking
- Sell/dismiss actions

### Results Screen

| Tab | Content |
|-----|---------|
| Debrief | Kill counts, damage dealt/received |
| Rewards | Credits, salvage breakdown |
| Pilot stats | Updated stats for survivors |

**Mission-Specific:**
- Escort: convoy survival percentage
- Station Defense: hull remaining
- Ambush: stopped vs destroyed count

### Store Screen

| Section | Purpose |
|---------|---------|
| Categories | Ships, Weapons, Missiles, Ammo |
| Inventory | Available stock |
| Storage | Purchased items |
| Detail | Selected item stats |

## In-Game HUD

### Status Panel (Bottom Center)

```
┌─────────────────────────────────────────┐
│  SHIELDS ████████░░  HULL ██████████    │
│  HEAT    ████░░░░░░  SPD  ▼────●────▲   │
└─────────────────────────────────────────┘
```

| Bar | Segments | Color Coding |
|-----|----------|--------------|
| Shields | 10 | Cyan |
| Hull | 10 | Green→Orange→Red |
| Heat | 10 | Green→Orange→Red |
| Speed | Continuous | Throttle marker |

### Target Display (Top Right)

| Element | Information |
|---------|-------------|
| Callsign | Ship name/type |
| Distance | Formatted (m/km) |
| Aspect | Closing/separating indicator |
| Bars | Hull and shield percentages |
| Camera | Picture-in-picture view |

### Radar (Bottom Left)

| Feature | Implementation |
|---------|----------------|
| Size | 150×150 pixels |
| View | Ship-relative 6DOF |
| Scaling | Logarithmic range |
| Blips | Color-coded (red/green/yellow) |

### Allied Display (Top Left)

| Context | Display |
|---------|---------|
| Standard | Wingman shield/hull bars |
| Escort | Convoy ship status |
| Station Defense | Station hull bar |

### Weapon Display (Bottom Right)

| Element | Information |
|---------|-------------|
| Primary banks | Weapon type, heat |
| Secondary banks | Missile count, lock status |
| Ammo | Count with color warning |
| Link mode | Indicator |

## Color Coding Standards

### Status Colors

| Color | Meaning | Usage |
|-------|---------|-------|
| Green | Healthy (>50%) | Hull, generic positive |
| Cyan | Shields | Shield bars, shield hits |
| Orange | Warning (30-50%) | Degraded state |
| Red | Critical (<30%) | Low health, danger |
| Purple | Ionized | Shield debuff |

### Faction Colors

| Faction | Color |
|---------|-------|
| Player/Allies | Green |
| Enemies | Red/Orange |
| Neutral | Yellow |

## Theme System

CSS custom properties in `theme.css`:

```css
:root {
  --color-primary: #ffaa44;    /* Amber - accents */
  --color-secondary: #44aaff;  /* Cyan - info */
  --color-success: #44ff66;    /* Green - positive */
  --color-danger: #ff4444;     /* Red - negative */
  --font-display: 'Orbitron';  /* Headers */
  --font-body: 'Share Tech Mono'; /* Body text */
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/ui/framework/screen.ts` | Screen framework |
| `src/ui/screens/` | Screen implementations |
| `src/ui/styles/` | CSS modules |
| `src/rendering/hud/` | In-game HUD |
| `src/rendering/reticle/` | Targeting UI |

## Strengths

1. **Consistent Framework:** All screens use same patterns
2. **Clean Event Management:** No memory leaks from handlers
3. **Comprehensive HUD:** All combat info visible at glance
4. **Intuitive Color Coding:** Status immediately clear
5. **Responsive Layout:** Handles window resize
6. **Live Preview:** Title screen shows actual gameplay

## Areas for Improvement

1. **No Tutorial:** Players must learn by trial and error
2. **Dense HUD:** Can be overwhelming for new players
3. **No Customization:** Cannot reposition HUD elements
4. **No Accessibility:** No colorblind modes
5. **Limited Keyboard Nav:** Some menus mouse-only
6. **No Tooltips:** Hover info missing in many places

## UX Recommendations

### High Priority

1. Add first-time player tutorial/hints
2. Add tooltips for all interactive elements
3. Implement colorblind-friendly color schemes

### Medium Priority

4. Add HUD opacity/scale options
5. Implement full keyboard navigation
6. Add toggle for individual HUD elements

### Low Priority

7. Add HUD position customization
8. Add animation options (reduce motion)
9. Consider high-contrast mode
