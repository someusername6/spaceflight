/**
 * Tooltip Styles - Scan-line effect HUD tooltips
 */

import { colors, fonts } from './theme';

export function getTooltipStyles(): string {
  return `
    /* ========================================
       TOOLTIP SYSTEM
       ======================================== */

    .stat-tooltip {
      position: fixed;
      z-index: 10000;
      background: ${colors.bgPanel};
      border: 1px solid ${colors.borderLight};
      padding: 0;
      min-width: 200px;
      max-width: 280px;
      pointer-events: none;
      box-shadow:
        0 0 20px rgba(0, 0, 0, 0.5),
        0 0 40px ${colors.secondaryGlow},
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .stat-tooltip::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        transparent,
        ${colors.secondary},
        transparent
      );
    }

    .tooltip-header {
      padding: 10px 14px;
      background: rgba(0, 245, 255, 0.08);
      border-bottom: 1px solid ${colors.border};
    }

    .tooltip-title {
      font-family: ${fonts.display};
      font-size: 0.95rem;
      font-weight: 600;
      color: ${colors.secondary};
      letter-spacing: 0.1em;
    }

    .tooltip-subtitle {
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    .tooltip-divider {
      height: 1px;
      background: ${colors.border};
      margin: 0;
    }

    .tooltip-stat {
      display: flex;
      justify-content: space-between;
      padding: 6px 14px;
      font-family: ${fonts.body};
      font-size: 0.8rem;
    }

    .tooltip-stat:nth-child(odd) {
      background: rgba(0, 0, 0, 0.15);
    }

    .tooltip-label {
      color: ${colors.textSecondary};
    }

    .tooltip-value {
      color: ${colors.textPrimary};
      font-weight: 500;
    }

    .tooltip-note {
      padding: 8px 14px;
      font-size: 0.75rem;
      color: ${colors.success};
      font-style: italic;
      background: rgba(0, 255, 136, 0.05);
    }
  `;
}
