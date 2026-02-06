# UI Framework & Screens Review

## Overview

The UI Framework & Screens layer provides all non-3D user interfaces for the Spaceflight game: the Screen component framework, all game screens (title, squadron, store, contracts, settings, results, lobby, replays), shared UI components (navigation, notifications, tooltips), ship display components, utility functions, game settings management, and input handling.

The overall health is **good**. The Screen framework is well-designed with automatic event cleanup, event delegation, and a clean render/bind lifecycle. Most screens follow the framework correctly, accessibility is strong throughout (ARIA roles, tablist patterns, aria-label annotations), and the codebase is well-documented. All files comply with the 400-line limit.

The most significant findings are: inline `capitalize()` duplication persisting across 8 call sites despite the shared utility existing, and several unescaped pilot names in HTML templates creating a theoretical XSS surface.

---

## Issues

### Maintenance: Inline capitalize still duplicated at 8 call sites
**File**: Multiple files across `src/ui/screens/`
**Severity**: Low

Despite the shared `capitalize()` in `src/ui/utils/text.ts`, 8 call sites still use inline `charAt(0).toUpperCase() + slice(1)`:

| File | Line | Context |
|------|------|---------|
| `src/ui/screens/store/render.ts` | 60 | `shipClass.charAt(0).toUpperCase() + shipClass.slice(1)` |
| `src/ui/screens/store/render.ts` | 101 | Scrap name construction |
| `src/ui/screens/store/detail.ts` | 64 | `itemId.charAt(0).toUpperCase() + itemId.slice(1)` |
| `src/ui/screens/store/item-stats.ts` | 105 | `stats.category.charAt(0).toUpperCase()...` |
| `src/ui/screens/store/item-stats.ts` | 265 | Scrap stats display name |
| `src/ui/screens/contracts-rendering.ts` | 168 | Station type name |
| `src/ui/screens/contracts-rendering.ts` | 222 | Station type name (attack) |
| `src/ui/screens/results/results-salvage.ts` | 51 | Scrap display name |

Additionally, `src/systems/weapons/missile-helpers.ts:126` defines a standalone `capitalizeMissileType()` that does the same thing but lives in the game systems layer.

**Recommendation**: Replace all 8 inline sites with `import { capitalize } from '../../utils/text'` (adjusting path per file).

---

### Maintenance: `roster/skill-rendering.ts` has its own `formatShipClass()` wrapper
**File**: `src/ui/screens/roster/skill-rendering.ts:41-43`
**Severity**: Low

```typescript
export function formatShipClass(shipClass: string): string {
  return shipClass.charAt(0).toUpperCase() + shipClass.slice(1);
}
```

This is exported and consumed by `pilot-viewer.ts`. It is functionally identical to `capitalize()` in `src/ui/utils/text.ts`. Having two exported functions that do the same thing creates confusion about which to use.

**Recommendation**: Replace with a re-export or direct use of `capitalize` from `src/ui/utils/text.ts`.

---

### Security: Pilot names rendered without `escapeHtml()` in multiple locations
**File**: Multiple files
**Severity**: Low

Pilot names are interpolated directly into HTML without escaping:

| File | Line | Template |
|------|------|----------|
| `src/ui/ship/viewer.ts` | 142, 157 | `${pilotName}` in schematic header |
| `src/ui/ship/card.ts` | 54 | `${pilotName}` in card display |
| `src/ui/common/ship-item.ts` | 98, 125 | `${pilot.name}` in aria-label and display |
| `src/ui/screens/squadron/list.ts` | 86, 93 | `${pilot.name}` in aria-label and display |
| `src/ui/screens/roster/pilot-viewer.ts` | 292, 313 | `${pilot.name}` in data attribute and display |

Pilot names are currently generated from a hardcoded name pool in the game's PRNG-based pilot generator, so they are not user-supplied. However, if pilot naming were ever extended to allow player input, these sites would become XSS vectors.

The `data-pilot-name="${pilot.name}"` at `pilot-viewer.ts:292` is particularly notable because data attributes with unescaped quotes could break the HTML structure even without script injection.

