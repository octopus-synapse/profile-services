/**
 * Handlers must NOT publish new domain events.
 *
 * A `*.handler.ts` reacts to an event by calling services or
 * mutating projection tables. If it also publishes another event,
 * the cascade is hidden inside the bus and creates implicit
 * coupling that's painful to trace, test, and reason about. When
 * a handler genuinely needs to trigger more asynchronous work,
 * enqueue it via the `JobQueuePort` so the boundary is explicit.
 *
 * Today (2026-05-12) zero handlers violate this. The test fixes
 * the convention before it drifts.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', 'src');
const FORBIDDEN = [
  /\beventBus\.publish(?:Async)?\s*\(/,
  /\beventPublisher\.publish(?:Async)?\s*\(/,
];

function walkHandlers(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walkHandlers(abs, acc);
    } else if (entry.endsWith('.handler.ts') && !entry.endsWith('.spec.ts')) {
      acc.push(abs);
    }
  }
  return acc;
}

describe('arch: handlers do not publish events (Q12-V3)', () => {
  it('no *.handler.ts file calls eventBus.publish or eventPublisher.publish', () => {
    const handlers = walkHandlers(ROOT);
    expect(handlers.length).toBeGreaterThan(0); // sanity: there ARE handler files

    const offenders: Array<{ file: string; match: string }> = [];
    for (const file of handlers) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN) {
        const m = src.match(pattern);
        if (m) {
          offenders.push({
            file: relative(join(__dirname, '..', '..', '..'), file),
            match: m[0],
          });
        }
      }
    }

    if (offenders.length > 0) {
      const lines = offenders.map((o) => `  - ${o.file}: ${o.match}`).join('\n');
      throw new Error(
        `Handler cascade detected — handlers must not publish events. Use JobQueuePort to enqueue async follow-up work instead.\n${lines}`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
