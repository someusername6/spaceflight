/**
 * DynamoDB storage adapter for AWS signaling server.
 * Implements the SignalingStorage interface with DynamoDB operations.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { generateId } from '../auth';
import type { Config } from '../config';
import type { Peer, Room, RoomEvent, Signal, SignalingStorage } from './types';

export class DynamoDBStorage implements SignalingStorage {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private config: Config;

  constructor(config: Config, client?: DynamoDBDocumentClient) {
    this.client = client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName = config.tableName;
    this.config = config;
  }

  async createRoom(room: Room): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `ROOM#${room.code}`,
          SK: '#META',
          ...room,
          expiresAt: now + this.config.roomExpirySeconds,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  }

  async getRoom(code: string): Promise<Room | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `ROOM#${code}`, SK: '#META' },
      }),
    );
    return result.Item ? this.toRoom(result.Item) : null;
  }

  async updateRoom(code: string, updates: Partial<Room>): Promise<void> {
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], i) => {
      expressions.push(`#k${i} = :v${i}`);
      names[`#k${i}`] = key;
      values[`:v${i}`] = value;
    });

    if (expressions.length === 0) return;

    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `ROOM#${code}`, SK: '#META' },
        UpdateExpression: `SET ${expressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
  }

  async deleteRoom(code: string): Promise<void> {
    // Query all items for this room, then batch delete them
    const items = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `ROOM#${code}` },
        ProjectionExpression: 'PK, SK',
      }),
    );

    if (!items.Items?.length) return;

    // Collect token indices to delete (from peer items)
    const peers = await this.listPeers(code);
    const tokenDeletes = peers.map((peer) => ({
      DeleteRequest: { Key: { PK: `TOKEN#${peer.token}`, SK: '#' } },
    }));

    // DynamoDB BatchWriteItem limit is 25 items
    const roomDeletes = items.Items.map((item) => ({
      DeleteRequest: { Key: { PK: item.PK as string, SK: item.SK as string } },
    }));

    const allDeletes = [...roomDeletes, ...tokenDeletes];
    const batches: (typeof allDeletes)[] = [];
    for (let i = 0; i < allDeletes.length; i += 25) {
      batches.push(allDeletes.slice(i, i + 25));
    }

    for (const batch of batches) {
      await this.client.send(
        new BatchWriteCommand({
          RequestItems: { [this.tableName]: batch },
        }),
      );
    }
  }

  async addPeer(code: string, peer: Peer): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.roomExpirySeconds;

    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: {
                PK: `ROOM#${code}`,
                SK: `PEER#${peer.id}`,
                ...peer,
                expiresAt,
              },
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: {
                PK: `TOKEN#${peer.token}`,
                SK: '#',
                roomCode: code,
                peerId: peer.id,
                expiresAt,
              },
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: {
                PK: `ROOM#${code}`,
                SK: `EVT#${now}#${generateId()}`,
                type: 'peer_joined',
                data: { peerId: peer.id, callsign: peer.callsign },
                createdAt: now,
                expiresAt: now + this.config.signalExpirySeconds,
              },
            },
          },
        ],
      }),
    );
  }

  async getPeer(code: string, peerId: string): Promise<Peer | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `ROOM#${code}`, SK: `PEER#${peerId}` },
      }),
    );
    return result.Item ? this.toPeer(result.Item) : null;
  }

  async getPeerByToken(code: string, token: string): Promise<Peer | null> {
    // Use strongly consistent read to avoid race conditions
    const tokenResult = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `TOKEN#${token}`, SK: '#' },
        ConsistentRead: true,
      }),
    );
    if (!tokenResult.Item || tokenResult.Item.roomCode !== code) {
      return null;
    }
    return this.getPeer(code, tokenResult.Item.peerId as string);
  }

  async removePeer(code: string, peerId: string): Promise<void> {
    const peer = await this.getPeer(code, peerId);
    if (!peer) return;

    const now = Math.floor(Date.now() / 1000);
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: this.tableName,
              Key: { PK: `ROOM#${code}`, SK: `PEER#${peerId}` },
            },
          },
          {
            Delete: {
              TableName: this.tableName,
              Key: { PK: `TOKEN#${peer.token}`, SK: '#' },
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: {
                PK: `ROOM#${code}`,
                SK: `EVT#${now}#${generateId()}`,
                type: 'peer_left',
                data: { peerId },
                createdAt: now,
                expiresAt: now + this.config.signalExpirySeconds,
              },
            },
          },
        ],
      }),
    );
  }

  async listPeers(code: string): Promise<Peer[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${code}`,
          ':prefix': 'PEER#',
        },
      }),
    );
    return (result.Items ?? []).map((item) => this.toPeer(item));
  }

  async kickPeer(
    code: string,
    peerId: string,
    callsign: string,
  ): Promise<void> {
    const peer = await this.getPeer(code, peerId);
    if (!peer) return;

    const now = Math.floor(Date.now() / 1000);
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          // Update room's kickedCallsigns array
          {
            Update: {
              TableName: this.tableName,
              Key: { PK: `ROOM#${code}`, SK: '#META' },
              UpdateExpression:
                'SET kickedCallsigns = list_append(if_not_exists(kickedCallsigns, :empty), :callsign)',
              ExpressionAttributeValues: {
                ':empty': [],
                ':callsign': [callsign],
              },
            },
          },
          // Delete peer
          {
            Delete: {
              TableName: this.tableName,
              Key: { PK: `ROOM#${code}`, SK: `PEER#${peerId}` },
            },
          },
          // Delete token index
          {
            Delete: {
              TableName: this.tableName,
              Key: { PK: `TOKEN#${peer.token}`, SK: '#' },
            },
          },
          // Add kick event
          {
            Put: {
              TableName: this.tableName,
              Item: {
                PK: `ROOM#${code}`,
                SK: `EVT#${now}#${generateId()}`,
                type: 'peer_kicked',
                data: { peerId, callsign },
                createdAt: now,
                expiresAt: now + this.config.signalExpirySeconds,
              },
            },
          },
        ],
      }),
    );
  }

  async addSignal(code: string, signal: Signal): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `ROOM#${code}`,
          SK: `SIG#${signal.toPeerId}#${now}#${generateId()}`,
          fromPeerId: signal.fromPeerId,
          toPeerId: signal.toPeerId,
          type: signal.type,
          data: signal.data,
          createdAt: now,
          expiresAt: now + this.config.signalExpirySeconds,
        },
      }),
    );
  }

  async getSignals(
    code: string,
    peerId: string,
    since: number,
  ): Promise<Signal[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'createdAt > :since',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${code}`,
          ':prefix': `SIG#${peerId}#`,
          ':since': since,
        },
      }),
    );
    return (result.Items ?? []).map((item) => this.toSignal(item));
  }

  async addEvent(code: string, event: RoomEvent): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `ROOM#${code}`,
          SK: `EVT#${now}#${generateId()}`,
          type: event.type,
          data: event.data,
          createdAt: now,
          expiresAt: now + this.config.signalExpirySeconds,
        },
      }),
    );
  }

  async getEvents(code: string, since: number): Promise<RoomEvent[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'createdAt > :since',
        ExpressionAttributeValues: {
          ':pk': `ROOM#${code}`,
          ':prefix': 'EVT#',
          ':since': since,
        },
      }),
    );
    return (result.Items ?? []).map((item) => this.toEvent(item));
  }

  // Helper methods to convert DynamoDB items to domain types
  private toRoom(item: Record<string, unknown>): Room {
    return {
      code: item.code as string,
      hostId: item.hostId as string,
      gameVersion: item.gameVersion as string,
      state: item.state as string,
      createdAt: item.createdAt as number,
      lastActivity: item.lastActivity as number,
      kickedCallsigns: (item.kickedCallsigns as string[]) ?? [],
    };
  }

  private toPeer(item: Record<string, unknown>): Peer {
    return {
      id: item.id as string,
      token: item.token as string,
      callsign: item.callsign as string,
      joinedAt: item.joinedAt as number,
    };
  }

  private toSignal(item: Record<string, unknown>): Signal {
    return {
      fromPeerId: item.fromPeerId as string,
      toPeerId: item.toPeerId as string,
      type: item.type as string,
      data: item.data as unknown,
    };
  }

  private toEvent(item: Record<string, unknown>): RoomEvent {
    return {
      type: item.type as string,
      data: item.data as Record<string, unknown>,
    };
  }
}

export function createStorage(
  config: Config,
  client?: DynamoDBDocumentClient,
): SignalingStorage {
  return new DynamoDBStorage(config, client);
}
