/**
 * Debrief Styles - Tactical interface design
 *
 * Pilot cards layout: responsive 2-column grid (max-width ~450px per card)
 * Features staggered reveal animations and military aesthetic details
 */

import { colors, fonts } from '../common/theme';

export function getDebriefStyles(): string {
  return `
    /* ========================================
       DEBRIEF SECTION
       ======================================== */

    .debrief-section {
      max-width: 1000px;
      margin: 0 auto;
      animation: fadeSlideIn 0.4s ease-out;
    }

    .debrief-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 14px 18px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${colors.border};
      position: relative;
    }

    /* Corner accents on header */
    .debrief-header::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      width: 12px;
      height: 12px;
      border-top: 1px solid ${colors.secondary};
      border-left: 1px solid ${colors.secondary};
      opacity: 0.6;
    }

    .debrief-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 12px;
      height: 12px;
      border-bottom: 1px solid ${colors.secondary};
      border-right: 1px solid ${colors.secondary};
      opacity: 0.6;
    }

    .debrief-header h2 {
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      margin: 0;
    }

    .mission-time {
      font-family: ${fonts.display};
      font-size: 0.9rem;
      color: ${colors.primary};
      text-shadow: 0 0 6px ${colors.primaryGlow};
    }

    /* ========================================
       PILOT CARDS - 2 COLUMN RESPONSIVE GRID
       ======================================== */

    .pilot-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 16px;
    }

    @media (max-width: 500px) {
      .pilot-cards {
        grid-template-columns: 1fr;
      }
    }

    .pilot-card {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${colors.border};
      padding: 16px;
      position: relative;
      overflow: hidden;
      max-width: 500px;
      animation: cardReveal 0.4s ease-out;
      animation-fill-mode: both;
    }

    /* Staggered animation for cards */
    .pilot-card:nth-child(1) { animation-delay: 0.1s; }
    .pilot-card:nth-child(2) { animation-delay: 0.15s; }
    .pilot-card:nth-child(3) { animation-delay: 0.2s; }
    .pilot-card:nth-child(4) { animation-delay: 0.25s; }
    .pilot-card:nth-child(5) { animation-delay: 0.3s; }
    .pilot-card:nth-child(6) { animation-delay: 0.35s; }

    @keyframes cardReveal {
      from {
        opacity: 0;
        transform: translateY(15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Top accent bar */
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
      background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryDim} 100%);
      box-shadow: 0 0 8px ${colors.primaryGlow};
    }

    .pilot-card.wingman::before {
      background: linear-gradient(90deg, ${colors.secondary} 0%, ${colors.secondaryDim} 100%);
      box-shadow: 0 0 8px ${colors.secondaryGlow};
    }

    .pilot-card.kia::before {
      background: linear-gradient(90deg, ${colors.danger} 0%, ${colors.dangerDim} 100%);
      box-shadow: 0 0 8px ${colors.dangerGlow};
    }

    /* Corner detail */
    .pilot-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, transparent 50%, rgba(255, 255, 255, 0.03) 50%);
    }

    /* ========================================
       PILOT CARD HEADER
       ======================================== */

    .pilot-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .pilot-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .callsign {
      font-family: ${fonts.display};
      font-size: 1.05rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      letter-spacing: 0.08em;
    }

    .pilot-card.player .callsign {
      color: ${colors.primary};
      text-shadow: 0 0 10px ${colors.primaryGlow};
    }

    .archetype {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      color: ${colors.textDim};
      text-transform: capitalize;
      letter-spacing: 0.03em;
    }

    .pilot-status {
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 5px 12px;
      clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
    }

    .pilot-status.survived {
      background: rgba(0, 255, 136, 0.15);
      color: ${colors.success};
      border: 1px solid rgba(0, 255, 136, 0.35);
    }

    .pilot-status.kia {
      background: rgba(255, 51, 102, 0.15);
      color: ${colors.danger};
      border: 1px solid rgba(255, 51, 102, 0.35);
      animation: kiaFlicker 3s ease-in-out infinite;
    }

    @keyframes kiaFlicker {
      0%, 92%, 100% { opacity: 1; }
      93% { opacity: 0.7; }
      94% { opacity: 1; }
      95% { opacity: 0.8; }
    }

    .time-of-death {
      font-size: 0.65rem;
      opacity: 0.8;
      margin-left: 6px;
    }

    /* ========================================
       COMBAT STATS GRID
       ======================================== */

    .pilot-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      padding: 14px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .stat-value {
      font-family: ${fonts.display};
      font-size: 1.25rem;
      font-weight: 600;
      color: ${colors.primary};
      margin-bottom: 3px;
      text-shadow: 0 0 6px ${colors.primaryGlow};
    }

    .stat-value.destroyed {
      color: ${colors.danger};
      text-shadow: 0 0 6px ${colors.dangerGlow};
    }

    .stat-label {
      font-family: ${fonts.ui};
      font-size: 0.6rem;
      font-weight: 500;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ========================================
       WEAPON BREAKDOWN TABLE
       ======================================== */

    .weapon-breakdown {
      margin-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 12px;
    }

    .weapon-breakdown table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.75rem;
    }

    .weapon-breakdown th {
      font-family: ${fonts.ui};
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${colors.textDim};
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid ${colors.border};
    }

    .weapon-breakdown th:last-child {
      text-align: right;
    }

    .weapon-breakdown td {
      font-family: ${fonts.body};
      color: ${colors.textSecondary};
      padding: 8px 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }

    .weapon-breakdown tr:last-child td {
      border-bottom: none;
    }

    .weapon-breakdown tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .weapon-breakdown td.damage {
      text-align: right;
      font-family: ${fonts.display};
      color: ${colors.primary};
      text-shadow: 0 0 4px ${colors.primaryGlow};
    }

    .weapon-breakdown .no-weapons {
      text-align: center;
      color: ${colors.textDim};
      font-style: italic;
      padding: 16px;
    }

    /* ========================================
       WEAPON ROW (legacy class)
       ======================================== */

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
