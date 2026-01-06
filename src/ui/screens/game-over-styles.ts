/**
 * Game Over Screen Styles - Campaign end state
 */

import { colors, fonts } from '../common/theme';

export function getGameOverStyles(): string {
  return `
    /* ========================================
       GAME OVER SCREEN
       ======================================== */

    .game-over-screen {
      justify-content: center;
      align-items: center;
    }

    .game-over-content {
      text-align: center;
      max-width: 500px;
      padding: 40px;
      animation: fadeSlideIn 0.5s ease-out;
    }

    .game-over-title {
      font-family: ${fonts.display};
      font-size: 4rem;
      font-weight: 700;
      color: ${colors.danger};
      text-transform: uppercase;
      letter-spacing: 0.25em;
      text-shadow:
        0 0 50px ${colors.dangerGlow},
        0 0 100px ${colors.dangerGlow};
      animation: gameOverFlicker 0.15s ease-in-out infinite;
      margin-bottom: 40px;
    }

    @keyframes gameOverFlicker {
      0%, 100% {
        opacity: 1;
        transform: translateX(0);
      }
      25% {
        opacity: 0.97;
        transform: translateX(-1px);
      }
      75% {
        opacity: 0.98;
        transform: translateX(1px);
      }
    }

    .game-over-stats {
      margin-bottom: 40px;
    }

    .game-over-message {
      font-family: ${fonts.ui};
      font-size: 1rem;
      color: ${colors.textSecondary};
      margin-bottom: 28px;
      letter-spacing: 0.05em;
    }

    .game-over-stat {
      display: flex;
      justify-content: space-between;
      padding: 14px 18px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${colors.border};
      margin-bottom: 8px;
      animation: fadeSlideIn 0.4s ease-out;
      animation-fill-mode: both;
    }

    .game-over-stat:nth-child(2) { animation-delay: 0.1s; }
    .game-over-stat:nth-child(3) { animation-delay: 0.15s; }
    .game-over-stat:nth-child(4) { animation-delay: 0.2s; }

    .game-over-stat .stat-label {
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      color: ${colors.textSecondary};
      letter-spacing: 0.05em;
    }

    .game-over-stat .stat-value {
      font-family: ${fonts.display};
      font-size: 1rem;
      color: ${colors.textPrimary};
    }

    .btn-restart {
      min-width: 240px;
      padding: 16px 40px;
      font-family: ${fonts.ui};
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      background: linear-gradient(180deg, rgba(255, 51, 102, 0.15) 0%, rgba(255, 51, 102, 0.08) 100%);
      border: 1px solid ${colors.danger};
      color: ${colors.danger};
      cursor: pointer;
      transition: all 0.2s ease;
      clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
      animation: fadeSlideIn 0.4s ease-out 0.3s;
      animation-fill-mode: both;
    }

    .btn-restart:hover {
      background: linear-gradient(180deg, rgba(255, 51, 102, 0.25) 0%, rgba(255, 51, 102, 0.15) 100%);
      box-shadow: 0 0 20px ${colors.dangerGlow}, inset 0 0 20px rgba(255, 51, 102, 0.1);
      transform: translateY(-1px);
    }

    /* ========================================
       RESPONSIVE - GAME OVER
       ======================================== */

    @media (max-width: 700px) {
      .game-over-title {
        font-size: 2.5rem;
        letter-spacing: 0.15em;
      }

      .btn-restart {
        min-width: 180px;
        padding: 14px 28px;
        clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
      }
    }
  `;
}
