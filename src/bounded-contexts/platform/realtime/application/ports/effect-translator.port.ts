/**
 * Contract every domain-event-to-UI-effect translator implements.
 *
 * Translators are the only place where domain knowledge meets the
 * realtime BC: they read a single `DomainEvent` and produce one or
 * more `(topic, effects)` pairs. The `TranslateAndPublishUseCase`
 * registers each translator against `EventBusPort` by `eventType`.
 *
 * P1-074 — locale policy. Translators MUST NOT pre-translate user-
 * facing strings; the bus dispatches each event ONCE and a topic
 * may fan out to subscribers across multiple locales (en + pt-BR).
 * Instead, emit the i18n code + params on the effect payload and
 * let the SSE consumer (browser, native client) render to the
 * user's negotiated locale. This mirrors the rest of the surface:
 *   - Success messages: route returns `{ code, params }`, mounter
 *     renders via `Accept-Language`.
 *   - Notifications: dictionary lookup at the consumer.
 *   - Error envelopes: pre-rendered server-side because the response
 *     is already locale-scoped (one user, one request).
 *
 * The `EffectPayload` type already carries arbitrary JSON; new
 * effects that need user-visible text should ship `{ messageCode,
 * params }` rather than `{ message }`.
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
