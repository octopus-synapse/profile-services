#!/usr/bin/env bun
/**
 * Q39 / P1-038: every WebSocket inbound handler MUST be wrapped with
 * `validateWsMessage(schema, handler)` from
 * `shared-kernel/websocket/ws-message-schema.ts`. Without the wrapper
 * the payload is `unknown` and a malformed / hostile client can crash
 * or exploit the handler.
 *
 * The lint targets files that live in a `/gateways/` directory and end
 * with `.handler.ts` (the convention; today only one such file:
 * `chat.handler.ts`). Each `.on('event-name', ...)` registration
 * inside such a file MUST have a `validateWsMessage(` call as the
 * argument (or somewhere in the file mentions it, as a coarse but
 * effective check).
 *
 * Lint approach:
 *   1. Find every `socket.on(` / `ws.on(` / `io.on(` / `server.on(`
 *      call inside a gateway handler file.
 *   2. Each registration must be followed (within 200 chars) by a
 *      `validateWsMessage(` call OR the second argument itself is a
 *      `validateWsMessage(...)` expression.
 *
 * Inline escape `// lint-allow-no-ws-validate: <reason>` on the
 * registration line for the `connection`/`disconnect` lifecycle hooks
 * (which don't take a payload).
 *
 * Run: bun run scripts/lint-ws-validate.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const REGISTER_RE = /\b(?:socket|ws|io|server|nsp)\.on\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
const ESCAPE_RE = /lint-allow-no-ws-validate:\s*\S/;
// Lifecycle hooks that don't carry user payload — wrapping them with
// validateWsMessage would be a category error.
const LIFECYCLE_EVENTS = new Set([
  'connection',
  'connect',
  'disconnect',
  'disconnecting',
  'error',
  'reconnect',
  'reconnect_attempt',
]);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (entry.endsWith('.handler.ts') && full.includes('/gateways/')) yield full;
  }
}

type Offense = { file: string; line: number; event: string };
const offenses: Offense[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  REGISTER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = REGISTER_RE.exec(src)) !== null) {
    const event = m[1];
    if (LIFECYCLE_EVENTS.has(event)) continue;
    const lineNum = src.slice(0, m.index).split('\n').length;
    if (ESCAPE_RE.test(lines[lineNum - 1] || '')) continue;
    // Look at the next ~200 chars after this `.on('event',` call for `validateWsMessage(`.
    const window = src.slice(m.index, m.index + 300);
    if (!/\bvalidateWsMessage\s*\(/.test(window)) {
      offenses.push({ file: rel, line: lineNum, event });
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-ws-validate: 0 violations');
  process.exit(0);
}
console.error(`lint-ws-validate: ${offenses.length} unguarded WS handler(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}  event="${o.event}"`);
console.error(
  '\nWrap the handler with `validateWsMessage(<Schema>, async ({...}) => { ... })`. ' +
    'See `shared-kernel/websocket/ws-message-schema.ts`.',
);
process.exit(1);
