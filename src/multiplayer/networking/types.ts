/**
 * Types for client networking layer.
 *
 * These mirror the signaling server types for API communication.
 */

// =============================================================================
// Room Types
// =============================================================================

/** Room state (matches server) */
export type RoomState = 'lobby' | 'playing';

/** Signal types for WebRTC (matches server) */
export type SignalType = 'offer' | 'answer' | 'ice';

// =============================================================================
// API Request/Response Types
// =============================================================================

/** Create room response */
export interface CreateRoomResponse {
  roomCode: string;
  hostId: string;
  hostToken: string;
}

/** Existing peer info for join response */
export interface ExistingPeerInfo {
  peerId: string;
}

/** Join room response */
export interface JoinRoomResponse {
  guestId: string;
  guestToken: string;
  hostId: string;
  existingPeers: ExistingPeerInfo[];
}

/** Signal from server */
export interface Signal {
  fromPeerId: string;
  type: SignalType;
  data: string;
  timestamp: number;
}

/** Get signals response */
export interface GetSignalsResponse {
  signals: Signal[];
}

/** Room event types */
export type RoomEventType =
  | 'peer_joined'
  | 'peer_left'
  | 'peer_kicked'
  | 'game_started';

/** Room event */
export interface RoomEvent {
  type: RoomEventType;
  data: { peerId?: string };
  timestamp: number;
}

/** Get events response */
export interface GetEventsResponse {
  events: RoomEvent[];
}

/** Error response from server */
export interface ErrorResponse {
  error: string;
  message: string;
}

// =============================================================================
// Connection State Types
// =============================================================================

/** Error codes for connection failures */
export type ConnectionErrorCode =
  | 'invalid_room'
  | 'room_full'
  | 'game_in_progress'
  | 'version_mismatch'
  | 'mesh_timeout'
  | 'network_error'
  | 'signaling_error'
  | 'peer_connection_failed'
  | 'callsign_kicked';

/** Connection error */
export interface ConnectionError {
  code: ConnectionErrorCode;
  message: string;
}

/** Connection state (discriminated union) */
export type ConnectionState =
  | { status: 'idle' }
  | { status: 'creating-room' }
  | { status: 'joining-room'; roomCode: string }
  | { status: 'signaling'; roomCode: string }
  | {
      status: 'forming-mesh';
      roomCode: string;
      connectedPeers: number;
      totalPeers: number;
    }
  | { status: 'connected'; roomCode: string }
  | { status: 'error'; error: ConnectionError };

/** Result after successful connection */
export interface ConnectionResult {
  roomCode: string;
  localPeerId: string;
  isHost: boolean;
  hostPeerId: string;
  allPeerIds: string[];
}

// =============================================================================
// Configuration Types
// =============================================================================

/** Signaling client configuration */
export interface SignalingClientConfig {
  serverUrl: string;
  gameVersion: string;
  pollIntervalMs: number;
}

/** WebRTC mesh configuration */
export interface WebRTCMeshConfig {
  iceServers: RTCIceServer[];
  meshTimeoutMs: number;
}

/** Full networking configuration */
export interface NetworkingConfig {
  signaling: SignalingClientConfig;
  webrtc: WebRTCMeshConfig;
}

/** Default configuration */
export const DEFAULT_NETWORKING_CONFIG: NetworkingConfig = {
  signaling: {
    serverUrl: 'http://localhost:3001',
    gameVersion: __APP_VERSION__,
    pollIntervalMs: 100,
  },
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    meshTimeoutMs: 10000,
  },
};
