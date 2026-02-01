/**
 * Storage types for AWS signaling server.
 * Defines domain objects and the storage interface.
 */

export interface Room {
  code: string;
  hostId: string;
  gameVersion: string;
  state: string;
  createdAt: number;
  lastActivity: number;
  kickedCallsigns: string[];
}

export interface Peer {
  id: string;
  token: string;
  callsign: string;
  joinedAt: number;
}

export interface Signal {
  fromPeerId: string;
  toPeerId: string;
  type: string;
  data: unknown;
}

export interface RoomEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Storage interface for signaling server.
 * Implemented by DynamoDB adapter in production.
 */
export interface SignalingStorage {
  // Room operations
  createRoom(room: Room): Promise<void>;
  getRoom(code: string): Promise<Room | null>;
  updateRoom(code: string, updates: Partial<Room>): Promise<void>;
  deleteRoom(code: string): Promise<void>;

  // Peer operations
  addPeer(code: string, peer: Peer): Promise<void>;
  getPeer(code: string, peerId: string): Promise<Peer | null>;
  getPeerByToken(code: string, token: string): Promise<Peer | null>;
  removePeer(code: string, peerId: string): Promise<void>;
  listPeers(code: string): Promise<Peer[]>;
  kickPeer(code: string, peerId: string, callsign: string): Promise<void>;

  // Signal operations
  addSignal(code: string, signal: Signal): Promise<void>;
  getSignals(code: string, peerId: string, since: number): Promise<Signal[]>;

  // Event operations
  addEvent(code: string, event: RoomEvent): Promise<void>;
  getEvents(code: string, since: number): Promise<RoomEvent[]>;
}
