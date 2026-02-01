# AWS Signaling Server

Production signaling server for Spaceflight multiplayer.

## Production URL

```
https://7fgo4kpjpauc5nwfr7bj2zxw5a0yjjrg.lambda-url.us-east-1.on.aws/
```

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
cd infra
sam build

# Deploy (first time)
sam deploy --guided --parameter-overrides AllowedOrigin='*'

# Deploy (subsequent)
sam deploy
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `AllowedOrigin` | `*` | CORS origin (`*` for itch.io) |
| `MaxPeersPerRoom` | 4 | Max players per room |
| `RoomExpirySeconds` | 3600 | Room TTL (1 hour) |
| `InvocationAlarmThreshold` | 30000 | Invocations/hour before auto-disable |

## Monitoring

- **CloudWatch Logs:** `/aws/lambda/spaceflight-signaling`
- **CloudWatch Alarm:** `spaceflight-signaling-invocation-limit`
- **DLQ:** `spaceflight-signaling-disable-dlq`

### Check alarm status

```bash
aws cloudwatch describe-alarms \
  --alarm-names spaceflight-signaling-invocation-limit \
  --query 'MetricAlarms[0].StateValue'
```

## Re-enabling after auto-disable

If the invocation alarm triggers, the signaling Lambda is automatically disabled (concurrency set to 0). To re-enable:

```bash
# 1. Investigate why alarm triggered
aws cloudwatch describe-alarm-history \
  --alarm-name spaceflight-signaling-invocation-limit

# 2. Check logs for unusual patterns
aws logs tail /aws/lambda/spaceflight-signaling --since 1h

# 3. If safe, re-enable with reasonable concurrency
aws lambda put-function-concurrency \
  --function-name spaceflight-signaling \
  --reserved-concurrent-executions 50

# 4. Monitor for recurrence
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/rooms` | Create room |
| POST | `/rooms/:code/join` | Join room |
| POST | `/rooms/:code/leave` | Leave room |
| DELETE | `/rooms/:code` | Delete room (host only) |
| POST | `/rooms/:code/kick/:peerId` | Kick peer (host only) |
| POST | `/rooms/:code/state` | Set room state (host only) |
| POST | `/rooms/:code/signal` | Post signal |
| GET | `/rooms/:code/signals` | Get signals |
| GET | `/rooms/:code/events` | Get events (long-poll) |

## Architecture

- **Lambda Function URL** - HTTPS endpoint (bypasses API Gateway for cost)
- **DynamoDB** - Provisioned at free tier (25 RCU/WCU)
- **CloudWatch Alarm** - Auto-disables on excessive invocations
- **EventBridge** - Triggers disable Lambda when alarm fires

### Cost Protection

The server includes automatic cost protection:

1. **DynamoDB:** Provisioned at 25 RCU/WCU (free tier limit)
2. **Lambda:** Reserved concurrency of 50 (limits parallel executions)
3. **Auto-disable:** CloudWatch alarm triggers at 30k invocations/hour, automatically setting Lambda concurrency to 0
4. **Rate limiting:** Per-IP limits on create (10/min), join (5/sec), signal (20/sec)

## Rollback

If issues occur after deployment:

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name spaceflight-signaling

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name spaceflight-signaling
```
