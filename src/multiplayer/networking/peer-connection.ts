/**
 * Peer Connection Management - Handles individual WebRTC peer connections.
 *
 * Creates and manages RTCPeerConnection instances with data channels.
 */

import type { SignalType, WebRTCMeshConfig } from './types';

/** Outgoing signal to be sent via signaling server */
export interface OutgoingSignal {
  toPeerId: string;
  type: SignalType;
  data: string;
}

/** Internal state for a peer connection */
export interface PeerState {
  connection: RTCPeerConnection;
  reliableChannel: RTCDataChannel | null;
  unreliableChannel: RTCDataChannel | null;
  connected: boolean;
  iceCandidateBuffer: RTCIceCandidate[];
  remoteDescriptionSet: boolean;
}

/** Callbacks for peer connection events */
export interface PeerConnectionCallbacks {
  onSignalNeeded: (signal: OutgoingSignal) => void;
  onPeerConnected: (peerId: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onMessage: (peerId: string, data: Uint8Array) => void;
}

/** Convert Uint8Array to ArrayBuffer for DataChannel.send() */
export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

/**
 * Create a new peer connection with data channels.
 */
export function createPeerConnection(
  peerId: string,
  initiator: boolean,
  config: WebRTCMeshConfig,
  callbacks: PeerConnectionCallbacks,
  onStateChange: (peerId: string, state: PeerState) => void,
): PeerState {
  const connection = new RTCPeerConnection({
    iceServers: config.iceServers,
  });

  const state: PeerState = {
    connection,
    reliableChannel: null,
    unreliableChannel: null,
    connected: false,
    iceCandidateBuffer: [],
    remoteDescriptionSet: false,
  };

  // Set up ICE candidate handling
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      callbacks.onSignalNeeded({
        toPeerId: peerId,
        type: 'ice',
        data: JSON.stringify(event.candidate.toJSON()),
      });
    }
  };

  // Handle connection state changes
  connection.onconnectionstatechange = () => {
    handleConnectionStateChange(peerId, state, callbacks);
  };

  // Handle incoming data channels (for non-initiators)
  connection.ondatachannel = (event) => {
    handleIncomingDataChannel(peerId, state, event.channel, callbacks);
    onStateChange(peerId, state);
  };

  // If initiator, create data channels and offer
  if (initiator) {
    createDataChannels(peerId, state, callbacks);
    createAndSendOffer(peerId, state, callbacks);
  }

  return state;
}

/**
 * Create reliable and unreliable data channels.
 */
function createDataChannels(
  peerId: string,
  state: PeerState,
  callbacks: PeerConnectionCallbacks,
): void {
  // Reliable channel: ordered, guaranteed delivery
  const reliable = state.connection.createDataChannel('reliable', {
    ordered: true,
  });
  setupDataChannel(peerId, state, reliable, 'reliable', callbacks);
  state.reliableChannel = reliable;

  // Unreliable channel: for future optimization
  const unreliable = state.connection.createDataChannel('unreliable', {
    ordered: false,
    maxRetransmits: 0,
  });
  setupDataChannel(peerId, state, unreliable, 'unreliable', callbacks);
  state.unreliableChannel = unreliable;
}

/**
 * Handle an incoming data channel from remote peer.
 */
function handleIncomingDataChannel(
  peerId: string,
  state: PeerState,
  channel: RTCDataChannel,
  callbacks: PeerConnectionCallbacks,
): void {
  if (channel.label === 'reliable') {
    state.reliableChannel = channel;
    setupDataChannel(peerId, state, channel, 'reliable', callbacks);
  } else if (channel.label === 'unreliable') {
    state.unreliableChannel = channel;
    setupDataChannel(peerId, state, channel, 'unreliable', callbacks);
  }
}

/**
 * Set up event handlers on a data channel.
 */
function setupDataChannel(
  peerId: string,
  state: PeerState,
  channel: RTCDataChannel,
  label: string,
  callbacks: PeerConnectionCallbacks,
): void {
  channel.binaryType = 'arraybuffer';

  channel.onopen = () => {
    // Check if both channels are open
    if (areBothChannelsOpen(state)) {
      handlePeerConnected(peerId, state, callbacks);
    }
  };

  channel.onclose = () => {
    if (state.connected) {
      handlePeerDisconnected(peerId, state, callbacks);
    }
  };

  channel.onerror = (event) => {
    console.error(`DataChannel ${label} error for peer ${peerId}:`, event);
  };

  // Only handle messages on reliable channel
  if (label === 'reliable') {
    channel.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      callbacks.onMessage(peerId, data);
    };
  }
}

/**
 * Check if both data channels are open.
 */
export function areBothChannelsOpen(state: PeerState): boolean {
  return (
    state.reliableChannel?.readyState === 'open' &&
    state.unreliableChannel?.readyState === 'open'
  );
}

/**
 * Create and send an SDP offer.
 */
async function createAndSendOffer(
  peerId: string,
  state: PeerState,
  callbacks: PeerConnectionCallbacks,
): Promise<void> {
  const offer = await state.connection.createOffer();
  await state.connection.setLocalDescription(offer);

  callbacks.onSignalNeeded({
    toPeerId: peerId,
    type: 'offer',
    data: JSON.stringify(offer),
  });
}

/**
 * Handle connection state changes.
 */
function handleConnectionStateChange(
  peerId: string,
  state: PeerState,
  callbacks: PeerConnectionCallbacks,
): void {
  const connState = state.connection.connectionState;

  if (connState === 'failed' || connState === 'disconnected') {
    if (state.connected) {
      handlePeerDisconnected(peerId, state, callbacks);
    }
  }
}

/**
 * Handle peer becoming connected.
 */
function handlePeerConnected(
  peerId: string,
  state: PeerState,
  callbacks: PeerConnectionCallbacks,
): void {
  if (state.connected) return;
  state.connected = true;
  callbacks.onPeerConnected(peerId);
}

/**
 * Handle peer disconnection.
 */
function handlePeerDisconnected(
  peerId: string,
  state: PeerState,
  callbacks: PeerConnectionCallbacks,
): void {
  if (!state.connected) return;
  state.connected = false;
  callbacks.onPeerDisconnected(peerId);
}

/**
 * Clean up a peer connection.
 */
export function cleanupPeerConnection(state: PeerState): void {
  state.reliableChannel?.close();
  state.unreliableChannel?.close();
  state.connection.close();
  state.connected = false;
}

/**
 * Process buffered ICE candidates after remote description is set.
 */
export async function processBufferedIceCandidates(
  state: PeerState,
): Promise<void> {
  for (const candidate of state.iceCandidateBuffer) {
    await state.connection.addIceCandidate(candidate);
  }
  state.iceCandidateBuffer = [];
}
