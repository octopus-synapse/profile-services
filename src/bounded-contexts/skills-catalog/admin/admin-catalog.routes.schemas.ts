/**
 * Route descriptors for the skills-catalog/admin BC. Replaces the five
 * legacy admin controllers (`AdminTechAreasController`,
 * `AdminTechNichesController`, `AdminTechSkillsController`,
 * `AdminSpokenLanguagesController`, `AdminProgrammingLanguagesController`).
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

extendZodWithOpenApi(z);

export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
  search: z.string().optional(),
  isActive: z.string().optional(),
});

export const NicheListQuery = ListQuery.extend({ areaId: z.string().optional() });

export const SkillListQuery = ListQuery.extend({
  nicheId: z.string().optional(),
  type: z.string().optional(),
});

export const IdParam = IdParamSchema;
export const CodeParam = z.object({ code: z.string() }).openapi({ example: { code: 'en' } });
export const SlugParam = z.object({ slug: z.string() });

export const AnyBody = z.record(z.unknown()).openapi({
  example: {
    slug: 'fixture-slug',
    nameEn: 'Fixture',
    namePtBr: 'Fixture PT',
    isActive: true,
    areaId: '01900000-0000-7000-a000-000000000001',
    type: 'OTHER',
  },
});

export const SpokenLanguageBody = z.record(z.unknown()).openapi({
  example: {
    code: 'fixture-slug',
    nameEn: 'Fixture',
    namePtBr: 'Fixture PT',
    nameEs: 'Fixture ES',
    isActive: true,
  },
});

// ─── Response schemas (mirror Prisma row shapes) ──────────────────────
export const TechAreaTypeEnum = z.enum([
  'DEVELOPMENT',
  'DEVOPS',
  'DATA',
  'SECURITY',
  'DESIGN',
  'PRODUCT',
  'QA',
  'INFRASTRUCTURE',
  'OTHER',
]);

export const SkillTypeEnum = z.enum([
  'LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'DATABASE',
  'TOOL',
  'PLATFORM',
  'METHODOLOGY',
  'SOFT_SKILL',
  'CERTIFICATION',
  'OTHER',
]);

export const TechAreaRowSchema = z.object({
  id: z.string(),
  type: TechAreaTypeEnum,
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const TechNicheRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  areaId: z.string(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const TechSkillRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  type: SkillTypeEnum,
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  nicheId: z.string().nullable(),
  aliases: z.array(z.string()),
  keywords: z.array(z.string()),
  popularity: z.number().int(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const SpokenLanguageRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  nameEs: z.string(),
  nativeName: z.string().nullable(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const ProgrammingLanguageRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  descriptionEn: z.string().nullable(),
  descriptionPtBr: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  website: z.string().nullable(),
  paradigms: z.array(z.string()),
  typing: z.string().nullable(),
  aliases: z.array(z.string()),
  fileExtensions: z.array(z.string()),
  popularity: z.number().int(),
  order: z.number().int(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const TechAreaListResponseSchema = PaginatedResponseSchema(TechAreaRowSchema);
export const TechNicheListResponseSchema = PaginatedResponseSchema(TechNicheRowSchema);
export const TechSkillListResponseSchema = PaginatedResponseSchema(TechSkillRowSchema);
export const SpokenLanguageListResponseSchema = PaginatedResponseSchema(SpokenLanguageRowSchema);
export const ProgrammingLanguageListResponseSchema = PaginatedResponseSchema(
  ProgrammingLanguageRowSchema,
);

export const DeleteAckResponseSchema = z.object({}).strict();

export type ListInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
};

export function toListInput(q: z.infer<typeof ListQuery>): ListInput {
  return {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    search: q.search,
    isActive: q.isActive !== undefined ? String(q.isActive) === 'true' : undefined,
  };
}
