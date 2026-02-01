/**
 * Core types for the signaling server.
 */

/** Room state */
export type RoomState = 'lobby' | 'playing';

/** Signal types for WebRTC */
export type SignalType = 'offer' | 'answer' | 'ice';

/** Room metadata */
export interface Room {
  code: string;
  hostId: string;
  gameVersion: string;
  state: RoomState;
  createdAt: number;
  lastActivity: number;
  /** Callsigns that have been kicked from this room (lowercase for comparison) */
  kickedCallsigns: string[];
}

/** Peer in a room */
export interface Peer {
  peerId: string;
  token: string;
  joinedAt: number;
  /** Player callsign (for tracking kicked callsigns) */
  callsign?: string;
}

/** WebRTC signal */
export interface Signal {
  fromPeerId: string;
  toPeerId: string;
  type: SignalType;
  data: string;
  timestamp: number;
}

/** Room event types */
export type RoomEventType =
  | 'peer_joined'
  | 'peer_left'
  | 'peer_kicked'
  | 'game_started';

/** Event data for peer_joined */
export interface PeerJoinedEventData {
  peerId: string;
}

/** Event data for peer_left */
export interface PeerLeftEventData {
  peerId: string;
}

/** Event data for peer_kicked */
export interface PeerKickedEventData {
  peerId: string;
}

/** Event data for game_started (empty) */
export type GameStartedEventData = Record<string, never>;

/** Discriminated union of room events */
export type RoomEvent =
  | { type: 'peer_joined'; data: PeerJoinedEventData; timestamp: number }
  | { type: 'peer_left'; data: PeerLeftEventData; timestamp: number }
  | { type: 'peer_kicked'; data: PeerKickedEventData; timestamp: number }
  | { type: 'game_started'; data: GameStartedEventData; timestamp: number };

/** API error codes */
export type ErrorCode =
  | 'invalid_room'
  | 'room_full'
  | 'game_in_progress'
  | 'version_mismatch'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'bad_request'
  | 'internal_error'
  | 'callsign_kicked';

/** Standard error response */
export interface ErrorResponse {
  error: ErrorCode;
  message: string;
}

/** Create room request */
export interface CreateRoomRequest {
  gameVersion: string;
}

/** Create room response */
export interface CreateRoomResponse {
  roomCode: string;
  hostId: string;
  hostToken: string;
}

/** Join room request */
export interface JoinRoomRequest {
  gameVersion: string;
  /** Player callsign (for kicked callsign blocking) */
  callsign?: string;
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

/** Post signal request */
export interface PostSignalRequest {
  targetPeerId: string;
  type: SignalType;
  data: string;
}

/** Get signals response */
export interface GetSignalsResponse {
  signals: Array<{
    fromPeerId: string;
    type: SignalType;
    data: string;
    timestamp: number;
  }>;
}

/** Get events response */
export interface GetEventsResponse {
  events: RoomEvent[];
}

/** Kick request */
export interface KickRequest {
  peerId: string;
}

/** Set state request */
export interface SetStateRequest {
  state: RoomState;
}

/** Success response */
export interface SuccessResponse {
  success: boolean;
}
