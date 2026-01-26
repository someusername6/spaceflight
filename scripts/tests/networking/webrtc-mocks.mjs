/**
 * Mock WebRTC APIs for testing.
 *
 * These mocks allow testing networking code without a real browser.
 */

// Polyfill Vite build-time constant (must be before any imports that use it)
globalThis.__APP_VERSION__ = '0.0.0-test';

// =============================================================================
// Test Helpers for accessing private properties
// =============================================================================

/** Get a private property from an object */
export function getPrivate(obj, key) {
  return Reflect.get(obj, key);
}

/** Set a private property on an object */
export function setPrivate(obj, key, value) {
  Reflect.set(obj, key, value);
}

// =============================================================================
// Mock WebRTC APIs
// =============================================================================

export class MockRTCDataChannel {
  constructor(label, options = {}) {
    this.label = label;
    this.ordered = options.ordered ?? true;
    this.maxRetransmits = options.maxRetransmits;
    this.readyState = 'connecting';
    this.binaryType = 'blob';
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this._sentMessages = [];
  }

  send(data) {
    if (this.readyState !== 'open') {
      throw new Error('Channel not open');
    }
    this._sentMessages.push(data);
  }

  close() {
    this.readyState = 'closed';
    this.onclose?.();
  }

  // Test helpers
  _simulateOpen() {
    this.readyState = 'open';
    this.onopen?.();
  }

  _simulateMessage(data) {
    this.onmessage?.({ data });
  }
}

export class MockRTCPeerConnection {
  constructor(config) {
    this.config = config;
    this.connectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.onicecandidate = null;
    this.onconnectionstatechange = null;
    this.ondatachannel = null;
    this._dataChannels = new Map();
  }

  createDataChannel(label, options) {
    const channel = new MockRTCDataChannel(label, options);
    this._dataChannels.set(label, channel);
    return channel;
  }

  async createOffer() {
    return { type: 'offer', sdp: 'mock-sdp-offer' };
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'mock-sdp-answer' };
  }

  async setLocalDescription(desc) {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(_candidate) {
    // Mock implementation
  }

  close() {
    this.connectionState = 'closed';
  }

  // Test helpers
  _simulateDataChannel(channel) {
    this.ondatachannel?.({ channel });
  }

  _simulateConnectionState(state) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

// =============================================================================
// Install Mocks
// =============================================================================

export function installWebRTCMocks() {
  globalThis.RTCPeerConnection = MockRTCPeerConnection;
  globalThis.RTCDataChannel = MockRTCDataChannel;
  globalThis.RTCIceCandidate = class {
    constructor(init) {
      Object.assign(this, init);
    }
    toJSON() {
      return { candidate: this.candidate };
    }
  };
}

// Auto-install mocks when this module is imported
installWebRTCMocks();
