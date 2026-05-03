/**
 * Route descriptors for the admin-section-types BC. Replaces
 * `AdminSectionTypesController`. Wires Zod validation directly on
 * body/query schemas.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  KeyParam,
  SectionTypeListResponseSchema,
  SectionTypeResponseSchema,
  SemanticKindsResponseSchema,
} from './admin-section-types.routes.schemas';
import { AdminSectionTypesUseCases } from './application/ports/admin-section-types.port';
import {
  type CreateSectionTypeDto,
  CreateSectionTypeSchema,
  type ListSectionTypesQueryDto,
  ListSectionTypesQuerySchema,
  type UpdateSectionTypeDto,
  UpdateSectionTypeSchema,
} from './dto';

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
      tags: ['admin-section-types'],
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
      tags: ['admin-section-types'],
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
      tags: ['admin-section-types'],
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
      tags: ['admin-section-types'],
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
      tags: ['admin-section-types'],
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
      tags: ['admin-section-types'],
      description: 'Admin Section Types Management API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      await bc.deleteSectionTypeUseCase.execute((ctx.params as { key: string }).key);
    },
  },
];
