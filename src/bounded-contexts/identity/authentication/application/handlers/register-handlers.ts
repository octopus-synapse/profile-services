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

  // The handler methods take typed event payloads but `EventBusPort.on`
  // expects `EventHandler<T extends DomainEvent>`. The bus surface is
  // intentionally generic — cast through `unknown` so each binding can
  // declare its own payload type without leaking `any`.
  eventBus.on(
    'auth.session.invalidate',
    handler.handleSessionInvalidate.bind(handler) as unknown as Parameters<typeof eventBus.on>[1],
  );
  eventBus.on(
    'email.verified',
    handler.handleEmailVerified.bind(handler) as unknown as Parameters<typeof eventBus.on>[1],
  );
  eventBus.on(
    'password.changed',
    handler.handle.bind(handler) as unknown as Parameters<typeof eventBus.on>[1],
  );
}
