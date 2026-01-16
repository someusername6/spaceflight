# UI System Review

**Date:** 2026-01-16
**Reviewer:** Claude Opus 4.5
**Files Reviewed:** 40+ files in `src/ui/`

---

## Executive Summary

The UI system is well-architected with a clear separation between rendering and event binding. The custom `Screen` framework provides automatic event cleanup and state management. Most screens follow the framework correctly, but there are **notable exceptions** involving imperative popover/picker components that bypass the framework entirely.

**Key Findings:**
- The Screen framework is well-designed and prevents most common memory leak patterns
- 15+ locations use raw `addEventListener` outside the framework - some justified, some problematic
- Popover components form a parallel subsystem with their own lifecycle management
- Good accessibility coverage with ARIA attributes on most interactive elements
- XSS protection via `escapeHtml()` utility, but inconsistent usage
- No significant bugs found, but several areas have technical debt

**Overall Assessment:** The codebase is production-quality with thoughtful architecture. The main risk is the complexity introduced by the dual system (Screen framework + imperative popovers).

---

## Framework Assessment

### Screen Framework (`src/ui/framework/screen.ts`)

**Design Quality: Excellent**

The framework provides:
1. **Event delegation** (`api.on()`) - Single listener per event type, efficient for dynamic content
2. **Root-level events** (`api.onRoot()`) - For events that need direct binding
3. **Global events** (`api.onGlobal()`) - Document-level with automatic cleanup
4. **State management** - `setState()` triggers re-render, `updateState()` does not
5. **Modal support** - `showModal()` creates promise-based modal dialogs

**Strengths:**
- Automatic cleanup on re-render prevents stale closures (lines 154-171)
- Delegation listeners persist across re-renders for efficiency (line 156-158)
- `getState()` provided for async handlers to get latest state (line 144-146)
- Clear separation: `render()` is pure, `bind()` has side effects

