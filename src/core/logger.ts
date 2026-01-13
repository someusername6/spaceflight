/**
 * Logger utility - Centralized logging with debug mode control.
 *
 * Debug logs are disabled by default in production builds.
 * Enable with: localStorage.setItem('DEBUG', 'true') then refresh.
 */

/** Cached debug state (read once at module load to avoid per-call localStorage access) */
const DEBUG_ENABLED = (() => {
  try {
    return localStorage.getItem('DEBUG') === 'true';
  } catch {
    return false;
  }
})();

/** Log a debug message (only in debug mode) */
export function logDebug(message: string, ...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

/** Log a warning (always shown) */
export function logWarn(message: string, ...args: unknown[]): void {
  console.warn(`[WARN] ${message}`, ...args);
}

/** Log an error (always shown) */
export function logError(message: string, ...args: unknown[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}
