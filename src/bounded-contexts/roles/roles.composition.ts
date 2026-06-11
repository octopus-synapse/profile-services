/**
 * Wiring for the roles BC — the job-title dictionary behind the Add
 * Experience role autocomplete. Reads the `RoleTitle` table populated by
 * `bun run roles:import` (src/scripts/import-roles.ts); the bootstrap
 * mounts `{ useCases, routes }` like any other BC.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { SearchRolesUseCase } from './application/use-cases/search-roles.use-case';
import { PrismaRoleSearchAdapter } from './infrastructure/adapters/prisma-role-search.adapter';
import type { RolesBundle } from './roles.bundle';
import { rolesRoutes } from './roles.routes';

export type { RolesBundle } from './roles.bundle';

export function buildRolesComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): {
  useCases: RolesBundle;
  routes: typeof rolesRoutes;
} {
  const useCases: RolesBundle = {
    searchRoles: new SearchRolesUseCase(new PrismaRoleSearchAdapter(prisma, logger)),
  };
  return { useCases, routes: rolesRoutes };
}
