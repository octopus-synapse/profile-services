/**
 * Topic-aware SSE hub port. The route handler calls `subscribe` with
 * the authenticated user id and a list of topics; the use-case calls
 * `publish` with a freshly translated `EffectBatch`.
 *
 * Concrete adapters (in-memory today, Redis/NATS tomorrow) implement
 * the fan-out — handlers and use-cases stay framework-free.
 */
import type { Observable } from 'rxjs';
import type { EffectBatch } from '../../domain/effect-batch';
import type { Topic } from '../../domain/topic';

export abstract class SseHubPort {
  abstract subscribe(userId: string, topics: Topic[]): Observable<EffectBatch>;
  abstract publish(topic: Topic, batch: EffectBatch): void;
}
