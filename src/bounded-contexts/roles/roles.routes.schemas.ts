/**
 * Zod schemas + bundle types for `roles.routes.ts`.
 *
 * The roles BC powers the Add Experience role autocomplete over the
 * RoleTitle dictionary (ESCO / CBO / O*NET). It is a read-only lookup —
 * the final value the client stores is still the free-form `role` string
 * (the item `label`), so free text is never blocked.
 */

import { RoleSeniority, RoleTitleLang, RoleTitleSource } from '@prisma/client';
import { z } from 'zod';

/** One autocomplete suggestion. `label` is the ready-to-store title.
 *  `seniority` is set only on curated level variants (Estagiário/Júnior/…)
 *  — null for imported occupational titles; the client uses INTERN to
 *  auto-lock the experience's employmentType to Internship. */
export const RoleTitleItemSchema = z.object({
  label: z.string(),
  lang: z.nativeEnum(RoleTitleLang),
  source: z.nativeEnum(RoleTitleSource),
  isPreferred: z.boolean().openapi({ example: true }),
  seniority: z.nativeEnum(RoleSeniority).nullish().openapi({ example: 'INTERN' }),
});
export type RoleTitleItem = z.infer<typeof RoleTitleItemSchema>;

export const RolesSearchResponseSchema = z.object({
  items: z.array(RoleTitleItemSchema),
});
export type RolesSearchResponse = z.infer<typeof RolesSearchResponseSchema>;

/** Query for `GET /v1/roles/search`. `lang` picks the primary dictionary
 *  (defaults to `pt` in the use case); when it under-fills the limit the
 *  other language tops the list up so EN titles still surface for pt-BR
 *  users (and vice versa). */
export const RolesSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  lang: z.nativeEnum(RoleTitleLang).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});
export type RolesSearchQuery = z.infer<typeof RolesSearchQuerySchema>;
