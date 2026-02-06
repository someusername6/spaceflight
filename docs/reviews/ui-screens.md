# UI Framework & Screens Review

## Overview

The UI Framework & Screens layer provides all non-3D user interfaces for the Spaceflight game: the Screen component framework, all game screens (title, squadron, store, contracts, settings, results, lobby, replays), shared UI components (navigation, notifications, tooltips), ship display components, utility functions, game settings management, and input handling.

The overall health is **good**. The Screen framework is well-designed with automatic event cleanup, event delegation, and a clean render/bind lifecycle. Most screens follow the framework correctly, accessibility is strong throughout (ARIA roles, tablist patterns, aria-label annotations), and the codebase is well-documented. All files comply with the 400-line limit, though two are very close.

The review covers approximately 9,800 lines across 55+ source files. The most significant findings are: stale comments that contradict framework capabilities, several cases of raw `addEventListener` bypassing the Screen framework, duplicated utility functions across four files, and a monotonically growing SVG mask ID counter that never resets.

---

## Issues Found

### Design: Stale comment claims `onGlobal()` lacks capture support
**File**: `src/ui/screens/settings/key-listener.ts:19`
**Severity**: Low

The comment says:
```typescript
// Note: Cannot use api.onGlobal() because it doesn't support capture phase
```

However, `src/ui/framework/screen.ts:31` clearly declares:
```typescript
onGlobal(event: string, handler: (e: Event) => void, capture?: boolean): void;
```

And the implementation at `screen.ts:159` passes the capture flag through:
```typescript
onGlobal(event, handler, capture = false) {
  document.addEventListener(event, handler, capture);
  globalListeners.push({ event, handler, capture });
}
```

The actual reason for using raw `addEventListener` in the key listener is legitimate: the listener needs to be cleaned up independently from the screen's render/bind cycle (e.g., during tab switching at `settings-screen.ts:108` and back navigation at `settings-screen.ts:116`). If `api.onGlobal()` were used, the framework would clear it on every re-render and re-register it in `bind()`, which works but makes independent cleanup via `cleanupKeyListener()` impossible since the framework owns the reference.

**Recommendation**: Update the comment to explain the real reason: the listener must be managed independently from the screen lifecycle for external cleanup.

---

### Maintenance: Raw `addEventListener` in squadron viewer tabs
**File**: `src/ui/screens/squadron/viewer.ts:113`
**Severity**: Low

The `bindViewerTabs` function uses raw `addEventListener` on each `.viewer-tab` element:
```typescript
tabEl.addEventListener('click', handler);
listeners.push({ el: tabEl, event: 'click', handler });
```

This requires manual tracking via a `tabCleanup` closure (line 88) and explicit `destroyViewerTabListeners()` calls. Click events bubble, so this could use the Screen framework's `api.on('.viewer-tab', 'click', handler)` instead. However, `bindViewerTabs` is called from `SquadronScreenComponent.bind()` (squadron-screen.ts:222), which does have access to `api`. The function would need to accept a `ScreenAPI` parameter instead of the raw container element.

**Recommendation**: Refactor `bindViewerTabs` to accept a `ScreenAPI` and use `api.on()`. This would eliminate the manual cleanup code and the `tabCleanup` singleton.

---

### Maintenance: Raw `addEventListener` in hardpoint events
**File**: `src/ui/screens/squadron/hardpoint.ts:58`
**Severity**: Low

The `bindHardpointEvents` function uses raw `addEventListener` for `mouseenter` and `mouseleave` events:
```typescript
el.addEventListener(event, handler);
```

This is justified for `mouseenter`/`mouseleave` since they don't bubble and can't use `api.on()`. However, the function also binds `click` events (for empty slots, line 129 area) which do bubble and could use delegation. The function uses its own `TrackedListener` infrastructure and `hardpointCleanup` closure for lifecycle management.

The Screen framework provides `api.onDirect()` (screen.ts:145) specifically for non-bubbling events, which would handle the automatic cleanup. The function would need refactoring to accept a `ScreenAPI` parameter.

**Recommendation**: Consider refactoring to use `api.onDirect()` for mouseenter/mouseleave and `api.on()` for click events, eliminating the manual cleanup infrastructure.

---

### Maintenance: `capitalize()` function duplicated across four files
**File**: `src/ui/common/ship-item.ts:12`, `src/ui/screens/store/storage.ts:24`, `src/ui/screens/replay/replay-detail-tabs.ts:31`, `src/ui/screens/replay/replay-debrief-render.ts:17`
**Severity**: Low

