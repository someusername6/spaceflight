/**
 * Global Navigation Bar - Shared navigation across Hangar, Store, Contracts
 *
 * Provides consistent top-level navigation with sector/credits display.
 */

/** Navigation destinations */
export type NavDestination = 'squadron' | 'store' | 'contracts';

/** Props for nav bar rendering */
export interface NavBarProps {
  activeTab: NavDestination;
  credits: number;
  sector: number;
  onNavigate: (destination: NavDestination) => void;
  onPause?: () => void;
}

/** Render the status display (sector + credits) - integrated into nav bar */
function renderStatusDisplay(credits: number, sector: number): string {
  return `
    <div class="nav-status" role="status" aria-label="Player status">
      <div class="nav-status-item" aria-label="Current sector: ${sector}">
        <span class="nav-status-label">SECTOR</span>
        <span class="nav-status-value">${sector}</span>
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

  const tabs: { id: NavDestination; label: string; icon: string }[] = [
    { id: 'squadron', label: 'SQUADRON', icon: '◈' },
    { id: 'store', label: 'STORE', icon: '⬡' },
    { id: 'contracts', label: 'CONTRACTS', icon: '▶' },
  ];

  const tabsHtml = tabs
    .map(
      (tab) => `
      <button
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

/** Bind navigation event handlers */
export function bindNavBar(
  container: HTMLElement,
  onNavigate: (destination: NavDestination) => void,
  onPause?: () => void,
): void {
  container.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const dest = (tab as HTMLElement).dataset.nav as NavDestination;
      if (dest) {
        onNavigate(dest);
      }
    });
  });

  // Bind pause button if callback provided
  if (onPause) {
    const pauseBtn = container.querySelector('.nav-pause-btn');
    pauseBtn?.addEventListener('click', onPause);
  }
}
