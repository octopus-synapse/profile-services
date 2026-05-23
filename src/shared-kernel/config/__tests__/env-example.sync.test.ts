/**
 * .env.example ↔ EnvConfigSchema parity.
 *
 * The example file is the operator's UI for "which env vars does this
 * service understand?". When it drifts from the canonical schema:
 *   - keys-in-example-only mislead operators into setting variables
 *     the runtime silently ignores
 *   - keys-in-schema-only let production boot with a critical secret
 *     unset because nobody knew it existed
 *
 * This test is the cheap structural ratchet against both drifts. It
 * does NOT validate values or comments — that's the operator's job —
 * only that every active key on one side has a counterpart on the
 * other.
 *
 * "Active key" rules in .env.example:
 *   - lines starting with `#` are treated as comments and IGNORED
 *     (the example uses `# OPTIONAL_VAR=...` to advertise optional
 *     keys without forcing operators to define them)
 *   - lines with `KEY=value` are active; we keep KEY
 *
 * Adding a new env var:
 *   1. Add to EnvConfigSchema with the right Zod constraint
 *   2. Add an active OR commented-out entry to .env.example
 *   3. This test enforces (1) ↔ (2)
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EnvConfigSchema } from '../config.schema';

const ENV_EXAMPLE_PATH = join(import.meta.dir, '..', '..', '..', '..', '.env.example');

function parseEnvExampleKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    // Skip pure comments. Operators sometimes pre-document optional
    // keys as `# FOO=bar`; for those we DO want to count `FOO`.
    const stripped = line.startsWith('#') ? line.slice(1).trim() : line;
    if (stripped === '' || stripped.startsWith('#')) continue;
    const eq = stripped.indexOf('=');
    if (eq <= 0) continue;
    const key = stripped.slice(0, eq).trim();
    // Skip anything that doesn't look like an env identifier
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key)) continue;
    keys.add(key);
  }
  return keys;
}

function schemaKeys(): Set<string> {
  // Schema is built with `.superRefine`, so the innerType holds the
  // ZodObject. Fall back to the raw schema for older zod variants.
  const inner = (EnvConfigSchema as unknown as { _def: { schema?: { shape?: object } } })._def
    ?.schema;
  const shape = inner?.shape ?? (EnvConfigSchema as unknown as { shape: object }).shape;
  return new Set(Object.keys(shape));
}

describe('.env.example ↔ EnvConfigSchema sync', () => {
  const exampleKeys = parseEnvExampleKeys(readFileSync(ENV_EXAMPLE_PATH, 'utf8'));
  const declaredKeys = schemaKeys();

  it('every key in .env.example is declared in EnvConfigSchema', () => {
    const orphans = [...exampleKeys].filter((k) => !declaredKeys.has(k)).sort();
    expect(orphans).toEqual([]);
  });

  it('every key in EnvConfigSchema appears in .env.example (active or commented)', () => {
    const missing = [...declaredKeys].filter((k) => !exampleKeys.has(k)).sort();
    expect(missing).toEqual([]);
  });
});
