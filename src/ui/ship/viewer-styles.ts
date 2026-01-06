/**
 * Ship Viewer Styles - Schematic Blueprint Aesthetic
 */
import { colors, fonts } from '../common/theme';

export function getViewerStyles(): string {
  return `
    /* ========================================
       SHIP VIEWER - SCHEMATIC LAYOUT
       ======================================== */

    .ship-viewer.schematic {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .ship-viewer.schematic::before {
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

    /* ========================================
       SCHEMATIC HEADER
       ======================================== */

    .schematic-header {
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

    .schematic-header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .schematic-header-right {
      display: flex;
      align-items: flex-start;
    }

    .schematic-class {
      font-family: ${fonts.display};
      font-size: 1.1rem;
      font-weight: 700;
      color: ${colors.primary};
      letter-spacing: 0.15em;
      text-shadow: 0 0 20px ${colors.primaryGlow};
    }

    .schematic-pilot {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      font-weight: 500;
      color: ${colors.textSecondary};
      letter-spacing: 0.05em;
    }

    /* ========================================
       SCHEMATIC DIAGRAM - VERTICAL LAYOUT
       ======================================== */

    .schematic-diagram.vertical {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 16px;
      flex: 1;
      min-height: 0;
      position: relative;
    }

    /* ========================================
       HARDPOINT ROWS (TOP/BOTTOM)
       ======================================== */

    .hardpoint-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      position: relative;
    }

    .hardpoint-row.primary-row {
      margin-bottom: 8px;
    }

    .hardpoint-row.secondary-row {
      margin-top: 16px;
    }

    .row-label {
      font-family: ${fonts.ui};
      font-size: 0.55rem;
      font-weight: 600;
      color: ${colors.textDim};
      letter-spacing: 0.15em;
      margin: 4px 0;
    }

    .row-slots {
      position: relative;
      width: 100%;
      height: 56px;
    }

    /* ========================================
       SCHEMATIC SLOTS WITH CONNECTORS
       ======================================== */

    .schematic-slot {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px 6px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${colors.border};
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 44px;
      height: 58px;
      box-sizing: border-box;
      transform: translateX(-50%);
      left: var(--slot-x);
    }

    .schematic-slot:hover {
      border-color: ${colors.borderLight};
      background: rgba(255, 159, 28, 0.1);
      z-index: 10;
    }

    .schematic-slot.filled {
      border-color: var(--slot-color, ${colors.borderLight});
      background: linear-gradient(180deg,
        rgba(0, 0, 0, 0.3) 0%,
        rgba(255, 159, 28, 0.08) 100%
      );
    }

    .schematic-slot.filled:hover {
      background: rgba(255, 51, 102, 0.15);
      border-color: ${colors.danger};
    }

    /* Connector lines - vertical with diagonal */
    .slot-connector {
      position: absolute;
      width: 2px;
      height: 12px;
      background: ${colors.border};
      left: 50%;
      transform: translateX(-50%);
    }

    .primary-row .slot-connector {
      bottom: -12px;
      background: linear-gradient(180deg, ${colors.border}, ${colors.secondary});
    }

    .secondary-row .slot-connector {
      top: -12px;
      background: linear-gradient(180deg, ${colors.secondary}, ${colors.border});
    }

    .schematic-slot.filled .slot-connector {
      background: var(--slot-color, ${colors.borderLight});
      box-shadow: 0 0 4px var(--slot-color, ${colors.secondaryGlow});
    }

    /* Slot content */
    .slot-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .slot-empty-icon {
      font-size: 0.8rem;
      color: ${colors.textDim};
    }

    .slot-abbrev {
      font-family: ${fonts.display};
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--slot-color, ${colors.textPrimary});
      letter-spacing: 0.05em;
    }

    .slot-size {
      font-family: ${fonts.body};
      font-size: 0.55rem;
      color: ${colors.textDim};
    }

    .slot-capacity {
      font-family: ${fonts.body};
      font-size: 0.55rem;
      color: ${colors.textSecondary};
      padding: 1px 3px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 2px;
    }

    /* ========================================
       SCHEMATIC CENTER (SHIP ICON)
       ======================================== */

    .schematic-center {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 12px 0;
      flex: 1;
      min-height: 100px;
    }

    .ship-icon-large {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 200px;
      max-height: 200px;
      aspect-ratio: 1;
    }

    .ship-icon-frame {
      width: 100%;
      height: 100%;
      border: 2px solid ${colors.borderLight};
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      container-type: size;
      clip-path: polygon(
        0 8px, 8px 0,
        calc(100% - 8px) 0, 100% 8px,
        100% calc(100% - 8px), calc(100% - 8px) 100%,
        8px 100%, 0 calc(100% - 8px)
      );
    }

    .ship-icon-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      z-index: 1;
    }

    .ship-abbrev {
      font-family: ${fonts.display};
      font-size: clamp(1.5rem, 15cqw, 2.5rem);
      font-weight: 700;
      color: ${colors.secondary};
      letter-spacing: 0.15em;
      text-shadow: 0 0 20px ${colors.secondaryGlow};
    }

    .ship-silhouette {
      width: clamp(50px, 40cqw, 100px);
      aspect-ratio: 2 / 1;
      background: ${colors.secondary};
      opacity: 0.3;
      clip-path: polygon(50% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%);
    }

    .ship-silhouette.bomber {
      clip-path: polygon(50% 0%, 100% 30%, 90% 100%, 10% 100%, 0% 30%);
    }

    .ship-silhouette.heavy {
      clip-path: polygon(50% 0%, 95% 40%, 85% 100%, 15% 100%, 5% 40%);
    }

    .ship-silhouette.interceptor {
      clip-path: polygon(50% 0%, 100% 70%, 70% 100%, 30% 100%, 0% 70%);
    }

    .ship-icon-scanline {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg,
        transparent,
        ${colors.secondary},
        transparent
      );
      opacity: 0.5;
      animation: scanline 3s linear infinite;
    }

    @keyframes scanline {
      0% { top: 0; }
      100% { top: 100%; }
    }

    .ship-icon-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 130%;
      height: 130%;
      transform: translate(-50%, -50%);
      background: radial-gradient(
        ellipse at center,
        ${colors.secondaryGlow} 0%,
        transparent 60%
      );
      opacity: 0.3;
      pointer-events: none;
    }

  `;
}
