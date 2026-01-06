/**
 * Roster Styles - Two-column layout for pilot management
 */

import { colors, fonts } from './theme';

export function getRosterStyles(): string {
  return `
    /* ========================================
       ROSTER SCREEN - VIEWPORT LAYOUT
       ======================================== */

    .roster-screen {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 56px);
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* ========================================
       ROSTER LAYOUT - TWO COLUMNS
       ======================================== */

    .roster-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 20px;
      width: 100%;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .roster-list {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .roster-pilots {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      min-height: 0;
      border: 1px solid ${colors.border};
      border-top: none;
    }

    .roster-viewer {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;
    }

    @media (max-width: 800px) {
      .roster-layout {
        grid-template-columns: 1fr;
      }
    }

    /* ========================================
       ROSTER PILOT CARDS
       ======================================== */

    .roster-pilot-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: ${colors.bgPanel};
      border-bottom: 1px solid ${colors.border};
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .roster-pilot-card:last-child {
      border-bottom: none;
    }

    .roster-pilot-card:hover {
      background: rgba(0, 245, 255, 0.05);
    }

    .roster-pilot-card.selected {
      background: rgba(0, 245, 255, 0.1);
      border-left: 2px solid ${colors.secondary};
    }

    .roster-pilot-card.commander-pilot {
      border-left: 2px solid ${colors.primary};
    }

    .roster-pilot-card.commander-pilot.selected {
      border-left: 2px solid ${colors.primary};
      background: rgba(255, 159, 28, 0.1);
    }

    .roster-pilot-card.unassigned {
      opacity: 0.7;
    }

    .roster-pilot-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .roster-pilot-name {
      font-size: 0.85rem;
      color: ${colors.textPrimary};
    }

    .roster-pilot-status {
      font-size: 0.7rem;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .roster-pilot-card.assigned .roster-pilot-status {
      color: ${colors.success};
    }

    .roster-pilot-ship {
      font-family: ${fonts.display};
      font-size: 0.8rem;
      color: ${colors.textSecondary};
      text-transform: capitalize;
    }

    .roster-pilot-card.assigned .roster-pilot-ship {
      color: ${colors.secondary};
    }

    /* ========================================
       PILOT VIEWER (matches ship viewer style)
       ======================================== */

    .pilot-viewer {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .pilot-viewer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 245, 255, 0.015) 2px,
          rgba(0, 245, 255, 0.015) 4px
        );
      pointer-events: none;
    }

    .pilot-viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px;
      background: linear-gradient(180deg,
        rgba(0, 245, 255, 0.08) 0%,
        transparent 100%
      );
      border-bottom: 1px solid ${colors.border};
      flex-shrink: 0;
    }

    .pilot-header-top {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .pilot-header-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pilot-header-right {
      display: flex;
      align-items: flex-start;
    }

    .pilot-viewer-name {
      font-family: ${fonts.display};
      font-size: 1.1rem;
      font-weight: 700;
      color: ${colors.primary};
      letter-spacing: 0.15em;
      text-shadow: 0 0 20px ${colors.primaryGlow};
    }

    .pilot-rank {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      font-weight: 500;
      color: ${colors.textSecondary};
      letter-spacing: 0.05em;
    }

    .pilot-viewer-stats {
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      margin: 0 12px 12px;
    }

    .pilot-viewer-stats .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.85rem;
    }

    .pilot-viewer-stats .stat-row:last-child {
      border-bottom: none;
    }

    .pilot-viewer-stats .stat-label {
      color: ${colors.textSecondary};
      font-family: ${fonts.body};
      font-size: inherit;
      text-transform: none;
    }

    .pilot-viewer-stats .stat-value {
      color: ${colors.textPrimary};
      font-family: ${fonts.body};
      font-size: inherit;
    }

    /* ========================================
       PILOT ASSIGNMENT SECTION
       ======================================== */

    .pilot-assignment {
      padding: 10px 12px;
      border-top: 1px solid ${colors.border};
      background: rgba(0, 0, 0, 0.15);
    }

    .assignment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .assignment-label {
      font-size: 0.75rem;
      color: ${colors.textDim};
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .pilot-assignment > .assignment-label {
      margin-bottom: 10px;
    }

    .assignment-ship {
      font-family: ${fonts.display};
      font-size: 0.9rem;
      color: ${colors.textPrimary};
      text-transform: capitalize;
    }

    .assignment-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .btn-assign-pilot {
      padding: 8px 14px;
      font-size: 0.8rem;
      text-transform: capitalize;
    }

    /* ========================================
       HULL CARD BUTTONS (Deploy with hull)
       ======================================== */

    .hull-options {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .hull-card-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 90px;
    }

    .hull-card-btn:hover {
      border-color: ${colors.secondary};
      background: rgba(0, 245, 255, 0.08);
    }

    .hull-card-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${colors.border};
    }

    .hull-abbrev {
      font-family: ${fonts.display};
      font-size: 1rem;
      color: ${colors.secondary};
      letter-spacing: 0.05em;
    }

    .hull-card-name {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      color: ${colors.textPrimary};
      text-transform: capitalize;
      text-align: center;
    }

    .hull-card-health {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
    }

    .hull-card-health .hull-bar {
      flex: 1;
      height: 4px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${colors.border};
    }

    .hull-card-health .hull-fill {
      height: 100%;
      background: ${colors.success};
      transition: width 0.3s ease;
    }

    .hull-card-health.damaged .hull-fill {
      background: ${colors.warning};
    }

    .hull-card-health .hull-text {
      font-family: ${fonts.display};
      font-size: 0.65rem;
      color: ${colors.textSecondary};
      min-width: 28px;
      text-align: right;
    }

    .hull-card-health.damaged .hull-text {
      color: ${colors.warning};
    }
  `;
}
