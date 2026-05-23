/**
 * Single-process in-memory implementation of `SseHubPort`. Each topic
 * owns a `Set` of `Subject`s — one per active subscriber. `subscribe`
 * registers a fresh subject in every requested topic and returns the
 * merged `Observable`; tearing down the observer cleans the subject
 * out of every set so dropped clients don't leak.
 *
 * Cross-node fan-out is a future concern: a Redis-backed adapter will
 * implement the same port without touching the use-case or routes.
 */
import { merge, Observable, Subject } from 'rxjs';
import { SseHubPort } from '../../application/ports/sse-hub.port';
import type { EffectBatch } from '../../domain/effect-batch';
import type { Topic } from '../../domain/topic';

export class InMemorySseHubAdapter extends SseHubPort {
  // Topic → Set of subscriber Subjects.
  private readonly subjectsByTopic = new Map<Topic, Set<Subject<EffectBatch>>>();

  subscribe(_userId: string, topics: Topic[]): Observable<EffectBatch> {
    const streams = topics.map((topic) => {
      const subject = new Subject<EffectBatch>();
      const set = this.subjectsByTopic.get(topic) ?? new Set<Subject<EffectBatch>>();
      set.add(subject);
      this.subjectsByTopic.set(topic, set);

      return new Observable<EffectBatch>((observer) => {
        const sub = subject.subscribe(observer);
        return () => {
          sub.unsubscribe();
          set.delete(subject);
          if (set.size === 0) this.subjectsByTopic.delete(topic);
        };
      });
    });
    return merge(...streams);
  }

  publish(topic: Topic, batch: EffectBatch): void {
    const subjects = this.subjectsByTopic.get(topic);
    if (!subjects) return;
    for (const s of subjects) s.next(batch);
  }
}
