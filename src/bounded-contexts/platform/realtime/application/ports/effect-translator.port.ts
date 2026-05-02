/**
 * Contract every domain-event-to-UI-effect translator implements.
 *
 * Translators are the only place where domain knowledge meets the
 * realtime BC: they read a single `DomainEvent` and produce one or
 * more `(topic, effects)` pairs. The `TranslateAndPublishUseCase`
 * registers each translator against `EventBusPort` by `eventType`.
 */
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import type { Effect } from '../../domain/effect';
import type { Topic } from '../../domain/topic';

export interface TranslatedEvent {
  readonly topic: Topic;
  readonly effects: Effect[];
}

export abstract class EffectTranslator<T extends DomainEvent = DomainEvent> {
  abstract readonly eventType: string;
  abstract translate(event: T): TranslatedEvent[];
}
