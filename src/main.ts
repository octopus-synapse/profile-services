/**
 * Application entry-point. Phase-2 cutover: Nest is gone — the app
 * boots on Elysia + Bun via the framework-free composition graph in
 * `src/infrastructure/elysia-adapter/elysia-bootstrap.ts`.
 *
 * Default port is 3010 (the original Nest port). Set `PORT` to override.
 */

import { bootstrap } from './infrastructure/elysia-adapter/elysia-bootstrap';

void bootstrap().catch((err) => {
  process.stderr.write(`Bootstrap failed: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
