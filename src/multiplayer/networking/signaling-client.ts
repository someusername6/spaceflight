/**
 * Signaling Client - HTTP client for the signaling server.
 *
 * Handles room creation/joining and WebRTC signal exchange via HTTP polling.
 * The signaling server is only used during connection setup (~5-10 seconds);
 * once the WebRTC mesh is established, all communication is peer-to-peer.
 */

import type {
  CreateRoomResponse,
  GetEventsResponse,
  GetSignalsResponse,
  JoinRoomResponse,
  RoomEvent,
  RoomState,
  Signal,
  SignalingClientConfig,
  SignalType,
} from './types';

/** Result of createRoom */
export interface CreateRoomResult {
  roomCode: string;
  hostId: string;
  hostToken: string;
}

/** Result of joinRoom */
export interface JoinRoomResult {
  guestId: string;
  guestToken: string;
  hostId: string;
  existingPeers: string[];
}

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
function isRetryableError(error: unknown, status?: number): boolean {
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

/**
 * HTTP client for signaling server communication.
 */
export class SignalingClient {
  private readonly config: SignalingClientConfig;
  private _roomCode: string | null = null;
  private _localPeerId: string | null = null;
  private _token: string | null = null;
  private _isHost = false;
  private _lastSignalTimestamp = 0;
  private _lastEventTimestamp = 0;
  private disposed = false;

  constructor(config: SignalingClientConfig) {
    this.config = config;
  }

  // ===========================================================================
  // Public Properties
  // ===========================================================================

  get roomCode(): string | null {
    return this._roomCode;
  }

  get localPeerId(): string | null {
    return this._localPeerId;
  }

  get token(): string | null {
    return this._token;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  // ===========================================================================
  // Room Lifecycle
  // ===========================================================================

  /**
   * Create a new room.
   * @returns Room code, host ID, and host token
   */
  async createRoom(): Promise<CreateRoomResult> {
    this.checkNotDisposed();

    const response = await this.fetch('/rooms', {
      method: 'POST',
      body: JSON.stringify({ gameVersion: this.config.gameVersion }),
    });

    const data = (await response.json()) as CreateRoomResponse;

    this._roomCode = data.roomCode;
    this._localPeerId = data.hostId;
    this._token = data.hostToken;
    this._isHost = true;
    this._lastSignalTimestamp = 0;
    this._lastEventTimestamp = 0;

    return {
      roomCode: data.roomCode,
      hostId: data.hostId,
      hostToken: data.hostToken,
    };
  }

  /**
   * Join an existing room.
   * @param code - The room code to join
   * @returns Guest ID, token, host ID, and list of existing peer IDs
   */
  async joinRoom(code: string): Promise<JoinRoomResult> {
    this.checkNotDisposed();

    const response = await this.fetch(`/rooms/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ gameVersion: this.config.gameVersion }),
    });

    const data = (await response.json()) as JoinRoomResponse;

    this._roomCode = code;
    this._localPeerId = data.guestId;
    this._token = data.guestToken;
    this._isHost = false;
    this._lastSignalTimestamp = 0;
    this._lastEventTimestamp = 0;

    return {
      guestId: data.guestId,
      guestToken: data.guestToken,
      hostId: data.hostId,
      existingPeers: data.existingPeers.map((p) => p.peerId),
    };
  }

  /**
   * Leave the current room.
   */
  async leaveRoom(): Promise<void> {
    this.checkNotDisposed();
    if (!this._roomCode || !this._token) return;

    try {
      await this.fetch(`/rooms/${this._roomCode}/leave`, {
        method: 'POST',
      });
    } finally {
      this.clearRoomState();
    }
  }

  /**
   * Delete the current room (host only).
   */
  async deleteRoom(): Promise<void> {
    this.checkNotDisposed();
    if (!this._roomCode || !this._token || !this._isHost) return;

    try {
      await this.fetch(`/rooms/${this._roomCode}`, {
        method: 'DELETE',
      });
    } finally {
      this.clearRoomState();
    }
  }

  // ===========================================================================
  // Signaling
  // ===========================================================================

  /**
   * Post a WebRTC signal to another peer.
   * @param targetPeerId - The peer to send the signal to
   * @param type - Signal type (offer, answer, or ice)
   * @param data - The signal data (SDP or ICE candidate JSON)
   */
  async postSignal(
    targetPeerId: string,
    type: SignalType,
    data: string,
  ): Promise<void> {
    this.checkNotDisposed();
    this.checkInRoom();

    await this.fetch(`/rooms/${this._roomCode}/signals`, {
      method: 'POST',
      body: JSON.stringify({ targetPeerId, type, data }),
    });
  }

  /**
   * Poll for new signals addressed to this peer.
   * @returns Array of new signals since last poll
   */
  async pollSignals(): Promise<Signal[]> {
    this.checkNotDisposed();
    this.checkInRoom();

    const url =
      this._lastSignalTimestamp > 0
        ? `/rooms/${this._roomCode}/signals?since=${this._lastSignalTimestamp}`
        : `/rooms/${this._roomCode}/signals`;

    const response = await this.fetch(url, { method: 'GET' });
    const data = (await response.json()) as GetSignalsResponse;

    // Update timestamp for next poll
    if (data.signals.length > 0) {
      const maxTimestamp = Math.max(...data.signals.map((s) => s.timestamp));
      this._lastSignalTimestamp = maxTimestamp;
    }

    return data.signals;
  }

  /**
   * Poll for new room events (peer_joined, peer_left, etc.).
   * @returns Array of new events since last poll
   */
  async pollEvents(): Promise<RoomEvent[]> {
    this.checkNotDisposed();
    this.checkInRoom();

    const url =
      this._lastEventTimestamp > 0
        ? `/rooms/${this._roomCode}/events?since=${this._lastEventTimestamp}`
        : `/rooms/${this._roomCode}/events`;

    const response = await this.fetch(url, { method: 'GET' });
    const data = (await response.json()) as GetEventsResponse;

    // Update timestamp for next poll
    if (data.events.length > 0) {
      const maxTimestamp = Math.max(...data.events.map((e) => e.timestamp));
      this._lastEventTimestamp = maxTimestamp;
    }

    return data.events;
  }

  // ===========================================================================
  // Host Actions
  // ===========================================================================

  /**
   * Kick a peer from the room (host only).
   * @param peerId - The peer to kick
   */
  async kick(peerId: string): Promise<void> {
    this.checkNotDisposed();
    this.checkInRoom();
    this.checkIsHost();

    await this.fetch(`/rooms/${this._roomCode}/kick`, {
      method: 'POST',
      body: JSON.stringify({ peerId }),
    });
  }

  /**
   * Set the room state (host only).
   * @param state - The new room state ('lobby' or 'playing')
   */
  async setState(state: RoomState): Promise<void> {
    this.checkNotDisposed();
    this.checkInRoom();
    this.checkIsHost();

    await this.fetch(`/rooms/${this._roomCode}/state`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose of the client, clearing all state.
   */
  dispose(): void {
    this.disposed = true;
    this.clearRoomState();
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async fetch(
    path: string,
    options: RequestInit,
  ): Promise<globalThis.Response> {
    const url = `${this.config.serverUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this._token) {
      headers.Authorization = `Bearer ${this._token}`;
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
          if (
            isRetryableError(null, response.status) &&
            attempt < MAX_RETRIES
          ) {
            lastError = new SignalingError(
              'transient_error',
              `HTTP ${response.status}`,
              response.status,
            );
            await this.sleep(delay);
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
          await this.sleep(delay);
          delay *= 2; // Exponential backoff
          continue;
        }
        throw error;
      }
    }

    // All retries exhausted
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private clearRoomState(): void {
    this._roomCode = null;
    this._localPeerId = null;
    this._token = null;
    this._isHost = false;
    this._lastSignalTimestamp = 0;
    this._lastEventTimestamp = 0;
  }

  private checkNotDisposed(): void {
    if (this.disposed) {
      throw new Error('SignalingClient has been disposed');
    }
  }

  private checkInRoom(): void {
    if (!this._roomCode || !this._token) {
      throw new Error('Not in a room');
    }
  }

  private checkIsHost(): void {
    if (!this._isHost) {
      throw new Error('Only host can perform this action');
    }
  }
}

/**
 * Create a signaling client with the given configuration.
 */
export function createSignalingClient(
  config: SignalingClientConfig,
): SignalingClient {
  return new SignalingClient(config);
}
