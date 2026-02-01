# Phase 01: Project Setup

## Objective

Create the project structure, configuration files, and shared types for the AWS signaling server.

## Files to Create

```
server/signaling-aws/
├── package.json
├── tsconfig.json
├── src/
│   ├── config.ts
│   ├── auth.ts
│   └── storage/
│       └── types.ts
```

## Tasks

### 1. Create directory structure

```bash
mkdir -p server/signaling-aws/src/storage
mkdir -p server/signaling-aws/src/handlers
mkdir -p server/signaling-aws/src/rate-limiter
mkdir -p server/signaling-aws/infra
```

### 2. Create package.json

```json
{
  "name": "spaceflight-signaling-aws",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "sam build",
    "deploy": "sam deploy",
    "test": "vitest"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "@aws-sdk/client-lambda": "^3.600.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.140",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "esbuild": "^0.21.0"
  }
}
```

### 3. Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create src/config.ts

See main plan: "Configuration" section.

Key config values:
- `tableName` (from TABLE_NAME env)
- `maxPeersPerRoom` (default: 4)
- `roomExpirySeconds` (default: 3600)
- `signalExpirySeconds` (default: 60)
- Rate limit configs

### 5. Create src/auth.ts

Three functions:
- `generateId()` → `peer-{8 hex chars}`
- `generateToken()` → 32 hex chars
- `generateRoomCode()` → 8 uppercase alphanumeric

Use `node:crypto` randomBytes.

### 6. Create src/storage/types.ts

Interfaces:
- `Room` (code, hostId, gameVersion, state, createdAt, lastActivity, kickedCallsigns)
- `Peer` (id, token, callsign, joinedAt)
- `Signal` (fromPeerId, toPeerId, type, data)
- `RoomEvent` (type, data)
- `SignalingStorage` (all CRUD methods)

## Acceptance Criteria

- [ ] `npm install` succeeds in `server/signaling-aws/`
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] All files exist with correct exports
- [ ] Types are properly exported from storage/types.ts

## Commit Message

```
Add AWS signaling server project structure and types

- package.json with AWS SDK dependencies
- TypeScript configuration
- Config, auth, and storage type definitions
```