**Limitations:**
- No capture-phase support in `onGlobal()` - forces manual `addEventListener` for key rebinding
- No built-in support for mouseenter/mouseleave (don't bubble) - forces manual binding
- No way to bind to dynamically created elements outside the root

**Suggested Improvements:**
1. Add `onGlobalCapture()` for capture-phase listeners
2. Consider adding `onNonBubbling()` helper for mouseenter/mouseleave patterns
3. Document the limitations in code comments

---

## Screen-by-Screen Findings

### Well-Implemented Screens

#### Title Screen (`src/ui/screens/title.ts`)
- **Lines 79-119:** Uses `api.on()` and `api.onGlobal()` correctly
- **Lines 243-258:** Proper cleanup pattern with `screenHandle?.destroy()`
- **Lines 283-292:** `cleanupTitleScreen()` properly disposes battle simulation
- Good async state initialization pattern

#### Pause Menu (`src/ui/screens/pause-menu.ts`)
- **Lines 57-81:** Clean, stateless modal implementation
- Uses `showModal()` helper correctly
- Proper Escape key handling with `stopImmediatePropagation()`

#### Contracts Screen (`src/ui/screens/contracts.ts`)
- **Lines 222-273:** Uses `api.on()` throughout
- **Lines 277-289:** Proper handle cleanup
- **Issue at line 228:** Calls `bindNavBar()` which uses raw `addEventListener`

#### Alert Modal (`src/ui/screens/alert-modal.ts`)
- **Lines 28-61:** Clean modal pattern
- **Lines 33-37:** Uses `escapeHtml()` for XSS protection
- Good keyboard handling (Escape + Enter)

#### Results Screen (`src/ui/screens/results/results.ts`)
- **Lines 176-192:** Simple, correct event binding
- **Lines 196-227:** Proper cleanup pattern
- Includes game over screen component in same file

#### Replay List (`src/ui/screens/replay/replay-list.ts`)
- **Lines 69-197:** Uses framework throughout
- Good async loading pattern with state updates
- Double-click handling for watch action

### Screens with Issues

#### Settings Screen (`src/ui/screens/settings/index.ts`)
- **Issue at lines 236-241:** Uses external key listener module
- **Justified:** Capture phase needed for key rebinding, framework doesn't support it
- **Mitigation:** Has proper cleanup via `cleanupKeyListener()` (key-listener.ts:75-80)

#### Settings Key Listener (`src/ui/screens/settings/key-listener.ts`)
- **Lines 62, 103:** Raw `addEventListener` with capture phase
- **Justified:** Required for intercepting keystrokes before other handlers
- **Lines 75-80, 107-112:** Proper cleanup functions exist

#### Squadron Screen (`src/ui/screens/squadron/index.ts`)
- **Lines 201-227:** Uses framework but delegates to external modules
- **Line 220-221:** Calls `bindViewerTabs()` which uses raw `addEventListener`
- **Line 226:** Calls `bindSquadronEvents()` which is clean
- **Lines 241-244:** Cleanup calls external destroy functions

#### Squadron Viewer Tabs (`src/ui/screens/squadron/viewer.ts`)
- **Lines 106-114:** Raw `addEventListener` for tab clicks
- **Unjustified:** This could use delegation
- **Lines 96-123:** Has cleanup function, so no memory leak, but inconsistent pattern

#### Squadron Hardpoint (`src/ui/screens/squadron/hardpoint.ts`)
- **Lines 53-63:** Raw `addEventListener` with cleanup tracking
- **Justified:** mouseenter/mouseleave don't bubble, can't use delegation
- **Lines 44-63:** Good cleanup pattern prevents memory leaks
- Comment at line 5-7 explains the rationale

#### Store Screen (`src/ui/screens/store/store.ts`)
- **Line 78 comment:** Acknowledges `bindNavBar` uses `addEventListener` directly
- **Lines 80-83:** Queries for specific screen element to avoid conflicts

#### Nav Bar (`src/ui/common/nav-bar.ts`)
- **Lines 115-148:** Uses raw `addEventListener` throughout
- **Partially Justified:** Operates outside the Screen component lifecycle
- **Has cleanup:** `navBarCleanup` function at lines 97-103, 143-148
- **Risk:** If caller forgets to call `cleanupNavBar()`, listeners accumulate

---

## Popover/Picker Subsystem

The popover system operates outside the Screen framework entirely. This is a significant architectural decision worth documenting.

### Files Involved
- `src/ui/screens/popover/state.ts` - Shared state management
- `src/ui/screens/popover/weapon.ts` - Equipped weapon popovers
- `src/ui/screens/popover/equip.ts` - Empty slot weapon pickers
- `src/ui/screens/popover/swap.ts` - Weapon swap submenus
- `src/ui/screens/ship-picker.ts` - Ship assignment picker

### Issues Found

#### Raw addEventListener Usage (Not Framework-Managed)

**weapon.ts:**
- Lines 109, 218, 239: Button click handlers
- Lines 303, 307: mouseenter/mouseleave handlers
- **Cleanup:** Popover is removed from DOM on close, removing listeners

**equip.ts:**
- Lines 192, 196: mouseenter/mouseleave handlers
- Lines 253, 289, 310: Button click handlers
- **Cleanup:** Same pattern as weapon.ts

**swap.ts:**
- Lines 188, 216, 239: Button click handlers
- Line 287: Outside-click handler with self-removal
- **Cleanup:** Proper self-removing handler

**ship-picker.ts:**
- Lines 195, 244: Button and outside-click handlers
- Lines 243-245: Uses `setTimeout(0)` pattern correctly
- **Cleanup:** Self-removing outside-click handler at line 240

### Popover State Management (`src/ui/screens/popover/state.ts`)

**Lines 5-24:** Module-level state variables
- `activePicker`, `activeSubmenu`, `activeSlotElement`
- `isPopoverPinned`, `isMouseOverPopover`
- `closeTimeout`, `outsideClickListener`

**Cleanup at lines 73-91:** `closePopover()` properly:
- Clears timeout
- Removes outside-click listener
- Removes submenu and picker from DOM
- Resets all state

**Risk:** If `closePopover()` isn't called (e.g., exception thrown), listeners could leak. Current code appears to always call it.

### Replay Help Modal (`src/ui/screens/replay/replay-help-modal.ts`)

**Lines 158, 178, 185, 192, 202, 212, 232:** Multiple raw `addEventListener` calls
- Similar pattern to settings key listener
- **Justified:** Capture phase needed for key rebinding
- **Has cleanup:** Lines 162-167, 236-241

---

## Event Handling Analysis

### Memory Leak Risk Assessment

| Location | Risk | Reason |
|----------|------|--------|
| Screen framework | Low | Auto-cleanup on destroy |
| Nav bar | Medium | Requires manual cleanup call |
| Popover system | Low | DOM removal cleans up |
| Key listeners | Low | Explicit cleanup functions |
| Viewer tabs | Low | Cleanup function tracked |
| Hardpoint events | Low | Cleanup function tracked |

### Outside-Click Pattern

The codebase has a consistent pattern for outside-click dismissal:

```typescript
// Pattern from state.ts:112-122
const closeOnOutsideClick = (e: MouseEvent) => {
  if (activePicker && !activePicker.contains(e.target as Node)) {
    closePopover();
  }
};
setTimeout(() => {
  document.addEventListener('click', closeOnOutsideClick);
}, 0);
```

**Found in:**
- `src/ui/screens/popover/state.ts:112-122`
- `src/ui/screens/ship-picker.ts:237-245`
- `src/ui/screens/popover/swap.ts:274-288`
- `src/ui/screens/settings/index.ts:65-77`

The `setTimeout(0)` is critical - prevents the click that opened the popover from immediately closing it.

---

## XSS Vulnerability Analysis

### escapeHtml Usage (`src/ui/utils.ts:14-24`)

**Good Usage:**
- `alert-modal.ts:33-37` - Escapes title, message, buttonText
- `campaign-create.ts:92` - Escapes commander name in input value

**Missing Escaping (Potential XSS if data comes from untrusted source):**

1. **contracts.ts:91** - `contract.name` rendered directly
   - Risk: Low (contract names come from code, not user input)

2. **contracts.ts:131** - `contract.description` rendered directly
   - Risk: Low (same reason)

3. **replay-list-render.ts** - Replay metadata rendered directly
   - Risk: Medium (replay files could be imported from external sources)

4. **results.ts:117-119** - `contract.name` rendered directly
   - Risk: Low

5. **ship-picker.ts:39** - `shipClass` used in alt attribute
   - Risk: Low (comes from code constants)

**Recommendation:** Add `escapeHtml()` to any user-visible strings that could come from:
- Imported replay files
- Imported campaign save files
- Any future user-generated content

---

## Accessibility Review

### Positive Findings

Most screens include proper ARIA attributes:

- **contracts.ts:82-97** - Contract list items have `role="option"`, `aria-selected`, `aria-label`
- **nav-bar.ts:55-59** - Tabs have `role="tab"`, `aria-selected`, tabindex management
- **results.ts:64-76** - Tab buttons with proper ARIA
- **pause-menu.ts:36** - Modal has `role="dialog"`, `aria-modal="true"`

### Missing or Incomplete

1. **Focus Management:**
   - Modals should trap focus (not implemented)
   - Focus should return to trigger element on modal close (not implemented)

2. **campaign-create.ts:244-248:** Auto-focuses input, good
   - But should also select text for easy replacement

3. **Popovers:** No focus trap, but they are hover-triggered so this may be intentional

4. **Keyboard Navigation:**
   - Arrow key navigation in lists not implemented
   - Tab order generally follows visual order

---

## Error Handling Review

### Good Patterns

1. **load-campaign.ts:96-119** - Try/catch with error state display
2. **replay-list.ts:118-129** - Error state propagation
3. **settings/index.ts:211-216** - Shows error modal on export failure

### Missing Error Handling

1. **Popover positioning** - No handling if viewport is too small
   - Code attempts adjustment but could still overflow

2. **title.ts:217-219** - Swallows IndexedDB errors silently
   - Appropriate for init, but could log for debugging

---

## Stale Closure Prevention

The framework handles this well through re-binding on each render:

```typescript
// screen.ts:174-178
const render = () => {
  clearHandlers();  // Remove old handlers
  element.innerHTML = screen.render(state, props);
  screen.bind(createAPI(), props);  // Fresh handlers with current state
};
```

**Best Practice Followed:**
- `api.getState()` used in async handlers to get current state
- Examples: `contracts.ts:234`, `replay-list.ts:87`, `campaign-create.ts:205`

**Potential Issue:**
- Hardpoint events capture `props.campaignState` in closure
- If props update during hover, popover sees stale state
- Mitigated by `rerender()` callback triggering re-bind

---

## Recommendations

### High Priority

1. **Document the dual system architecture** - Add comments explaining when to use Screen framework vs. popover pattern

2. **Standardize nav-bar integration** - Consider making nav-bar a Screen component or adding framework support for shared components

3. **Add escapeHtml to replay imports** - Replay data from external files could contain malicious strings

### Medium Priority

4. **Add capture-phase support to framework** - Would allow settings key listener to use framework

5. **Add focus trap to modals** - Improves accessibility for keyboard users

6. **Consolidate popover cleanup** - Single cleanup function that screens can call in their destroy

### Low Priority

7. **Convert viewer tabs to use delegation** - Currently works but inconsistent with pattern

8. **Add TypeScript strict null checks** - Some `querySelector` results aren't checked

9. **Consider React/Vue** - If the UI becomes more complex, a mature framework might reduce custom code

---

## Files Requiring Attention

| File | Issue | Severity |
|------|-------|----------|
| `popover/*.ts` | Outside framework, complex lifecycle | Medium |
| `ship-picker.ts` | Outside framework | Medium |
| `replay-help-modal.ts` | Many raw addEventListener | Low |
| `nav-bar.ts` | Raw addEventListener | Low |
| `viewer.ts` | Could use delegation | Low |

---

## Conclusion

The UI system is well-designed for a game of this complexity. The Screen framework effectively prevents most common memory leak and stale closure issues. The popover subsystem, while outside the framework, has proper cleanup patterns.

The main technical debt is the existence of two parallel event management approaches. This is justified by browser limitations (capture phase, non-bubbling events) but should be documented to help future maintainers understand when to use each approach.

No critical bugs were found. The codebase demonstrates thoughtful architecture with good separation of concerns.
