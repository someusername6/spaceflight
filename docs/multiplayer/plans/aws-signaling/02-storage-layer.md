# Phase 02: Storage Layer

## Objective

Implement the DynamoDB storage adapter that implements the `SignalingStorage` interface.

## Prerequisites

- Phase 01 complete (types exist)

## Files to Create

```
server/signaling-aws/
├── src/
│   └── storage/
│       └── dynamodb-storage.ts
└── tests/
    └── test-dynamodb-storage.ts
```

## Tasks

### 1. Create src/storage/dynamodb-storage.ts

Implement `DynamoDBStorage` class with all methods from `SignalingStorage` interface.

**Key implementation details:**

| Method | DynamoDB Operations | Notes |
|--------|---------------------|-------|
| `createRoom` | PutItem with condition | `attribute_not_exists(PK)` |
| `getRoom` | GetItem | Returns null if not found |
| `updateRoom` | UpdateItem | Dynamic expression building |
| `deleteRoom` | Query + BatchWriteItem | Delete all room items + token indices |
| `addPeer` | TransactWriteItems | Peer + token index + event (3 items) |
| `getPeer` | GetItem | Direct lookup |
| `getPeerByToken` | GetItem (ConsistentRead) | Token → peer lookup |
| `removePeer` | TransactWriteItems | Delete peer + token + add event |
| `listPeers` | Query | `begins_with(SK, 'PEER#')` |
| `kickPeer` | TransactWriteItems | Update room + delete peer + delete token + event |
| `addSignal` | PutItem | SK includes toPeerId for efficient queries |
| `getSignals` | Query + FilterExpression | Filter by `createdAt > since` |
| `addEvent` | PutItem | - |
| `getEvents` | Query + FilterExpression | Filter by `createdAt > since` |

**Item key patterns:**

```
Room:    PK=ROOM#{code}, SK=#META
Peer:    PK=ROOM#{code}, SK=PEER#{peerId}
Token:   PK=TOKEN#{token}, SK=#
Signal:  PK=ROOM#{code}, SK=SIG#{toPeerId}#{timestamp}#{uuid}
Event:   PK=ROOM#{code}, SK=EVT#{timestamp}#{uuid}
```

**TTL handling:**
- Rooms/peers: `now + roomExpirySeconds` (3600)
- Signals/events: `now + signalExpirySeconds` (60)
- All timestamps in Unix seconds: `Math.floor(Date.now() / 1000)`

### 2. Create tests/test-dynamodb-storage.ts

Use vitest with DynamoDB Local or mocks.

**Test cases:**

Room operations:
- [ ] createRoom succeeds for new room
- [ ] createRoom fails (ConditionalCheckFailedException) for existing room
- [ ] getRoom returns null for non-existent room
- [ ] getRoom returns room data for existing room
- [ ] updateRoom modifies specific fields
- [ ] deleteRoom removes room and all associated items

Peer operations:
- [ ] addPeer creates peer, token index, and event atomically
- [ ] getPeer returns null for non-existent peer
- [ ] getPeerByToken returns peer for valid token
- [ ] getPeerByToken returns null for invalid token
- [ ] removePeer deletes peer, token index, and adds event
- [ ] listPeers returns all peers in room

Kick operations:
- [ ] kickPeer updates kickedCallsigns, removes peer, adds event

Signal operations:
- [ ] addSignal creates signal with correct SK pattern
- [ ] getSignals returns only signals for specified peer
- [ ] getSignals filters by `since` timestamp

Event operations:
- [ ] addEvent creates event
- [ ] getEvents filters by `since` timestamp

## Implementation Notes

**Batch delete in deleteRoom:**
```typescript
// DynamoDB BatchWriteItem limit is 25 items per request
const batches = [];
for (let i = 0; i < allDeletes.length; i += 25) {
  batches.push(allDeletes.slice(i, i + 25));
}
```

**Consistent read for token lookup:**
```typescript
// Avoid race conditions with eventual consistency
const result = await client.send(new GetCommand({
  Key: { PK: `TOKEN#${token}`, SK: '#' },
  ConsistentRead: true,
}));
```

## Acceptance Criteria

- [ ] All storage methods implemented
- [ ] Unit tests pass
- [ ] No TypeScript errors
- [ ] TTL values correctly calculated

## Commit Message

```
Implement DynamoDB storage adapter for AWS signaling

- Full SignalingStorage interface implementation
- Atomic transactions for peer join/leave/kick
- Batch delete for room cleanup
- Unit tests for all operations
```
