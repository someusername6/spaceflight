# UI/UX Review

## Screen Framework

The game uses a custom component-based UI framework (`src/ui/framework/screen.ts`) with:
- Pure render functions returning HTML strings
- Automatic event cleanup via innerHTML replacement
- Event delegation for optimized large lists
- Modal support via showModal() factory

This approach eliminates memory leaks from orphaned event listeners and provides consistent patterns across all screens.

## Menu Screens

### Title Screen
- Live battle simulation as background (engaging visual)
- Clear main menu buttons (Play, Settings, Replays)
- Campaign persistence with sector/credits display
- Emergency save recovery for browser crashes

### Settings Screen
- Tabbed interface (Gameplay, Graphics, Controls, Data)
- Frame rate options (30/60/120/Uncapped)
- Autoaim angle presets (0° to 5°)
- Key binding with capture listener
- Campaign import/export

### Contracts Screen
- Two-panel layout (list + detail)
- Pool counter showing progress
- Refresh and Advance Sector options
- Replay mode indicator (50% reward)

### Squadron Screen
- Three-column layout for management
- Unified list (deployed, available, recruits)
- Tabbed viewer (loadout, pilot stats)
- SVG connector lines to hardpoints

### Results Screen
- Tabbed debrief and rewards
- Mission-specific result displays
- Salvage breakdown

## In-Game HUD

### Status Panel (Bottom Center)
- 10-segment bars for shields, hull, heat
- Speed bar with throttle marker
- Afterburner fill indicator
- Match speed indicator

### Color Coding (Standardized)
- Green: Healthy (>50%)
- Orange: Warning (30-50%)
- Red: Critical (<30%)
- Cyan: Shields
- Purple: Ionized state

### Target Stats (Top Right)
- Callsign and ship type
- Distance (formatted)
- Hull and shield bars with percentages
- Aspect indicator (closing/separating)
- Picture-in-picture target camera

### Radar (Bottom Left)
- 150x150 pixel canvas
- 6DOF ship-relative orientation
- Logarithmic range scaling
- Color-coded blips (enemy/ally/neutral)

### Allied Display (Top Left)
- Wingman status bars
- Convoy/station displays for missions
- Distance indicators

### Weapon Display (Bottom Right)
- Primary and secondary banks
- Ammo counts with color coding
- Link mode indicator
- Heat status

## Strengths

1. **Consistent Framework** - All screens use same patterns
2. **Clean Event Management** - No memory leaks
3. **Comprehensive HUD** - All combat info visible
4. **Good Color Coding** - Intuitive status communication
5. **Responsive Layout** - Handles resize properly

## Areas for Improvement

1. **No Tutorial/Tooltips** - New players must learn by trial
2. **Dense Information** - HUD can be overwhelming initially
3. **Limited Customization** - Cannot reposition HUD elements
4. **No Accessibility Options** - No colorblind modes
5. **Keyboard Navigation** - Limited in some menus

## Recommendations

1. Add tutorial popups for first-time players
2. Consider HUD opacity/scale options
3. Add colorblind-friendly color schemes
4. Implement full keyboard navigation in menus
5. Add option to toggle HUD elements