The same `capitalize` function is independently defined in four source files:
```typescript
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

Only `ship-item.ts` exports it; the other three define it as a private function. This is a maintenance smell -- if the behavior ever needs to change (e.g., handling empty strings, multi-word capitalization), it must be updated in four places.

**Recommendation**: Move `capitalize` to `src/ui/utils/` (perhaps a `text.ts` module) and import from there. The `ship-item.ts` version already exports it, so the other three files can import directly or the function can be relocated.

---

### Design: Dead code in `ship/actions.ts`
**File**: `src/ui/ship/actions.ts:11-17`
**Severity**: Low

The entire module is effectively dead code:
```typescript
export function renderShipActions(
  _ship: OwnedShip,
  _state: CampaignState,
): string {
  // Hull swap removed - pilot assignment happens via Pilots panel
  return '';
}
```

It's still imported and called from `src/ui/ship/viewer.ts:21,165`, where it injects an empty string into the ship viewer template. The comment says "reserved for future use", but keeping dead code as a placeholder adds noise.

**Recommendation**: Either remove the module entirely and its call site in `viewer.ts:165`, or if there are concrete plans for ship actions, add a TODO comment with the planned feature.

---

### Maintenance: Vestigial tooltip module
**File**: `src/ui/common/tooltip.ts:1-17`
**Severity**: Low

The entire module is vestigial. `tooltipElement` is hardcoded to `null` and never assigned, making `hideTooltip()` a permanent no-op:
```typescript
const tooltipElement: HTMLElement | null = null;

export function hideTooltip(): void {
  if (tooltipElement) {
    tooltipElement.style.display = 'none';
  }
}
```

The module comment explains it's "kept for defensive hideTooltip() calls", but since the function can never do anything, those call sites are also dead code.

**Recommendation**: Remove the module and all its call sites. If there are concerns about future tooltip needs, the `forbidden-tooltip.ts` system or the popover layer provide proper replacements.

---

### Bug: SVG mask ID counter grows monotonically without reset
**File**: `src/ui/ship/connectors.ts:236`
**Severity**: Low

```typescript
let maskIdCounter = 0;
```

This module-level counter increments every time `renderOcclusionMask` or `renderConnectorGroup` is called (lines 321, 336) and never resets. While the counter is unlikely to overflow in practice (it would take billions of viewer renders), the IDs are injected into SVG `<mask>` elements and referenced by `mask="url(#slot-mask-N)"`. Over a long play session with frequent squadron screen visits, the IDs grow arbitrarily large.

More importantly, the counter persists across screen navigations, so if any code relies on ID predictability (e.g., for testing), results would be non-deterministic depending on how many times the squadron screen was visited.

**Recommendation**: Reset `maskIdCounter` to 0 in `destroyShipConnectors()`, which is already called during cleanup.

---

### Design: `AlertState` duplicates `AlertProps` fields
**File**: `src/ui/screens/alert-modal.ts:14-25`
**Severity**: Low

Both interfaces contain the same three fields:
```typescript
interface AlertState {
  title: string;
  message: string;
  buttonText: string;
}

