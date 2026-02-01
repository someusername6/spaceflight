# Phase 06: Auto-Disable Mechanism

## Objective

Implement the cost protection mechanism that automatically disables the signaling Lambda when usage approaches free tier limits.

## Prerequisites

- Phase 01 complete (project structure exists)

## Files to Create

```
server/signaling-aws/
└── src/
    └── disable.ts
```

## Tasks

### 1. Create src/disable.ts

**Purpose:** Lambda function triggered by CloudWatch alarm to disable the main signaling Lambda.

```typescript
import {
  LambdaClient,
  PutFunctionConcurrencyCommand,
} from '@aws-sdk/client-lambda';

const FUNCTION_NAME = process.env.TARGET_FUNCTION_NAME ?? 'spaceflight-signaling';

export async function handler(event: unknown): Promise<void> {
  const lambda = new LambdaClient({});

  console.log('Auto-disable triggered. Event:', JSON.stringify(event));

  try {
    await lambda.send(new PutFunctionConcurrencyCommand({
      FunctionName: FUNCTION_NAME,
      ReservedConcurrentExecutions: 0,
    }));
    console.log(`Successfully disabled ${FUNCTION_NAME}`);
  } catch (error) {
    console.error('Failed to disable Lambda:', error);
    throw error; // Re-throw to trigger DLQ
  }
}
```

**Key behaviors:**
- Sets reserved concurrency to 0 → Lambda cannot be invoked
- Logs event for debugging
- Throws on failure → message goes to Dead Letter Queue
- Manual re-enable required (intentional)

### 2. Document the trigger chain

```
CloudWatch Alarm (Invocations > 30k/hour)
    ↓
CloudWatch publishes to EventBridge
    ↓
EventBridge matches alarm state change event
    ↓
EventBridge invokes disable Lambda
    ↓
Disable Lambda sets concurrency to 0
    ↓
(If failure) → Dead Letter Queue
```

### 3. CloudWatch Alarm configuration (for SAM template)

**Metric:** `AWS/Lambda` → `Invocations`
**Dimension:** `FunctionName: spaceflight-signaling`
**Threshold:** 30,000 per hour (72% of free tier monthly pace)
**Period:** 3600 seconds (1 hour)
**Evaluation:** 1 period
**Statistic:** Sum

**Rationale:**
- Free tier: 1M invocations/month
- 30k/hour × 24 hours × 30 days = 21.6M (way over)
- But we only trigger after ONE hour of 30k
- This catches sustained abuse while allowing brief spikes

### 4. EventBridge rule configuration (for SAM template)

**Event pattern:**
```json
{
  "source": ["aws.cloudwatch"],
  "detail-type": ["CloudWatch Alarm State Change"],
  "detail": {
    "alarmName": ["spaceflight-signaling-invocation-limit"],
    "state": {
      "value": ["ALARM"]
    }
  }
}
```

### 5. Dead Letter Queue

**Purpose:** Capture failures if disable Lambda can't execute.

If disable fails:
1. Message goes to SQS DLQ
2. DLQ alarm triggers (threshold: 1 message)
3. Operator investigates

This is critical — if disable fails during an attack, costs could accumulate.

### 6. Re-enabling procedure (document in README)

```bash
# 1. Investigate why alarm triggered
aws cloudwatch describe-alarm-history \
  --alarm-name spaceflight-signaling-invocation-limit

# 2. Check CloudWatch logs for unusual patterns
aws logs filter-log-events \
  --log-group-name /aws/lambda/spaceflight-signaling \
  --start-time $(date -d '1 hour ago' +%s000)

# 3. If safe, re-enable with reasonable concurrency
aws lambda put-function-concurrency \
  --function-name spaceflight-signaling \
  --reserved-concurrent-executions 50

# 4. Monitor for recurrence
```

## Testing

### Manual testing procedure

1. Deploy with low threshold (e.g., 100 invocations/minute) for testing
2. Generate traffic exceeding threshold
3. Verify:
   - CloudWatch alarm enters ALARM state
   - EventBridge triggers disable Lambda
   - Signaling Lambda concurrency set to 0
   - Subsequent requests fail with throttling error
4. Re-enable and verify normal operation resumes
5. Reset threshold to production value (30k/hour)

### Unit test for disable Lambda

```typescript
// tests/test-disable.ts
import { describe, it, expect, vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutFunctionConcurrencyCommand: vi.fn(),
}));

describe('disable handler', () => {
  it('sets concurrency to 0', async () => {
    // ... test implementation
  });

  it('throws on failure to trigger DLQ', async () => {
    // ... test implementation
  });
});
```

## Acceptance Criteria

- [ ] disable.ts implemented and compiles
- [ ] Handler logs event for debugging
- [ ] Handler throws on failure (for DLQ)
- [ ] Re-enable procedure documented
- [ ] Unit tests pass

## Commit Message

```
Add auto-disable Lambda for cost protection

- Disables signaling Lambda when triggered by CloudWatch alarm
- Throws on failure to trigger Dead Letter Queue
- Manual re-enable required (intentional safety)
```
