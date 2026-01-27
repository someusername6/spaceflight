/**
 * Popover State Module Tests with Real Timers
 *
 * Tests the actual popover state module behavior with real timers,
 * including 50ms close debounce and click listener management.
 */

import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { setupMockDOM } from '../shared/popover-dom-mocks.mjs';

describe('State Module Tests with Real Timers', () => {
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

  describe('50ms close debounce', () => {
    it('popover closes after 50ms when mouse leaves and does not return', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      mockDocument.body.appendChild(picker);
      state.setActivePicker(picker);
      state.resetPopoverState();
      state.setMouseOverPopover(false);

      // Trigger close
      state.hideWeaponPopoverIfNotPinned();

      // Before 50ms - still open
      assert.strictEqual(
        state.getActivePicker(),
        picker,
        'should still be open before timeout',
      );

      // Wait 100ms (more than 50ms debounce)
      await new Promise((r) => setTimeout(r, 100));

      assert.strictEqual(
        state.getActivePicker(),
        null,
        'should be closed after timeout',
      );
    });

    it('popover stays open if mouse re-enters within 50ms', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      mockDocument.body.appendChild(picker);
      state.setActivePicker(picker);
      state.resetPopoverState();

      // Mouse leaves
      state.setMouseOverPopover(false);
      state.hideWeaponPopoverIfNotPinned();

      // Mouse re-enters within 50ms (at 20ms)
      await new Promise((r) => setTimeout(r, 20));
      state.setMouseOverPopover(true);

      // Wait for timeout to fire (another 80ms)
      await new Promise((r) => setTimeout(r, 80));

      // Should still be open because isMouseOver was true when timeout checked
      assert.strictEqual(state.getActivePicker(), picker, 'should remain open');

      state.closePopover();
    });

    it('pinned popover never auto-closes on mouseleave', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      mockDocument.body.appendChild(picker);
      state.setActivePicker(picker);
      state.resetPopoverState();
      state.pinWeaponPopover();

      // Mouse leaves
      state.setMouseOverPopover(false);
      state.hideWeaponPopoverIfNotPinned();

      // Wait longer than debounce
      await new Promise((r) => setTimeout(r, 100));

      assert.strictEqual(
        state.getActivePicker(),
        picker,
        'pinned popover should NOT auto-close',
      );
      assert.ok(
        picker.classList.contains('pinned'),
        'should have pinned class',
      );

      state.closePopover();
    });
  });

  describe('outside click listener management', () => {
    it('pinWeaponPopover adds document click listener (deferred)', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      mockDocument.body.appendChild(picker);
      state.setActivePicker(picker);
      state.resetPopoverState();

      const countBefore = mockDocument.getClickListenerCount();

      state.pinWeaponPopover();

      // Listener is added with setTimeout(0), so wait a tick
      await new Promise((r) => setTimeout(r, 10));

      const countAfter = mockDocument.getClickListenerCount();

      assert.strictEqual(
        countAfter,
        countBefore + 1,
        'should add one click listener',
      );

      state.closePopover();
    });

    it('closePopover removes the click listener', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      mockDocument.body.appendChild(picker);
      state.setActivePicker(picker);
      state.resetPopoverState();

      state.pinWeaponPopover();
      await new Promise((r) => setTimeout(r, 10));

      const countBeforeClose = mockDocument.getClickListenerCount();

      state.closePopover();

      const countAfterClose = mockDocument.getClickListenerCount();

      assert.strictEqual(
        countAfterClose,
        countBeforeClose - 1,
        'should remove the click listener',
      );
    });

    it('clicking outside triggers close via the listener', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      mockDocument.body.appendChild(picker);
      state.setActivePicker(picker);
      state.resetPopoverState();

      state.pinWeaponPopover();
      await new Promise((r) => setTimeout(r, 10));

      // Create outside element and simulate click
      const outside = mockDocument.createElement('div');
      mockDocument.body.appendChild(outside);

      mockDocument.dispatchEvent({ type: 'click', target: outside });

      assert.strictEqual(
        state.getActivePicker(),
        null,
        'should close on outside click',
      );
    });

    it('clicking inside does NOT trigger close', async () => {
      const state = await import('../../../src/ui/screens/popover/state.ts');
      state.closePopover();

      const picker = mockDocument.createElement('div');
      const innerButton = mockDocument.createElement('button');
      picker.appendChild(innerButton);
      mockDocument.body.appendChild(picker);

      state.setActivePicker(picker);
      state.resetPopoverState();

      state.pinWeaponPopover();
      await new Promise((r) => setTimeout(r, 10));

      mockDocument.dispatchEvent({ type: 'click', target: innerButton });

      assert.strictEqual(
        state.getActivePicker(),
        picker,
        'should NOT close on inside click',
      );

      state.closePopover();
    });
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('POPOVER STATE MODULE TIMER TESTS');
console.log(`${'='.repeat(70)}\n`);
