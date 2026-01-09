/**
 * Inline SVG Loader
 *
 * Uses Vite's glob imports to load SVG files at build time.
 * Provides two access modes:
 *
 * 1. **Inline content** (`getWeaponSvgInline`, etc.)
 *    Returns raw SVG markup for inline injection into the DOM.
 *    Use when you need CSS control over `currentColor` elements.
 *
 * 2. **Asset URLs** (`getWeaponSvgUrl`, etc.)
 *    Returns hashed asset URLs for use in `<img>` tags.
 *    Use for simple display where CSS styling isn't needed.
 *
 * ## Why Inline SVGs?
 *
 * SVGs using `currentColor` can only inherit CSS `color` when inline in the DOM.
 * When loaded via `<img>`, they're treated as external images with no CSS access.
 *
 * For weapon icons with dual coloring (fixed beam color + currentColor body),
 * inline injection allows CSS to control the body color while preserving
 * the fixed beam color defined in the SVG.
 *
 * ## Usage
 *
 * ```typescript
 * // For inline rendering (CSS can style currentColor)
 * const svg = getWeaponSvgInline('redlaser');
 * container.innerHTML = `<div class="weapon-icon">${svg}</div>`;
 * // CSS: .weapon-icon { color: var(--color-primary); }
 *
 * // For img tags (simpler, no CSS styling of SVG internals)
 * const url = getWeaponSvgUrl('redlaser');
 * container.innerHTML = `<img src="${url}" alt="Red Laser" />`;
 * ```
 */

// =============================================================================
// Glob Imports - Load all SVGs at build time
// =============================================================================

// Weapon SVGs as raw content (for inline injection)
const weaponSvgContent = import.meta.glob<string>(
  '/src/assets/icons/weapons/*.svg',
  { query: '?raw', import: 'default', eager: true },
);

// Weapon SVGs as asset URLs (for img tags)
const weaponSvgUrls = import.meta.glob<string>(
  '/src/assets/icons/weapons/*.svg',
  { import: 'default', eager: true },
);

// Missile SVGs as raw content
const missileSvgContent = import.meta.glob<string>(
  '/src/assets/icons/missiles/*.svg',
  { query: '?raw', import: 'default', eager: true },
);

// Missile SVGs as asset URLs
const missileSvgUrls = import.meta.glob<string>(
  '/src/assets/icons/missiles/*.svg',
  { import: 'default', eager: true },
);

// Ship SVGs as raw content
const shipSvgContent = import.meta.glob<string>(
  '/src/assets/icons/ships/*.svg',
  { query: '?raw', import: 'default', eager: true },
);

// Ship SVGs as asset URLs
const shipSvgUrls = import.meta.glob<string>('/src/assets/icons/ships/*.svg', {
  import: 'default',
  eager: true,
});

// Fallback icon
const fallbackSvgContent = import.meta.glob<string>(
  '/src/assets/icons/fallback.svg',
  { query: '?raw', import: 'default', eager: true },
);

const fallbackSvgUrls = import.meta.glob<string>(
  '/src/assets/icons/fallback.svg',
  { import: 'default', eager: true },
);

// =============================================================================
// Fallback Helpers
// =============================================================================

const FALLBACK_KEY = '/src/assets/icons/fallback.svg';

/** Get fallback SVG content */
export function getFallbackSvgInline(): string {
  return fallbackSvgContent[FALLBACK_KEY] ?? '';
}

/** Get fallback SVG URL */
export function getFallbackSvgUrl(): string {
  return fallbackSvgUrls[FALLBACK_KEY] ?? '';
}

// =============================================================================
// Weapon SVG Accessors
// =============================================================================

/**
 * Get weapon SVG as raw content for inline injection.
 * Returns fallback SVG if weapon type not found.
 */
export function getWeaponSvgInline(weaponType: string): string {
  const key = `/src/assets/icons/weapons/${weaponType.toLowerCase()}.svg`;
  return weaponSvgContent[key] ?? getFallbackSvgInline();
}

/**
 * Get weapon SVG as asset URL for img tags.
 * Returns fallback URL if weapon type not found.
 */
export function getWeaponSvgUrl(weaponType: string): string {
  const key = `/src/assets/icons/weapons/${weaponType.toLowerCase()}.svg`;
  return weaponSvgUrls[key] ?? getFallbackSvgUrl();
}

// =============================================================================
// Missile SVG Accessors
// =============================================================================

/**
 * Get missile SVG as raw content for inline injection.
 * Returns fallback SVG if missile type not found.
 */
export function getMissileSvgInline(missileType: string): string {
  const key = `/src/assets/icons/missiles/${missileType.toLowerCase()}.svg`;
  return missileSvgContent[key] ?? getFallbackSvgInline();
}

/**
 * Get missile SVG as asset URL for img tags.
 * Returns fallback URL if missile type not found.
 */
export function getMissileSvgUrl(missileType: string): string {
  const key = `/src/assets/icons/missiles/${missileType.toLowerCase()}.svg`;
  return missileSvgUrls[key] ?? getFallbackSvgUrl();
}

// =============================================================================
// Ship SVG Accessors
// =============================================================================

/**
 * Get ship SVG as raw content for inline injection.
 * Returns fallback SVG if ship class not found.
 */
export function getShipSvgInline(shipClass: string): string {
  const key = `/src/assets/icons/ships/${shipClass.toLowerCase()}.svg`;
  return shipSvgContent[key] ?? getFallbackSvgInline();
}

/**
 * Get ship SVG as asset URL for img tags.
 * Returns fallback URL if ship class not found.
 */
export function getShipSvgUrl(shipClass: string): string {
  const key = `/src/assets/icons/ships/${shipClass.toLowerCase()}.svg`;
  return shipSvgUrls[key] ?? getFallbackSvgUrl();
}
