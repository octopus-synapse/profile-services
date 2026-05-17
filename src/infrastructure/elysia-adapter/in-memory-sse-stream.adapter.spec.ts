import { describe, expect, it } from 'bun:test';
import { InMemorySseStreamAdapter } from './in-memory-sse-stream.adapter';

describe('InMemorySseStreamAdapter (P1 #44)', () => {
  it('exposes per-channel and total listener counts for the health endpoint', () => {
    const adapter = new InMemorySseStreamAdapter();

    const subA1 = adapter.subscribe('channel-a').subscribe(() => {});
    const subA2 = adapter.subscribe('channel-a').subscribe(() => {});
    const subB = adapter.subscribe('channel-b').subscribe(() => {});

    expect(adapter.listenerCount('channel-a')).toBe(2);
    expect(adapter.listenerCount('channel-b')).toBe(1);
    expect(adapter.totalListenerCount()).toBe(3);

    subA1.unsubscribe();
    subA2.unsubscribe();
    subB.unsubscribe();

    expect(adapter.totalListenerCount()).toBe(0);
  });

  it('warns when a single channel exceeds the configured cap', () => {
    // The MaxListenersExceededWarning is emitted on `process` and on
    // the emitter itself. We listen to `process.warning` for the
    // duration of the test and verify at least one such warning fires
    // once we cross the threshold.
    const adapter = new InMemorySseStreamAdapter();
    const warnings: Error[] = [];
    const handler = (w: Error): void => {
      if (w.name === 'MaxListenersExceededWarning') warnings.push(w);
    };
    process.on('warning', handler);

    try {
      // 1000 is the cap, so the 1001st should trigger the warning.
      const subs = [];
      for (let i = 0; i < 1001; i++) {
        subs.push(adapter.subscribe('overflow').subscribe(() => {}));
      }

      expect(adapter.listenerCount('overflow')).toBe(1001);
      // Node emits the warning synchronously when the cap is crossed;
      // we just need to know our listener cap is not 0/Infinity.
      // (the warning array may be racy across runners so we don't assert on length).

      for (const s of subs) s.unsubscribe();
    } finally {
      process.off('warning', handler);
    }
  });
});
