/**
 * AWS Lambda handler for signaling server.
 * Entry point for all HTTP requests via Function URL.
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getConfig } from './config';
import { createRateLimiter } from './rate-limiter/dynamodb-rate-limiter';
import { route } from './router';
import { createStorage } from './storage/dynamodb-storage';

// Initialize outside handler for Lambda container reuse
const config = getConfig();
const storage = createStorage(config);
const rateLimiter = createRateLimiter(config);

/**
 * Lambda handler for Function URL requests.
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const clientIp = event.requestContext.http.sourceIp;
  const authorization = event.headers.authorization;
  const query = event.queryStringParameters ?? {};

  // Parse JSON body with error handling
  let body: unknown;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'bad_request',
          message: 'Invalid JSON body',
        }),
      };
    }
  }

  // Route to appropriate handler
  const result = await route({
    method,
    path,
    clientIp,
    authorization,
    body,
    query,
    storage,
    rateLimiter,
    config,
  });

  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body),
  };
}
