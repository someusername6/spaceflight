/**
 * Results Screen Styles - Post-mission screens
 *
 * Layout: Tab bar + scrollable content + fixed footer
 * Max-width: 1200px (same as Roster/Store)
 *
 * Tactical CIC aesthetic with scanlines, corner cuts, and amber/cyan glow
 *
 * This file composes:
 * - Core results layout (this file)
 * - Rewards tab styles (rewards-styles.ts)
 * - Game over styles (game-over-styles.ts)
 */

import { colors, fonts } from '../common/theme';
import { getGameOverStyles } from './game-over-styles';
import { getRewardsStyles } from './rewards-styles';

export function getResultsStyles(): string {
  return `
    /* ========================================
       RESULTS SCREEN - MAIN LAYOUT
       ======================================== */

    .results-screen {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      box-sizing: border-box;
      overflow: hidden;
      background: linear-gradient(
        180deg,
        rgba(5, 8, 15, 0.98) 0%,
        rgba(8, 12, 20, 0.95) 50%,
        rgba(5, 8, 15, 0.98) 100%
      );
    }

    /* Scanline overlay for entire results screen */
    .results-screen::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 245, 255, 0.012) 2px,
        rgba(0, 245, 255, 0.012) 4px
      );
      z-index: 1000;
    }

    /* ========================================
       RESULTS TAB BAR
       ======================================== */

    .results-tab-bar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 56px;
      background: linear-gradient(
        180deg,
        rgba(10, 15, 25, 0.98) 0%,
        rgba(5, 10, 18, 0.95) 100%
      );
      border-bottom: 1px solid ${colors.border};
      box-shadow:
        0 2px 20px rgba(0, 0, 0, 0.5),
        inset 0 -1px 0 rgba(255, 159, 28, 0.1);
      flex-shrink: 0;
      z-index: 100;
    }

    /* Top accent line */
    .results-tab-bar::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        ${colors.primary} 20%,
        ${colors.primary} 80%,
        transparent 100%
      );
      opacity: 0.6;
    }

    /* Scanline effect on tab bar */
    .results-tab-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 245, 255, 0.015) 2px,
        rgba(0, 245, 255, 0.015) 4px
      );
    }

    .results-tabs-group {
      display: flex;
      gap: 4px;
      height: 100%;
    }

    .results-tab {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      height: 100%;
      background: transparent;
      border: none;
      cursor: pointer;
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: ${colors.textDim};
      transition: all 0.2s ease;
    }

    .results-tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 2px;
      background: ${colors.primary};
      transition: width 0.25s ease;
    }

    .results-tab:hover {
      color: ${colors.textSecondary};
      background: rgba(255, 159, 28, 0.05);
    }

    .results-tab:hover::after {
      width: 60%;
    }

    .results-tab.active {
      color: ${colors.primary};
      background: rgba(255, 159, 28, 0.08);
    }

    .results-tab.active::after {
      width: 100%;
      box-shadow: 0 0 10px ${colors.primaryGlow};
    }

    .results-tab-icon {
      font-size: 1rem;
      opacity: 0.7;
      transition: all 0.2s ease;
    }

    .results-tab.active .results-tab-icon {
      opacity: 1;
      text-shadow: 0 0 8px ${colors.primaryGlow};
    }

    .results-tab-label {
      text-transform: uppercase;
    }

    /* ========================================
       RESULTS STATUS (Sector + Credits)
       ======================================== */

    .results-status {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .results-status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
    }

    .results-status-label {
      font-family: ${fonts.ui};
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: ${colors.textDim};
      text-transform: uppercase;
    }

    .results-status-value {
      font-family: ${fonts.display};
      font-size: 1rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      letter-spacing: 0.05em;
    }

    .results-credits {
      color: ${colors.primary};
      text-shadow: 0 0 8px ${colors.primaryGlow};
    }

    /* ========================================
       RESULTS MAIN CONTENT AREA
       ======================================== */

    .results-main {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 0 24px;
    }

    .results-content-scroll {
      height: 100%;
      overflow-y: auto;
      padding: 24px 0;
      scrollbar-width: thin;
      scrollbar-color: ${colors.primary} transparent;
    }

    .results-content-scroll::-webkit-scrollbar {
      width: 6px;
    }

    .results-content-scroll::-webkit-scrollbar-track {
      background: transparent;
    }

    .results-content-scroll::-webkit-scrollbar-thumb {
      background: ${colors.primaryDim};
      border-radius: 0;
    }

    /* ========================================
       RESULTS FOOTER (Fixed Button)
       ======================================== */

    .results-footer {
      flex-shrink: 0;
      padding: 20px 24px 28px;
      display: flex;
      justify-content: center;
      background: linear-gradient(
        0deg,
        rgba(5, 10, 18, 0.99) 0%,
        rgba(5, 10, 18, 0.85) 70%,
        transparent 100%
      );
      border-top: 1px solid rgba(255, 159, 28, 0.1);
    }

    .btn-continue {
      min-width: 220px;
      padding: 16px 40px;
      font-size: 0.9rem;
      font-family: ${fonts.ui};
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      background: linear-gradient(180deg, rgba(255, 159, 28, 0.15) 0%, rgba(255, 159, 28, 0.08) 100%);
      border: 1px solid ${colors.primary};
      color: ${colors.primary};
      cursor: pointer;
      transition: all 0.2s ease;
      clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
      position: relative;
    }

    .btn-continue:hover {
      background: linear-gradient(180deg, rgba(255, 159, 28, 0.25) 0%, rgba(255, 159, 28, 0.15) 100%);
      box-shadow: 0 0 20px ${colors.primaryGlow}, inset 0 0 20px rgba(255, 159, 28, 0.1);
      transform: translateY(-1px);
    }

    .btn-continue:active {
      transform: translateY(0);
    }

    /* ========================================
       RESPONSIVE - CORE LAYOUT
       ======================================== */

    @media (max-width: 700px) {
      .results-tab-bar {
        padding: 0 12px;
      }

      .results-tab {
        padding: 0 14px;
      }

      .results-tab-label {
        display: none;
      }

      .results-tab-icon {
        font-size: 1.2rem;
      }

      .results-status-item {
        padding: 4px 8px;
        clip-path: none;
      }

      .results-main {
        padding: 0 12px;
      }

      .results-footer {
        padding: 16px 12px 20px;
      }

      .btn-continue {
        min-width: 180px;
        padding: 14px 28px;
        clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
      }
    }

    /* Include rewards and game over styles */
    ${getRewardsStyles()}
    ${getGameOverStyles()}
  `;
}
