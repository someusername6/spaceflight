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
  const { activeTab, credits, sector } = props;

  const tabs: { id: NavDestination; label: string; icon: string }[] = [
    { id: 'hangar', label: 'HANGAR', icon: '◈' },
    { id: 'roster', label: 'ROSTER', icon: '★' },
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

  return `
    <nav class="global-nav" role="navigation" aria-label="Main navigation">
      <div class="nav-tabs" role="tablist" aria-label="Screen navigation">
        ${tabsHtml}
      </div>
      ${statusHtml}
      <div class="nav-scanline" aria-hidden="true"></div>
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
       CAMPAIGN PAGE WRAPPER
       Constrained width with shared background
       ======================================== */

    .campaign-page {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      background: linear-gradient(
        180deg,
        rgba(5, 8, 15, 0.98) 0%,
        rgba(8, 12, 20, 0.95) 50%,
        rgba(5, 8, 15, 0.98) 100%
      );
      position: relative;
      box-sizing: border-box;
    }

    /* Scanline overlay for entire campaign screens */
    .campaign-page::before {
      content: '';
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
        rgba(0, 245, 255, 0.012) 2px,
        rgba(0, 245, 255, 0.012) 4px
      );
      z-index: 1000;
    }

    /* ========================================
       GLOBAL NAVIGATION BAR
       Joint header with tabs left, status right
       ======================================== */

    .global-nav {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
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

    /* Top accent line */
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
       NAVIGATION TABS (Left side)
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
      padding: 0 24px;
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
      font-size: 1rem;
      opacity: 0.7;
      transition: all 0.2s ease;
    }

    .nav-tab.active .nav-tab-icon {
      opacity: 1;
      text-shadow: 0 0 8px ${colors.primaryGlow};
    }

    .nav-tab-label {
      text-transform: uppercase;
    }

    /* ========================================
       STATUS DISPLAY (Right side - integrated)
       ======================================== */

    .nav-status {
      display: flex;
      align-items: center;
      gap: 24px;
      z-index: 1;
    }

    .nav-status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
    }

    .nav-status-label {
      font-family: ${fonts.ui};
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: ${colors.textDim};
      text-transform: uppercase;
    }

    .nav-status-value {
      font-family: ${fonts.display};
      font-size: 1rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      letter-spacing: 0.05em;
    }

    .nav-credits {
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
        padding: 0 14px;
      }

      .nav-tab-label {
        display: none;
      }

      .nav-tab-icon {
        font-size: 1.2rem;
      }

      .nav-status {
        gap: 12px;
      }

      .nav-status-item {
        padding: 4px 8px;
        clip-path: none;
      }
    }
  `;
}
