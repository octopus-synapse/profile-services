import { describe, expect, it } from 'bun:test';
import { InProcessShutdownOrchestrator } from './on-shutdown.port';

describe('InProcessShutdownOrchestrator.runOne timer cleanup (P1 #48)', () => {
  it('clears the timeout timer even on the happy path', async () => {
    // Spy on globalThis setTimeout / clearTimeout to count handles.
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    let activeTimers = 0;
    const opened: Array<ReturnType<typeof realSetTimeout>> = [];
    globalThis.setTimeout = ((fn: () => void, ms?: number) => {
      activeTimers += 1;
      const h = realSetTimeout(fn, ms);
      opened.push(h);
      return h;
    }) as typeof globalThis.setTimeout;
    globalThis.clearTimeout = ((h: ReturnType<typeof realSetTimeout>) => {
      activeTimers -= 1;
      return realClearTimeout(h);
    }) as typeof globalThis.clearTimeout;

    try {
      const orchestrator = new InProcessShutdownOrchestrator();
      for (let i = 0; i < 5; i++) {
        orchestrator.register({
          name: `task-${i}`,
          run: () => Promise.resolve(),
          timeoutMs: 60_000,
        });
      }
      await orchestrator.shutdown('SEQUENTIAL');
      expect(activeTimers).toBe(0);
    } finally {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
      for (const h of opened) realClearTimeout(h);
    }
  });

  it('still clears the timer when the task throws', async () => {
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    let activeTimers = 0;
    const opened: Array<ReturnType<typeof realSetTimeout>> = [];
    globalThis.setTimeout = ((fn: () => void, ms?: number) => {
      activeTimers += 1;
      const h = realSetTimeout(fn, ms);
      opened.push(h);
      return h;
    }) as typeof globalThis.setTimeout;
    globalThis.clearTimeout = ((h: ReturnType<typeof realSetTimeout>) => {
      activeTimers -= 1;
      return realClearTimeout(h);
    }) as typeof globalThis.clearTimeout;

    try {
      const orchestrator = new InProcessShutdownOrchestrator();
      orchestrator.register({
        name: 'crash',
        run: () => Promise.reject(new Error('boom')),
        timeoutMs: 60_000,
      });
      await orchestrator.shutdown('BEST_EFFORT');
      expect(activeTimers).toBe(0);
    } finally {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
      for (const h of opened) realClearTimeout(h);
    }
  });
});
