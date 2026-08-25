/**
 * Request-validation 400s carry localized `fields[]`.
 *
 * Pins the ZodError branch in `mountRoutes`: with the i18n composition
 * wired, a rejected body renders one `fields[]` entry per issue with the
 * message in the negotiated locale, `severity: 'inline'`, and
 * `Content-Language` set — the contract the frontend renders under inputs.
 */

import { describe, expect, it } from 'bun:test';
import Elysia from 'elysia';
import { z } from 'zod';
import { I18nService } from '@/bounded-contexts/platform/i18n/application/i18n.service';
import type { Route } from '@/shared-kernel/http/route.types';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { PasswordSchema } from '@/shared-kernel/schemas/primitives/password.schema';
import { FullNameSchema } from '@/shared-kernel/schemas/primitives/user-fields.schema';
import { mountRoutes } from './elysia-route-mounter';

interface NoopBundle {
  readonly name: string;
}

function buildApp(withI18n: boolean) {
  const route: Route<NoopBundle> = {
    method: 'POST',
    path: '/accounts',
    auth: { kind: 'public' },
    body: z.object({ name: FullNameSchema, password: PasswordSchema }),
    response: z.object({ ok: z.literal(true) }),
    openapi: { summary: 'Create', tags: ['test'] },
    handler: async () => ({ ok: true as const }),
  };
  return mountRoutes(
    new Elysia(),
    { bundle: { name: 'test' }, routes: [route] },
    { prefix: '/api', ...(withI18n ? { i18n: new I18nService(stubLogger) } : {}) },
  );
}

async function post(app: Elysia, body: unknown, acceptLanguage?: string) {
  const res = await app.handle(
    new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(acceptLanguage ? { 'accept-language': acceptLanguage } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  return { res, body: (await res.json()) as Record<string, unknown> };
}

type Field = { path: unknown[]; code: string; params: Record<string, unknown>; message: string };

describe('elysia-route-mounter — localized 400 fields[]', () => {
  it('renders pt-BR field messages with params and inline severity', async () => {
    const { res, body } = await post(buildApp(true), { name: 'A', password: 'abc' }, 'pt-BR');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-language')).toBe('pt-BR');
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.severity).toBe('inline');

    const fields = body.fields as Field[];
    const name = fields.find((f) => f.path[0] === 'name');
    expect(name?.code).toBe('STRING_TOO_SHORT');
    expect(name?.params).toEqual({ min: 2 });
    expect(name?.message).toBe('Mínimo de 2 caracteres');

    const codes = fields.filter((f) => f.path[0] === 'password').map((f) => f.code);
    expect(codes).toContain('STRING_TOO_SHORT');
    expect(codes).toContain('PASSWORD_NEEDS_UPPERCASE');
    expect(codes).toContain('PASSWORD_NEEDS_DIGIT');
    expect(codes).toContain('PASSWORD_NEEDS_SYMBOL');
    const symbol = fields.find((f) => f.code === 'PASSWORD_NEEDS_SYMBOL');
    expect(symbol?.message).toBe('Inclua ao menos um símbolo (@$!%*?&)');
  });

  it('maps a missing key to REQUIRED and falls back to en with Vary', async () => {
    const { res, body } = await post(buildApp(true), { password: 'Abcdef1!' }, 'fr-FR');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-language')).toBe('en');
    expect(res.headers.get('vary')).toBe('Accept-Language');
    const fields = body.fields as Field[];
    expect(fields).toEqual([
      { path: ['name'], code: 'REQUIRED', params: {}, message: 'This field is required' },
    ]);
  });

  it('keeps the envelope shape (raw Zod text) when no i18n is mounted', async () => {
    const { res, body } = await post(buildApp(false), { name: 'A', password: 'Abcdef1!' });
    expect(res.status).toBe(400);
    expect(body.severity).toBe('inline');
    const fields = body.fields as Field[];
    expect(fields[0]?.path).toEqual(['name']);
    expect(typeof fields[0]?.message).toBe('string');
  });
});
