/**
 * Debrief Styles - Tactical interface design
 */

import { colors, fonts } from '../common/theme';

export function getDebriefStyles(): string {
  return `
    /* ========================================
       DEBRIEF HEADER
       ======================================== */

    .debrief-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    /* ========================================
       PILOT CARDS
       ======================================== */

    .pilot-card {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${colors.border};
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .pilot-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: ${colors.borderLight};
    }

    .pilot-card.player::before {
      background: ${colors.primary};
    }

    .pilot-card.wingman::before {
      background: ${colors.secondary};
    }

    .pilot-card.kia::before {
      background: ${colors.danger};
    }

    .pilot-status {
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 3px 10px;
    }

    .pilot-status.survived {
      background: rgba(0, 255, 136, 0.15);
      color: ${colors.success};
    }

    .pilot-status.kia {
      background: rgba(255, 51, 102, 0.15);
      color: ${colors.danger};
    }

    /* ========================================
       COMBAT STATS
       ======================================== */

    .pilot-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }

    .stat-value {
      font-family: ${fonts.display};
      font-size: 1.3rem;
      font-weight: 600;
      color: ${colors.primary};
      margin-bottom: 2px;
    }

    .stat-label {
      font-family: ${fonts.ui};
      font-size: 0.65rem;
      font-weight: 500;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ========================================
       WEAPON BREAKDOWN
       ======================================== */

    .weapon-breakdown {
      margin-top: 12px;
    }

    .weapon-row {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      font-size: 0.8rem;
    }

    .weapon-row:last-child {
      border-bottom: none;
    }
  `;
}