interface AlertProps extends ModalProps<void> {
  title: string;
  message: string;
  buttonText: string;
}
```

The `showAlert` function passes the same object as both state and props:
```typescript
return showModal<AlertState, AlertProps, void>(
  AlertModalScreen,
  { title, message, buttonText },  // state
  { title, message, buttonText },  // props
);
```

This duplication means changes to the alert fields must be made in two interfaces.

**Recommendation**: Either have `AlertState` extend `Pick<AlertProps, 'title' | 'message' | 'buttonText'>`, or since the alert never changes state, use an empty state `{}` and read everything from props in `render()`.

---

### Design: Contract names rendered without `escapeHtml`
**File**: `src/ui/screens/contracts-rendering.ts:40,291,296`
**Severity**: Low

Contract names and descriptions are interpolated directly into HTML:
```typescript
// Line 40
<div class="contract-list-name">${contract.name}${replayBadge}</div>
// Line 291
<span class="contract-detail-name">${contract.name}</span>
// Line 296
<div class="contract-detail-desc">${contract.description}</div>
```

Other screens in the codebase use `escapeHtml()` consistently (e.g., `alert-modal.ts:33-34`, `notification.ts`). While contract names are currently hardcoded in the sector contract definitions and not user-supplied, this is inconsistent with the defensive coding pattern used elsewhere. If contracts were ever generated from user input (e.g., custom missions, modding), this would be an XSS vector.

**Recommendation**: Wrap `contract.name` and `contract.description` in `escapeHtml()` for consistency with the rest of the codebase.

---

### Performance: `getKeyBindings()` creates a copy on every call
**File**: `src/input/key-bindings.ts:122-124`
**Severity**: Low

```typescript
export function getKeyBindings(): KeyBindings {
  return { ...currentBindings };
}
```

This creates a new object spread every call. The function is used in the settings screen during key rebinding (`key-listener.ts:49`), which is infrequent. The `KeyboardInputSource` class in `input-source.ts` reads bindings at construction time and caches a reference, so this is not called per-frame during gameplay.

The same pattern exists in `replay-bindings.ts:204-206` for `getReplayBindings()`.

Since neither function is called on a hot path, this is not a real performance issue, just a note for awareness.

**Recommendation**: No action needed. The defensive copy prevents external mutation, and the call frequency is low enough that allocation is negligible.

---

### Design: `previousScreen` is a single field, not a stack
**File**: `src/ui/common/screens.ts:61`
**Severity**: Low

The screen state machine tracks only a single `previousScreen`:
```typescript
previousScreen: Screen | null;
```

All `goTo*` functions set `previousScreen = manager.currentScreen` (e.g., line 243), and all `goBackFrom*` functions read it and reset to null (e.g., line 249-250). This works correctly for the current navigation structure where settings is always a one-level-deep detour, but it would break if:
- Two screens both set `previousScreen` without an intervening "go back"
- A sequence like squadron -> settings -> (something else) -> back were added

The current code mitigates this by having each `goBackFrom*` function use a fallback default (e.g., `manager.previousScreen ?? Screen.TITLE`), so even if `previousScreen` is null or stale, navigation doesn't break.

**Recommendation**: The current design is adequate for the existing navigation graph. If more complex navigation is added, consider replacing `previousScreen` with a small stack (capped at 3-5 entries to prevent memory growth).

---

### Maintenance: Files approaching 400-line limit
**File**: `src/ui/ship/connectors.ts` (391 lines), `src/ui/screens/lobby/lobby.ts` (388 lines)
**Severity**: Low

Two files are within 10 lines of the project's 400-line maximum:
- `connectors.ts` at 391 lines: The SVG connector line system with coordinate calculation, path rendering, occlusion masks, and ResizeObserver management. The coordinate-to-path logic (lines 143-233) could be extracted to a `connector-paths.ts` module.
- `lobby.ts` at 388 lines: The multiplayer lobby screen with host/guest state management, popover creation, and screen lifecycle. The popover management section could be extracted.

**Recommendation**: Plan extractions proactively before the next feature addition to either file pushes past the limit.

---

### Design: Campaign create modal uses manual lifecycle instead of `showModal`
**File**: `src/ui/screens/campaign-create.ts:1-36`
**Severity**: Low

The campaign creation screen uses `createScreen` directly and manages its own modal container, while other modals (alert, confirm, pause menu, quit confirm) use the framework's `showModal` helper. The `showModal` API (`screen.ts:244`) handles container creation, mounting, cleanup, and promise resolution automatically.

The campaign create screen likely predates `showModal` or has requirements that `showModal` doesn't handle (e.g., it returns a discriminated union result type `CampaignCreateResult` rather than a simple value). Looking at the code, `showModal` does support generic result types via `ModalProps<Result>`, so this could be refactored.

**Recommendation**: Consider migrating to `showModal` for consistency and reduced boilerplate.

---

### Design: Battle canvas re-attachment pattern duplicated
**File**: `src/ui/screens/settings/settings-screen.ts:254-276`, `src/ui/screens/load-campaign.ts` (similar pattern)
**Severity**: Low

The pattern of storing a canvas reference, re-attaching it to a background container after re-renders, and restoring CSS classes is implemented in `settings-screen.ts`:
```typescript
let battleCanvas: HTMLCanvasElement | null = null;

export function storeBattleCanvas(canvas: HTMLCanvasElement): void {
  battleCanvas = canvas;
}

