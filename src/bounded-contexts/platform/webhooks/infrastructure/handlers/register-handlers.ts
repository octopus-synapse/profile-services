/**
 * Explicit registration of webhooks-BC event handlers.
 *
 * The handler is a framework-free POJO; this file wires its methods to
 * `EventBusPort` for the cross-context string event types.
 *
 * Note: these are payload-only events (no `EventClass.TYPE`); the
 * upstream emitters publish raw payload objects keyed by string event
 * names — so the handler signature stays `(payload) => ...`.
 */

import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import { registerPayloadHandler } from '@/shared-kernel/event-bus/register-handler';
import type { WebhooksUseCases } from '../../application/ports/webhooks.port';
import { WebhookEventHandler } from './webhook-event.handler';

export interface WebhooksHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly bc: WebhooksUseCases;
  readonly logger: LoggerPort;
}

export function registerWebhooksHandlers(deps: WebhooksHandlersDeps): void {
  const { eventBus, bc, logger } = deps;

  const handler = new WebhookEventHandler(bc, logger);

  // The original `@OnEvent('resume.created', { async: true })` published
  // raw payloads, not DomainEvent envelopes. The bus contract preserves
  // that — `on()` receives whatever `publish()` puts on the wire. The
  // helper contains the one boundary assertion that raw-payload binding
  // needs against the `<T extends DomainEvent>` surface.
  registerPayloadHandler(eventBus, 'resume.created', handler.handleResumeCreated.bind(handler));
  registerPayloadHandler(eventBus, 'resume.published', handler.handleResumePublished.bind(handler));
  registerPayloadHandler(
    eventBus,
    'ats.score.updated',
    handler.handleATSScoreUpdated.bind(handler),
  );
}
