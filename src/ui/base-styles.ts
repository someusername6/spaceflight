/**
 * Base Styles - Foundation styles for the tactical interface
 *
 * Includes: reset, typography, panel system, credits display
 */

import { colors, fonts, getCSSVariables, getFontImport } from './theme';

export function getBaseStyles(): string {
  return `
    ${getFontImport()}
    ${getCSSVariables()}

    /* ========================================
       BASE & RESET
       ======================================== */

    .game-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${colors.bgDeep};
      color: ${colors.textPrimary};
      font-family: ${fonts.body};
      font-size: 14px;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 40px 40px;
      box-sizing: border-box;
      overflow-y: auto;
      z-index: 100;
    }

    /* Animated background with subtle grid */
    .game-screen::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        linear-gradient(180deg,
          rgba(255, 159, 28, 0.03) 0%,
          transparent 30%,
          transparent 70%,
          rgba(0, 245, 255, 0.02) 100%),
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          ${colors.scanline} 2px,
          ${colors.scanline} 4px
        );
      pointer-events: none;
      z-index: -1;
    }

    /* Vignette overlay */
    .game-screen::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(
        ellipse at center,
        transparent 0%,
        transparent 60%,
        rgba(0, 0, 0, 0.4) 100%
      );
      pointer-events: none;
      z-index: 1000;
    }

    /* ========================================
       TYPOGRAPHY
       ======================================== */

    .game-screen h1 {
      font-family: ${fonts.display};
      font-size: 2.5rem;
      font-weight: 700;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin: 0 0 0.5rem 0;
      text-shadow: 0 0 30px ${colors.primaryGlow};
    }

    .game-screen h2 {
      font-family: ${fonts.ui};
      font-size: 1.1rem;
      font-weight: 500;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin: 0 0 1.5rem 0;
    }

    .game-screen h3 {
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 600;
      color: ${colors.secondary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0 0 0.75rem 0;
    }

    /* ========================================
       PANEL SYSTEM
       ======================================== */

    .screen-panel {
      background: ${colors.bgPanel};
      border: 1px solid ${colors.border};
      position: relative;
      padding: 20px;
      margin: 10px 0;
      max-width: 900px;
      width: 100%;
    }

    /* Corner brackets */
    .screen-panel::before,
    .screen-panel::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-color: ${colors.primary};
      border-style: solid;
    }

    .screen-panel::before {
      top: -1px;
      left: -1px;
      border-width: 2px 0 0 2px;
    }

    .screen-panel::after {
      bottom: -1px;
      right: -1px;
      border-width: 0 2px 2px 0;
    }

    .screen-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid ${colors.border};
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${colors.textSecondary};
    }

    .screen-panel-header span:first-child {
      color: ${colors.primary};
      font-weight: 600;
    }

    /* ========================================
       CREDITS DISPLAY
       ======================================== */

    .credits-display {
      position: fixed;
      top: 20px;
      right: 30px;
      font-family: ${fonts.display};
      font-size: 1.4rem;
      font-weight: 600;
      color: ${colors.success};
      z-index: 1001;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .credits-display::before {
      content: '◈';
      font-size: 1rem;
      opacity: 0.8;
    }

    .credits-display::after {
      content: 'CR';
      font-family: ${fonts.ui};
      font-size: 0.7rem;
      color: ${colors.textDim};
      letter-spacing: 0.1em;
    }

    /* ========================================
       EMPTY STATE PANEL
       Consistent appearance for all empty/unselected states
       ======================================== */

    .empty-state-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 200px;
      background: ${colors.bgPanel};
      border: 1px dashed ${colors.border};
      color: ${colors.textDim};
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-style: italic;
      text-align: center;
      padding: 24px;
    }
  `;
}
