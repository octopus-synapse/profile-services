/**
 * P1 #38: in production / staging the no-op JobQueue silently swallows
 * `enqueue()` calls, taking notifications/email workers offline for
 * hours before anyone notices. The bootstrap calls this helper before
 * constructing the queue so a misconfigured deploy fails at boot
 * instead of running degraded.
 */

import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { ConfigValidationError } from '@/shared-kernel/config/config.schema';

export function assertBullmqRequiredInProd(config: ConfigPort): void {
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  if (nodeEnv !== 'production' && nodeEnv !== 'staging') return;
  const enableBullmq = config.getOrDefault<string>('ENABLE_BULLMQ', 'false') === 'true';
  const redisHost = config.get<string>('REDIS_HOST');
  if (enableBullmq && redisHost) return;
  throw new ConfigValidationError([
    {
      path: 'ENABLE_BULLMQ',
      message:
        `BullMQ is required in ${nodeEnv}. Set ENABLE_BULLMQ=true ` +
        `(got ${enableBullmq}) and REDIS_HOST (got ${redisHost ?? 'unset'}). ` +
        `The no-op queue silently drops jobs.`,
    },
  ]);
}
