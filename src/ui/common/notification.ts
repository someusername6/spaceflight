/**
 * Notification Toast - Simple notification system matching popover style.
 *
 * Shows temporary messages that auto-dismiss after a duration.
 */

import { escapeHtml } from '../utils';

/** Notification types */
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

/** Notification options */
export interface NotificationOptions {
  type?: NotificationType;
  duration?: number; // ms, default 3000
}

/** Icons for each notification type */
const ICONS: Record<NotificationType, string> = {
  success: '✓',
  warning: '!',
  error: '✕',
  info: '●',
};

/** Container element (created on first use) */
let container: HTMLElement | null = null;

/** Get or create the notification container */
function getContainer(): HTMLElement {
  if (container && document.body.contains(container)) {
    return container;
  }

  container = document.createElement('div');
  container.className = 'notification-container';
  container.setAttribute('role', 'alert');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

/** Show a notification toast */
export function showNotification(
  message: string,
  options: NotificationOptions = {},
): void {
  const { type = 'info', duration = 3000 } = options;

  const containerEl = getContainer();

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;

  notification.innerHTML = `
    <span class="notification-icon" aria-hidden="true">${ICONS[type]}</span>
    <span class="notification-message">${escapeHtml(message)}</span>
  `;

  containerEl.appendChild(notification);

  // Auto-dismiss after duration
  setTimeout(() => {
    notification.classList.add('exiting');
    setTimeout(() => {
      notification.remove();
      // Clean up container if empty
      if (containerEl.children.length === 0) {
        containerEl.remove();
        container = null;
      }
    }, 300); // Match animation duration
  }, duration);
}

/** Convenience functions for specific types */
export function showSuccess(message: string, duration?: number): void {
  showNotification(message, {
    type: 'success',
    ...(duration !== undefined && { duration }),
  });
}

export function showWarning(message: string, duration?: number): void {
  showNotification(message, {
    type: 'warning',
    ...(duration !== undefined && { duration }),
  });
}

export function showError(message: string, duration?: number): void {
  showNotification(message, {
    type: 'error',
    ...(duration !== undefined && { duration }),
  });
}

export function showInfo(message: string, duration?: number): void {
  showNotification(message, {
    type: 'info',
    ...(duration !== undefined && { duration }),
  });
}
