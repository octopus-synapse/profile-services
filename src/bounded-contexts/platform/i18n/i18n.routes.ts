/**
 * Route descriptors for the i18n BC. Replaces `I18nDictionaryController`.
 *
 * Each endpoint negotiates the locale from `Accept-Language` and surfaces it
 * in both the body (`locale` field) and the dynamic `Content-Language`
 * response header. Static cache headers come from `route.headers`; the
 * per-request `Content-Language` is emitted via `withHeaders(...)`.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';
import { withHeaders } from '@/shared-kernel/http/route.types';
import { negotiateLocale } from './application/locale-negotiator';
import { I18nUseCases } from './application/ports/i18n.port';

const STATIC_HEADERS = {
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  Vary: 'Accept-Language',
} as const;

// ─── Response schemas ──────────────────────────────────────────────────
const ErrorsDictionaryResponseSchema = z.object({
  locale: z.string(),
  entries: z.record(z.string()),
});

const EnumsDictionaryResponseSchema = z.object({
  locale: z.string(),
  entries: z.record(z.record(z.string())),
});

const NotificationsDictionaryResponseSchema = z.object({
  locale: z.string(),
  entries: z.record(
    z.object({
      title: z.string(),
      body: z.string(),
      params: z.array(z.string()),
    }),
  ),
});

export const i18nRoutes: ReadonlyArray<Route<I18nUseCases>> = [
  {
    method: 'GET',
    path: '/v1/i18n/dictionary/errors',
    auth: { kind: 'public' },
    headers: STATIC_HEADERS,
    response: ErrorsDictionaryResponseSchema,
    openapi: {
      summary: 'Error-message dictionary in the negotiated locale',
      tags: ['i18n'],
      description:
        'Returns `{ locale, entries: { [CODE]: localized message } }`. ' +
        'Locale is chosen from `Accept-Language` (supports `en`, `pt-BR`).',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const acceptLanguage = ctx.headers['accept-language'];
      const header = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
      const { locale } = negotiateLocale(header);
      const payload = bc.getDictionary.execute('errors', locale);
      return withHeaders(
        { 'Content-Language': locale },
        { locale, entries: payload.entries as Record<string, string> },
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/i18n/dictionary/enums',
    auth: { kind: 'public' },
    headers: STATIC_HEADERS,
    response: EnumsDictionaryResponseSchema,
    openapi: {
      summary: 'Prisma enum label dictionary in the negotiated locale',
      tags: ['i18n'],
      description:
        'Returns `{ locale, entries: { [EnumName]: { [VALUE]: label } } }`. ' +
        'Locale is chosen from `Accept-Language` (supports `en`, `pt-BR`).',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const acceptLanguage = ctx.headers['accept-language'];
      const header = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
      const { locale } = negotiateLocale(header);
      const payload = bc.getDictionary.execute('enums', locale);
      return withHeaders(
        { 'Content-Language': locale },
        { locale, entries: payload.entries as Record<string, Record<string, string>> },
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/i18n/dictionary/notifications',
    auth: { kind: 'public' },
    headers: STATIC_HEADERS,
    response: NotificationsDictionaryResponseSchema,
    openapi: {
      summary: 'Notification-template dictionary in the negotiated locale',
      tags: ['i18n'],
      description:
        'Returns `{ locale, entries: { [TYPE]: { title, body, params[] } } }`. ' +
        'Templates may contain `{ param }` placeholders — the client substitutes ' +
        'them at render time using the `params` list as the allowed key set.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const acceptLanguage = ctx.headers['accept-language'];
      const header = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
      const { locale } = negotiateLocale(header);
      const payload = bc.getDictionary.execute('notifications', locale);
      return withHeaders(
        { 'Content-Language': locale },
        {
          locale,
          entries: payload.entries as Record<
            string,
            { title: string; body: string; params: string[] }
          >,
        },
      );
    },
  },
];
