/**
 * DOM Utilities for HUD
 *
 * Safe element querying with runtime validation.
 */

/**
 * Query for a required element. Throws if not found.
 * Use this instead of `querySelector(...) as HTMLElement` to get meaningful errors.
 */
export function requireElement<T extends HTMLElement = HTMLElement>(
  container: HTMLElement,
  selector: string,
): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(
      `HUD initialization failed: required element "${selector}" not found in container`,
    );
  }
  return element;
}

/**
 * Query for a required canvas rendering context. Throws if not available.
 */
export function require2DContext(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      'HUD initialization failed: could not get 2D canvas context',
    );
  }
  return ctx;
}
