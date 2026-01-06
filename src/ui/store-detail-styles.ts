/**
 * Store Detail Styles - Item preview and stats styles for the store detail panel
 */

import { colors, fonts } from './theme';

export function getStoreDetailStyles(): string {
  return `
    /* ========================================
       ITEM PREVIEW
       ======================================== */

    .item-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      margin-bottom: 20px;
      background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.4) 0%,
        rgba(0, 0, 0, 0.2) 100%
      );
      border: 1px solid var(--preview-color, ${colors.border});
      position: relative;
    }

    .item-preview::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(
        ellipse at center,
        var(--preview-color, ${colors.border}) 0%,
        transparent 70%
      );
      opacity: 0.08;
      pointer-events: none;
    }

    .item-preview-icon {
      font-size: 3rem;
      color: var(--preview-color, ${colors.textPrimary});
      text-shadow: 0 0 20px var(--preview-color, ${colors.primary});
      margin-bottom: 8px;
      line-height: 1;
    }

    .item-preview-abbrev {
      font-family: ${fonts.display};
      font-size: 1.8rem;
      font-weight: 700;
      color: ${colors.textPrimary};
      letter-spacing: 0.1em;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }

    .item-preview-type {
      font-family: ${fonts.ui};
      font-size: 0.65rem;
      font-weight: 600;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-top: 4px;
    }

    /* ========================================
       ITEM STATS
       ======================================== */

    .item-stats {
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      margin-bottom: 16px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.85rem;
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-row span:first-child {
      color: ${colors.textSecondary};
    }

    .stat-row span:last-child {
      color: ${colors.textPrimary};
      font-family: ${fonts.body};
    }

    .stat-note {
      font-size: 0.75rem;
      color: ${colors.textDim};
      font-style: italic;
      padding: 8px 0 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      margin-top: 8px;
    }

    /* ========================================
       SCRAP CONVERT BUTTON
       ======================================== */

    .detail-actions .btn-convert {
      flex: 0 0 100%;
      padding: 12px 24px;
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-color: ${colors.success};
      color: ${colors.success};
    }

    .btn-convert:hover:not(:disabled) {
      background: rgba(0, 255, 136, 0.1);
      box-shadow: 0 0 15px ${colors.successGlow};
    }

    .btn-convert:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;
}
