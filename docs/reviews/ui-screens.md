# UI Framework & Screens Review

## Overview

The UI Framework & Screens layer provides all non-3D user interfaces for the Spaceflight game: the Screen component framework, all game screens (title, squadron, store, contracts, settings, results, lobby, replays), shared UI components (navigation, notifications, tooltips), ship display components, utility functions, game settings management, and input handling.

The overall health is **good**. The Screen framework is well-designed with automatic event cleanup, event delegation, and a clean render/bind lifecycle. Most screens follow the framework correctly, accessibility is strong throughout (ARIA roles, tablist patterns, aria-label annotations), and the codebase is well-documented. All files comply with the 400-line limit.

The most significant remaining finding is unescaped pilot names in some HTML templates creating a theoretical XSS surface.

---

## Issues

### Maintenance: `roster/skill-rendering.ts` has its own `formatShipClass()` wrapper
**File**: `src/ui/screens/roster/skill-rendering.ts:41-43`
**Severity**: Low

```typescript
export function formatShipClass(shipClass: string): string {
  return capitalize(shipClass);
}
```

This is exported and consumed by `pilot-viewer.ts`. It is functionally identical to calling `capitalize()` directly from `src/ui/utils/text.ts`. Having two exported functions that do the same thing creates confusion about which to use.

**Recommendation**: Replace with a re-export or direct use of `capitalize` from `src/ui/utils/text.ts`.

---

### Security: Pilot names rendered without `escapeHtml()` in some locations
**File**: Multiple files
**Severity**: Low

Pilot names are interpolated directly into HTML without escaping in the following locations:

| File | Line | Template |
|------|------|----------|
| `src/ui/ship/viewer.ts` | 142, 157 | `${pilotName}` in schematic header |
| `src/ui/ship/card.ts` | 54 | `${pilotName}` in card display |
| `src/ui/common/ship-item.ts` | 98, 125 | `${pilot.name}` in aria-label and display |

Pilot names are currently generated from a hardcoded name pool in the game's PRNG-based pilot generator, so they are not user-supplied. However, if pilot naming were ever extended to allow player input, these sites would become XSS vectors.

Note: `src/ui/screens/squadron/list.ts` and `src/ui/screens/roster/pilot-viewer.ts` now correctly use `escapeHtml(pilot.name)`.

**Recommendation**: Wrap remaining `pilot.name` interpolations in `escapeHtml()` for consistency with the defensive pattern used in lobby screens, squadron list, pilot viewer, and notification toasts.

---

### Design: `previousScreen` is a single field, not a stack
**File**: `src/ui/common/screens.ts:61`
**Severity**: Low

The screen state machine tracks only a single `previousScreen`. This works for the current navigation structure where overlays are always one level deep. Each `goBackFrom*` function uses a fallback default, so navigation doesn't break even if `previousScreen` is null or stale.

**Recommendation**: The current design is adequate. If deeper navigation nesting is added, consider replacing with a small capped stack.

---

### Design: Battle canvas re-attachment pattern duplicated
**File**: `src/ui/screens/settings/settings-screen.ts`, `src/ui/screens/load-campaign.ts`
**Severity**: Low

Both the settings screen and load-campaign screen implement the same pattern of storing a canvas reference, re-attaching it to a background container after re-renders, and restoring CSS classes.

**Recommendation**: Extract a shared `BattleBackground` utility parameterized by container element ID and CSS class name.

---

## Strengths

### Excellent Screen framework design
**File**: `src/ui/framework/screen.ts`

The framework is compact (317 lines), well-documented, and solves real problems:
- **Event delegation** with one listener per event type on the root element (`on()`) prevents listener proliferation
- **Automatic cleanup** via `clearHandlers()` distinguishes between re-render and destroy
- **`onDirect()`** for non-bubbling events (mouseenter/mouseleave) with automatic tracking
- **`showModal()`** helper encapsulates modal lifecycle with promise-based resolution
- **`updateState()`** for direct DOM manipulation without triggering re-render

The render/bind separation enforces pure rendering (no side effects in `render()`) and keeps event binding co-located with the component definition.

### Consistent XSS protection in network-facing screens
All screens that handle data from network or user input correctly use `escapeHtml()`:
- Player callsigns, IDs, chat messages, sender names, room codes, error messages, permission summaries, contract names/descriptions, notification text, alert/confirm modal text, squadron list pilot names, roster pilot viewer names

This is thorough and consistent across the multiplayer-facing UI surface.

### Centralized text utilities
All capitalize operations use the shared `capitalize()` function from `src/ui/utils/text.ts`, including store rendering, contract rendering, item stats, and salvage display. The `capitalizeMissileType()` helper in `missile-helpers.ts` delegates to the same utility.

### Consistent framework usage
Squadron viewer tabs and hardpoint events correctly use `api.on()` and `api.onDirect()` from the Screen framework, eliminating manual event listener management. Alert and confirm modals use clean state/props separation with empty state objects.

### Consistent accessibility throughout
ARIA attributes are used consistently and correctly:
- Navigation bar: `role="tablist"` / `role="tab"` / `aria-selected`
- Contract list items: `role="option"` / `aria-selected` / descriptive `aria-label`
- Store items: `role="listbox"` / `role="option"` / `tabindex`
- Squadron list: `role="listbox"` / `role="option"` / `aria-label` with status text
- Alert/confirm modals: `role="dialog"` / `aria-modal="true"` / `aria-labelledby`
- Empty states: `role="status"`
- Decorative elements: `aria-hidden="true"` throughout

### Well-engineered shared components
The shared component library demonstrates clean composition:
- `renderShipItem()` accepts an `ShipItemOptions` bag with slots for `beforeContent`, `iconContent`, and `afterContent`
- `renderShipStatsRows()` uses a `classPrefix` option for shared rendering across hangar and store contexts
- `renderWeaponIcon()` / `renderMissileIcon()` / `renderShipIcon()` provide consistent inline SVG rendering
- `formatBankSizes()` handles bank grouping with accessible shape indicators

### Clean inline SVG architecture
The dual-mode SVG loading (raw content for inline injection, asset URLs for img tags) is well-documented and solves a real CSS limitation.

### Forbidden tooltip utility
A well-engineered solution for tooltips on elements inside overflow-hidden containers. Uses `WeakMap` for source tracking (no memory leaks), positions via `getBoundingClientRect`, handles viewport edge clamping, and correctly uses `api.onDirect()`.

### Notification system with proper lifecycle
The notification toast system manages its own container lifecycle, uses `escapeHtml()` on all text, includes proper ARIA attributes, and provides convenience functions for common notification types.

### Defensive settings loading
Settings systems follow a robust pattern: parse JSON, validate each field individually, merge with defaults for forward compatibility, log warnings without crashing, and fall back to defaults for completely invalid data.

---

## Recommendations

1. **Add `escapeHtml()`** to remaining pilot name interpolations in `viewer.ts`, `card.ts`, and `ship-item.ts` for consistency with the defensive pattern used elsewhere.

2. **Replace `formatShipClass()`** in `skill-rendering.ts` with direct use of `capitalize` to eliminate the redundant wrapper.

3. **Extract battle canvas re-attachment** into a shared utility used by both the settings screen and load-campaign screen.
