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

const SpokenLanguageSchema = z.object({
  code: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  nameEs: z.string(),
  nativeName: z.string().nullable(),
});

const LanguagesListResponseSchema = z.object({
  languages: z.array(SpokenLanguageSchema),
});

const LanguageResponseSchema = z.object({
  language: SpokenLanguageSchema,
});

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
    response: LanguagesListResponseSchema,
    openapi: {
      summary: 'Get all active spoken languages',
      tags: ['spoken-languages'],
      description: 'Active spoken languages returned',
    },
    sdk: { exported: true },
    handler: async (_ctx, service) => {
      const languages = await service.findAllActiveLanguages();
      return { languages };
    },
  },
  {
    method: 'GET',
    path: '/v1/spoken-languages/search',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    query: SearchQuery,
    response: LanguagesListResponseSchema,
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
      return { languages };
    },
  },
  {
    method: 'GET',
    path: '/v1/spoken-languages/:code',
    auth: { kind: 'jwt' },
    permission: Permission.SKILL_READ,
    params: CodeParams,
    response: LanguageResponseSchema,
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
      return { language };
    },
  },
];
