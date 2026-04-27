/**
 * Explicit registration of authentication-BC event handlers.
 *
 * The handler is a framework-free POJO; this file wires its three
 * methods to the `EventBusPort` for the corresponding event types.
 *
 * Note: these are payload-only events (no `EventClass.TYPE`); upstream
 * emitters publish raw payloads keyed by string event names.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { AuthenticationRepositoryPort } from '../../domain/ports';
import { InvalidateSessionsOnCredentialChangeHandler } from './invalidate-sessions-on-credential-change.handler';

export interface AuthenticationHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly authRepository: AuthenticationRepositoryPort;
  readonly cacheService: CacheService;
  readonly logger: LoggerPort;
}

export function registerAuthenticationHandlers(deps: AuthenticationHandlersDeps): void {
  const { eventBus, authRepository, cacheService, logger } = deps;

  const handler = new InvalidateSessionsOnCredentialChangeHandler(
    authRepository,
    cacheService,
    logger,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventBus.on('auth.session.invalidate', handler.handleSessionInvalidate.bind(handler) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventBus.on('email.verified', handler.handleEmailVerified.bind(handler) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventBus.on('password.changed', handler.handle.bind(handler) as any);
}
