/**
 * HTTP Client utilities for signaling server communication.
 *
 * Provides retry logic with exponential backoff for transient failures.
 */

/** Error from signaling server */
export class SignalingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SignalingError';
  }
}

/** Maximum retries for transient network failures */
const MAX_RETRIES = 3;

/** Initial delay between retries in ms */
const INITIAL_RETRY_DELAY = 100;

/** HTTP status codes that indicate a transient failure worth retrying */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/** Check if an error is a transient network failure worth retrying */
export function isRetryableError(error: unknown, status?: number): boolean {
  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  // Retryable HTTP status codes
  if (status !== undefined && RETRYABLE_STATUS_CODES.includes(status)) {
    return true;
  }
  return false;
}

/** Options for HTTP fetch with retry */
export interface FetchWithRetryOptions {
  serverUrl: string;
  path: string;
  options: RequestInit;
  token?: string | null;
}

/**
 * Fetch with automatic retry on transient failures.
 *
 * Implements exponential backoff (100ms → 200ms → 400ms).
 */
export async function fetchWithRetry({
  serverUrl,
  path,
  options,
  token,
}: FetchWithRetryOptions): Promise<globalThis.Response> {
  const url = `${serverUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let lastError: unknown;
  let delay = INITIAL_RETRY_DELAY;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await globalThis.fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (!response.ok) {
        // Check if this is a retryable status code
        if (isRetryableError(null, response.status) && attempt < MAX_RETRIES) {
          lastError = new SignalingError(
            'transient_error',
            `HTTP ${response.status}`,
            response.status,
          );
          await sleep(delay);
          delay *= 2; // Exponential backoff
          continue;
        }

        // Non-retryable error, throw immediately
        let errorCode = 'unknown';
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorData = (await response.json()) as {
            error?: string;
            message?: string;
          };
          errorCode = errorData.error ?? errorCode;
          errorMessage = errorData.message ?? errorMessage;
        } catch {
          // Ignore JSON parse errors
        }

        throw new SignalingError(errorCode, errorMessage, response.status);
      }

      return response;
    } catch (error) {
      // Network error (fetch failed)
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        lastError = error;
        await sleep(delay);
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }

  // All retries exhausted
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
