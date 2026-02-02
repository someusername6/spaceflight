/**
 * Quit Confirm Modal - Confirmation dialog for guest leaving mission.
 *
 * Shown when a guest player clicks quit during a multiplayer mission pause.
 * Warns that their ship will be controlled by AI.
 */

import { showConfirm } from './confirm-modal';

/** Result from quit confirmation */
export interface QuitConfirmResult {
  confirmed: boolean;
}

/**
 * Show the quit confirmation modal.
 *
 * @returns Promise resolving to { confirmed: true } if user confirms quit
 */
export async function showQuitConfirmModal(): Promise<QuitConfirmResult> {
  const confirmed = await showConfirm(
    'Leave Mission?',
    'Your ship will be controlled by AI for the rest of the mission. This cannot be undone.',
    {
      confirmText: 'Leave Mission',
      cancelText: 'Cancel',
      danger: true,
    },
  );

  return { confirmed };
}
