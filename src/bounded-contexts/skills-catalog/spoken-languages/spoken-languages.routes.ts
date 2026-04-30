/**
 * Route descriptors for the spoken-languages BC. Replaces
 * `SpokenLanguagesController`.
 *
 * The handlers consume `SpokenLanguagesService` directly (which still
 * owns the caching behaviour) — kept as the bundle token until the
 * caching responsibility is folded into the use-cases bag.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel';
import type { Route } from '@/shared-kernel/http/route';
import {
  InvalidLimitParameterException,
  SpokenLanguageNotFoundException,
} from '../domain/exceptions/skills-catalog.exceptions';
import { SpokenLanguagesService } from './services/spoken-languages.service';

const SearchQuery = z.object({
  q: z.string().optional(),
  limit: z.string().optional(),
});

const CodeParams = z.object({ code: z.string() });

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new InvalidLimitParameterException();
  }
  return parsed;
}

export const spokenLanguagesRoutes: ReadonlyArray<Route<SpokenLanguagesService>> = [
  {
    method: 'GET',
    path: '/v1/spoken-languages',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    openapi: {
      summary: 'Get all active spoken languages',
      tags: ['spoken-languages'],
      description: 'Active spoken languages returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, service) => {
      const languages = await service.findAllActiveLanguages();
      return { success: true, data: { languages } };
    },
  },
  {
    method: 'GET',
    path: '/v1/spoken-languages/search',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    query: SearchQuery,
    openapi: {
      summary: 'Search spoken languages by name',
      tags: ['spoken-languages'],
      description: 'Filtered spoken languages returned',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { q, limit } = ctx.query as { q?: string; limit?: string };
      const parsedLimit = parseLimit(limit, 10);
      const languages = await service.searchLanguagesByName(q ?? '', parsedLimit);
      return { success: true, data: { languages } };
    },
  },
  {
    method: 'GET',
    path: '/v1/spoken-languages/:code',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: CodeParams,
    openapi: {
      summary: 'Get spoken language by code',
      tags: ['spoken-languages'],
      description: 'Spoken language returned',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { code } = ctx.params as { code: string };
      const language = await service.findLanguageByCode(code);
      if (!language) throw new SpokenLanguageNotFoundException(code);
      return { success: true, data: { language } };
    },
  },
];
