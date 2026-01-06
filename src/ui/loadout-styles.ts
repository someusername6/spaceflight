/**
 * Loadout Panel Styles - Tactical interface design
 */

import { colors, fonts } from './theme';

export function getLoadoutStyles(): string {
  return `
    /* ========================================
       LOADOUT PANEL
       ======================================== */

    .loadout-panel {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      padding: 20px;
      position: relative;
    }

    .loadout-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(
        90deg,
        ${colors.primary} 0%,
        ${colors.secondary} 50%,
        ${colors.primary} 100%
      );
    }

    .loadout-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid ${colors.border};
    }

    /* ========================================
       WEAPON DISPLAY
       ======================================== */

    .weapon-name {
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 500;
      color: ${colors.textPrimary};
      margin-bottom: 2px;
    }

    .btn-unequip,
    .btn-equip {
      padding: 4px 10px;
      font-size: 0.7rem;
    }

    .btn-unequip {
      border-color: ${colors.danger};
      color: ${colors.danger};
    }

    .btn-unequip:hover:not(:disabled) {
      background: rgba(255, 51, 102, 0.1);
    }

    .btn-equip {
      border-color: ${colors.success};
      color: ${colors.success};
    }

    .btn-equip:hover:not(:disabled) {
      background: rgba(0, 255, 136, 0.1);
    }
  `;
}
