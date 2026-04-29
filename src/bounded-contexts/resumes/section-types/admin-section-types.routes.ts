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

export const adminSectionTypesRoutes: ReadonlyArray<Route<AdminSectionTypesUseCases>> = [
  {
    method: 'GET',
    path: '/v1/admin/section-types',
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    query: ListSectionTypesQuerySchema as unknown as z.ZodType<ListSectionTypesQueryDto>,
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
    auth: { kind: 'jwt' },
    permission: Permission.SECTION_TYPE_MANAGE,
    params: KeyParam,
    openapi: {
      summary: 'Delete a section type',
      tags: ['Admin - Section Types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteSectionTypeUseCase.execute((ctx.params as { key: string }).key);
      return { success: true };
    },
  },
];
