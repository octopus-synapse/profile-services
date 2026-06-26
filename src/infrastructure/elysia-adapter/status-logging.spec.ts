/**
 * Fase C — the request-logging stage must log the *final* HTTP status,
 * not 200. The mounter resolves the default success status (auto-201 for
 * POST, declared `statusCode` for 204 DELETE, etc.) — the logging stage
 * (outermost, runs in `finally`) has to observe that resolved value.
 *
 * Regression: the mounter used to write the resolved status onto
 * `ec.set.status` only AFTER `runPipeline` returned, so the logging
 * stage's `finally` (which runs during the pipeline unwind, before that)
 * read `ctx.state.responseStatus === undefined` and logged 200.
 */

import { describe, expect, it } from 'bun:test';
import Elysia from 'elysia';
import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { buildDefaultPipeline } from './elysia-pipeline';
import { mountRoutes } from './elysia-route-mounter';

interface NoopBundle {
  readonly name: string;
}

/** Capture every `logger.log` message so we can read back the status the
 *  request-logging stage recorded. */
class CapturingLogger implements LoggerPort {
  readonly messages: string[] = [];
  log(message: string): void {
    this.messages.push(message);
  }
  debug(): void {}
  warn(): void {}
  error(): void {}
}

/** Pull the status token out of the single `"<METHOD> <path> <status>
 *  <ms>ms"` line each one-route app emits. */
function loggedStatus(logger: CapturingLogger): number | undefined {
  const line = logger.messages[0];
  if (!line) return undefined;
  return Number(line.split(' ')[2]);
}

function buildApp(logger: LoggerPort, route: Route<NoopBundle>) {
  const app = new Elysia();
  const pipeline = buildDefaultPipeline({ logger });
  return mountRoutes(
    app,
    { bundle: { name: 'test' }, routes: [route] },
    { prefix: '/api', pipeline },
  );
}

describe('Fase C — request logging records the resolved status', () => {
  it('logs 201 for a POST with no declared statusCode (auto-201)', async () => {
    const logger = new CapturingLogger();
    const route: Route<NoopBundle> = {
      method: 'POST',
      path: '/widgets',
      auth: { kind: 'public' },
      response: z.object({ id: z.string() }),
      openapi: { summary: 'Create widget', tags: ['test'] },
      handler: async () => ({ id: 'w1' }),
    };
    const app = buildApp(logger, route);
    const res = await app.handle(new Request('http://localhost/api/widgets', { method: 'POST' }));
    expect(res.status).toBe(201);
    expect(loggedStatus(logger)).toBe(201);
  });

  it('logs 204 for a DELETE declaring statusCode 204', async () => {
    const logger = new CapturingLogger();
    const route: Route<NoopBundle> = {
      method: 'DELETE',
      path: '/widgets/:id',
      auth: { kind: 'public' },
      statusCode: 204,
      openapi: { summary: 'Delete widget', tags: ['test'] },
      handler: async () => undefined,
    };
    const app = buildApp(logger, route);
    const res = await app.handle(
      new Request('http://localhost/api/widgets/w1', { method: 'DELETE' }),
    );
    expect(res.status).toBe(204);
    expect(loggedStatus(logger)).toBe(204);
  });

  it('logs 200 for a plain GET', async () => {
    const logger = new CapturingLogger();
    const route: Route<NoopBundle> = {
      method: 'GET',
      path: '/widgets',
      auth: { kind: 'public' },
      response: z.object({ ok: z.boolean() }),
      openapi: { summary: 'List widgets', tags: ['test'] },
      handler: async () => ({ ok: true }),
    };
    const app = buildApp(logger, route);
    const res = await app.handle(new Request('http://localhost/api/widgets'));
    expect(res.status).toBe(200);
    expect(loggedStatus(logger)).toBe(200);
  });
});
