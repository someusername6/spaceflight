/**
 * Button Styles - All button variants for the tactical interface
 */

import { colors, fonts } from './theme';

export function getButtonStyles(): string {
  return `
    /* ========================================
       BUTTONS
       ======================================== */

    .btn {
      font-family: ${fonts.ui};
      font-size: 0.85rem;
      font-weight: 600;
      padding: 12px 24px;
      background: transparent;
      border: 1px solid ${colors.borderLight};
      color: ${colors.textPrimary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
      clip-path: polygon(
        0 0,
        calc(100% - 8px) 0,
        100% 8px,
        100% 100%,
        8px 100%,
        0 calc(100% - 8px)
      );
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.05) 0%,
        transparent 50%
      );
      pointer-events: none;
    }

    .btn:hover:not(:disabled) {
      background: ${colors.bgPanelHover};
      border-color: ${colors.primary};
      color: ${colors.primary};
      box-shadow: 0 0 20px ${colors.primaryGlow};
    }

    .btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(
        180deg,
        rgba(255, 159, 28, 0.2) 0%,
        rgba(255, 159, 28, 0.1) 100%
      );
      border-color: ${colors.primary};
      color: ${colors.primary};
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(
        180deg,
        rgba(255, 159, 28, 0.3) 0%,
        rgba(255, 159, 28, 0.15) 100%
      );
      box-shadow: 0 0 30px ${colors.primaryGlow};
    }

    .btn-danger {
      border-color: ${colors.danger};
      color: ${colors.danger};
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(255, 51, 102, 0.1);
      box-shadow: 0 0 20px ${colors.dangerGlow};
    }

    .btn-small {
      padding: 6px 14px;
      font-size: 0.75rem;
      clip-path: polygon(
        0 0,
        calc(100% - 5px) 0,
        100% 5px,
        100% 100%,
        5px 100%,
        0 calc(100% - 5px)
      );
    }

    .btn-back {
      position: fixed;
      top: 20px;
      left: 30px;
      z-index: 1001;
      padding: 10px 20px;
    }
  `;
}
