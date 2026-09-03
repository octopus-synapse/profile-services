/**
 * Every BullMQ queue with a producer has a consumer the bootstrap wires.
 *
 * The composition contract (`shared-kernel/composition`) says each BC
 * returns `workers` and the bootstrap calls `queue.register(...)` for each.
 * For months the second half did not exist: seven queues had producers
 * (`enqueue` / `schedule`) and no registered processor, so resume quality,
 * match recompute, recommendations, expiry reminders and fit-profile expiry
 * silently never ran. This spec pins the three facts that keep that from
 * recurring:
 *
 *  1. Every `*_QUEUE` constant that some `.enqueue(` / `.schedule(` call
 *     targets appears in a `workers` binding of a composition (or is
 *     registered directly by the bootstrap).
 *  2. Every composition that declares `workers` is handed to
 *     `registerBcWorkers(...)` in the bootstrap — the bindings are not just
 *     built and dropped.
 *  3. A binding gated by `enabledWhen` names a flag the registry knows, so
 *     the gate can actually be flipped.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { FEATURE_FLAGS_REGISTRY } from '@/bounded-contexts/platform/feature-flags/registry/feature-flags.registry';

const REPO = join(__dirname, '..', '..', '..');
const SRC = join(REPO, 'src');
const BOOTSTRAP = join(SRC, 'infrastructure', 'elysia-adapter', 'elysia-bootstrap.ts');

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walkTs(abs, acc);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) acc.push(abs);
  }
  return acc;
}

const files = walkTs(SRC).map((abs) => ({
  abs,
  rel: relative(REPO, abs),
  src: readFileSync(abs, 'utf8'),
}));
const bootstrap = readFileSync(BOOTSTRAP, 'utf8');

/** `export const FOO_QUEUE = 'foo'` → { FOO_QUEUE: 'foo' } */
const queueConstants = new Map<string, string>();
for (const f of files) {
  for (const m of f.src.matchAll(/export const (\w+_QUEUE) = '([^']+)'/g)) {
    queueConstants.set(m[1] as string, m[2] as string);
  }
}

/** Queue constants some code enqueues or schedules onto. */
const produced = new Map<string, string[]>();
for (const f of files) {
  for (const m of f.src.matchAll(/\.(?:enqueue|schedule)(?:<[^>]*>)?\(\s*(\w+_QUEUE)\b/g)) {
    const name = m[1] as string;
    produced.set(name, [...(produced.get(name) ?? []), f.rel]);
  }
}

/** `workers` bindings: `queue: FOO_QUEUE` inside a composition file. */
interface Binding {
  readonly queue: string;
  readonly file: string;
  readonly builder: string;
  readonly enabledWhen: string | null;
}
const bindings: Binding[] = [];
for (const f of files) {
  if (!f.rel.endsWith('.composition.ts')) continue;
  const builder = f.src.match(/export function (build\w+Composition)\(/)?.[1];
  for (const m of f.src.matchAll(/\{\s*queue:\s*(\w+_QUEUE),[^}]*\}/g)) {
    const gate = m[0].match(/enabledWhen:\s*(\w+)/)?.[1] ?? null;
    bindings.push({
      queue: m[1] as string,
      file: f.rel,
      builder: builder ?? '<no builder>',
      enabledWhen: gate,
    });
  }
}

/** Queues the bootstrap registers by hand (`queue.register(FOO_QUEUE, …)`). */
const directlyRegistered = new Set(
  [...bootstrap.matchAll(/queue\.register(?:<[^>]*>)?\(\s*(\w+_QUEUE)\b/g)].map(
    (m) => m[1] as string,
  ),
);

/** The `registerBcWorkers({...}, [ ... ])` call's owner list, verbatim. */
function registerBcWorkersOwners(): string {
  const start = bootstrap.indexOf('registerBcWorkers(');
  if (start === -1) return '';
  const end = bootstrap.indexOf('])', start);
  return end === -1 ? '' : bootstrap.slice(start, end);
}

/** Bootstrap variable a composition builder is assigned to. */
function bootstrapVariableFor(builder: string): string | null {
  const m = bootstrap.match(new RegExp(`const (\\w+) = ${builder}\\(`));
  return m?.[1] ?? null;
}

describe('arch: every produced BullMQ queue has a wired consumer', () => {
  it('sanity: the scan sees the known queues and producers', () => {
    expect(queueConstants.size).toBeGreaterThanOrEqual(8);
    expect(produced.size).toBeGreaterThanOrEqual(8);
    expect(bindings.length).toBeGreaterThanOrEqual(7);
  });

  it('every queue with an enqueue/schedule producer has a workers binding or a direct register', () => {
    const consumed = new Set([...bindings.map((b) => b.queue), ...directlyRegistered]);
    const orphans = [...produced.entries()]
      .filter(([queue]) => !consumed.has(queue))
      .map(
        ([queue, producers]) =>
          `  - ${queue} (${queueConstants.get(queue) ?? '?'}) produced by:\n      ${producers.join('\n      ')}`,
      );
    if (orphans.length > 0) {
      throw new Error(
        `Queues with producers but no consumer — jobs will pile up in Redis and never run:\n${orphans.join('\n')}`,
      );
    }
  });

  it('every composition that declares workers is handed to registerBcWorkers in the bootstrap', () => {
    const owners = registerBcWorkersOwners();
    expect(owners).not.toBe('');

    const missing: string[] = [];
    for (const builder of new Set(bindings.map((b) => b.builder))) {
      const variable = bootstrapVariableFor(builder);
      if (!variable) {
        missing.push(`  - ${builder} is never assigned in the bootstrap`);
        continue;
      }
      if (!new RegExp(`\\b${variable}(?: as \\w+)?\\)?\\.workers\\b`).test(owners)) {
        missing.push(`  - ${variable}.workers (${builder}) is not passed to registerBcWorkers`);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Worker bindings are built but never registered against the JobQueuePort:\n${missing.join('\n')}`,
      );
    }
  });

  it('every enabledWhen gate names a registered feature flag', () => {
    const known = new Set<string>(FEATURE_FLAGS_REGISTRY.map((f) => f.key));
    const flagConstants = new Map<string, string>();
    for (const f of files) {
      for (const m of f.src.matchAll(/export const (\w+_FLAG_KEY)\s*=\s*'([^']+)'/g)) {
        flagConstants.set(m[1] as string, m[2] as string);
      }
    }
    const bad = bindings
      .filter((b) => b.enabledWhen !== null)
      .map((b) => ({ ...b, key: flagConstants.get(b.enabledWhen as string) ?? b.enabledWhen }))
      .filter((b) => !known.has(b.key as string))
      .map((b) => `  - ${b.file}: ${b.queue} gated by unknown flag ${b.enabledWhen}`);
    expect(bad).toEqual([]);
  });

  it('automation workers are gated by automation.enabled', () => {
    const automation = bindings.filter((b) => b.file.includes('/automation/'));
    expect(automation.map((b) => b.queue).sort()).toEqual([
      'AUTO_APPLY_QUEUE',
      'WEEKLY_CURATED_QUEUE',
    ]);
    for (const b of automation) expect(b.enabledWhen).toBe('AUTOMATION_ENABLED_FLAG_KEY');
  });
});
