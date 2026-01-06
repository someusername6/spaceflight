/**
 * Picker Styles - Weapon/item selection dropdowns
 */

import { colors, fonts } from './theme';

export function getPickerStyles(): string {
  return `
    /* ========================================
       WEAPON PICKER DROPDOWN
       ======================================== */

    .weapon-picker {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.borderLight};
      min-width: 180px;
      box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.5),
        0 0 30px ${colors.secondaryGlow};
    }

    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(0, 245, 255, 0.08);
      border-bottom: 1px solid ${colors.border};
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      font-weight: 600;
      color: ${colors.secondary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .picker-close {
      background: none;
      border: none;
      color: ${colors.textDim};
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0;
      line-height: 1;
    }

    .picker-close:hover {
      color: ${colors.danger};
    }

    .picker-content {
      max-height: 200px;
      overflow-y: auto;
    }

    .picker-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      background: none;
      border: none;
      border-bottom: 1px solid ${colors.border};
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .picker-item:last-child {
      border-bottom: none;
    }

    .picker-item:hover {
      background: rgba(255, 159, 28, 0.1);
    }

    .picker-abbrev {
      font-family: ${fonts.display};
      font-size: 0.75rem;
      font-weight: 600;
      color: ${colors.primary};
      letter-spacing: 0.1em;
      min-width: 36px;
    }

    .picker-name {
      font-family: ${fonts.ui};
      font-size: 0.8rem;
      color: ${colors.textPrimary};
      text-transform: capitalize;
      flex: 1;
    }

    .picker-stock {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      color: ${colors.textDim};
      margin-left: auto;
    }

    .picker-empty {
      padding: 16px 12px;
      text-align: center;
      color: ${colors.textDim};
      font-style: italic;
      font-size: 0.8rem;
    }

    /* ========================================
       MISSILE PICKER (with quantity selector)
       ======================================== */

    .missile-picker {
      min-width: 280px;
    }

    .picker-missile-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid ${colors.border};
    }

    .picker-missile-row:last-child {
      border-bottom: none;
    }

    .picker-missile-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .picker-storage {
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      color: ${colors.textDim};
      margin-left: auto;
    }

    .picker-quantity {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-end;
    }

    .picker-qty-btn {
      width: 24px;
      height: 24px;
      border: 1px solid ${colors.border};
      background: rgba(0, 0, 0, 0.3);
      color: ${colors.textSecondary};
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .picker-qty-btn:hover {
      border-color: ${colors.primary};
      color: ${colors.primary};
      background: rgba(255, 159, 28, 0.1);
    }

    .picker-qty-value {
      font-family: ${fonts.display};
      font-size: 0.9rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      min-width: 28px;
      text-align: center;
    }

    .picker-equip-btn {
      padding: 4px 12px;
      margin-left: 8px;
      border: 1px solid ${colors.primary};
      background: rgba(255, 159, 28, 0.1);
      color: ${colors.primary};
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .picker-equip-btn:hover {
      background: rgba(255, 159, 28, 0.25);
    }
  `;
}
