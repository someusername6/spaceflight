# UI Framework & Screens Review

## Overview

The UI Framework & Screens layer provides all non-3D user interfaces for the Spaceflight game: the Screen component framework, all game screens (title, squadron, store, contracts, settings, results, lobby, replays), shared UI components (navigation, notifications, tooltips), ship display components, utility functions, game settings management, and input handling.

The overall health is **good**. The Screen framework is well-designed with automatic event cleanup, event delegation, and a clean render/bind lifecycle. Most screens follow the framework correctly, accessibility is strong throughout (ARIA roles, tablist patterns, aria-label annotations), and the codebase is well-documented. All files comply with the 400-line limit, though two are very close.

The review covers approximately 9,800 lines across 55+ source files. The most significant findings are: inline `capitalize()` duplication persisting across 8 call sites despite the shared utility existing, several unescaped pilot names in HTML templates creating a theoretical XSS surface, and two files approaching the 400-line limit.

---

## Previous Fix Validation

The previous review identified 7 specific issues with recommended fixes. Here is the status of each:

### 1. SVG maskIdCounter never resets -- FIXED
**File**: `src/ui/ship/connectors.ts:391`

The counter is now reset to 0 inside `destroyShipConnectors()`:
```typescript
export function destroyShipConnectors(viewer: Element): void {
  const observer = observerMap.get(viewer);
  if (observer) {
    observer.disconnect();
    observerMap.delete(viewer);
  }
  const svg = viewer.querySelector('.connector-overlay');
  if (svg) {
    svg.remove();
  }
  maskIdCounter = 0;  // <-- Fix confirmed at line 391
}
```

### 2. Stale comment in key-listener.ts -- FIXED
**File**: `src/ui/screens/settings/key-listener.ts:17`

The misleading comment about `onGlobal()` lacking capture support has been replaced with an accurate explanation:
```typescript
// Uses raw addEventListener because the listener must be managed independently
// from the screen lifecycle for external cleanup via cleanupKeyListener()
```

### 3. Contract names not escaped -- FIXED
**File**: `src/ui/screens/contracts-rendering.ts:10,38,41,292,297`

The file now imports `escapeHtml` and uses it consistently on all contract text:
```typescript
import { escapeHtml } from '../utils';
// ...
aria-label="${escapeHtml(contract.name)}, ${contract.difficulty} difficulty..."
<div class="contract-list-name">${escapeHtml(contract.name)}${replayBadge}</div>
<span class="contract-detail-name">${escapeHtml(contract.name)}</span>
<div class="contract-detail-desc">${escapeHtml(contract.description)}</div>
```

### 4. Dead code `ship/actions.ts` -- FIXED
**File**: Previously `src/ui/ship/actions.ts`

The file has been deleted. No references to `renderShipActions` exist anywhere in the codebase (confirmed via grep). The import and call site in `viewer.ts` have been removed.

### 5. `capitalize()` duplicated 4x -- PARTIALLY FIXED
**File**: `src/ui/utils/text.ts`

A shared `capitalize()` function now exists at `src/ui/utils/text.ts:2` and is imported by 4 files (`ship-item.ts`, `store/storage.ts`, `replay/replay-detail-tabs.ts`, `replay/replay-debrief-render.ts`). However, 8 additional call sites still use inline `charAt(0).toUpperCase() + slice(1)` instead of the shared utility. See new issue below.

### 6. Vestigial `tooltip.ts` -- FIXED
**File**: Previously `src/ui/common/tooltip.ts`

The file has been deleted. No glob matches for `tooltip.ts` under `src/ui/`.

### 7. Dead code in `ship/viewer.ts` (renderShipActions import/call) -- FIXED
**File**: `src/ui/ship/viewer.ts`

No references to `renderShipActions` exist in the file. The viewer now renders the schematic diagram directly without the dead action placeholder.

**Summary**: 6 of 7 previous issues fully resolved. 1 partially resolved (capitalize consolidation incomplete).

---

## Issues Found

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

Additionally, `src/systems/weapons/missile-helpers.ts:126` defines a standalone `capitalizeMissileType()` that does the same thing but lives in the game systems layer. While the systems layer might not want a UI utility dependency, the 8 UI-layer sites have no such constraint.

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

Pilot names are currently generated from a hardcoded name pool in the game's PRNG-based pilot generator, so they are not user-supplied. However, in multiplayer, callsigns come from player input and follow a different path (lobby screens correctly escape via `escapeHtml()`). If pilot naming were ever extended to allow player input (e.g., custom callsigns for the commander), these sites would become XSS vectors.

The `data-pilot-name="${pilot.name}"` at `pilot-viewer.ts:292` is particularly notable because data attributes with unescaped quotes could break the HTML structure even without script injection.

**Recommendation**: Wrap all `pilot.name` interpolations in `escapeHtml()` for consistency with the defensive pattern used in lobby screens, contracts rendering, and notification toasts.

---

