/**
 * Global Navigation Bar - Shared navigation across Hangar, Store, Contracts
 *
 * Provides consistent top-level navigation with sector/credits display.
 */

import { colors, fonts } from './theme';

/** Navigation destinations */
export type NavDestination = 'hangar' | 'roster' | 'store' | 'contracts';

/** Props for nav bar rendering */
export interface NavBarProps {
  activeTab: NavDestination;
  credits: number;
  sector: number;
  onNavigate: (destination: NavDestination) => void;
}

/** Render the status display (sector + credits) for screen content area */
export function renderStatusDisplay(credits: number, sector: number): string {
  return `
    <div class="screen-status">
      <div class="status-item">
        <span class="status-label">SECTOR</span>
        <span class="status-value">${sector}</span>
      </div>
      <div class="status-item">
        <span class="status-label">CREDITS</span>
        <span class="status-value credits-amount">${credits.toLocaleString()}</span>
      </div>
    </div>
  `;
}

/** Render the navigation bar HTML */
export function renderNavBar(props: NavBarProps): string {
  const { activeTab } = props;

  const tabs: { id: NavDestination; label: string; icon: string }[] = [
    { id: 'hangar', label: 'HANGAR', icon: '◈' },
    { id: 'roster', label: 'ROSTER', icon: '★' },
    { id: 'store', label: 'STORE', icon: '⬡' },
    { id: 'contracts', label: 'CONTRACTS', icon: '▶' },
  ];

  const tabsHtml = tabs
    .map(
      (tab) => `
      <button class="nav-tab ${activeTab === tab.id ? 'active' : ''}" data-nav="${tab.id}">
        <span class="nav-tab-icon">${tab.icon}</span>
        <span class="nav-tab-label">${tab.label}</span>
      </button>
    `,
    )
    .join('');

  return `
    <nav class="global-nav">
      <div class="nav-tabs">
        ${tabsHtml}
      </div>
      <div class="nav-scanline"></div>
    </nav>
  `;
}

/** Bind navigation event handlers */
export function bindNavBar(
  container: HTMLElement,
  onNavigate: (destination: NavDestination) => void,
): void {
  container.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const dest = (tab as HTMLElement).dataset.nav as NavDestination;
      if (dest) {
        onNavigate(dest);
      }
    });
  });
}

/** Get nav bar styles */
export function getNavBarStyles(): string {
  return `
    /* ========================================
       GLOBAL NAVIGATION BAR
       ======================================== */

    .global-nav {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 24px;
      height: 56px;
      background: linear-gradient(
        180deg,
        rgba(10, 15, 25, 0.98) 0%,
        rgba(5, 10, 18, 0.95) 100%
      );
      border-bottom: 1px solid ${colors.border};
      box-shadow:
        0 2px 20px rgba(0, 0, 0, 0.5),
        inset 0 -1px 0 rgba(255, 159, 28, 0.1);
      flex-shrink: 0;
      z-index: 100;
    }

    .global-nav::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        ${colors.primary} 20%,
        ${colors.primary} 80%,
        transparent 100%
      );
      opacity: 0.6;
    }

    .nav-scanline {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 245, 255, 0.015) 2px,
        rgba(0, 245, 255, 0.015) 4px
      );
    }

    /* ========================================
       NAVIGATION TABS
       ======================================== */

    .nav-tabs {
      display: flex;
      gap: 4px;
      height: 100%;
      flex-shrink: 0;
    }

    .nav-tab {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 20px;
      height: 100%;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: ${colors.textDim};
      transition: all 0.2s ease;
    }

    .nav-tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 2px;
      background: ${colors.primary};
      transition: width 0.25s ease;
    }

    .nav-tab:hover {
      color: ${colors.textSecondary};
      background: rgba(255, 159, 28, 0.05);
    }

    .nav-tab:hover::after {
      width: 60%;
    }

    .nav-tab.active {
      color: ${colors.primary};
      background: rgba(255, 159, 28, 0.08);
    }

    .nav-tab.active::after {
      width: 100%;
      box-shadow: 0 0 10px ${colors.primaryGlow};
    }

    .nav-tab-icon {
      font-size: 0.9rem;
      opacity: 0.7;
    }

    .nav-tab.active .nav-tab-icon {
      opacity: 1;
    }

    .nav-tab-label {
      text-transform: uppercase;
    }

    /* ========================================
       SCREEN STATUS DISPLAY (Sector + Credits)
       Positioned inline with nav bar on the right
       ======================================== */

    .screen-status {
      position: fixed;
      top: 0;
      right: 24px;
      height: 56px;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 20px;
      z-index: 101;
    }

    .status-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      padding: 0;
      background: transparent;
      border: none;
    }

    .status-label {
      font-family: ${fonts.ui};
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: ${colors.textDim};
      text-transform: uppercase;
    }

    .status-value {
      font-family: ${fonts.display};
      font-size: 1rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      letter-spacing: 0.05em;
    }

    .credits-amount {
      color: ${colors.primary};
      text-shadow: 0 0 8px ${colors.primaryGlow};
    }

    /* ========================================
       RESPONSIVE
       ======================================== */

    @media (max-width: 700px) {
      .global-nav {
        padding: 0 12px;
      }

      .nav-tab {
        padding: 0 12px;
      }

      .nav-tab-label {
        display: none;
      }

      .nav-tab-icon {
        font-size: 1.2rem;
      }

      .nav-status {
        gap: 16px;
      }
    }
  `;
}
