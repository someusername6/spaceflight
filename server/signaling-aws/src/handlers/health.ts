/**
 * Health check handler.
 */

import type { HandlerResult, RouteContext } from '../router';

export async function health(_ctx: RouteContext): Promise<HandlerResult> {
  return { status: 200, body: { status: 'ok' } };
}
