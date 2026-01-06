/**
 * Hangar Styles - Ship management layout
 */

import { colors, fonts } from './theme';

export function getHangarStyles(): string {
  return `
    /* ========================================
       HANGAR SCREEN - VIEWPORT LAYOUT
       ======================================== */

    .hangar-screen {
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
       HANGAR LAYOUT
       ======================================== */

    .hangar-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr) 280px;
      gap: 20px;
      width: 100%;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .hangar-viewer {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }

    .hangar-viewer-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed ${colors.border};
      color: ${colors.textDim};
      font-family: ${fonts.ui};
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .hangar-ships {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      min-height: 0;
    }

    @media (max-width: 1000px) {
      .hangar-layout {
        grid-template-columns: 1fr;
      }

      .hangar-viewer-placeholder {
        display: none;
      }
    }

    /* ========================================
       PANEL HEADER
       ======================================== */

    .panel-header {
      font-family: ${fonts.ui};
      font-size: 0.8rem;
      font-weight: 600;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 10px 14px;
      background: rgba(255, 159, 28, 0.08);
      border: 1px solid ${colors.border};
      border-bottom: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-icon {
      font-size: 0.7rem;
      margin-right: 6px;
    }

    .panel-count {
      margin-left: auto;
      color: ${colors.textDim};
      font-weight: 400;
    }

    /* ========================================
       CLOSE VIEWER BUTTON (in header)
       ======================================== */

    .btn-close-viewer {
      width: 24px;
      height: 24px;
      border: 1px solid ${colors.border};
      background: transparent;
      color: ${colors.textDim};
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-close-viewer:hover {
      border-color: ${colors.danger};
      color: ${colors.danger};
      background: rgba(255, 51, 102, 0.1);
    }

    /* ========================================
       NO COMMANDER WARNING
       ======================================== */

    .no-commander-warning {
      font-size: 0.8rem;
      color: ${colors.warning};
      text-align: center;
      padding: 8px;
      margin-bottom: 8px;
      background: rgba(255, 159, 28, 0.1);
      border: 1px solid rgba(255, 159, 28, 0.3);
    }

    /* ========================================
       SHIP DETAILS PANEL (Right Column)
       ======================================== */

    .hangar-details {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;
    }

    .hangar-details-placeholder {
      /* Empty placeholder to maintain grid layout */
    }

    .ship-details {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      display: flex;
      flex-direction: column;
    }

    .ship-details-header {
      font-family: ${fonts.ui};
      font-size: 0.8rem;
      font-weight: 600;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 10px 14px;
      background: rgba(255, 159, 28, 0.08);
      border-bottom: 1px solid ${colors.border};
      display: flex;
      align-items: center;
    }

    .ship-details-stats {
      background: rgba(0, 0, 0, 0.2);
      padding: 12px;
      margin: 0 12px 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.85rem;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: ${colors.textSecondary};
      font-family: ${fonts.body};
    }

    .detail-value {
      color: ${colors.textPrimary};
      font-family: ${fonts.body};
    }

    .detail-value.damaged {
      color: ${colors.warning};
    }

    .detail-divider {
      height: 1px;
      background: ${colors.border};
      margin: 8px 0;
    }
  `;
}
