/**
 * Ship Card Styles - Compact ship list cards for hangar
 */

import { colors, fonts } from './theme';

export function getShipCardStyles(): string {
  return `
    /* ========================================
       SHIP CARDS
       ======================================== */

    .ship-list {
      display: flex;
      flex-direction: column;
      border: 1px solid ${colors.border};
      background: ${colors.bgPanel};
    }

    .ship-card {
      display: flex;
      align-items: center;
      padding: 12px 14px;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-bottom: 1px solid ${colors.border};
      position: relative;
    }

    .ship-card:last-child {
      border-bottom: none;
    }

    .ship-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: transparent;
      transition: all 0.2s ease;
    }

    .ship-card:hover {
      background: ${colors.bgPanelHover};
    }

    .ship-card:hover::before {
      background: ${colors.borderLight};
    }

    .ship-card.selected {
      background: rgba(255, 159, 28, 0.1);
    }

    .ship-card.selected::before {
      background: ${colors.primary};
      box-shadow: 0 0 10px ${colors.primaryGlow};
    }

    .ship-card.player-ship .ship-card-icon {
      border-color: ${colors.primary};
    }

    .ship-card-icon {
      width: 44px;
      height: 44px;
      border: 2px solid ${colors.border};
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      clip-path: polygon(
        0 6px, 6px 0,
        calc(100% - 6px) 0, 100% 6px,
        100% calc(100% - 6px), calc(100% - 6px) 100%,
        6px 100%, 0 calc(100% - 6px)
      );
    }

    .card-abbrev {
      font-family: ${fonts.display};
      font-size: 0.85rem;
      font-weight: 600;
      color: ${colors.secondary};
      letter-spacing: 0.1em;
    }

    .ship-card-info {
      flex: 1;
      min-width: 0;
    }

    .card-pilot {
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-class {
      font-size: 0.75rem;
      color: ${colors.textSecondary};
      text-transform: capitalize;
      margin-bottom: 4px;
    }

    .card-hull {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hull-bar {
      flex: 1;
      height: 4px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${colors.border};
      overflow: hidden;
    }

    .hull-fill {
      height: 100%;
      background: ${colors.success};
      transition: width 0.3s ease;
    }

    .card-hull.damaged .hull-fill {
      background: ${colors.warning};
    }

    .hull-text {
      font-family: ${fonts.body};
      font-size: 0.7rem;
      color: ${colors.textDim};
      min-width: 30px;
    }

    .ship-card-weapons {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .weapon-count {
      font-family: ${fonts.body};
      font-size: 0.65rem;
      padding: 2px 6px;
      border: 1px solid ${colors.border};
      background: rgba(0, 0, 0, 0.2);
    }

    .weapon-count.primary {
      color: ${colors.primary};
      border-color: rgba(255, 159, 28, 0.3);
    }

    .weapon-count.secondary {
      color: ${colors.secondary};
      border-color: rgba(0, 245, 255, 0.3);
    }
  `;
}
