/**
 * Route descriptors for the admin-section-types BC. Replaces
 * `AdminSectionTypesController`. Wires Zod validation directly on
 * body/query schemas.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { AdminSectionTypesUseCases } from './application/ports/admin-section-types.port';
import {
  type CreateSectionTypeDto,
  CreateSectionTypeSchema,
  type ListSectionTypesQueryDto,
  ListSectionTypesQuerySchema,
  type UpdateSectionTypeDto,
  UpdateSectionTypeSchema,
} from './dto';

const KeyParam = z.object({ key: z.string() });

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded-depth JSON value: leaf | array of leaves | object of leaves.
// Two levels deep covers the section type definition / uiSchema / hints
// shapes that admins use today.
const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const JsonNodeLevel2Schema = z.union([
  JsonLeafSchema,
  z.array(JsonLeafSchema),
  z.record(z.string(), JsonLeafSchema),
]);
const JsonNodeLevel1Schema = z.union([
  JsonLeafSchema,
  z.array(JsonNodeLevel2Schema),
  z.record(z.string(), JsonNodeLevel2Schema),
]);
const JsonObjectSchema = z.record(z.string(), JsonNodeLevel1Schema);

const SectionTypeTranslationSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  label: z.string(),
  noDataLabel: z.string().optional(),
  placeholder: z.string().optional(),
  addLabel: z.string().optional(),
});

const SectionTypeResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  semanticKind: z.string(),
  version: z.number().int(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  isRepeatable: z.boolean(),
  minItems: z.number().int(),
  maxItems: z.number().int().nullable(),
  definition: JsonObjectSchema,
  uiSchema: JsonObjectSchema.nullable(),
  renderHints: JsonObjectSchema,
  fieldStyles: z.record(z.string(), JsonObjectSchema),
  iconType: z.string(),
  icon: z.string(),
  translations: z.record(z.string(), SectionTypeTranslationSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SectionTypeListResponseSchema = z.object({
  items: z.array(SectionTypeResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

const SemanticKindsResponseSchema = z.array(z.string());

export const adminSectionTypesRoutes: ReadonlyArray<Route<AdminSectionTypesUseCases>> = [
  {
    method: 'GET',
    path: '/v1/admin/section-types',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    query: ListSectionTypesQuerySchema as unknown as z.ZodType<ListSectionTypesQueryDto>,
    response: SectionTypeListResponseSchema,
    openapi: {
      summary: 'List all section types with pagination',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.listSectionTypesAdminUseCase.execute(ctx.query as unknown as ListSectionTypesQueryDto),
  },
  {
    method: 'GET',
    path: '/v1/admin/section-types/semantic-kinds',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    response: SemanticKindsResponseSchema,
    openapi: {
      summary: 'Get all unique semantic kinds',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getSemanticKindsUseCase.execute(),
  },
  {
    method: 'GET',
    path: '/v1/admin/section-types/:key',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: KeyParam,
    response: SectionTypeResponseSchema,
    openapi: {
      summary: 'Get a section type by key',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.getSectionTypeUseCase.execute((ctx.params as { key: string }).key),
  },
  {
    method: 'POST',
    path: '/v1/admin/section-types',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    body: CreateSectionTypeSchema as unknown as z.ZodType<CreateSectionTypeDto>,
    response: SectionTypeResponseSchema,
    openapi: {
      summary: 'Create a new section type',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.createSectionTypeUseCase.execute(ctx.body as CreateSectionTypeDto),
  },
  {
    method: 'PATCH',
    path: '/v1/admin/section-types/:key',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: KeyParam,
    body: UpdateSectionTypeSchema as unknown as z.ZodType<UpdateSectionTypeDto>,
    response: SectionTypeResponseSchema,
    openapi: {
      summary: 'Update a section type',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) =>
      bc.updateSectionTypeUseCase.execute(
        (ctx.params as { key: string }).key,
        ctx.body as UpdateSectionTypeDto,
      ),
  },
  {
    method: 'DELETE',
    path: '/v1/admin/section-types/:key',
    statusCode: 204,
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: KeyParam,
    response: z.null(),
    openapi: {
      summary: 'Delete a section type',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteSectionTypeUseCase.execute((ctx.params as { key: string }).key);
    },
  },
];