function reattachBattleCanvas(): void {
  if (battleCanvas) {
    const bgContainer = document.getElementById('settings-battle-bg');
    // ...
  }
}
```

The load-campaign screen has a similar pattern. Since both screens display the title battle simulation as a background, this re-attachment logic is duplicated.

**Recommendation**: Extract a shared `BattleBackground` utility that manages the canvas storage and re-attachment, parameterized by the container element ID and CSS class name.

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

### Consistent accessibility throughout
**Files**: `src/ui/common/nav-bar.ts`, `src/ui/screens/contracts-rendering.ts`, `src/ui/screens/store/render.ts`, `src/ui/screens/squadron/viewer.ts`

ARIA attributes are used consistently and correctly:
- Navigation bar uses `role="tablist"` / `role="tab"` / `aria-selected` (nav-bar.ts:92-110)
- Contract list items use `role="option"` / `aria-selected` / descriptive `aria-label` (contracts-rendering.ts:34-37)
- Squadron viewer tabs use `role="tablist"` / `role="tab"` / `aria-controls` / `tabindex` management (viewer.ts:18-42)
- Store items use `role="listbox"` / `role="option"` patterns
- Alert modal uses `role="dialog"` / `aria-modal="true"` (alert-modal.ts:31)
- Empty states use `role="status"` (squadron-screen.ts:157)
- Decorative elements use `aria-hidden="true"` (viewer.ts:27, squadron-screen.ts:167)

### Clean design system
**File**: `src/ui/common/theme.ts`

The theme module provides a centralized design system with named constants for colors, fonts, spacing, and timing. It exports a `generateThemeCSS()` function to inject CSS variables, which prevents magic values scattered across components. Color semantics are clear (`theme.colors.hull`, `theme.colors.shield`, `theme.colors.ammo`).

### Well-structured input system
**Files**: `src/input/input-source.ts`, `src/input/input-encoding.ts`, `src/input/key-bindings.ts`

The input abstraction cleanly separates concerns:
- `InputSource` interface with concrete implementations (keyboard, replay, network, recording wrapper)
- Bitmask encoding for compact per-tick input storage in replays (18 boolean fields in 32 bits)
- Key bindings with localStorage persistence, validation on load, forward-compatible merge with defaults
- `findKeyConflict()` for user-friendly rebinding with automatic swap

### Notification system with proper sanitization
**File**: `src/ui/common/notification.ts`

The notification toast system uses `escapeHtml()` on all user-visible text, manages its own container lifecycle (create on first use, remove when last notification fades), and includes proper ARIA attributes (`role="status"`, `aria-live="polite"`).

### Defensive settings loading
**Files**: `src/settings/game-settings.ts`, `src/input/key-bindings.ts`, `src/input/replay-bindings.ts`

All three settings/bindings systems follow the same robust pattern:
1. Parse localStorage JSON
2. Validate each field individually (type checks, range checks)
3. Merge with defaults (forward-compatible with new fields added in updates)
4. Log warnings for invalid data without crashing
5. Return null for completely invalid data, falling back to defaults

### Clean modal pattern
**Files**: `src/ui/screens/alert-modal.ts`, `src/ui/screens/confirm-modal.ts`, `src/ui/screens/pause-menu.ts`

The modal screens demonstrate the framework at its best: minimal state, clear props interface with `ModalProps<Result>`, proper escape key handling via `api.onGlobal()`, and promise-based API for callers. The `showModal` helper in the framework handles all container lifecycle and cleanup.

### Forbidden tooltip utility
**File**: `src/ui/utils/forbidden-tooltip.ts`

A well-engineered solution for tooltips on elements inside overflow-hidden containers. Uses `WeakMap` for source tracking (no memory leaks), positions via `getBoundingClientRect` relative to viewport, and correctly uses `api.onDirect()` for non-bubbling mouseenter/mouseleave events. This demonstrates understanding of the framework's capabilities and appropriate tool selection.

---

## Recommendations

1. **Update stale comments** in `key-listener.ts` to reflect the actual reason for bypassing the framework (lifecycle independence, not missing capture support).

2. **Consolidate `capitalize()`** into a shared utility module. Four independent copies is a clear DRY violation.

3. **Remove dead code**: `ship/actions.ts` (empty function) and `tooltip.ts` (permanent no-op). Both add confusion for developers reading the codebase.

4. **Plan file splits** for `connectors.ts` (391 lines) and `lobby.ts` (388 lines) before the next feature addition pushes them past 400.

5. **Add `escapeHtml()`** to contract name/description rendering for consistency with the defensive pattern used elsewhere.

6. **Consider refactoring** squadron viewer tabs and hardpoint events to use `ScreenAPI` methods instead of raw `addEventListener`. This would eliminate two manual cleanup systems and align with the framework's design intent.

7. **Reset `maskIdCounter`** in `destroyShipConnectors()` to prevent unbounded ID growth across screen navigations.

8. **Extract battle canvas re-attachment** into a shared utility used by both the settings screen and load-campaign screen.
