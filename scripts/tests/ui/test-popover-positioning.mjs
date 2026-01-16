/**
 * Popover Positioning Tests
 *
 * Tests for the pure positioning functions that calculate popover placement.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  adjustForOverflow,
  calculateInitialPosition,
  calculateSubmenuPosition,
  isPointInRect,
} from '../../../src/ui/screens/popover-layer/positioning.ts';

// Mock DOMRect for testing
function createRect(left, top, width, height) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

// ============================================================================
// calculateInitialPosition Tests
// ============================================================================

describe('calculateInitialPosition', () => {
  it('should position popover below trigger with gap', () => {
    const triggerRect = createRect(100, 50, 80, 30);
    const pos = calculateInitialPosition(triggerRect);

    assert.strictEqual(pos.left, 100, 'left should match trigger left');
    assert.strictEqual(pos.top, 84, 'top should be trigger.bottom + 4px gap');
  });

  it('should handle trigger at top-left of viewport', () => {
    const triggerRect = createRect(0, 0, 50, 20);
    const pos = calculateInitialPosition(triggerRect);

    assert.strictEqual(pos.left, 0, 'left should be 0');
    assert.strictEqual(pos.top, 24, 'top should be trigger.bottom + 4px gap');
  });
});

// ============================================================================
// adjustForOverflow Tests
// ============================================================================

describe('adjustForOverflow', () => {
  const viewportWidth = 1024;
  const viewportHeight = 768;

  describe('vertical positioning', () => {
    it('should not flip when there is room below', () => {
      const triggerRect = createRect(100, 100, 80, 30);
      const position = { top: 134, left: 100 }; // below trigger
      const popoverRect = { width: 200, height: 150 };

      const result = adjustForOverflow(
        position,
        popoverRect,
        triggerRect,
        viewportWidth,
        viewportHeight,
      );

      assert.strictEqual(result.flipped, false, 'should not flip');
      assert.strictEqual(result.top, 134, 'top should be unchanged');
    });

    it('should flip above trigger when overflowing bottom', () => {
      const triggerRect = createRect(100, 600, 80, 30);
      const position = { top: 634, left: 100 }; // below trigger
      const popoverRect = { width: 200, height: 200 };

      const result = adjustForOverflow(
        position,
        popoverRect,
        triggerRect,
        viewportWidth,
        viewportHeight,
      );

      assert.strictEqual(result.flipped, true, 'should flip');
      // Should be above trigger: triggerRect.top - height - gap = 600 - 200 - 4 = 396
      assert.strictEqual(result.top, 396, 'should position above trigger');
    });

    it('should clamp to top when cannot flip', () => {
      // Trigger near top of viewport with tall popover
      const triggerRect = createRect(100, 50, 80, 30);
      const position = { top: 84, left: 100 }; // below trigger
      const popoverRect = { width: 200, height: 800 }; // taller than viewport

      const result = adjustForOverflow(
        position,
        popoverRect,
        triggerRect,
        viewportWidth,
        viewportHeight,
      );

      assert.strictEqual(result.flipped, false, 'should not flip');
      assert.strictEqual(result.top, 8, 'should clamp to viewport padding');
    });
  });

  describe('horizontal positioning', () => {
    it('should shift left when overflowing right edge', () => {
      const triggerRect = createRect(900, 100, 80, 30);
      const position = { top: 134, left: 900 };
      const popoverRect = { width: 200, height: 150 };

      const result = adjustForOverflow(
        position,
        popoverRect,
        triggerRect,
        viewportWidth,
        viewportHeight,
      );

      // Should shift left: viewportWidth - width - padding = 1024 - 200 - 8 = 816
      assert.strictEqual(result.left, 816, 'should shift left');
    });

    it('should not shift when fits', () => {
      const triggerRect = createRect(100, 100, 80, 30);
      const position = { top: 134, left: 100 };
      const popoverRect = { width: 200, height: 150 };

      const result = adjustForOverflow(
        position,
        popoverRect,
        triggerRect,
        viewportWidth,
        viewportHeight,
      );

      assert.strictEqual(result.left, 100, 'left should be unchanged');
    });
  });
});

// ============================================================================
// calculateSubmenuPosition Tests
// ============================================================================

describe('calculateSubmenuPosition', () => {
  const viewportWidth = 1024;
  const viewportHeight = 768;

  describe('vertical positioning', () => {
    it('should position submenu below button by default', () => {
      const buttonRect = createRect(200, 200, 100, 30);
      const submenuRect = { width: 150, height: 200 };

      const result = calculateSubmenuPosition(
        buttonRect,
        submenuRect,
        viewportWidth,
        viewportHeight,
      );

      assert.strictEqual(result.flipped, false, 'should not flip');
      // Should be below button: buttonRect.bottom + 4px gap = 230 + 4 = 234
      assert.strictEqual(result.top, 234, 'should position below button');
      assert.strictEqual(result.left, 200, 'left should match button left');
    });

    it('should flip above button when overflowing bottom', () => {
      const buttonRect = createRect(200, 600, 100, 30);
      const submenuRect = { width: 150, height: 200 };

      const result = calculateSubmenuPosition(
        buttonRect,
        submenuRect,
        viewportWidth,
        viewportHeight,
      );

      assert.strictEqual(result.flipped, true, 'should flip');
      // Should be above button: buttonRect.top - height - gap = 600 - 200 - 4 = 396
      assert.strictEqual(result.top, 396, 'should position above button');
    });

    it('should clamp to bottom when cannot flip', () => {
      // Button near top with tall submenu
      const buttonRect = createRect(200, 100, 100, 30);
      const submenuRect = { width: 150, height: 800 }; // taller than viewport

      const result = calculateSubmenuPosition(
        buttonRect,
        submenuRect,
        viewportWidth,
        viewportHeight,
      );

      // Cannot flip (not enough room above), clamp to bottom
      // viewportHeight - height - padding = 768 - 800 - 8 = -40, but should clamp
      assert.strictEqual(
        result.top,
        768 - 800 - 8,
        'should clamp to bottom edge',
      );
    });
  });

  describe('horizontal positioning', () => {
    it('should shift left when overflowing right edge', () => {
      const buttonRect = createRect(900, 200, 100, 30);
      const submenuRect = { width: 200, height: 150 };

      const result = calculateSubmenuPosition(
        buttonRect,
        submenuRect,
        viewportWidth,
        viewportHeight,
      );

      // Should shift left: viewportWidth - width - padding = 1024 - 200 - 8 = 816
      assert.strictEqual(result.left, 816, 'should shift left');
    });

    it('should shift right when overflowing left edge', () => {
      const buttonRect = createRect(0, 200, 50, 30);
      const submenuRect = { width: 200, height: 150 };

      const result = calculateSubmenuPosition(
        buttonRect,
        submenuRect,
        viewportWidth,
        viewportHeight,
      );

      // Should shift right to padding
      assert.strictEqual(result.left, 8, 'should shift to left padding');
    });
  });
});

// ============================================================================
// isPointInRect Tests
// ============================================================================

describe('isPointInRect', () => {
  const rect = createRect(100, 100, 200, 150);

  it('should return true for point inside rect', () => {
    assert.strictEqual(isPointInRect(150, 150, rect), true);
    assert.strictEqual(isPointInRect(100, 100, rect), true); // top-left corner
    assert.strictEqual(isPointInRect(300, 250, rect), true); // bottom-right corner
  });

  it('should return false for point outside rect', () => {
    assert.strictEqual(isPointInRect(50, 150, rect), false); // left of rect
    assert.strictEqual(isPointInRect(350, 150, rect), false); // right of rect
    assert.strictEqual(isPointInRect(150, 50, rect), false); // above rect
    assert.strictEqual(isPointInRect(150, 300, rect), false); // below rect
  });

  it('should respect padding parameter', () => {
    assert.strictEqual(isPointInRect(95, 150, rect, 10), true); // outside but within padding
    assert.strictEqual(isPointInRect(305, 150, rect, 10), true); // outside but within padding
    assert.strictEqual(isPointInRect(85, 150, rect, 10), false); // outside padding too
  });
});

console.log(`\n${'='.repeat(70)}`);
console.log('POPOVER POSITIONING TESTS');
console.log(`${'='.repeat(70)}\n`);
