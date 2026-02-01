/**
 * Auto-disable Lambda for cost protection.
 *
 * Triggered by CloudWatch alarm when invocation count approaches free tier limits.
 * Sets the signaling Lambda's reserved concurrency to 0, effectively disabling it.
 *
 * Trigger chain:
 *   CloudWatch Alarm (Invocations > 30k/hour)
 *     → CloudWatch publishes to EventBridge
 *     → EventBridge matches alarm state change event
 *     → EventBridge invokes this Lambda
 *     → This Lambda sets concurrency to 0
 *     → (If failure) → Dead Letter Queue
 *
 * Re-enabling procedure:
 *   1. Investigate why alarm triggered:
 *      aws cloudwatch describe-alarm-history \
 *        --alarm-name spaceflight-signaling-invocation-limit
 *
 *   2. Check CloudWatch logs for unusual patterns:
 *      aws logs filter-log-events \
 *        --log-group-name /aws/lambda/spaceflight-signaling \
 *        --start-time $(date -d '1 hour ago' +%s000)
 *
 *   3. If safe, re-enable with reasonable concurrency:
 *      aws lambda put-function-concurrency \
 *        --function-name spaceflight-signaling \
 *        --reserved-concurrent-executions 50
 *
 *   4. Monitor for recurrence
 */

import {
  LambdaClient,
  PutFunctionConcurrencyCommand,
} from '@aws-sdk/client-lambda';

const FUNCTION_NAME =
  process.env.TARGET_FUNCTION_NAME ?? 'spaceflight-signaling';

/**
 * CloudWatch Alarm State Change event structure (simplified).
 */
export interface AlarmEvent {
  source?: string;
  'detail-type'?: string;
  detail?: {
    alarmName?: string;
    state?: {
      value?: string;
      reason?: string;
    };
  };
}

/**
 * Handler for the auto-disable Lambda.
 * Sets the target Lambda's reserved concurrency to 0, preventing all invocations.
 *
 * @param event - CloudWatch Alarm State Change event from EventBridge
 * @throws Re-throws any errors to trigger Dead Letter Queue
 */
export async function handler(event: AlarmEvent): Promise<void> {
  const lambda = new LambdaClient({});

  console.log('Auto-disable triggered. Event:', JSON.stringify(event));

  // Log alarm details if available
  if (event.detail?.alarmName) {
    console.log('Alarm name:', event.detail.alarmName);
    console.log('Alarm state:', event.detail.state?.value);
    console.log('Reason:', event.detail.state?.reason);
  }

  try {
    await lambda.send(
      new PutFunctionConcurrencyCommand({
        FunctionName: FUNCTION_NAME,
        ReservedConcurrentExecutions: 0,
      }),
    );
    console.log(`Successfully disabled ${FUNCTION_NAME}`);
  } catch (error) {
    console.error('Failed to disable Lambda:', error);
    // Re-throw to trigger DLQ - this is critical for alerting
    throw error;
  }
}
