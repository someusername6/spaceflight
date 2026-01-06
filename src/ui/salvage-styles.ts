/**
 * Salvage Styles - Results screen salvage display
 */

import { colors, fonts } from './theme';

export function getSalvageStyles(): string {
  return `
    /* ========================================
       SALVAGE SECTION (Results Screen)
       ======================================== */

    .salvage-section {
      padding: 0;
    }

    .salvage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: rgba(0, 245, 255, 0.05);
      border: 1px solid ${colors.secondary};
      margin-bottom: 16px;
    }

    .salvage-header h2 {
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 600;
      color: ${colors.secondary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0;
    }

    .salvage-value {
      font-family: ${fonts.display};
      font-size: 1rem;
      font-weight: 600;
      color: ${colors.success};
    }

    .salvage-value::before {
      content: '≈ ◈ ';
      font-size: 0.8em;
      opacity: 0.8;
    }

    /* ========================================
       SALVAGE CATEGORIES
       ======================================== */

    .salvage-items {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .salvage-category {
      background: rgba(0, 0, 0, 0.2);
      padding: 14px;
      border-left: 3px solid ${colors.border};
    }

    .salvage-category h3 {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid ${colors.border};
      color: ${colors.textSecondary};
    }

    /* ========================================
       SALVAGE ITEMS
       ======================================== */

    .salvage-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.2);
      margin-bottom: 6px;
      transition: background 0.15s ease;
    }

    .salvage-item:last-child {
      margin-bottom: 0;
    }

    .salvage-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .salvage-item .item-name {
      flex: 1;
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 500;
      color: ${colors.textPrimary};
      text-transform: capitalize;
    }

    .salvage-item .item-category {
      font-size: 0.75rem;
      color: ${colors.textDim};
      margin-left: 8px;
      padding: 2px 8px;
      background: rgba(0, 0, 0, 0.3);
    }

    .salvage-item .item-count {
      font-family: ${fonts.display};
      font-size: 0.9rem;
      font-weight: 500;
      color: ${colors.secondary};
      min-width: 50px;
      text-align: right;
    }

    .salvage-empty {
      text-align: center;
      padding: 40px 20px;
      color: ${colors.textDim};
      font-style: italic;
      background: rgba(0, 0, 0, 0.2);
      border: 1px dashed ${colors.border};
    }
  `;
}