### Maintenance: Raw `addEventListener` in squadron viewer tabs
**File**: `src/ui/screens/squadron/viewer.ts:113`
**Severity**: Low

The `bindViewerTabs` function uses raw `addEventListener` on each `.viewer-tab` element with manual tracking via a `tabCleanup` closure. Click events bubble, so this could use the Screen framework's `api.on('.viewer-tab', 'click', handler)` instead. The function would need to accept a `ScreenAPI` parameter rather than a raw container element.

**Recommendation**: Refactor `bindViewerTabs` to accept a `ScreenAPI` and use `api.on()`. This would eliminate the manual cleanup code and the `tabCleanup` singleton.

---

### Maintenance: Raw `addEventListener` in hardpoint events
**File**: `src/ui/screens/squadron/hardpoint.ts:58`
**Severity**: Low

The `bindHardpointEvents` function uses raw `addEventListener` for `mouseenter`, `mouseleave`, and `click` events with its own `TrackedListener` infrastructure. The Screen framework provides `api.onDirect()` (screen.ts:145) for non-bubbling events and `api.on()` for bubbling events. Refactoring would eliminate the manual cleanup infrastructure.

**Recommendation**: Refactor to use `api.onDirect()` for mouseenter/mouseleave and `api.on()` for click events.

---

### Design: `AlertState` duplicates `AlertProps` fields
**File**: `src/ui/screens/alert-modal.ts:14-25`
**Severity**: Low

Both interfaces contain the same three fields (`title`, `message`, `buttonText`). The `showAlert` function passes identical objects as both state and props. The `ConfirmModal` has the same pattern at `confirm-modal.ts:14-29`.

Since these modals never change state after creation, the state could be an empty interface `{}` with `render()` reading everything from props.

**Recommendation**: Use an empty state and read from props in `render()`, or have the state type extend a shared interface with props.

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

The `config` object does not have an `onComplete` callback (which `ModalProps<boolean>` requires), but it is cast to `ConfirmProps` anyway. This works only because `showModal` injects `onComplete` into the props before passing them to `createScreen`. The cast suppresses a legitimate type error.

**Recommendation**: Either use `Omit<ConfirmProps, 'onComplete'>` explicitly (which is what `showModal` actually accepts) or accept the cast with a comment explaining why it is safe.

---

### Design: `previousScreen` is a single field, not a stack
**File**: `src/ui/common/screens.ts:61`
**Severity**: Low

The screen state machine tracks only a single `previousScreen`. This works for the current navigation structure where overlays (settings, replays, load campaign) are always one level deep. Each `goBackFrom*` function uses a fallback default, so navigation doesn't break even if `previousScreen` is null or stale.

**Recommendation**: The current design is adequate. If deeper navigation nesting is added, consider replacing with a small capped stack.

---

### Maintenance: Files approaching 400-line limit
**File**: `src/ui/ship/connectors.ts` (392 lines), `src/ui/screens/lobby/lobby.ts` (387 lines)
**Severity**: Low

Two files are within 10 lines of the project's 400-line maximum:

- `connectors.ts` at 392 lines (grew by 1 line from the maskIdCounter reset fix). The coordinate-to-path logic (lines 38-86) or the rendering functions (lines 242-299) could be extracted to separate modules.
- `lobby.ts` at 387 lines. The popover management section could be extracted.

**Recommendation**: Plan extractions proactively before the next feature addition to either file pushes past the limit.

---

### Design: Campaign create modal uses manual lifecycle instead of `showModal`
**File**: `src/ui/screens/campaign-create.ts`
**Severity**: Low

The campaign creation screen uses `createScreen` directly and manages its own modal container, while other modals (alert, confirm, pause menu) use the framework's `showModal` helper. Since `showModal` supports generic result types via `ModalProps<Result>`, this could be refactored for consistency.

**Recommendation**: Consider migrating to `showModal` for reduced boilerplate.

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
- **Automatic cleanup** via `clearHandlers()` distinguishes between re-render (reference cleanup only, since innerHTML orphans child elements) and destroy (explicit removeEventListener)
- **`onDirect()`** for non-bubbling events (mouseenter/mouseleave) with automatic tracking
- **`showModal()`** helper encapsulates modal lifecycle with promise-based resolution
- **`updateState()`** for direct DOM manipulation without triggering re-render

The render/bind separation enforces pure rendering (no side effects in `render()`) and keeps event binding co-located with the component definition.

### Consistent XSS protection in network-facing screens
**Files**: `src/ui/screens/lobby/players-panel.ts`, `src/ui/screens/lobby/chat-panel.ts`, `src/ui/screens/lobby/lobby-render.ts`, `src/ui/common/notification.ts`, `src/ui/screens/contracts-rendering.ts`

