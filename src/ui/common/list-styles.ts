/**
 * List Styles - Ship list and contract list styles
 */

import { colors, fonts } from './theme';

export function getListStyles(): string {
  return `
    /* ========================================
       SHIP LIST
       ======================================== */

    .ship-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ship-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(
        90deg,
        rgba(20, 30, 45, 0.8) 0%,
        rgba(15, 25, 40, 0.6) 100%
      );
      border: 1px solid ${colors.border};
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .ship-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${colors.borderLight};
      transition: all 0.2s ease;
    }

    .ship-item:hover {
      background: linear-gradient(
        90deg,
        rgba(30, 45, 65, 0.9) 0%,
        rgba(25, 40, 60, 0.7) 100%
      );
      border-color: ${colors.borderLight};
    }

    .ship-item:hover::before {
      background: ${colors.primary};
      box-shadow: 0 0 10px ${colors.primaryGlow};
    }

    .ship-item.selected {
      background: linear-gradient(
        90deg,
        rgba(255, 159, 28, 0.15) 0%,
        rgba(255, 159, 28, 0.05) 100%
      );
      border-color: ${colors.primary};
    }

    .ship-item.selected::before {
      background: ${colors.primary};
      width: 4px;
      box-shadow: 0 0 15px ${colors.primaryGlow};
    }

    .ship-icon {
      width: 50px;
      height: 35px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${colors.border};
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${fonts.display};
      font-size: 0.7rem;
      font-weight: 600;
      color: ${colors.textDim};
      letter-spacing: 0.05em;
    }

    .ship-info {
      flex: 1;
      min-width: 0;
    }

    .ship-name {
      font-family: ${fonts.ui};
      font-weight: 600;
      font-size: 0.95rem;
      color: ${colors.textPrimary};
      margin-bottom: 2px;
    }

    .ship-class {
      font-size: 0.8rem;
      color: ${colors.textSecondary};
      text-transform: capitalize;
    }

    .ship-status {
      font-size: 0.75rem;
      margin-top: 4px;
      font-family: ${fonts.body};
    }

    .ship-status.ok {
      color: ${colors.success};
    }

    .ship-status.damaged {
      color: ${colors.warning};
    }

    /* ========================================
       CONTRACTS SCREEN - TWO PANEL LAYOUT
       ======================================== */

    .contracts-screen {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px;
      height: calc(100vh - 56px);
      box-sizing: border-box;
      overflow: hidden;
    }

    .contracts-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 20px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .contracts-list-panel {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      max-width: 280px;
    }

    .contracts-detail-panel {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      padding: 20px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .no-contract-selected {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: ${colors.textDim};
      font-style: italic;
      text-align: center;
    }

    /* ========================================
       CONTRACT LIST ITEMS (compact)
       ======================================== */

    .contract-list-item {
      display: flex;
      align-items: center;
      padding: 12px 14px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }

    .contract-list-item:hover {
      background: rgba(255, 159, 28, 0.08);
      border-color: ${colors.border};
    }

    .contract-list-item.selected {
      background: rgba(255, 159, 28, 0.12);
      border-color: ${colors.primary};
    }

    .contract-list-item.selected::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${colors.primary};
    }

    .contract-list-info {
      flex: 1;
      min-width: 0;
    }

    .contract-list-name {
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 500;
      color: ${colors.textPrimary};
      margin-bottom: 4px;
    }

    .contract-list-reward {
      font-family: ${fonts.display};
      font-size: 0.85rem;
      font-weight: 500;
      color: ${colors.success};
      min-width: 70px;
      text-align: right;
    }

    /* ========================================
       CONTRACT DETAIL PANEL
       ======================================== */

    .contract-detail {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .contract-detail-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid ${colors.border};
    }

    .contract-detail-name {
      font-family: ${fonts.ui};
      font-size: 1.3rem;
      font-weight: 600;
      color: ${colors.primary};
    }

    .contract-detail-desc {
      font-size: 0.9rem;
      color: ${colors.textSecondary};
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .contract-detail-section {
      margin-bottom: 20px;
    }

    .detail-section-label {
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      font-weight: 600;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }

    .contract-enemies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .enemy-entry {
      padding: 6px 12px;
      background: rgba(255, 51, 102, 0.1);
      border: 1px solid ${colors.danger};
      font-size: 0.85rem;
      color: ${colors.textPrimary};
      text-transform: capitalize;
    }

    .contract-waves {
      font-size: 0.8rem;
      color: ${colors.textDim};
    }

    .contract-detail-reward {
      font-family: ${fonts.display};
      font-size: 1.4rem;
      font-weight: 600;
      color: ${colors.success};
    }

    .btn-accept-mission {
      margin-top: auto;
      padding: 14px 24px;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      border-color: ${colors.success};
      color: ${colors.success};
      background: rgba(0, 255, 136, 0.05);
    }

    .btn-accept-mission:hover {
      background: rgba(0, 255, 136, 0.15);
      box-shadow: 0 0 20px ${colors.successGlow};
    }

    /* ========================================
       CONTRACT DIFFICULTY BADGES
       ======================================== */

    .contract-difficulty {
      display: inline-block;
      padding: 3px 10px;
      font-family: ${fonts.ui};
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      clip-path: polygon(
        4px 0,
        100% 0,
        calc(100% - 4px) 100%,
        0 100%
      );
    }

    .contract-difficulty.easy {
      background: rgba(0, 255, 136, 0.2);
      color: ${colors.success};
    }

    .contract-difficulty.medium {
      background: rgba(255, 217, 61, 0.2);
      color: ${colors.warning};
    }

    .contract-difficulty.hard {
      background: rgba(255, 51, 102, 0.2);
      color: ${colors.danger};
    }

    @media (max-width: 850px) {
      .contracts-layout {
        grid-template-columns: 1fr;
      }
    }
  `;
}
