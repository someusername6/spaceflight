/**
 * UI Utility Functions
 *
 * Common utilities for UI rendering and handling.
 */

/**
 * Escape HTML special characters to prevent XSS.
 * Use this when inserting dynamic text into HTML templates.
 *
 * @param text - The text to escape
 * @returns HTML-safe string
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] ?? char);
}