All screens that handle data from network or user input correctly use `escapeHtml()`:
- Player callsigns: `escapeHtml(player.callsign)` at `players-panel.ts:75`
- Player IDs in data attributes: `escapeHtml(player.playerId)` at `players-panel.ts:64`
- Chat messages: `escapeHtml(entry.text)` at `chat-panel.ts:27,36`
- Chat sender names: `escapeHtml(entry.fromCallsign ?? 'Unknown')` at `chat-panel.ts:35`
- Room codes: `escapeHtml(formattedCode)` at `lobby-render.ts:41`
- Error messages: `escapeHtml(errorMessage)` at `lobby-render.ts:70`
- Permission summaries: `escapeHtml(summary)` at `players-panel.ts:100`
- Contract names and descriptions: `escapeHtml(contract.name)` at `contracts-rendering.ts:41,292`
- Notification text: `escapeHtml(message)` at `notification.ts:58`
- Alert/confirm modal text: `escapeHtml()` throughout `alert-modal.ts` and `confirm-modal.ts`

This is thorough and consistent across the multiplayer-facing UI surface.

### Consistent accessibility throughout
**Files**: `src/ui/common/nav-bar.ts`, `src/ui/screens/contracts-rendering.ts`, `src/ui/screens/store/store-content.ts`, `src/ui/screens/squadron/list.ts`

ARIA attributes are used consistently and correctly:
- Navigation bar: `role="tablist"` / `role="tab"` / `aria-selected` (nav-bar.ts:67-71)
- Contract list items: `role="option"` / `aria-selected` / descriptive `aria-label` (contracts-rendering.ts:34-38)
- Store items: `role="listbox"` / `role="option"` / `tabindex` (store-content.ts:49,58)
- Squadron list: `role="listbox"` / `role="option"` / `aria-label` with status text (list.ts:84-87)
- Alert/confirm modals: `role="dialog"` / `aria-modal="true"` / `aria-labelledby`
- Empty states: `role="status"`
- Decorative elements: `aria-hidden="true"` throughout

### Well-engineered shared components
**Files**: `src/ui/common/ship-item.ts`, `src/ui/ship/stats.ts`, `src/ui/utils/weapon-icon.ts`

The shared component library demonstrates clean composition:
- `renderShipItem()` accepts an `ShipItemOptions` bag with slots for `beforeContent`, `iconContent`, and `afterContent`, enabling flexible composition without parameter explosion
- `renderShipStatsRows()` uses a `classPrefix` option for shared rendering across hangar and store contexts
- `renderWeaponIcon()` / `renderMissileIcon()` / `renderShipIcon()` provide consistent inline SVG rendering with configurable size, color, and glow parameters
- `formatBankSizes()` handles bank grouping with accessible shape indicators

### Clean inline SVG architecture
**File**: `src/ui/utils/inline-svg.ts`

The dual-mode SVG loading (raw content for inline injection, asset URLs for img tags) is well-documented and solves a real CSS limitation. The file clearly explains why inline SVGs are needed (currentColor inheritance), provides both access modes, and includes fallback handling for missing assets.

### Forbidden tooltip utility
**File**: `src/ui/utils/forbidden-tooltip.ts`

A well-engineered solution for tooltips on elements inside overflow-hidden containers. Uses `WeakMap` for source tracking (no memory leaks), positions via `getBoundingClientRect` relative to viewport, handles viewport edge clamping, and correctly uses `api.onDirect()` for non-bubbling mouseenter/mouseleave events.

### Notification system with proper lifecycle
**File**: `src/ui/common/notification.ts`

The notification toast system manages its own container lifecycle (creates on first use, removes when last notification fades), uses `escapeHtml()` on all text, includes proper ARIA attributes (`role="alert"`, `aria-live="polite"`), and provides convenience functions for common notification types.

### Defensive settings loading
**Files**: `src/settings/game-settings.ts`, `src/input/key-bindings.ts`

Settings systems follow a robust pattern: parse JSON, validate each field individually, merge with defaults for forward compatibility with new fields, log warnings without crashing, and fall back to defaults for completely invalid data.

---

## Recommendations

1. **Replace 8 inline capitalize calls** with imports from `src/ui/utils/text.ts`. Replace `formatShipClass()` in `skill-rendering.ts` with a re-export or direct use of `capitalize`.

2. **Add `escapeHtml()`** to pilot name interpolations in `viewer.ts`, `card.ts`, `ship-item.ts`, `squadron/list.ts`, and `roster/pilot-viewer.ts` for consistency with the defensive pattern used in multiplayer-facing screens.

3. **Plan file splits** for `connectors.ts` (392 lines) and `lobby.ts` (387 lines) before the next feature addition pushes them past 400.

4. **Consider refactoring** squadron viewer tabs and hardpoint events to use `ScreenAPI` methods instead of raw `addEventListener`, eliminating manual cleanup infrastructure.

5. **Extract battle canvas re-attachment** into a shared utility used by both the settings screen and load-campaign screen.

6. **Simplify modal state** in `alert-modal.ts` and `confirm-modal.ts` by using empty state and reading from props.