**Recommendation**: Wrap all `pilot.name` interpolations in `escapeHtml()` for consistency with the defensive pattern used in lobby screens, contracts rendering, and notification toasts.

---

### Maintenance: Raw `addEventListener` in squadron viewer tabs
**File**: `src/ui/screens/squadron/viewer.ts:113`
**Severity**: Low

The `bindViewerTabs` function uses raw `addEventListener` on each `.viewer-tab` element with manual tracking via a `tabCleanup` closure. Click events bubble, so this could use the Screen framework's `api.on('.viewer-tab', 'click', handler)` instead.

**Recommendation**: Refactor `bindViewerTabs` to accept a `ScreenAPI` and use `api.on()`. This would eliminate the manual cleanup code and the `tabCleanup` singleton.

---

### Maintenance: Raw `addEventListener` in hardpoint events
**File**: `src/ui/screens/squadron/hardpoint.ts:58`
**Severity**: Low

The `bindHardpointEvents` function uses raw `addEventListener` for `mouseenter`, `mouseleave`, and `click` events with its own `TrackedListener` infrastructure. The Screen framework provides `api.onDirect()` for non-bubbling events and `api.on()` for bubbling events.

**Recommendation**: Refactor to use `api.onDirect()` for mouseenter/mouseleave and `api.on()` for click events.

---

### Design: `AlertState` duplicates `AlertProps` fields
**File**: `src/ui/screens/alert-modal.ts:14-25`
**Severity**: Low

Both interfaces contain the same three fields (`title`, `message`, `buttonText`). The `showAlert` function passes identical objects as both state and props. The `ConfirmModal` has the same pattern at `confirm-modal.ts:14-29`.

Since these modals never change state after creation, the state could be an empty interface `{}` with `render()` reading everything from props.

---

### Design: `ConfirmModal` passes config with `as ConfirmProps` cast
**File**: `src/ui/screens/confirm-modal.ts:106`
**Severity**: Low

```typescript
return showModal<ConfirmState, ConfirmProps, boolean>(
  ConfirmModalScreen,
  config,
  config as ConfirmProps,  // <-- Unsafe cast: config has no onComplete
);
```

The `config` object does not have an `onComplete` callback (which `ModalProps<boolean>` requires), but it is cast to `ConfirmProps` anyway. This works only because `showModal` injects `onComplete` into the props before passing them to `createScreen`.

---

### Design: `previousScreen` is a single field, not a stack
**File**: `src/ui/common/screens.ts:61`
**Severity**: Low

The screen state machine tracks only a single `previousScreen`. This works for the current navigation structure where overlays are always one level deep. Each `goBackFrom*` function uses a fallback default, so navigation doesn't break even if `previousScreen` is null or stale.

**Recommendation**: The current design is adequate. If deeper navigation nesting is added, consider replacing with a small capped stack.

---

### Design: Campaign create modal uses manual lifecycle instead of `showModal`
**File**: `src/ui/screens/campaign-create.ts`
**Severity**: Low

The campaign creation screen uses `createScreen` directly and manages its own modal container, while other modals use the framework's `showModal` helper. Since `showModal` supports generic result types, this could be refactored for consistency.

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
- Player callsigns, IDs, chat messages, sender names, room codes, error messages, permission summaries, contract names/descriptions, notification text, alert/confirm modal text

This is thorough and consistent across the multiplayer-facing UI surface.

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

1. **Replace 8 inline capitalize calls** with imports from `src/ui/utils/text.ts`. Replace `formatShipClass()` in `skill-rendering.ts` with a re-export or direct use of `capitalize`.

2. **Add `escapeHtml()`** to pilot name interpolations in `viewer.ts`, `card.ts`, `ship-item.ts`, `squadron/list.ts`, and `roster/pilot-viewer.ts` for consistency with the defensive pattern used in multiplayer-facing screens.

3. **Consider refactoring** squadron viewer tabs and hardpoint events to use `ScreenAPI` methods instead of raw `addEventListener`, eliminating manual cleanup infrastructure.

4. **Extract battle canvas re-attachment** into a shared utility used by both the settings screen and load-campaign screen.

5. **Simplify modal state** in `alert-modal.ts` and `confirm-modal.ts` by using empty state and reading from props.
