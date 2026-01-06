/**
 * Rewards Tab Styles - Victory/Defeat title and reward sections
 */

import { colors, fonts } from '../common/theme';

export function getRewardsStyles(): string {
  return `
    /* ========================================
       REWARDS TAB CONTENT
       ======================================== */

    .rewards-content {
      max-width: 800px;
      margin: 0 auto;
      animation: fadeSlideIn 0.4s ease-out;
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Victory / Defeat Title */
    .rewards-title {
      font-family: ${fonts.display};
      font-size: 3.5rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      text-align: center;
      margin-bottom: 32px;
      position: relative;
      padding: 20px 0;
    }

    .rewards-title::before,
    .rewards-title::after {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      height: 1px;
      width: 200px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        currentColor 50%,
        transparent 100%
      );
      opacity: 0.5;
    }

    .rewards-title::before {
      top: 0;
    }

    .rewards-title::after {
      bottom: 0;
    }

    .rewards-title.victory {
      color: ${colors.success};
      text-shadow:
        0 0 30px ${colors.successGlow},
        0 0 60px ${colors.successGlow},
        0 0 90px rgba(0, 255, 136, 0.2);
      animation: victoryPulse 2s ease-in-out infinite, fadeSlideIn 0.4s ease-out;
    }

    .rewards-title.defeat {
      color: ${colors.danger};
      text-shadow:
        0 0 30px ${colors.dangerGlow},
        0 0 60px ${colors.dangerGlow};
      animation: defeatGlitch 4s ease-in-out infinite, fadeSlideIn 0.4s ease-out;
    }

    @keyframes victoryPulse {
      0%, 100% {
        opacity: 1;
        text-shadow:
          0 0 30px ${colors.successGlow},
          0 0 60px ${colors.successGlow},
          0 0 90px rgba(0, 255, 136, 0.2);
      }
      50% {
        opacity: 0.9;
        text-shadow:
          0 0 40px ${colors.successGlow},
          0 0 80px ${colors.successGlow},
          0 0 120px rgba(0, 255, 136, 0.3);
      }
    }

    @keyframes defeatGlitch {
      0%, 94%, 100% {
        opacity: 1;
        transform: translateX(0);
      }
      95% {
        opacity: 0.8;
        transform: translateX(-2px);
      }
      96% {
        opacity: 0.9;
        transform: translateX(2px);
      }
      97% {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* ========================================
       REWARDS SECTIONS (Contract + Salvage)
       ======================================== */

    .rewards-contract,
    .rewards-salvage {
      margin-bottom: 24px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${colors.border};
      position: relative;
      animation: fadeSlideIn 0.4s ease-out;
      animation-fill-mode: both;
    }

    .rewards-contract {
      animation-delay: 0.1s;
    }

    .rewards-salvage {
      animation-delay: 0.2s;
    }

    /* Corner cut effect */
    .rewards-contract::before,
    .rewards-salvage::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      width: 16px;
      height: 16px;
      border-top: 1px solid ${colors.primary};
      border-left: 1px solid ${colors.primary};
      opacity: 0.6;
    }

    .rewards-contract::after,
    .rewards-salvage::after {
      content: '';
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 16px;
      height: 16px;
      border-bottom: 1px solid ${colors.primary};
      border-right: 1px solid ${colors.primary};
      opacity: 0.6;
    }

    .rewards-section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: linear-gradient(90deg, rgba(255, 159, 28, 0.08) 0%, transparent 100%);
      border-bottom: 1px solid ${colors.border};
    }

    .rewards-section-icon {
      font-size: 0.9rem;
      color: ${colors.primary};
      text-shadow: 0 0 6px ${colors.primaryGlow};
    }

    .rewards-section-title {
      font-family: ${fonts.ui};
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      flex: 1;
    }

    .rewards-section-value {
      font-family: ${fonts.display};
      font-size: 0.85rem;
      color: ${colors.success};
      text-shadow: 0 0 6px ${colors.successGlow};
    }

    /* Contract reward details */
    .rewards-contract-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 20px;
    }

    .rewards-contract-name {
      font-family: ${fonts.ui};
      font-size: 1rem;
      font-weight: 500;
      color: ${colors.textPrimary};
    }

    .rewards-contract-amount {
      font-family: ${fonts.display};
      font-size: 1.3rem;
      font-weight: 600;
    }

    .rewards-contract-amount.earned {
      color: ${colors.success};
      text-shadow: 0 0 10px ${colors.successGlow};
    }

    .rewards-contract-amount.failed {
      color: ${colors.danger};
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    /* Salvage items within rewards */
    .rewards-salvage .salvage-items {
      padding: 18px 20px;
    }

    /* ========================================
       RESPONSIVE - REWARDS
       ======================================== */

    @media (max-width: 700px) {
      .rewards-title {
        font-size: 2.2rem;
        letter-spacing: 0.2em;
      }
    }
  `;
}
