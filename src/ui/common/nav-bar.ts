/**
 * Global Navigation Bar - Shared navigation across Hangar, Store, Contracts
 *
 * Provides consistent top-level navigation with sector/credits display.
 * Integrates with the Screen framework for automatic event cleanup.
 */

import { MAX_SECTOR } from '../../campaign/types';
import { isMultiplayerMode } from '../../multiplayer/multiplayer-context';
import type { ScreenAPI } from '../framework/screen';

/** Navigation destinations */
export type NavDestination = 'lobby' | 'squadron' | 'store' | 'contracts';

/** Props for nav bar rendering */
export interface NavBarProps {
  activeTab: NavDestination;
  credits: number;
  sector: number;
  /** Navigation callback. Optional for render-only use (binding handled separately). */
  onNavigate?: (destination: NavDestination) => void;
  onPause?: () => void;
}

/** Render the status display (sector + credits) - integrated into nav bar */
function renderStatusDisplay(credits: number, sector: number): string {
  const isEndless = sector >= MAX_SECTOR;
  const sectorDisplay = isEndless ? '∞' : sector.toString();

  return `
    <div class="nav-status" role="status" aria-label="Player status">
      <div class="nav-status-item" aria-label="Current sector: ${sector}">
        <span class="nav-status-label">SECTOR</span>
        <span class="nav-status-value nav-sector-name">${sectorDisplay}</span>
      </div>
      <div class="nav-status-item" aria-label="Credits: ${credits.toLocaleString()}">
        <span class="nav-status-label">CREDITS</span>
        <span class="nav-status-value nav-credits">${credits.toLocaleString()}</span>
      </div>
    </div>
  `;
}

/** Render the navigation bar HTML with integrated status display */
export function renderNavBar(props: NavBarProps): string {
  const { activeTab, credits, sector, onPause } = props;

  const tabs: { id: NavDestination; label: string; icon: string }[] = [];

  // Show lobby tab only in multiplayer mode
  if (isMultiplayerMode()) {
    tabs.push({ id: 'lobby', label: 'LOBBY', icon: '◇' });
  }

  tabs.push(
    { id: 'squadron', label: 'SQUADRON', icon: '◈' },
    { id: 'store', label: 'STORE', icon: '⬡' },
    { id: 'contracts', label: 'CONTRACTS', icon: '▶' },
  );

  const tabsHtml = tabs
    .map(
      (tab) => `
      <button
        id="nav-${tab.id}"
        class="nav-tab ${activeTab === tab.id ? 'active' : ''}"
        data-nav="${tab.id}"
        role="tab"
        aria-selected="${activeTab === tab.id}"
        aria-label="${tab.label}"
        tabindex="${activeTab === tab.id ? '0' : '-1'}"
      >
        <span class="nav-tab-icon" aria-hidden="true">${tab.icon}</span>
        <span class="nav-tab-label">${tab.label}</span>
      </button>
    `,
    )
    .join('');

  const statusHtml = renderStatusDisplay(credits, sector);

  // Pause button (only shown if onPause callback is provided)
  const pauseButton = onPause
    ? `<button class="nav-pause-btn" aria-label="Pause menu" title="Menu (Esc)">
        <span aria-hidden="true">☰</span>
      </button>`
    : '';

  return `
    <nav class="global-nav" role="navigation" aria-label="Main navigation">
      <div class="nav-tabs" role="tablist" aria-label="Screen navigation">
        ${tabsHtml}
      </div>
      ${statusHtml}
      ${pauseButton}
      <div class="nav-scanline" aria-hidden="true"></div>
    </nav>
  `;
}

/**
 * Bind navigation event handlers using the Screen framework.
 * Events are automatically cleaned up when the parent screen re-renders.
 *
 * @param api - The ScreenAPI from the parent screen's bind function
 * @param onNavigate - Callback for navigation tab clicks
 * @param onPause - Optional callback for pause button clicks
 */
export function bindNavBar<S>(
  api: ScreenAPI<S>,
  onNavigate: (destination: NavDestination) => void,
  onPause?: () => void,
): void {
  // Navigation tabs - use event delegation for automatic cleanup
  api.on('.nav-tab', 'click', (_e, el) => {
    const dest = el.dataset.nav as NavDestination;
    if (dest) {
      onNavigate(dest);
    }
  });

  // Pause button
  if (onPause) {
    api.on('.nav-pause-btn', 'click', () => {
      onPause();
    });
  }
}
