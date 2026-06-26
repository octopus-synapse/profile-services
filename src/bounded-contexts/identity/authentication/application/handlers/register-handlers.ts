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
import { registerPayloadHandler } from '@/shared-kernel/event-bus/register-handler';
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

  // Payload-only events (raw payloads, not DomainEvent envelopes); the
  // helper contains the one boundary assertion the bus's
  // `<T extends DomainEvent>` surface requires.
  registerPayloadHandler(
    eventBus,
    'auth.session.invalidate',
    handler.handleSessionInvalidate.bind(handler),
  );
  registerPayloadHandler(eventBus, 'email.verified', handler.handleEmailVerified.bind(handler));
  registerPayloadHandler(eventBus, 'password.changed', handler.handle.bind(handler));
}
