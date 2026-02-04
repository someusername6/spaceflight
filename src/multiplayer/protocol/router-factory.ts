/**
 * Router Factory - Creates message router instances.
 */

import { MessageRouter } from './router';
import type { MessageRouterConfig } from './router-types';

/**
 * Create a new message router.
 */
export function createMessageRouter(
  config: MessageRouterConfig,
): MessageRouter {
  return new MessageRouter(config);
}
