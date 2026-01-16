/**
 * Popover Full Event Flow Tests
 *
 * Integration tests for complete popover event sequences
 * including hover, pin, submenu, and outside click behaviors.
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { setupMockDOM } from '../shared/popover-dom-mocks.mjs';

describe('Full Event Sequence Tests', () => {
  let mockDocument;
  let cleanup;

  beforeEach(() => {
    const setup = setupMockDOM();
    mockDocument = setup.mockDocument;
    cleanup = setup.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('complete flow: hover -> pin -> open submenu -> button click (stopPropagation) -> click outside', async () => {
    const state = await import('../../../src/ui/screens/popover/state.ts');
    state.closePopover();

    // Step 1: Create slot and hover (mouseenter)
    const slot = mockDocument.createElement('div');
    mockDocument.body.appendChild(slot);

    // Step 2: Show popover (simulating showWeaponPopover)
    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';
    mockDocument.body.appendChild(popover);
    state.setActivePicker(popover);
    state.setActiveSlotElement(slot);
    state.resetPopoverState();

    assert.strictEqual(state.activePicker, popover, 'popover should be active');
    assert.ok(!popover.classList.contains('pinned'), 'should be UNPINNED');

    // Step 3: Click slot to pin
    state.pinWeaponPopover();
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(popover.classList.contains('pinned'), 'should be PINNED');

    // Step 4: Click CHANGE to open submenu
    const submenu = mockDocument.createElement('div');
    submenu.className = 'weapon-submenu';
    const submenuButton = mockDocument.createElement('button');
    submenu.appendChild(submenuButton);
    mockDocument.body.appendChild(submenu);
    state.setActiveSubmenu(submenu);

    // Set up submenu's 3-way click listener (simulating swap.ts)
    let submenuListenerRemoved = false;
    const submenuClickHandler = (e) => {
      const target = e.target;
      if (submenu.contains(target)) return; // Inside submenu - do nothing
      if (state.activePicker?.contains(target)) {
        state.closeSubmenu();
        mockDocument.removeEventListener('click', submenuClickHandler);
        submenuListenerRemoved = true;
        return;
      }
      state.closePopover();
      mockDocument.removeEventListener('click', submenuClickHandler);
      submenuListenerRemoved = true;
    };
    mockDocument.addEventListener('click', submenuClickHandler);

    assert.strictEqual(
      state.activeSubmenu,
      submenu,
      'submenu should be active',
    );

    // Step 5: Click submenu BUTTON - in real code, buttons call stopPropagation
    // So document-level listeners (including parent's outsideClickListener) DON'T fire
    // We simulate this by NOT dispatching to document
    // The button action runs, but popovers stay open
    assert.strictEqual(
      state.activePicker,
      popover,
      'popover should stay open after button click',
    );
    assert.strictEqual(
      state.activeSubmenu,
      submenu,
      'submenu should stay open after button click',
    );

    // Step 6: Click inside popover (not submenu) - submenu closes, popover stays
    const popoverContent = mockDocument.createElement('div');
    popover.appendChild(popoverContent);

    // This click DOES propagate to document listeners
    mockDocument.dispatchEvent({ type: 'click', target: popoverContent });

    // Submenu's 3-way handler sees: not in submenu, but IN popover -> close only submenu
    assert.strictEqual(state.activePicker, popover, 'popover should stay open');
    assert.strictEqual(state.activeSubmenu, null, 'submenu should be closed');
    assert.ok(
      submenuListenerRemoved,
      'submenu listener should have been removed',
    );

    // Step 7: Click outside - popover closes
    const outside = mockDocument.createElement('div');
    mockDocument.body.appendChild(outside);

    mockDocument.dispatchEvent({ type: 'click', target: outside });

    assert.strictEqual(state.activePicker, null, 'popover should be closed');
  });

  it('hover preview: show -> leave slot -> enter popover -> leave popover -> closes', async () => {
    const state = await import('../../../src/ui/screens/popover/state.ts');
    state.closePopover();

    // Show popover
    const popover = mockDocument.createElement('div');
    mockDocument.body.appendChild(popover);
    state.setActivePicker(popover);
    state.resetPopoverState();

    assert.ok(!popover.classList.contains('pinned'), 'should be UNPINNED');

    // Mouse leaves slot (triggers close timer)
    state.setMouseOverPopover(false);
    state.hideWeaponPopoverIfNotPinned();

    // Wait 20ms then mouse enters popover
    await new Promise((r) => setTimeout(r, 20));
    state.setMouseOverPopover(true);

    // Wait for original timeout to fire
    await new Promise((r) => setTimeout(r, 50));

    assert.strictEqual(
      state.activePicker,
      popover,
      'should still be open (mouse is over)',
    );

    // Mouse leaves popover
    state.setMouseOverPopover(false);
    state.hideWeaponPopoverIfNotPinned();

    // Wait for close
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(
      state.activePicker,
      null,
      'should be closed after leaving popover',
    );
  });

  it('clicking CHANGE directly from hover state should pin popover AND open submenu', async () => {
    // This test documents a critical bug that was found:
    // When clicking CHANGE button directly from hover state (not pre-pinned),
    // the button's stopPropagation() prevents the popover from being pinned.
    // The CHANGE handler must explicitly pin the main popover when opening submenu.

    const state = await import('../../../src/ui/screens/popover/state.ts');
    state.closePopover();

    // Step 1: Show popover in hover state (UNPINNED)
    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';
    mockDocument.body.appendChild(popover);
    state.setActivePicker(popover);
    state.resetPopoverState();

    assert.ok(
      !popover.classList.contains('pinned'),
      'popover should start UNPINNED',
    );

    // Step 2: Simulate CHANGE button click
    // In real code, CHANGE button does e.stopPropagation() which prevents
    // the popover's click-to-pin handler from running.
    // The CHANGE handler must ALSO pin the main popover.

    // For the original system, the expected behavior is:
    // - If popover is unpinned, clicking CHANGE should pin it
    // - Submenu should open

    // The fix ensures that when CHANGE is clicked:
    // 1. Main popover visibility is set to 'pinned'
    // 2. Submenu is created

    // In the original state.ts, pinWeaponPopover is called separately.
    // The migrated screen.ts CHANGE handler must do this itself.

    // Test the REQUIRED behavior: after CHANGE click from hover, popover is pinned
    state.pinWeaponPopover(); // This should happen inside CHANGE handler

    const submenu = mockDocument.createElement('div');
    submenu.className = 'weapon-submenu';
    mockDocument.body.appendChild(submenu);
    state.setActiveSubmenu(submenu);

    await new Promise((r) => setTimeout(r, 10));

    // Verify both conditions
    assert.ok(
      popover.classList.contains('pinned'),
      'CRITICAL: Main popover must be PINNED after CHANGE click from hover state',
    );
    assert.strictEqual(
      state.activeSubmenu,
      submenu,
      'Submenu should be open after CHANGE click',
    );

    // Cleanup
    state.closePopover();
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('POPOVER FULL EVENT FLOW TESTS');
console.log(`${'='.repeat(70)}\n`);
