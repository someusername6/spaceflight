/**
 * Viewer Actions Styles - Ship action buttons in viewer
 */

import { colors, fonts } from '../common/theme';

export function getViewerActionsStyles(): string {
  return `
    /* ========================================
       VIEWER ACTIONS
       ======================================== */

    .viewer-actions {
      padding: 10px 12px;
      border-top: 1px solid ${colors.border};
      background: rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .viewer-actions-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .actions-label {
      font-family: ${fonts.ui};
      font-size: 0.65rem;
      font-weight: 600;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .btn-danger {
      border-color: ${colors.danger};
      color: ${colors.danger};
    }

    .btn-danger:hover {
      background: rgba(255, 51, 102, 0.15);
      box-shadow: 0 0 10px ${colors.dangerGlow};
    }
  `;
}
