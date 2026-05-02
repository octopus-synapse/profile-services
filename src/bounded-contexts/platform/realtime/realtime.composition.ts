/**
 * Pure-TS wiring for the realtime BC. Zero `@nestjs/*` imports.
 *
 * Provides:
 *  - `SseHubPort` → `InMemorySseHubAdapter` (single-process fan-out).
 *  - `RealtimeBundle` (concrete) wired with the hub for the
 *    `/v1/stream` route.
 *  - `TranslateAndPublishUseCase` registered against the EventBus
 *    during the lifecycle init (which is when domain events start
 *    flowing through the bus).
 *
 * The translator list ships with one entry today
 * (`FeatureFlagToggledTranslator`) — the remaining 12 are added
 * incrementally by following the same pattern.
 */
import type { EventBusPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { EffectTranslator } from './application/ports/effect-translator.port';
import { SseHubPort } from './application/ports/sse-hub.port';
import { TranslateAndPublishUseCase } from './application/use-cases/translate-and-publish/translate-and-publish.use-case';
import { InMemorySseHubAdapter } from './infrastructure/adapters/in-memory-sse-hub.adapter';
import { RealtimeBundle, realtimeRoutes } from './infrastructure/http/realtime.routes';
import { FeatureFlagToggledTranslator } from './infrastructure/translators/feature-flag-toggled.translator';

/**
 * Bundle every route group exposes — the realtime BC has only one
 * route group keyed on `RealtimeBundle`, so this is also what the
 * composition surfaces as `useCases`.
 */
export interface RealtimeUseCases extends RealtimeBundle {
  readonly translateAndPublish: TranslateAndPublishUseCase;
}

export interface RealtimeCompositionDeps {
  readonly eventBus: EventBusPort;
}

function buildTranslators(): EffectTranslator[] {
  return [new FeatureFlagToggledTranslator()];
}

export function buildRealtimeComposition(
  deps: RealtimeCompositionDeps,
): BoundedContextComposition<RealtimeUseCases> {
  const hub: SseHubPort = new InMemorySseHubAdapter();
  const translators = buildTranslators();
  const translateAndPublish = new TranslateAndPublishUseCase(deps.eventBus, hub, translators);

  const useCases: RealtimeUseCases = {
    hub,
    translateAndPublish,
  };

  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        translateAndPublish.register();
      },
    },
  ];

  return {
    useCases,
    routes: realtimeRoutes,
    lifecycles,
  };
}
