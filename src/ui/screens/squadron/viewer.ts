/**
 * Squadron Viewer - Tabbed viewer for deployed pilot-ship pairs.
 *
 * Shows [LOADOUT] and [PILOT] tabs for switching between views.
 */

import type { CampaignState, OwnedShip, Pilot } from '../../../campaign/types';

/** Viewer tab types */
export type ViewerTab = 'loadout' | 'pilot';

/** Render tab bar */
function renderTabBar(activeTab: ViewerTab): string {
  const loadoutActive = activeTab === 'loadout' ? 'active' : '';
  const pilotActive = activeTab === 'pilot' ? 'active' : '';

  return `
    <div class="viewer-tabs" role="tablist" aria-label="View mode">
      <button
        class="viewer-tab ${loadoutActive}"
        data-tab="loadout"
        role="tab"
        aria-selected="${activeTab === 'loadout'}"
        aria-controls="viewer-content"
        tabindex="${activeTab === 'loadout' ? '0' : '-1'}"
      >
        <span class="viewer-tab-icon" aria-hidden="true">◈</span>
        <span class="viewer-tab-label">Loadout</span>
      </button>
      <button
        class="viewer-tab ${pilotActive}"
        data-tab="pilot"
        role="tab"
        aria-selected="${activeTab === 'pilot'}"
        aria-controls="viewer-content"
        tabindex="${activeTab === 'pilot' ? '0' : '-1'}"
      >
        <span class="viewer-tab-icon" aria-hidden="true">★</span>
        <span class="viewer-tab-label">Pilot</span>
      </button>
    </div>
  `;
}

/** Render the tabbed viewer for a deployed pilot-ship pair */
export function renderViewerWithTabs(
  ship: OwnedShip,
  state: CampaignState,
  activeTab: ViewerTab,
  renderShipViewer: (ship: OwnedShip, state: CampaignState) => string,
  renderPilotViewer: (pilot: Pilot, state: CampaignState) => string,
): string {
  const pilot = ship.pilot;
  if (!pilot) {
    return `
      <div class="empty-state-panel" role="status">
        No pilot assigned to this ship
      </div>
    `;
  }

  const tabBar = renderTabBar(activeTab);

  // Render content based on active tab
  const content =
    activeTab === 'loadout'
      ? renderShipViewer(ship, state)
      : renderPilotViewer(pilot, state);

  return `
    <section class="squadron-viewer tabbed" aria-label="Ship and pilot details">
      ${tabBar}
      <div class="viewer-content" id="viewer-content" role="tabpanel">
        ${content}
      </div>
    </section>
  `;
}

/** Tracked listener for cleanup */
interface TrackedListener {
  el: HTMLElement;
  event: string;
  handler: EventListener;
}

/** Cleanup function for previous tab listeners */
let tabCleanup: (() => void) | null = null;

/** Clean up tab listeners (call on screen destroy) */
export function destroyViewerTabListeners(): void {
  tabCleanup?.();
  tabCleanup = null;
}

/** Bind tab click events */
export function bindViewerTabs(
  container: HTMLElement,
  onTabChange: (tab: ViewerTab) => void,
): void {
  // Clean up previous listeners to prevent duplicates
  tabCleanup?.();

  const listeners: TrackedListener[] = [];

  container.querySelectorAll<HTMLElement>('.viewer-tab').forEach((tabEl) => {
    const handler = () => {
      const tabType = tabEl.dataset.tab as ViewerTab;
      if (tabType) {
        onTabChange(tabType);
      }
    };
    tabEl.addEventListener('click', handler);
    listeners.push({ el: tabEl, event: 'click', handler });
  });

  // Store cleanup function for next call
  tabCleanup = () => {
    for (const { el, event, handler } of listeners) {
      el.removeEventListener(event, handler);
    }
    listeners.length = 0;
  };
}
