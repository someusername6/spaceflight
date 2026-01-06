/**
 * Results & Game Over Styles - Post-mission screens
 */

import { colors, fonts } from './theme';

export function getResultsStyles(): string {
  return `
    /* ========================================
       RESULTS SCREEN
       ======================================== */

    .result-title {
      font-family: ${fonts.display};
      font-size: 4rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      margin-bottom: 0.5rem;
    }

    .result-title.victory {
      color: ${colors.success};
      text-shadow:
        0 0 40px ${colors.successGlow},
        0 0 80px ${colors.successGlow};
      animation: victoryPulse 2s ease-in-out infinite;
    }

    .result-title.defeat {
      color: ${colors.danger};
      text-shadow:
        0 0 40px ${colors.dangerGlow},
        0 0 80px ${colors.dangerGlow};
    }

    @keyframes victoryPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .results-panel {
      max-height: 70vh;
      overflow-y: auto;
    }

    .result-stats {
      font-family: ${fonts.body};
      font-size: 0.9rem;
      margin: 20px 0;
      padding: 16px;
      background: rgba(0, 0, 0, 0.3);
      border-left: 2px solid ${colors.primary};
    }

    .result-stats div {
      margin: 6px 0;
      display: flex;
      justify-content: space-between;
    }

    .credits-breakdown {
      color: ${colors.success};
      font-weight: 500;
    }

    /* Results tabs */
    .results-tabs {
      display: flex;
      gap: 4px;
      margin: 16px 0;
    }

    .tab-btn {
      font-family: ${fonts.ui};
      font-size: 0.8rem;
      font-weight: 600;
      padding: 10px 24px;
      background: transparent;
      border: 1px solid ${colors.border};
      color: ${colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      background: ${colors.bgPanelHover};
      color: ${colors.textPrimary};
    }

    .tab-btn.active {
      background: ${colors.bgPanelActive};
      border-color: ${colors.primary};
      color: ${colors.primary};
    }

    .results-tab-content {
      min-height: 200px;
    }

    /* ========================================
       GAME OVER
       ======================================== */

    .game-over-title {
      font-family: ${fonts.display};
      font-size: 5rem;
      font-weight: 700;
      color: ${colors.danger};
      text-transform: uppercase;
      letter-spacing: 0.2em;
      text-shadow:
        0 0 50px ${colors.dangerGlow},
        0 0 100px ${colors.dangerGlow};
      animation: gameOverFlicker 0.1s ease-in-out infinite;
    }

    @keyframes gameOverFlicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.95; }
    }

    .game-over-stats {
      font-family: ${fonts.body};
      font-size: 1rem;
      color: ${colors.textSecondary};
      margin: 30px 0;
      text-align: center;
    }

    .game-over-stats div {
      margin: 10px 0;
    }
  `;
}
