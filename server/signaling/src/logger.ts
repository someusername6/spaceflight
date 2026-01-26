/**
 * Simple logging utility for the signaling server.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      console.debug(`[${formatTimestamp()}] DEBUG: ${message}`, data ?? '');
    }
  },

  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      console.info(`[${formatTimestamp()}] INFO: ${message}`, data ?? '');
    }
  },

  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      console.warn(`[${formatTimestamp()}] WARN: ${message}`, data ?? '');
    }
  },

  error(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      console.error(`[${formatTimestamp()}] ERROR: ${message}`, data ?? '');
    }
  },

  /**
   * Log an HTTP response (for 4xx/5xx status codes).
   */
  httpError(
    method: string,
    path: string,
    status: number,
    error: string,
    message: string,
  ): void {
    const logFn = status >= 500 ? this.error : this.warn;
    logFn.call(this, `${method} ${path} ${status}`, { error, message });
  },
};
