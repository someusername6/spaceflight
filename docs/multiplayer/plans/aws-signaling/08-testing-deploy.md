# Phase 08: Testing & Deployment

## Objective

Run integration tests, deploy to AWS, and verify the production system works correctly.

## Prerequisites

- All previous phases complete
- AWS CLI configured with credentials
- SAM CLI installed

## Tasks

### 1. Run all unit tests

```bash
cd server/signaling-aws
npm test
```

All tests from phases 02-06 must pass.

### 2. Build the project

```bash
sam build
```

Verify:
- No TypeScript errors
- esbuild bundles correctly
- `.aws-sam/build/` contains Lambda packages

### 3. Integration tests (local)

If using SAM local or DynamoDB Local:

```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Create table
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name spaceflight-signaling \
  --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=25,WriteCapacityUnits=25

# Run integration tests
DYNAMODB_ENDPOINT=http://localhost:8000 npm run test:integration
```

### 4. Deploy to AWS

**CORS Note for itch.io:**
The game at https://sunlitgrove.itch.io/spaceflight runs in an iframe served from `*.itch.zone` domains (e.g., `https://html-classic.itch.zone`), not from `itch.io` directly. SAM Function URL CORS only supports a single origin, so use `*` for itch.io deployments:

```bash
# First deployment (interactive) - use * for itch.io
sam deploy --guided \
  --parameter-overrides AllowedOrigin='*'

# Save config to samconfig.toml for future deploys
# Then subsequent deploys:
sam deploy
```

**Deployment prompts:**
- Stack name: `spaceflight-signaling`
- Region: `us-east-1`
- Confirm changes: Yes
- Allow SAM to create IAM roles: Yes

### 5. Post-deployment verification

```bash
# Get Function URL
SIGNALING_URL=$(aws lambda get-function-url-config \
  --function-name spaceflight-signaling \
  --query 'FunctionUrl' --output text)
echo "Signaling URL: $SIGNALING_URL"
```

#### 5.1 Health check

```bash
curl "${SIGNALING_URL}health"
# Expected: {"status":"ok"}
```

#### 5.2 Room lifecycle test

```bash
# Create room
RESPONSE=$(curl -s -X POST "${SIGNALING_URL}rooms" \
  -H "Content-Type: application/json" \
  -d '{"gameVersion":"1.0.0"}')
echo "$RESPONSE"
ROOM_CODE=$(echo "$RESPONSE" | jq -r '.roomCode')
HOST_TOKEN=$(echo "$RESPONSE" | jq -r '.hostToken')

# Join room
curl -s -X POST "${SIGNALING_URL}rooms/${ROOM_CODE}/join" \
  -H "Content-Type: application/json" \
  -d '{"callsign":"TestPlayer"}'

# Leave room
GUEST_TOKEN=<from join response>
curl -s -X POST "${SIGNALING_URL}rooms/${ROOM_CODE}/leave" \
  -H "Authorization: Bearer ${GUEST_TOKEN}"

# Delete room
curl -s -X DELETE "${SIGNALING_URL}rooms/${ROOM_CODE}" \
  -H "Authorization: Bearer ${HOST_TOKEN}"
```

#### 5.3 Verify DynamoDB table

```bash
aws dynamodb describe-table \
  --table-name spaceflight-signaling \
  --query 'Table.{Status:TableStatus,TTL:TimeToLiveDescription}'
# Expected: Status=ACTIVE, TTL.TimeToLiveStatus=ENABLED
```

#### 5.4 Verify CloudWatch alarm

```bash
aws cloudwatch describe-alarms \
  --alarm-names spaceflight-signaling-invocation-limit \
  --query 'MetricAlarms[0].{Name:AlarmName,Threshold:Threshold,State:StateValue}'
# Expected: Threshold=30000, State=OK
```

#### 5.5 Verify EventBridge rule

```bash
aws events describe-rule \
  --name spaceflight-signaling-auto-disable \
  --query '{Name:Name,State:State}'
# Expected: State=ENABLED
```

### 6. Run existing integration tests against AWS

```bash
SIGNALING_URL="${SIGNALING_URL}" \
  npx tsx scripts/tests/signaling/test-room-lifecycle.mjs
```

**Note:** Some tests may need modification:
- TTL tests (can't control DynamoDB TTL timing)
- Rate limiting tests (timing differences)

### 7. Load test (optional but recommended)

Simulate realistic load to verify no throttling under normal usage:

```bash
# Create 10 rooms with 4 players each
# Each player polls signals every 500ms for 60 seconds
# Verify no 429 or 503 responses
```

### 8. Update client configuration

Update production build to use AWS URL:

```bash
# In your CI/CD or build script
VITE_SIGNALING_URL="${SIGNALING_URL}" npm run build
```

Or update environment config:
```typescript
// src/config/production.ts
export const SIGNALING_URL = 'https://xxx.lambda-url.us-east-1.on.aws/';
```

### 9. Create README

Create `server/signaling-aws/README.md`:

```markdown
# AWS Signaling Server

Production signaling server for Spaceflight multiplayer.

## Quick Start

\`\`\`bash
npm install
sam build
sam deploy --guided
\`\`\`

## Configuration

Set `AllowedOrigin` parameter to your game's domain.

## Monitoring

- CloudWatch Logs: `/aws/lambda/spaceflight-signaling`
- CloudWatch Alarm: `spaceflight-signaling-invocation-limit`
- DLQ: `spaceflight-signaling-disable-dlq`

## Re-enabling after auto-disable

\`\`\`bash
aws lambda put-function-concurrency \
  --function-name spaceflight-signaling \
  --reserved-concurrent-executions 50
\`\`\`

## Architecture

See `docs/multiplayer/plans/aws-signaling-server.md`
```

## Production Checklist

- [ ] All unit tests pass
- [ ] SAM build succeeds
- [ ] Deployed to AWS
- [ ] Health endpoint responds
- [ ] Room create/join/leave works
- [ ] DynamoDB TTL enabled
- [ ] CloudWatch alarm exists and is OK
- [ ] EventBridge rule enabled
- [ ] `AllowedOrigin` configured (`*` for itch.io deployment)
- [ ] Client configured with production URL
- [ ] README created
- [ ] Local server can be used as fallback

## Rollback procedure

If issues occur after deployment:

```bash
# 1. Revert client to local server URL
# 2. Delete CloudFormation stack
aws cloudformation delete-stack --stack-name spaceflight-signaling

# 3. Verify deletion
aws cloudformation wait stack-delete-complete --stack-name spaceflight-signaling
```

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] SAM builds and deploys successfully
- [ ] Health check responds
- [ ] Room lifecycle works end-to-end
- [ ] DynamoDB table has TTL enabled
- [ ] CloudWatch alarm configured correctly
- [ ] EventBridge rule active
- [ ] Integration tests pass against AWS
- [ ] README documented
- [ ] Client can connect to production server

## Commit Message

```
Deploy AWS signaling server and verify production

- Integration tests pass against deployed Lambda
- Production checklist verified
- README with deployment and monitoring docs
- Client configured for production URL
```
