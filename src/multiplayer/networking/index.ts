/**
 * Networking Module - Client networking layer for multiplayer.
 *
 * Provides WebRTC-based peer-to-peer networking using a signaling server
 * for connection setup. Implements the TransportAdapter interface from
 * rollback-netcode for integration with the rollback engine.
 *
 * @example
 * ```typescript
 * import { createConnectionFlow } from './multiplayer/networking';
 *
 * // Create connection flow
 * const flow = createConnectionFlow({
 *   signaling: { serverUrl: 'http://localhost:3001' },
 * });
 *
 * // Host: create a room
 * const result = await flow.createRoom();
 * console.log('Room code:', result.roomCode);
 *
 * // Guest: join a room
 * const result = await flow.joinRoom('ABCD1234');
 *
 * // Get transport for rollback-netcode
 * const transport = flow.getTransport();
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  ConnectionError,
  ConnectionErrorCode,
  ConnectionResult,
  ConnectionState,
  CreateRoomResponse,
  ErrorResponse,
  ExistingPeerInfo,
  GetEventsResponse,
  GetSignalsResponse,
  JoinRoomResponse,
  NetworkingConfig,
  RoomEvent,
  RoomEventType,
  RoomState,
  Signal,
  SignalingClientConfig,
  SignalType,
  WebRTCMeshConfig,
} from './types';

export { DEFAULT_NETWORKING_CONFIG } from './types';

// =============================================================================
// Signaling Client
// =============================================================================

export {
  type CreateRoomResult,
  createSignalingClient,
  type JoinRoomResult,
  SignalingClient,
  SignalingError,
} from './signaling-client';

// =============================================================================
// WebRTC Mesh
// =============================================================================

export {
  createWebRTCMesh,
  type OutgoingSignal,
  WebRTCMesh,
  type WebRTCMeshEvents,
} from './webrtc-mesh';

// =============================================================================
// WebRTC Transport
// =============================================================================
//
// WebRTCTransport implements TransportAdapter for rollback-netcode.
// It also implements RTTTracker for connection quality monitoring:
//
//   transport.recordPingSent(peerId, pingId);    // Call when sending a ping
//   transport.recordPongReceived(peerId, pingId); // Call when pong arrives
//   transport.getConnectionMetrics(peerId);       // Get RTT, jitter, packet loss

export {
  createWebRTCTransport,
  type RTTTracker,
  WebRTCTransport,
} from './webrtc-transport';

// =============================================================================
// Connection Flow
// =============================================================================

export {
  ConnectionFlow,
  type ConnectionFlowEvents,
  createConnectionFlow,
} from './connection-flow';

// =============================================================================
// Session State
// =============================================================================

export {
  addConnectedPeer,
  createSessionState,
  type MultiplayerSessionState,
  type MutableSessionState,
  removeConnectedPeer,
  resetSessionState,
  setConnectedState,
} from './session-state';
