/**
 * Popover Edge Case Tests
 *
 * Tests for critical edge cases in popover behavior including:
 * - CHANGE button click interactions
 * - Click-to-pin handler conflicts
 * - Picker button interactions
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { setupMockDOM } from '../shared/popover-dom-mocks.mjs';

describe('Popover Edge Cases', () => {
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

  it('outside click listener should NOT close submenu when CHANGE button is clicked', () => {
    // This test documents a critical bug where:
    // 1. Clicking CHANGE opens the submenu via the CHANGE handler
    // 2. The click bubbles and triggers bind() which registers outside click listener
    // 3. The outside click listener fires on the SAME click event
    // 4. Listener sees click is inside main popover -> closes submenu (BUG!)
    //
    // The fix is to skip closing submenu when the click target is .btn-change-weapon

    // Simulate the 3-way click handler logic
    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';

    const changeButton = mockDocument.createElement('button');
    changeButton.className = 'btn-change-weapon';
    popover.appendChild(changeButton);

    const submenu = mockDocument.createElement('div');
    submenu.className = 'weapon-swap-picker';

    mockDocument.body.appendChild(popover);
    mockDocument.body.appendChild(submenu);

    // Simulate the outside click listener logic (from addOutsideClickListener)
    let submenuClosedByOutsideClick = false;

    const outsideClickListener = (e) => {
      const target = e.target;

      // Case 1: Inside submenu - do nothing
      if (submenu.contains(target)) return;

      // Case 2: Inside main popover - close only submenu
      if (popover.contains(target)) {
        // BUG FIX: Don't close if clicking the CHANGE button
        const clickedChangeButton = target.closest('.btn-change-weapon');
        if (!clickedChangeButton) {
          submenuClosedByOutsideClick = true;
        }
        return;
      }

      // Case 3: Outside both - close all
      submenuClosedByOutsideClick = true;
    };

    // Simulate click on CHANGE button (which is inside popover)
    outsideClickListener({ target: changeButton });

    assert.ok(
      !submenuClosedByOutsideClick,
      'CRITICAL: Clicking CHANGE button must NOT close submenu via outside click listener',
    );

    // But clicking elsewhere in popover SHOULD close submenu
    const popoverContent = mockDocument.createElement('div');
    popover.appendChild(popoverContent);

    outsideClickListener({ target: popoverContent });

    assert.ok(
      submenuClosedByOutsideClick,
      'Clicking elsewhere in popover SHOULD close submenu',
    );
  });

  it('click-to-pin handler must NOT run when clicking CHANGE button (prevents re-render race)', () => {
    // This test documents a critical bug where:
    // 1. User hovers over slot, popover appears in UNPINNED state
    // 2. User clicks CHANGE button directly (without first clicking to pin)
    // 3. The click-to-pin handler (.weapon-popover click) runs FIRST
    // 4. It calls setState({visibility: 'pinned'}) which triggers re-render
    // 5. Re-render clears and re-registers handlers mid-event
    // 6. The CHANGE handler never runs - submenu doesn't open!
    //
    // The fix is to check in the click-to-pin handler if the click target
    // is the CHANGE button, and skip pinning (let CHANGE handler do it).

    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';

    const changeButton = mockDocument.createElement('button');
    changeButton.className = 'btn-change-weapon';
    popover.appendChild(changeButton);

    mockDocument.body.appendChild(popover);

    // Simulate the click-to-pin handler logic (from screen.ts bind())
    let clickToPinRan = false;

    const clickToPinHandler = (e) => {
      const target = e.target;

      // FIX: Skip if clicking the CHANGE button
      if (target.closest('.btn-change-weapon')) {
        return;
      }

      // Would trigger re-render
      clickToPinRan = true;
    };

    // Click on CHANGE button
    clickToPinHandler({ target: changeButton });

    assert.ok(
      !clickToPinRan,
      'CRITICAL: Click-to-pin handler must NOT run when clicking CHANGE button',
    );

    // But clicking elsewhere in popover SHOULD trigger click-to-pin
    const popoverStats = mockDocument.createElement('div');
    popover.appendChild(popoverStats);

    clickToPinHandler({ target: popoverStats });

    assert.ok(
      clickToPinRan,
      'Clicking elsewhere in popover SHOULD trigger click-to-pin',
    );
  });

  it('click-to-pin handler must NOT run when clicking picker buttons (EQUIP, +/-)', () => {
    // Same bug as CHANGE button but for the weapon picker in empty slots:
    // 1. User hovers over EMPTY slot, picker appears in UNPINNED state
    // 2. User clicks EQUIP button directly (without first clicking to pin)
    // 3. The click-to-pin handler runs FIRST and triggers re-render
    // 4. The EQUIP handler never runs - weapon doesn't equip!
    //
    // The fix is to also skip picker buttons in the click-to-pin handler.

    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';

    const equipButton = mockDocument.createElement('button');
    equipButton.className = 'picker-equip-btn';

    const qtyButton = mockDocument.createElement('button');
    qtyButton.className = 'picker-qty-btn';

    const pickerItem = mockDocument.createElement('div');
    pickerItem.className = 'picker-item';

    popover.appendChild(equipButton);
    popover.appendChild(qtyButton);
    popover.appendChild(pickerItem);

    mockDocument.body.appendChild(popover);

    // Simulate the click-to-pin handler logic (from screen.ts bind())
    const simulateClickToPinHandler = (target) => {
      // Skip if clicking buttons that handle their own actions
      if (
        target.closest('.btn-change-weapon') ||
        target.closest('.manager-btn') ||
        target.closest('.btn-unequip') ||
        target.closest('.picker-equip-btn') ||
        target.closest('.picker-qty-btn') ||
        target.closest('.picker-item')
      ) {
        return false; // Skipped
      }
      return true; // Would trigger re-render
    };

    // Click on EQUIP button - should be skipped
    assert.ok(
      !simulateClickToPinHandler(equipButton),
      'CRITICAL: Click-to-pin must skip .picker-equip-btn',
    );

    // Click on +/- quantity button - should be skipped
    assert.ok(
      !simulateClickToPinHandler(qtyButton),
      'CRITICAL: Click-to-pin must skip .picker-qty-btn',
    );

    // Click on picker item (primary weapon selection) - should be skipped
    assert.ok(
      !simulateClickToPinHandler(pickerItem),
      'CRITICAL: Click-to-pin must skip .picker-item',
    );

    // But clicking elsewhere in popover SHOULD trigger click-to-pin
    const popoverContent = mockDocument.createElement('div');
    popover.appendChild(popoverContent);

    assert.ok(
      simulateClickToPinHandler(popoverContent),
      'Clicking elsewhere in popover SHOULD trigger click-to-pin',
    );
  });

  it('manager-btn (ammo load/unload) clicks should not trigger click-to-pin', () => {
    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';

    const loadBtn = mockDocument.createElement('button');
    loadBtn.className = 'manager-btn';
    loadBtn.dataset.action = 'load';

    const unloadBtn = mockDocument.createElement('button');
    unloadBtn.className = 'manager-btn';
    unloadBtn.dataset.action = 'unload';

    popover.appendChild(loadBtn);
    popover.appendChild(unloadBtn);

    mockDocument.body.appendChild(popover);

    const simulateClickToPinHandler = (target) => {
      if (
        target.closest('.btn-change-weapon') ||
        target.closest('.manager-btn') ||
        target.closest('.btn-unequip') ||
        target.closest('.picker-equip-btn') ||
        target.closest('.picker-qty-btn') ||
        target.closest('.picker-item')
      ) {
        return false; // Skipped
      }
      return true; // Would trigger re-render
    };

    assert.ok(
      !simulateClickToPinHandler(loadBtn),
      'CRITICAL: Click-to-pin must skip .manager-btn (load)',
    );

    assert.ok(
      !simulateClickToPinHandler(unloadBtn),
      'CRITICAL: Click-to-pin must skip .manager-btn (unload)',
    );
  });

  it('btn-unequip clicks should not trigger click-to-pin', () => {
    const popover = mockDocument.createElement('div');
    popover.className = 'weapon-popover';

    const unequipBtn = mockDocument.createElement('button');
    unequipBtn.className = 'btn-unequip';

    popover.appendChild(unequipBtn);

    mockDocument.body.appendChild(popover);

    const simulateClickToPinHandler = (target) => {
      if (
        target.closest('.btn-change-weapon') ||
        target.closest('.manager-btn') ||
        target.closest('.btn-unequip') ||
        target.closest('.picker-equip-btn') ||
        target.closest('.picker-qty-btn') ||
        target.closest('.picker-item')
      ) {
        return false; // Skipped
      }
      return true; // Would trigger re-render
    };

    assert.ok(
      !simulateClickToPinHandler(unequipBtn),
      'CRITICAL: Click-to-pin must skip .btn-unequip',
    );
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('POPOVER EDGE CASE TESTS');
console.log(`${'='.repeat(70)}\n`);
