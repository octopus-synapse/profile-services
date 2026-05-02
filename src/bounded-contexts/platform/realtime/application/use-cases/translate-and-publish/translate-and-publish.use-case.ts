/**
 * Wires every registered translator to the EventBus and pushes the
 * resulting `EffectBatch`es into the SSE hub. Call `register()` once
 * at boot — after that, every domain event whose `eventType` matches
 * a translator's declared `eventType` produces SSE traffic.
 *
 * Empty translation results (no effects) are silently dropped so
 * translators can return `[]` for events they don't care about
 * without polluting the wire.
 */
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import { EventBusPort } from '@/shared-kernel/event-bus/event-bus.port';
import { EffectTranslator } from '../../ports/effect-translator.port';
import { SseHubPort } from '../../ports/sse-hub.port';

export class TranslateAndPublishUseCase {
  private readonly translatorsByType = new Map<string, EffectTranslator>();

  constructor(
    private readonly bus: EventBusPort,
    private readonly hub: SseHubPort,
    translators: ReadonlyArray<EffectTranslator>,
  ) {
    for (const t of translators) {
      this.translatorsByType.set(t.eventType, t);
    }
  }

  /** Wire all translators to the EventBus. Call once at app startup. */
  register(): void {
    for (const [eventType, translator] of this.translatorsByType) {
      this.bus.on(eventType, (event: DomainEvent) => this.handle(translator, event));
    }
  }

  private handle(translator: EffectTranslator, event: DomainEvent): void {
    const ts = new Date().toISOString();
    for (const { topic, effects } of translator.translate(event)) {
      if (effects.length === 0) continue;
      this.hub.publish(topic, {
        effects,
        correlationId: event.eventId,
        ts,
      });
    }
  }
}
